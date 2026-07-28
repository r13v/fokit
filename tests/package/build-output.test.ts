import { execFile } from "node:child_process"
import { readFile, stat } from "node:fs/promises"
import { dirname, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import { describe, expect, it } from "vitest"

const execFileAsync = promisify(execFile)
const rootDirectory = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const packageJson = JSON.parse(
	await readFile(new URL("../../package.json", import.meta.url), "utf8"),
)

const javaScriptEntrypoints = {
	".": "index",
	"./core": "core",
	"./react19": "react19",
	"./server": "server",
} as const

type JavaScriptEntrypoint = keyof typeof javaScriptEntrypoints

type ExportCondition = {
	readonly types: string
	readonly default: string
}

type JavaScriptExport = {
	readonly import: ExportCondition
	readonly require: ExportCondition
	readonly default: string
}

describe("packed build output", () => {
	it("ships every JavaScript export target with matching declarations", async () => {
		const packedFiles = await getPackedFiles()

		for (const [entrypoint, distName] of Object.entries(
			javaScriptEntrypoints,
		) as [JavaScriptEntrypoint, string][]) {
			const exported = getJavaScriptExport(entrypoint)

			expect(exported.import.default).toBe(`./dist/${distName}.js`)
			expect(exported.require.default).toBe(`./dist/${distName}.cjs`)
			expect(exported.default).toBe(exported.import.default)
			expect(exported.import.types).toBe(`./dist/${distName}.d.ts`)
			expect(exported.require.types).toBe(`./dist/${distName}.d.cts`)
			expect(exported.import.types).not.toBe(exported.require.types)

			await assertPackageFileExists(exported.import.default)
			await assertPackageFileExists(exported.require.default)
			await assertPackageFileExists(exported.import.types)
			await assertPackageFileExists(exported.require.types)

			expect(packedFiles).toEqual(
				expect.arrayContaining([
					toPackedPath(exported.import.default),
					toPackedPath(exported.require.default),
					toPackedPath(exported.import.types),
					toPackedPath(exported.require.types),
				]),
			)
		}
	})

	it("keeps CSS explicit and side-effectful in the packed output", async () => {
		const packedFiles = await getPackedFiles()

		expect(packageJson.exports["./layout.css"]).toBe("./dist/layout.css")
		expect(packageJson.sideEffects).toEqual(["**/*.css"])
		expect(packedFiles).toContain("dist/layout.css")

		for (const entrypoint of Object.keys(
			javaScriptEntrypoints,
		) as JavaScriptEntrypoint[]) {
			const exported = getJavaScriptExport(entrypoint)
			await expectTargetNotToContain(exported.import.default, "layout.css")
			await expectTargetNotToContain(exported.require.default, "layout.css")
		}
	})

	it("preserves client directives only on React entries", async () => {
		const clientEntrypoints = new Set<JavaScriptEntrypoint>([".", "./react19"])

		for (const entrypoint of Object.keys(
			javaScriptEntrypoints,
		) as JavaScriptEntrypoint[]) {
			const exported = getJavaScriptExport(entrypoint)
			const expectedDirective = clientEntrypoints.has(entrypoint)

			for (const target of [
				exported.import.default,
				exported.require.default,
			]) {
				const source = await readPackageFile(target)
				expect(hasUseClientDirective(source)).toBe(expectedDirective)
			}
		}
	})

	it("keeps React and control imports out of the core and server export graphs", async () => {
		for (const entrypoint of ["./core", "./server"] as const) {
			const exported = getJavaScriptExport(entrypoint)

			await expectNoClientRuntimeImport(exported.import.default)
			await expectNoClientRuntimeImport(exported.require.default)
		}
	})

	it("packs only public package artifacts", async () => {
		const packedFiles = await getPackedFiles()

		expect(packedFiles).toEqual(
			expect.arrayContaining([
				"dist/layout.css",
				"LICENSE",
				"README.md",
				"package.json",
			]),
		)
		expect(packedFiles.some((file) => file.startsWith("dist/"))).toBe(true)

		for (const file of packedFiles) {
			expect(file).toMatch(/^(?:dist\/|LICENSE$|README\.md$|package\.json$)/)
			expect(file).not.toMatch(
				/^(?:src|tests|docs\/plans|docs-site|examples|\.ralphex)\//,
			)
			expect(file).not.toMatch(/^fokit-\d+\.\d+\.\d+\.tgz$/)
		}
	})
})

async function getPackedFiles(): Promise<readonly string[]> {
	const { stdout } = await execFileAsync(
		"npm",
		["pack", "--dry-run", "--json"],
		{
			cwd: rootDirectory,
		},
	)
	const [packResult] = JSON.parse(stdout) as [
		{
			readonly files: readonly { readonly path: string }[]
		},
	]
	return packResult.files.map((file) => file.path).sort()
}

function getJavaScriptExport(
	entrypoint: JavaScriptEntrypoint,
): JavaScriptExport {
	return packageJson.exports[entrypoint] as JavaScriptExport
}

async function assertPackageFileExists(packagePath: string): Promise<void> {
	await stat(packagePathToAbsolutePath(packagePath))
}

async function readPackageFile(packagePath: string): Promise<string> {
	return await readFile(packagePathToAbsolutePath(packagePath), "utf8")
}

async function expectTargetNotToContain(
	packagePath: string,
	pattern: string,
): Promise<void> {
	await expect(readPackageFile(packagePath)).resolves.not.toContain(pattern)
}

function packagePathToAbsolutePath(packagePath: string): string {
	return resolve(rootDirectory, toPackedPath(packagePath))
}

function toPackedPath(packagePath: string): string {
	return packagePath.replace(/^\.\//, "")
}

function hasUseClientDirective(source: string): boolean {
	return source.trimStart().startsWith('"use client";')
}

async function expectNoClientRuntimeImport(
	packagePath: string,
	visited = new Set<string>(),
): Promise<void> {
	const absolutePath = packagePathToAbsolutePath(packagePath)
	if (visited.has(absolutePath)) {
		return
	}
	visited.add(absolutePath)

	const source = await readFile(absolutePath, "utf8")
	for (const specifier of collectRuntimeSpecifiers(source)) {
		expect(specifier).not.toMatch(/^react(?:\/|$)/)
		expect(specifier).not.toMatch(/^react-dom(?:\/|$)/)
		expect(specifier).not.toMatch(/control-types/)

		if (specifier.startsWith(".")) {
			await expectNoClientRuntimeImport(
				`./${relative(rootDirectory, resolve(dirname(absolutePath), specifier))}`,
				visited,
			)
		}
	}
}

function collectRuntimeSpecifiers(source: string): readonly string[] {
	return [
		...source.matchAll(
			/\bimport\s+(?:[^'"]+\s+from\s+)?["']([^"']+)["']|export\s+[^"']+\s+from\s+["']([^"']+)["']/g,
		),
		...source.matchAll(/\brequire\(["']([^"']+)["']\)/g),
	].map((match) => match[1] ?? match[2] ?? "")
}
