import { createRequire } from "node:module"

import { describe, expect, it } from "vitest"

type RuntimeForm = object
type RuntimeKit = Readonly<{
	readonly controls: Readonly<Record<string, object>>
	readonly slots: Readonly<Record<string, unknown>>
	readonly useCreateForm: unknown
	readonly useBindForm: unknown
	defineForm(
		schema: object,
		definition: { readonly ui: readonly never[] },
	): object
	createForm(
		definition: object,
		options: {
			readonly defaultValues: object
			readonly middleware: readonly object[]
		},
	): RuntimeForm
}>
type RootModule = Readonly<{
	createFormKit(options: {
		readonly controls: object
		readonly slots: object
	}): RuntimeKit
	readonly [name: string]: unknown
}>
type DefaultSlotsModule = Readonly<{
	createDefaultSlots(): object
}>
type NativeControlsModule = Readonly<{
	createNativeControls(): Readonly<Record<string, object>>
}>
type PresetNativeModule = Readonly<{
	readonly nativeFormKit: RuntimeKit
}>
type CoreModule = Readonly<{ createFormStore: unknown }>
type HistoryHandle = Readonly<{
	getSnapshot(): { readonly canUndo: boolean; readonly canRedo: boolean }
}>
type HistoryFeature = object & Readonly<{ handle(form: object): HistoryHandle }>
type HistoryModule = Readonly<{
	createHistoryMiddleware(options?: object): HistoryFeature
}>
type PersistenceHandle = Readonly<{
	getSnapshot(): { readonly phase: string }
}>
type PersistenceFeature = object &
	Readonly<{ handle(form: object): PersistenceHandle }>
type PersistenceModule = Readonly<{
	createPersistenceMiddleware(options: object): PersistenceFeature
}>
type DevToolsHandle = Readonly<{ disconnect(): void }>
type DevToolsFeature = object &
	Readonly<{ handle(form: object): DevToolsHandle }>
type DevToolsModule = Readonly<{
	createDevToolsMiddleware(options?: object): DevToolsFeature
}>
type React19Module = Readonly<{
	ActionForm: unknown
	ActionSubmit: unknown
}>

const require = createRequire(import.meta.url)

