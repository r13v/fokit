import { createRequire } from "node:module"

import { describe, expect, it } from "vitest"

type RuntimeForm = object
type RuntimeKit = Readonly<{
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
	createFormKit(options: { readonly controls: object }): RuntimeKit
	readonly [name: string]: unknown
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

	it("shares the Symbol.for capability across ESM and CommonJS", async () => {
		const esm = await loadEsmModules()
		const commonJs = loadCommonJsModules()

		const esmFormWithCommonJsFeature = createHistoryForm(
			esm.root,
			commonJs.history,
		)
		expect(
			esmFormWithCommonJsFeature.feature.handle(
				esmFormWithCommonJsFeature.form,
			),
		).toBe(esmFormWithCommonJsFeature.handle)

		const commonJsFormWithEsmFeature = createHistoryForm(
			commonJs.root,
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
				"createForm",
				"useCreateForm",
				"useBindForm",
				"useForm",
				"createFormStore",
				"KitForm",
				"Submit",
			]) {
				expect(modules.root).not.toHaveProperty(name)
			}
			expect(modules.core.createFormStore).toBeTypeOf("function")
			expect(modules.react19.ActionForm).toBeTypeOf("function")
			expect(modules.react19.ActionSubmit).toBeTypeOf("function")
			const kit = modules.root.createFormKit({ controls: {} })
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
				"createForm",
				"useCreateForm",
				"useBindForm",
				"useForm",
				"createFormStore",
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
			for (const entrypoint of ["index", "core", "react19", "server"]) {
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
	const { kit, definition } = createKitDefinition(modules.root)
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

function createHistoryForm(root: RootModule, history: HistoryModule) {
	const feature = history.createHistoryMiddleware()
	const { kit, definition } = createKitDefinition(root)
	const form = kit.createForm(definition, {
		defaultValues: { name: "Ada" },
		middleware: [feature],
	})
	return { feature, form, handle: feature.handle(form) }
}

function createKitDefinition(root: RootModule) {
	type Input = { readonly name: string }
	const schema = {
		"~standard": {
			version: 1,
			vendor: "package-test",
			validate: (value: unknown) => ({ value: value as Input }),
		},
	}
	const kit = root.createFormKit({ controls: {} })
	const definition = kit.defineForm(schema, { ui: [] })
	return { kit, definition }
}

type LoadedModules = Readonly<{
	root: RootModule
	core: CoreModule
	devtools: DevToolsModule
	history: HistoryModule
	persistence: PersistenceModule
	react19: React19Module
}>

async function loadEsmModules(): Promise<LoadedModules> {
	return {
		root: (await import("../../dist/index.js")) as unknown as RootModule,
		core: (await import("../../dist/core.js")) as unknown as CoreModule,
		devtools: (await import(
			"../../dist/devtools.js"
		)) as unknown as DevToolsModule,
		history: (await import(
			"../../dist/history.js"
		)) as unknown as HistoryModule,
		persistence: (await import(
			"../../dist/persistence.js"
		)) as unknown as PersistenceModule,
		react19: (await import(
			"../../dist/react19.js"
		)) as unknown as React19Module,
	}
}

function loadCommonJsModules(): LoadedModules {
	return {
		root: require("../../dist/index.cjs") as RootModule,
		core: require("../../dist/core.cjs") as CoreModule,
		devtools: require("../../dist/devtools.cjs") as DevToolsModule,
		history: require("../../dist/history.cjs") as HistoryModule,
		persistence: require("../../dist/persistence.cjs") as PersistenceModule,
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
