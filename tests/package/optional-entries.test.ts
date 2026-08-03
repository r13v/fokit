import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"

import { describe, expect, it } from "vitest"

const require = createRequire(import.meta.url)

describe("built package entries", () => {
	it("loads the supported ESM and CommonJS entries", async () => {
		const esm = await loadEsm()
		const cjs = loadCommonJs()

		for (const modules of [esm, cjs]) {
			expect(modules.root.createFormKit).toBeTypeOf("function")
			expect(modules.root.defineControl).toBeTypeOf("function")
			expect(modules.root.fromResource).toBeTypeOf("function")
			expect(modules.defaultSlots.createDefaultSlots).toBeTypeOf("function")
			expect(modules.nativeControls.createNativeControls).toBeTypeOf("function")
			expect(modules.presetNative.nativeFormKit.useForm).toBeTypeOf("function")
			expect(modules.presetMui.createMuiFormKit).toBeTypeOf("function")
		}
	})

	it("exports only canonical root runtime names", async () => {
		for (const root of [(await loadEsm()).root, loadCommonJs().root]) {
			expect(root).toHaveProperty("createFormKit")
			expect(root).not.toHaveProperty("createForm")
			expect(root).not.toHaveProperty("createFormStore")
			expect(root).not.toHaveProperty("useForm")
			expect(root).not.toHaveProperty("useCreateForm")
			expect(root).not.toHaveProperty("useBindForm")
		}
	})

	it("omits TanStack-prefixed and retired names from declarations", async () => {
		for (const extension of ["d.ts", "d.cts"]) {
			const declaration = await readFile(
				new URL(`../../dist/index.${extension}`, import.meta.url),
				"utf8",
			)
			for (const name of [
				"TanStackFormKit",
				"TanStackFormInstance",
				"ControlFormData",
				"ValuePolicy",
				"FormMiddleware",
			]) {
				expect(declaration).not.toContain(name)
			}
			for (const name of [
				"FormBinding",
				"FormDefinition",
				"FormKit",
				"UseFormOptions",
			]) {
				expect(declaration).toContain(name)
			}
		}
	})
})

type Modules = {
	readonly root: Record<string, unknown>
	readonly defaultSlots: Record<string, unknown>
	readonly nativeControls: Record<string, unknown>
	readonly presetNative: {
		readonly nativeFormKit: { readonly useForm: unknown }
	}
	readonly presetMui: Record<string, unknown>
}

async function loadEsm(): Promise<Modules> {
	return {
		root: await import("../../dist/index.js"),
		defaultSlots: await import("../../dist/default-slots.js"),
		nativeControls: await import("../../dist/native-controls.js"),
		presetNative: await import("../../dist/preset-native.js"),
		presetMui: await import("../../dist/preset-mui.js"),
	}
}

function loadCommonJs(): Modules {
	return {
		root: require("../../dist/index.cjs"),
		defaultSlots: require("../../dist/default-slots.cjs"),
		nativeControls: require("../../dist/native-controls.cjs"),
		presetNative: require("../../dist/preset-native.cjs"),
		presetMui: require("../../dist/preset-mui.cjs"),
	}
}
