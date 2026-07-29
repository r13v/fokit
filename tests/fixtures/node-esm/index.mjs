import { createDefaultSlots, nativeControls } from "fokit"
import { createFormStore, normalizeDefinition, parsePath } from "fokit/core"
import { parseFormData } from "fokit/server"

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
	throw new Error("ESM root export did not expose createDefaultSlots")
}

if (nativeControls.text.formData.mode !== "native") {
	throw new Error("ESM root export did not expose nativeControls")
}

const coreExports = await import("fokit/core")
const serverExports = await import("fokit/server")

if ("createDefaultSlots" in coreExports || "nativeControls" in coreExports) {
	throw new Error("ESM core entry leaked React defaults")
}

if (
	"createDefaultSlots" in serverExports ||
	"nativeControls" in serverExports
) {
	throw new Error("ESM server entry leaked React defaults")
}

if (parsePath("tags.0").length !== 2) {
	throw new Error("ESM path parser returned the wrong segment count")
}

const formData = new FormData()
formData.append("__fokit.array", "tags")
formData.append("name", "Grace")
formData.append("tags", "compiler")

const result = await parseFormData(formData, schema)

if (!result.success || result.value.name !== "Grace") {
	throw new Error("ESM server parsing failed")
}
