import {
	type ControlMetadata,
	createFormStore,
	type FormInput,
	type NormalizedFormDefinition,
	normalizeDefinition,
	type StandardSchema,
	type UiNode,
} from "form-please/core"
import type { DefaultSlotsI18n } from "form-please/default-slots"
import { createDefaultSlots } from "form-please/default-slots"
import { createDevToolsMiddleware } from "form-please/devtools"
import {
	createHistoryMiddleware,
	type FormJournal,
	replayJournal,
} from "form-please/history"
import type {
	NativeSelectOptions,
	NativeTextOptions,
} from "form-please/native-controls"
import { createNativeControls } from "form-please/native-controls"
import {
	createPersistenceMiddleware,
	type FormPersistenceAdapter,
} from "form-please/persistence"
import { nativeFormKit } from "form-please/preset-native"
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
const historyFeature = createHistoryMiddleware()
const adapter: FormPersistenceAdapter = {
	load: async () => undefined,
	save: async () => {},
	remove: async () => {},
}
const persistenceFeature = createPersistenceMiddleware({
	adapter,
	key: "type-smoke",
	version: 1,
})
const devToolsFeature = createDevToolsMiddleware()
declare const journal: FormJournal<ProfileInput>
const replayed = replayJournal(journal, journal.cursor)

if (createNativeControls().text.formData.mode !== "native") {
	throw new Error("CommonJS declarations did not expose native control values")
}

void store
void result
void textOptions
void selectOptions
void slotI18n
void defaultSlots
void historyFeature
void persistenceFeature
void devToolsFeature
void replayed
void nativeFormKit
