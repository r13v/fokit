import type {
	DefaultSlotsI18n,
	NativeSelectOptions,
	NativeTextOptions,
} from "form-please"
import { createDefaultSlots, nativeControls } from "form-please"
import {
	type ControlMetadata,
	createFormStore,
	type FormInput,
	type NormalizedFormDefinition,
	normalizeDefinition,
	type StandardSchema,
	type UiNode,
} from "form-please/core"
import { type ParseResult, parseFormData } from "form-please/server"

type ProfileInput = {
	readonly name: string
	readonly tags: readonly string[]
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

const textOptions = {
	type: "email",
	placeholder: "ada@example.test",
} satisfies NativeTextOptions

const selectOptions = {
	options: [{ value: "draft", label: "Draft" }],
} satisfies NativeSelectOptions<"draft">

const slotI18n = {
	arrayAdd: "Add item",
	arrayRemove: ({ position }) => `Remove item ${position}`,
} satisfies Partial<DefaultSlotsI18n>

const defaultSlots = createDefaultSlots()

if (nativeControls.text.formData.mode !== "native") {
	throw new Error("CommonJS declarations did not expose nativeControls values")
}

void store
void result
void textOptions
void selectOptions
void slotI18n
void defaultSlots
