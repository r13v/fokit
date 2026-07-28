import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

const packageJson = JSON.parse(
	await readFile(new URL("../../package.json", import.meta.url), "utf8"),
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
			name: "fokit",
			version: "0.0.0",
			license: "MIT",
			type: "module",
			files: ["dist"],
			sideEffects: ["**/*.css"],
			peerDependencies: {
				react: "^18.0.0 || ^19.0.0",
				"react-dom": "^18.0.0 || ^19.0.0",
			},
			exports: expectedExports(),
		})
		expect(Object.keys(packageJson.exports)).toEqual([
			".",
			"./core",
			"./react19",
			"./server",
			"./layout.css",
			"./package.json",
		])
	})

	it("does not retain npm-init entry-point metadata", () => {
		expect(packageJson).not.toHaveProperty("main")
		expect(packageJson).not.toHaveProperty("directories")
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