describe("built optional package entries", () => {
	it("initializes every feature and retrieves its handle in ESM and CommonJS", async () => {
		const esm = await loadEsmModules()
		const commonJs = loadCommonJsModules()

		for (const modules of [esm, commonJs]) {
			const handles = createFeatureEnabledForm(modules)
			expect(handles.history.getSnapshot()).toMatchObject({
				canUndo: false,
				canRedo: false,
			})
			expect(handles.persistence.getSnapshot().phase).toBe("idle")
			expect(handles.devTools.disconnect).toBeTypeOf("function")
		}
	})

	it("loads fresh frozen native controls and complete default slots from their subpaths", async () => {
		const esm = await loadEsmModules()
		const commonJs = loadCommonJsModules()

		for (const modules of [esm, commonJs]) {
			const first = modules.nativeControls.createNativeControls()
			const second = modules.nativeControls.createNativeControls()
			expect(first).not.toBe(second)
			expect(Object.isFrozen(first)).toBe(true)
			expect(Object.isFrozen(first.text)).toBe(true)
			expect(modules.defaultSlots.createDefaultSlots()).toMatchObject({
				Field: expect.any(Function),
				Section: expect.any(Function),
				Array: expect.any(Function),
				ArrayItem: expect.any(Function),
				ErrorMessage: expect.any(Function),
				Submit: expect.any(Function),
			})
		}
	})

	it("loads the immutable native preset in ESM and CommonJS", async () => {
		const esm = await loadEsmModules()
		const commonJs = loadCommonJsModules()

		for (const modules of [esm, commonJs]) {
			const kit = modules.presetNative.nativeFormKit
			expect(Object.isFrozen(kit)).toBe(true)
			expect(Object.isFrozen(kit.controls)).toBe(true)
			expect(Object.isFrozen(kit.slots)).toBe(true)
			expect(kit.controls).toHaveProperty("text")
			expect(kit.slots).toHaveProperty("Field")
		}
	})

	it("shares the Symbol.for capability across ESM and CommonJS", async () => {
		const esm = await loadEsmModules()
		const commonJs = loadCommonJsModules()

		const esmFormWithCommonJsFeature = createHistoryForm(
			esm.root,
			esm.defaultSlots,
			commonJs.history,
		)
		expect(
			esmFormWithCommonJsFeature.feature.handle(
				esmFormWithCommonJsFeature.form,
			),
		).toBe(esmFormWithCommonJsFeature.handle)

		const commonJsFormWithEsmFeature = createHistoryForm(
			commonJs.root,
			commonJs.defaultSlots,
			esm.history,
		)
		expect(
			commonJsFormWithEsmFeature.feature.handle(
				commonJsFormWithEsmFeature.form,
			),
		).toBe(commonJsFormWithEsmFeature.handle)
	})

	it("reports protocol mismatches instead of class or symbol errors", async () => {
		const esm = await loadEsmModules()
		const commonJs = loadCommonJsModules()
		const incompatibleForm = {
			[Symbol.for("form-please.feature-capability")]: { version: 2 },
		}

		for (const history of [esm.history, commonJs.history]) {
			const feature = history.createHistoryMiddleware()
			expect(() => feature.handle(incompatibleForm)).toThrow(
				/Incompatible Form Please feature protocol: expected version 1, received 2/,
			)
		}
	})

	it("keeps removed constructors out of main artifacts and core-only APIs isolated", async () => {
		const esm = await loadEsmModules()
		const commonJs = loadCommonJsModules()
		for (const modules of [esm, commonJs]) {
			for (const name of [
				"createDefaultSlots",
				"createForm",
				"useCreateForm",
				"useBindForm",
				"useForm",
				"createFormStore",
				"createNativeControls",
				"nativeControls",
				"nativeFormKit",
				"KitForm",
				"Submit",
			]) {
				expect(modules.root).not.toHaveProperty(name)
			}
			expect(modules.core.createFormStore).toBeTypeOf("function")
			expect(modules.react19.ActionForm).toBeTypeOf("function")
			expect(modules.react19.ActionSubmit).toBeTypeOf("function")
			const kit = modules.root.createFormKit({
				controls: {},
				slots: modules.defaultSlots.createDefaultSlots(),
			})
			expect(kit.useCreateForm).toBeTypeOf("function")
			expect(kit.useBindForm).toBeTypeOf("function")
		}
	})

	it("omits removed constructors from generated main declarations", async () => {
		for (const target of ["../../dist/index.d.ts", "../../dist/index.d.cts"]) {
			const declaration = await import("node:fs/promises").then(
				({ readFile }) => readFile(new URL(target, import.meta.url), "utf8"),
			)
			const exports = collectDeclarationExports(declaration)
			for (const name of [
				"createDefaultSlots",
				"createForm",
				"useCreateForm",
				"useBindForm",
				"useForm",
				"createFormStore",
				"createNativeControls",
				"nativeControls",
				"nativeFormKit",
				"KitForm",
				"Submit",
				"UseFormOptions",
			]) {
				expect(exports).not.toContain(name)
			}
		}
	})

	it("keeps optional declarations isolated to their subpaths", async () => {
		const optionalNames = [
			"CreateFileCodecOptions",
			"CreateDevToolsOptions",
			"CreateHistoryOptions",
			"CreatePersistenceOptions",
			"DevToolsFeature",
			"DevToolsFormState",
			"DevToolsHandle",
			"DevToolsRevisionToken",
			"FormJournal",
			"FormPersistenceAdapter",
			"HistoryFeature",
			"HistoryHandle",
			"HistoryOperationResult",
			"HistorySnapshot",
			"JournalCursor",
			"JsonValue",
			"LogicalRowIdentity",
			"PersistenceCodec",
			"PersistenceFeature",
			"PersistenceHandle",
			"PersistenceMigration",
			"PersistenceRestoreResult",
			"PersistenceSnapshot",
			"PersistenceStorage",
			"createDateCodec",
			"createDevToolsMiddleware",
			"createFileCodec",
			"createHistoryMiddleware",
			"createLocalStorageAdapter",
			"createPersistenceMiddleware",
			"replayJournal",
		]
		for (const format of ["d.ts", "d.cts"]) {
			for (const entrypoint of [
				"index",
				"core",
				"default-slots",
				"native-controls",
				"preset-native",
				"react19",
				"server",
			]) {
				const declaration = await import("node:fs/promises").then(
					({ readFile }) =>
						readFile(
							new URL(`../../dist/${entrypoint}.${format}`, import.meta.url),
							"utf8",
						),
				)
				const exports = collectDeclarationExports(declaration)
				for (const name of optionalNames) expect(exports).not.toContain(name)
			}
		}
	})
})

