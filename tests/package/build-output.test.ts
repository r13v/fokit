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
	"./devtools": "devtools",
	"./history": "history",
	"./persistence": "persistence",
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

			const targets = [
				exported.import.default,
				exported.require.default,
				exported.import.types,
				exported.require.types,
			]
			for (const target of targets) {
				await assertPackageFileExists(target)
			}
			const mappedTargets: string[] = []
			for (const target of targets) {
				if ((await readPackageFile(target)).includes("sourceMappingURL=")) {
					mappedTargets.push(target)
				}
			}
			for (const target of mappedTargets) {
				await assertPackageFileExists(`${target}.map`)
			}

			expect(packedFiles).toEqual(
				expect.arrayContaining([
					...targets.map(toPackedPath),
					...mappedTargets.map((target) => toPackedPath(`${target}.map`)),
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

	it("keeps optional implementations out of the base entry graphs", async () => {
		for (const entrypoint of [
			".",
			"./core",
			"./react19",
			"./server",
		] as const) {
			const exported = getJavaScriptExport(entrypoint)

			await expectGraphNotToContainOptionalImplementation(
				exported.import.default,
			)
			await expectGraphNotToContainOptionalImplementation(
				exported.require.default,
			)
		}
	})

	it("keeps optional entries free of Redux runtime dependencies", async () => {
		expect(packageJson.dependencies).not.toHaveProperty("redux")
		expect(packageJson.dependencies).not.toHaveProperty(
			"@redux-devtools/extension",
		)
		for (const entrypoint of [
			"./devtools",
			"./history",
			"./persistence",
		] as const) {
			const exported = getJavaScriptExport(entrypoint)
			await expectGraphNotToImportRedux(exported.import.default)
			await expectGraphNotToImportRedux(exported.require.default)
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
			expect(file).not.toMatch(/^form-please-\d+\.\d+\.\d+\.tgz$/)
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

async function expectGraphNotToContainOptionalImplementation(
	packagePath: string,
	visited = new Set<string>(),
): Promise<void> {
	const absolutePath = packagePathToAbsolutePath(packagePath)
	if (visited.has(absolutePath)) return
	visited.add(absolutePath)

	const source = await readFile(absolutePath, "utf8")
	expect(source).not.toMatch(/src\/(?:devtools|history|persistence)\//)
	for (const specifier of collectRuntimeSpecifiers(source)) {
		if (specifier.startsWith(".")) {
			await expectGraphNotToContainOptionalImplementation(
				`./${relative(rootDirectory, resolve(dirname(absolutePath), specifier))}`,
				visited,
			)
		}
	}
}

async function expectGraphNotToImportRedux(
	packagePath: string,
	visited = new Set<string>(),
): Promise<void> {
	const absolutePath = packagePathToAbsolutePath(packagePath)
	if (visited.has(absolutePath)) return
	visited.add(absolutePath)

	const source = await readFile(absolutePath, "utf8")
	for (const specifier of collectRuntimeSpecifiers(source)) {
		expect(specifier).not.toMatch(
			/^(?:redux|@redux-devtools\/extension)(?:\/|$)/,
		)
		if (specifier.startsWith(".")) {
			await expectGraphNotToImportRedux(
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
