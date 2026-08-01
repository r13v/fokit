const {
	createDefaultSlots,
	createFormKit,
	nativeControls,
} = require("form-please")
const {
	createFormStore,
	normalizeDefinition,
	parsePath,
} = require("form-please/core")
const serverExports = require("form-please/server")
const { parseFormData } = serverExports
const { createDevToolsMiddleware } = require("form-please/devtools")
const {
	createHistoryMiddleware,
	replayJournal,
} = require("form-please/history")
const { createPersistenceMiddleware } = require("form-please/persistence")

const schema = {
	"~standard": {
		version: 1,
		vendor: "form-please-smoke",
		validate(value) {
			return { value }
		},
	},
}

const definition = normalizeDefinition({
	schema,
	controls: {
		text: {
			formData: {
				mode: "native",
			},
		},
	},
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
		},
	],
})

const store = createFormStore({
	definition,
	defaultValues: {
		name: "Ada",
		tags: [],
	},
})

store.setValue("name", "Grace")

if (typeof createDefaultSlots().Field !== "function") {
	throw new Error("CommonJS root export did not expose createDefaultSlots")
}

if (nativeControls.text.formData.mode !== "native") {
	throw new Error("CommonJS root export did not expose nativeControls")
}

const coreExports = require("form-please/core")

if ("createDefaultSlots" in coreExports || "nativeControls" in coreExports) {
	throw new Error("CommonJS core entry leaked React defaults")
}

if (
	"createDefaultSlots" in serverExports ||
	"nativeControls" in serverExports
) {
	throw new Error("CommonJS server entry leaked React defaults")
}

if (parsePath("tags.0").length !== 2) {
	throw new Error("CommonJS path parser returned the wrong segment count")
}

const formData = new FormData()
formData.append("__fp.array", "tags")
formData.append("name", "Grace")
formData.append("tags", "compiler")

async function main() {
	const result = await parseFormData(formData, schema)
	if (!result.success || result.value.name !== "Grace") {
		throw new Error("CommonJS server parsing failed")
	}

	const featureKit = createFormKit({ controls: {} })
	const featureDefinition = featureKit.defineForm(schema)({ ui: [] })
	const historyFeature = createHistoryMiddleware({ groupWindow: 0 })
	const saves = []
	const persistenceFeature = createPersistenceMiddleware({
		adapter: {
			load: async () => undefined,
			save: async (_key, value) => saves.push(value),
			remove: async () => {},
		},
		key: "commonjs-smoke",
		version: 1,
		saveDelay: 0,
	})
	const devToolsFeature = createDevToolsMiddleware()
	const featureForm = featureKit.createForm(featureDefinition, {
		defaultValues: { name: "Ada", tags: [] },
		middleware: [historyFeature, persistenceFeature, devToolsFeature],
	})
	const history = historyFeature.handle(featureForm)
	const persistence = persistenceFeature.handle(featureForm)
	const devTools = devToolsFeature.handle(featureForm)

	featureForm.setValue("name", "Lin")
	const journal = history.export()
	if (replayJournal(journal, journal.cursor).values.name !== "Lin") {
		throw new Error("CommonJS history replay failed")
	}

	persistence.start()
	featureForm.setValue("name", "Margaret")
	await persistence.flush()
	if (
		saves.length !== 1 ||
		JSON.stringify(saves[0]).includes("Margaret") === false
	) {
		throw new Error("CommonJS persistence encoding failed")
	}
	devTools.disconnect()
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
