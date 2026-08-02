import { createFormKit } from "form-please"
import {
	createFormStore,
	normalizeDefinition,
	parsePath,
} from "form-please/core"
import { createDefaultSlots } from "form-please/default-slots"
import { createDevToolsMiddleware } from "form-please/devtools"
import { createHistoryMiddleware, replayJournal } from "form-please/history"
import { createNativeControls } from "form-please/native-controls"
import { createPersistenceMiddleware } from "form-please/persistence"
import { nativeFormKit } from "form-please/preset-native"
import { parseFormData } from "form-please/server"

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
	throw new Error("ESM default-slots entry did not expose createDefaultSlots")
}

if (createNativeControls().text.formData.mode !== "native") {
	throw new Error("ESM native-controls export did not create native controls")
}

if (nativeFormKit.controls.text.formData.mode !== "native") {
	throw new Error("ESM preset-native entry did not expose nativeFormKit")
}

const coreExports = await import("form-please/core")
const serverExports = await import("form-please/server")

if (
	"createDefaultSlots" in coreExports ||
	"createNativeControls" in coreExports
) {
	throw new Error("ESM core entry leaked React defaults")
}

if (
	"createDefaultSlots" in serverExports ||
	"createNativeControls" in serverExports
) {
	throw new Error("ESM server entry leaked React defaults")
}

if (parsePath("tags.0").length !== 2) {
	throw new Error("ESM path parser returned the wrong segment count")
}

const formData = new FormData()
formData.append("__fp.array", "tags")
formData.append("name", "Grace")
formData.append("tags", "compiler")

const result = await parseFormData(formData, schema)

if (!result.success || result.value.name !== "Grace") {
	throw new Error("ESM server parsing failed")
}

const featureKit = createFormKit({
	controls: {},
	slots: createDefaultSlots(),
})
const featureDefinition = featureKit.defineForm(schema, { ui: [] })
const historyFeature = createHistoryMiddleware({ groupWindow: 0 })
const saves = []
const persistenceFeature = createPersistenceMiddleware({
	adapter: {
		load: async () => undefined,
		save: async (_key, value) => saves.push(value),
		remove: async () => {},
	},
	key: "esm-smoke",
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
	throw new Error("ESM history replay failed")
}

persistence.start()
featureForm.setValue("name", "Margaret")
await persistence.flush()
if (
	saves.length !== 1 ||
	JSON.stringify(saves[0]).includes("Margaret") === false
) {
	throw new Error("ESM persistence encoding failed")
}
devTools.disconnect()
