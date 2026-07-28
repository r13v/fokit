import { normalizeDefinition, type StandardSchema } from "fokit/core"

import { ClientForm } from "./client-form"

type ServerInput = {
	readonly name: string
}

const schema: StandardSchema<ServerInput> = {
	"~standard": {
		version: 1,
		vendor: "fokit-smoke",
		validate(value) {
			return { value: value as ServerInput }
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

export default function Page() {
	return (
		<main>
			<p>{definition.fieldsByPath.name.path}</p>
			<ClientForm />
		</main>
	)
}
