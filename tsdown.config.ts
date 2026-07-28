import { defineConfig } from "tsdown"

export default defineConfig({
	entry: {
		index: "src/index.ts",
		core: "src/core/index.ts",
		react19: "src/react19/index.ts",
		server: "src/server/index.ts",
	},
	format: ["esm", "cjs"],
	platform: "neutral",
	fixedExtension: false,
	dts: true,
	sourcemap: true,
	clean: true,
	deps: {
		neverBundle: true,
		dts: {
			neverBundle: true,
		},
	},
	inputOptions: {
		preserveEntrySignatures: "strict",
	},
	copy: {
		from: "src/layout.css",
		to: "dist",
	},
	tsconfig: "tsconfig.build.json",
})
