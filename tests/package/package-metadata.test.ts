import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

const packageJson = JSON.parse(
	await readFile(new URL("../../package.json", import.meta.url), "utf8"),
)

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
			exports: {
				".": {
					types: "./dist/index.d.ts",
					import: "./dist/index.js",
					require: "./dist/index.cjs",
					default: "./dist/index.js",
				},
				"./core": {
					types: "./dist/core.d.ts",
					import: "./dist/core.js",
					require: "./dist/core.cjs",
					default: "./dist/core.js",
				},
				"./react19": {
					types: "./dist/react19.d.ts",
					import: "./dist/react19.js",
					require: "./dist/react19.cjs",
					default: "./dist/react19.js",
				},
				"./server": {
					types: "./dist/server.d.ts",
					import: "./dist/server.js",
					require: "./dist/server.cjs",
					default: "./dist/server.js",
				},
				"./layout.css": "./dist/layout.css",
				"./package.json": "./package.json",
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
	})

	it("does not retain npm-init entry-point metadata", () => {
		expect(packageJson).not.toHaveProperty("main")
		expect(packageJson).not.toHaveProperty("directories")
	})
})
