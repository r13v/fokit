import {
	type ControlMetadata,
	createFormStore,
	type FormInput,
	type NormalizedFormDefinition,
	normalizeDefinition,
	type StandardSchema,
	type UiNode,
} from "fokit/core"
import { type ParseResult, parseFormData } from "fokit/server"

type ProfileInput = {
	readonly name: string
	readonly tags: readonly string[]
}

const schema: StandardSchema<ProfileInput> = {
	"~standard": {
		version: 1,
		vendor: "fokit-smoke",
		validate(value) {
			return { value: value as ProfileInput }
		},
	},
}

type Controls = {
	readonly text: ControlMetadata<string | undefined>
}

const controls = {
	text: {
		formData: {
			mode: "native",
		},
	},
} satisfies Controls

const ui = [
	{
		kind: "field",
		path: "name",
		control: "text",
	},
] satisfies readonly UiNode<ProfileInput, Controls>[]

const normalizeProfile = normalizeDefinition as unknown as (input: {
	readonly schema: typeof schema
	readonly controls: Controls
	readonly ui: typeof ui
}) => NormalizedFormDefinition<typeof schema>

const definition = normalizeProfile({
	schema,
	controls,
	ui,
})

const store = createFormStore({
	definition,
	defaultValues: {
		name: "Ada",
		tags: [],
	},
})

type _Input = FormInput<typeof schema>

const result: Promise<ParseResult<ProfileInput>> = parseFormData(
	new FormData(),
	schema,
)

void store
void result
