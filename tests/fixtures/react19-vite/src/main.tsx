import "form-please/layout.css"

import type { StandardSchema } from "form-please"
import { createMuiFormKit } from "form-please/preset-mui"
import { nativeFormKit as kit } from "form-please/preset-native"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

type Input = { readonly name?: string }
const schema: StandardSchema<Input> = {
	"~standard": {
		version: 1,
		vendor: "form-please-smoke",
		validate(value) {
			return { value: value as Input }
		},
	},
}
const definition = kit.defineForm(schema, {
	ui: [{ kind: "field", path: "name", control: "text", label: "Name" }],
})
const muiKit = createMuiFormKit()
if (!muiKit.controls.slider || muiKit.grid.at(-1) !== 12) {
	throw new Error("Material UI preset did not initialize")
}

function App() {
	const form = kit.useForm(definition, { defaultValues: { name: "Ada" } })
	return (
		<kit.AutoForm form={form}>
			<kit.Submit>Save</kit.Submit>
		</kit.AutoForm>
	)
}

createRoot(document.getElementById("root") ?? document.body).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
