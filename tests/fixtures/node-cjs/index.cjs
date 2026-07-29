const { createDefaultSlots, nativeControls } = require("fokit")
const {
	createFormStore,
	normalizeDefinition,
	parsePath,
} = require("fokit/core")
const serverExports = require("fokit/server")
const { parseFormData } = serverExports

const schema = {
	"~standard": {
		version: 1,
		vendor: "fokit-smoke",
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

const coreExports = require("fokit/core")

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
formData.append("__fokit.array", "tags")
formData.append("name", "Grace")
formData.append("tags", "compiler")

parseFormData(formData, schema).then((result) => {
	if (!result.success || result.value.name !== "Grace") {
		throw new Error("CommonJS server parsing failed")
	}
})
