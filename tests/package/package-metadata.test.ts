import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import { describe, expect, it } from "vitest"

const execFileAsync = promisify(execFile)
const rootDirectory = fileURLToPath(new URL("../..", import.meta.url))
const packageJson = JSON.parse(
	await readFile(new URL("../../package.json", import.meta.url), "utf8"),
)
const packageLock = JSON.parse(
	await readFile(new URL("../../package-lock.json", import.meta.url), "utf8"),
)
const layoutCss = await readFile(
	new URL("../../src/layout.css", import.meta.url),
	"utf8",
)

const javaScriptEntrypoints = {
	".": "index",
	"./core": "core",
	"./react19": "react19",
	"./server": "server",
} as const

describe("package metadata", () => {
	it("publishes only the supported package surface", () => {
		expect(packageJson).toMatchObject({
			name: "form-please",
			license: "MIT",
			type: "module",
			homepage: "https://r13v.github.io/form-please/",
			files: ["dist"],
			sideEffects: ["**/*.css"],
			peerDependencies: {
				react: "^18.0.0 || ^19.0.0",
				"react-dom": "^18.0.0 || ^19.0.0",
			},
			exports: expectedExports(),
			engines: {
				node: ">=24",
			},
		})
		expect(Object.keys(packageJson.exports)).toEqual([
			".",
			"./core",
			"./react19",
			"./server",
			"./layout.css",
			"./package.json",
		])
		expect(packageJson.version).toMatch(
			/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/,
		)
		expect(packageLock.version).toBe(packageJson.version)
		expect(packageLock.packages[""].version).toBe(packageJson.version)
		expect(packageLock.packages[""].engines).toEqual(packageJson.engines)
	})

	it("does not retain npm-init entry-point metadata", () => {
		expect(packageJson).not.toHaveProperty("main")
		expect(packageJson).not.toHaveProperty("directories")
	})

	it("runs strict package analyzers against JavaScript entry points", () => {
		expect(packageJson.scripts["package:check"]).toBe(
			"npm run build && publint --strict && attw --pack . --profile node16 --entrypoints . ./core ./react19 ./server",
		)
	})

	it("routes declarations to the matching module format", () => {
		for (const [entrypoint, distName] of Object.entries(
			javaScriptEntrypoints,
		)) {
			const exported = packageJson.exports[entrypoint]

			expect(Object.keys(exported)).toEqual(["import", "require", "default"])
			expect(Object.keys(exported.import)).toEqual(["types", "default"])
			expect(exported.import).toEqual({
				types: `./dist/${distName}.d.ts`,
				default: `./dist/${distName}.js`,
			})
			expect(Object.keys(exported.require)).toEqual(["types", "default"])
			expect(exported.require).toEqual({
				types: `./dist/${distName}.d.cts`,
				default: `./dist/${distName}.cjs`,
			})
			expect(exported.default).toBe(`./dist/${distName}.js`)
		}
	})

	it("keeps the optional stylesheet structural and explicitly publishable", async () => {
		expect(layoutCss).toContain("@layer fp")
		expect(layoutCss).toContain("@container (min-width: 40rem)")
		expect(layoutCss).toContain("@container (min-width: 64rem)")
		expect(layoutCss).not.toMatch(/@media\b/)
		expect(layoutCss).not.toMatch(/resizeobserver/i)

		const cssVariables = new Set(layoutCss.match(/--fp-[a-z-]+/g) ?? [])
		expect([...cssVariables].sort()).toEqual([
			"--fp-array-item-gap",
			"--fp-column-gap",
			"--fp-row-gap",
			"--fp-stack-gap",
		])

		for (const pattern of forbiddenCssPatterns()) {
			expect(layoutCss).not.toMatch(pattern)
		}

		const sourceMain = await readFile(
			new URL("../../src/index.ts", import.meta.url),
			"utf8",
		)
		const builtMain = await readFile(
			new URL("../../dist/index.js", import.meta.url),
			"utf8",
		)
		const builtCommonJsMain = await readFile(
			new URL("../../dist/index.cjs", import.meta.url),
			"utf8",
		)
		expect(sourceMain).not.toContain("layout.css")
		expect(builtMain).not.toContain("layout.css")
		expect(builtCommonJsMain).not.toContain("layout.css")
		expect(packageJson.exports["./layout.css"]).toBe("./dist/layout.css")
		expect(packageJson.sideEffects).toEqual(["**/*.css"])

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
		expect(packResult.files.map((file) => file.path)).toContain(
			"dist/layout.css",
		)
	})

	it("keeps React 19 Action APIs isolated to the React 19 subpath", async () => {
		const builtEntrypoints = Object.fromEntries(
			await Promise.all(
				Object.values(javaScriptEntrypoints).map(async (distName) => [
					distName,
					await readFile(
						new URL(`../../dist/${distName}.js`, import.meta.url),
						"utf8",
					),
				]),
			),
		)

		expect(builtEntrypoints.react19?.startsWith('"use client"')).toBe(true)
		expect(builtEntrypoints.react19).toMatch(/use(?:ActionState|FormStatus)/)

		for (const [distName, source] of Object.entries(builtEntrypoints)) {
			if (distName === "react19") {
				continue
			}

			expect(source).not.toMatch(/use(?:ActionState|FormStatus)/)
		}
	})
})

function expectedExports() {
	return {
		...Object.fromEntries(
			Object.entries(javaScriptEntrypoints).map(([entrypoint, distName]) => [
				entrypoint,
				{
					import: {
						types: `./dist/${distName}.d.ts`,
						default: `./dist/${distName}.js`,
					},
					require: {
						types: `./dist/${distName}.d.cts`,
						default: `./dist/${distName}.cjs`,
					},
					default: `./dist/${distName}.js`,
				},
			]),
		),
		"./layout.css": "./dist/layout.css",
		"./package.json": "./package.json",
	}
}

function forbiddenCssPatterns(): readonly RegExp[] {
	return [
		/(^|[\s;{])(?:accent-color|appearance|background(?:-[a-z-]+)?|border(?:-[a-z-]+)?|box-shadow|color|font(?:-[a-z-]+)?|line-height|outline(?:-[a-z-]+)?|text-(?:align|decoration|transform))\s*:/i,
		/@(?:apply|tailwind)\b/i,
		/(^|[,{]\s*)\*/i,
		/\b(?:body|button|html|input|select|textarea)\b/i,
	]
}
