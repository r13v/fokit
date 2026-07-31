import "form-please/layout.css"

import {
	createFormKit,
	nativeControls,
	type StandardSchema,
	Submit,
} from "form-please"
import { ActionForm, ActionSubmit } from "form-please/react19"
import type { FormResult } from "form-please/server"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

type ProfileInput = {
	readonly name: string
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

const kit = createFormKit({
	controls: nativeControls,
})

const definition = kit.defineForm(schema)({
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
	return (
		<ActionForm
			action={saveProfile}
			defaultValues={{ name: "Ada" }}
			definition={definition}
			kit={kit}
			result={actionResult}
		>
			<ActionSubmit>Save</ActionSubmit>
			<Submit>Classic submit also remains importable</Submit>
		</ActionForm>
	)
}

createRoot(document.getElementById("root") ?? document.body).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
