import "form-please/layout.css"

import type { StandardSchema } from "form-please"
import { createMuiFormKit } from "form-please/preset-mui"
import { nativeFormKit as kit } from "form-please/preset-native"
import { ActionForm, ActionSubmit } from "form-please/react19"
import type { FormResult } from "form-please/server"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

type ProfileInput = {
	readonly name: string
}

const muiKit = createMuiFormKit()
if (!muiKit.controls.slider || muiKit.grid.at(-1) !== 12) {
	throw new Error("Material UI preset did not initialize")
}

const schema: StandardSchema<ProfileInput> = {
	"~standard": {
		version: 1,
		vendor: "form-please-smoke",
		validate(value) {
			return { value: value as ProfileInput }
		},
	},
}

const definition = kit.defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			label: "Name",
		},
	],
})

const actionResult: FormResult = {
	status: "success",
	reset: "submitted",
}

async function saveProfile(_formData: FormData): Promise<void> {
	void actionResult
}

function App() {
	const form = kit.useCreateForm(definition, {
		defaultValues: { name: "Ada" },
	})
	return (
		<ActionForm action={saveProfile} form={form} result={actionResult}>
			<ActionSubmit>Save</ActionSubmit>
			<kit.Submit>Classic submit also remains available</kit.Submit>
		</ActionForm>
	)
}

createRoot(document.getElementById("root") ?? document.body).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