function createFeatureEnabledForm(modules: LoadedModules) {
	const historyFeature = modules.history.createHistoryMiddleware()
	const persistenceFeature = modules.persistence.createPersistenceMiddleware({
		adapter: {
			load: async () => undefined,
			save: async () => {},
			remove: async () => {},
		},
		key: "package-test",
		version: 1,
	})
	const devToolsFeature = modules.devtools.createDevToolsMiddleware()
	const { kit, definition } = createKitDefinition(
		modules.root,
		modules.defaultSlots,
	)
	const form = kit.createForm(definition, {
		defaultValues: { name: "Ada" },
		middleware: [historyFeature, persistenceFeature, devToolsFeature],
	})
	return {
		history: historyFeature.handle(form),
		persistence: persistenceFeature.handle(form),
		devTools: devToolsFeature.handle(form),
	}
}

function createHistoryForm(
	root: RootModule,
	defaultSlots: DefaultSlotsModule,
	history: HistoryModule,
) {
	const feature = history.createHistoryMiddleware()
	const { kit, definition } = createKitDefinition(root, defaultSlots)
	const form = kit.createForm(definition, {
		defaultValues: { name: "Ada" },
		middleware: [feature],
	})
	return { feature, form, handle: feature.handle(form) }
}

function createKitDefinition(
	root: RootModule,
	defaultSlots: DefaultSlotsModule,
) {
	type Input = { readonly name: string }
	const schema = {
		"~standard": {
			version: 1,
			vendor: "package-test",
			validate: (value: unknown) => ({ value: value as Input }),
		},
	}
	const kit = root.createFormKit({
		controls: {},
		slots: defaultSlots.createDefaultSlots(),
	})
	const definition = kit.defineForm(schema, { ui: [] })
	return { kit, definition }
}

type LoadedModules = Readonly<{
	root: RootModule
	core: CoreModule
	defaultSlots: DefaultSlotsModule
	devtools: DevToolsModule
	history: HistoryModule
	nativeControls: NativeControlsModule
	persistence: PersistenceModule
	presetNative: PresetNativeModule
	react19: React19Module
}>

async function loadEsmModules(): Promise<LoadedModules> {
	return {
		root: (await import("../../dist/index.js")) as unknown as RootModule,
		core: (await import("../../dist/core.js")) as unknown as CoreModule,
		defaultSlots: (await import(
			"../../dist/default-slots.js"
		)) as unknown as DefaultSlotsModule,
		devtools: (await import(
			"../../dist/devtools.js"
		)) as unknown as DevToolsModule,
		history: (await import(
			"../../dist/history.js"
		)) as unknown as HistoryModule,
		nativeControls: (await import(
			"../../dist/native-controls.js"
		)) as unknown as NativeControlsModule,
		persistence: (await import(
			"../../dist/persistence.js"
		)) as unknown as PersistenceModule,
		presetNative: (await import(
			"../../dist/preset-native.js"
		)) as unknown as PresetNativeModule,
		react19: (await import(
			"../../dist/react19.js"
		)) as unknown as React19Module,
	}
}

function loadCommonJsModules(): LoadedModules {
	return {
		root: require("../../dist/index.cjs") as RootModule,
		core: require("../../dist/core.cjs") as CoreModule,
		defaultSlots: require("../../dist/default-slots.cjs") as DefaultSlotsModule,
		devtools: require("../../dist/devtools.cjs") as DevToolsModule,
		history: require("../../dist/history.cjs") as HistoryModule,
		nativeControls:
			require("../../dist/native-controls.cjs") as NativeControlsModule,
		persistence: require("../../dist/persistence.cjs") as PersistenceModule,
		presetNative: require("../../dist/preset-native.cjs") as PresetNativeModule,
		react19: require("../../dist/react19.cjs") as React19Module,
	}
}

function collectDeclarationExports(source: string): readonly string[] {
	return [...source.matchAll(/\bexport\s*\{([^}]*)\}/gs)].flatMap((match) =>
		(match[1] ?? "").split(",").map((entry) => {
			const names = entry
				.trim()
				.replace(/^type\s+/, "")
				.split(/\s+as\s+/)
			return names[1] ?? names[0] ?? ""
		}),
	)
}
