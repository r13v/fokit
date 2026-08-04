import type { StandardSchemaV1 } from "@standard-schema/spec"

import {
	createFormKit,
	defineControl,
	type FieldPath,
	type FormBinding,
	type FormKitSlots,
	type PathValue,
} from "../../src/index.js"

declare const untypedBinding: FormBinding
void untypedBinding.api.getValues().unknownField

type Input = {
	readonly name: string
	readonly age?: number
	readonly profile: {
		readonly country: string
	}
	readonly speakers: readonly {
		readonly name: string
		readonly sessions: readonly { readonly title: string }[]
	}[]
}
type Output = Input & { readonly accepted: true }
type Context = {
	readonly locale: string
	readonly permissions: readonly string[]
}
type FieldOptions = { readonly tone: "quiet" | "strong" }
type SectionOptions = { readonly bordered: boolean }
type ArrayOptions = { readonly dense: boolean }

const schema: StandardSchemaV1<Input, Output> = {
	"~standard": {
		version: 1,
		vendor: "type-test",
		validate(value) {
			return { value: { ...(value as Input), accepted: true } }
		},
	},
}

const slots = {} as FormKitSlots<FieldOptions, SectionOptions, ArrayOptions>
const baseKit = createFormKit({
	controls: {
		text: defineControl<string>({ component: () => null }),
		number: defineControl<number | undefined>({ component: () => null }),
		select: defineControl<string, { readonly choices: readonly string[] }>({
			component: () => null,
		}),
		localized: defineControl<string, { readonly prefix?: string }, Context>({
			component: () => null,
		}),
	},
	slots,
})
const kit = baseKit.forContext<Context>()

const definition = kit.defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "name",
			control: "localized",
			options: { prefix: "Dr" },
			slotOptions: { tone: "strong" },
			label: (values, { context }) => {
				const label = `${context.locale}: ${values.profile.country}`
				// @ts-expect-error Resolvers receive deeply readonly schema input.
				values.profile.country = "FR"
				// @ts-expect-error Resolver context is deeply readonly.
				context.permissions.push("admin")
				return label
			},
		},
		{
			kind: "section",
			id: "profile",
			slotOptions: { bordered: true },
			children: [
				{
					kind: "field",
					path: "profile.country",
					control: "select",
					options: { choices: ["DE", "FR"] },
				},
			],
		},
		{
			kind: "array",
			path: "speakers",
			slotOptions: { dense: true },
			itemDefault: { name: "", sessions: [] },
			label: (values) => `${values.speakers.length} speakers`,
			children: [
				{ kind: "field", path: "name", control: "text" },
				{
					kind: "array",
					path: "sessions",
					itemDefault: { title: "" },
					children: [{ kind: "field", path: "title", control: "text" }],
				},
			],
		},
	],
})

function useTypedBinding() {
	const form = kit.useForm(definition, {
		context: { locale: "en", permissions: [] },
		defaultValues: {
			name: "Ada",
			profile: { country: "GB" },
			speakers: [],
		},
		onSubmit({ value, input, form: binding }) {
			value.accepted satisfies true
			input.name satisfies string
			binding.api.control satisfies object
			binding.api.register satisfies object
			// @ts-expect-error Submit metadata is not part of Form Please.
			value.meta
		},
	})
	form.api.subscribe satisfies object
	return form
}

void useTypedBinding

function useMissingContext() {
	// @ts-expect-error Concrete form context is required.
	return kit.useForm(definition, { defaultValues: {} as Input })
}

void useMissingContext

// @ts-expect-error The kit has no extension runtime.
void kit.extend
// @ts-expect-error There is no second or compatibility runtime on the kit.
void kit.tf

kit.defineForm(schema, {
	ui: [
		// @ts-expect-error Required control options cannot be omitted.
		{
			kind: "field",
			path: "name",
			control: "select",
		},
	],
})

kit.defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "name",
			// @ts-expect-error A number control cannot bind to a string path.
			control: "number",
		},
	],
})

kit.defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			// @ts-expect-error valuePolicy was removed; hidden fields preserve values.
			valuePolicy: "preserve",
		},
	],
})

kit.defineForm(schema, {
	ui: [
		{
			kind: "array",
			path: "speakers",
			// @ts-expect-error Array defaults must match the item type.
			itemDefault: { name: "" },
			children: [],
		},
	],
})

type _NestedPath =
	"speakers.0.sessions.0.title" extends FieldPath<Input> ? true : false
const nestedPath: _NestedPath = true
const nestedValue: PathValue<Input, "speakers.0.sessions.0.title"> = "Talk"
void nestedPath
void nestedValue

// @ts-expect-error Bracket paths are not part of the public RHF path contract.
type _BracketValue = PathValue<Input, "speakers[0].name">

const primitiveSchema = {} as StandardSchemaV1<string>
// @ts-expect-error RHF form roots must be objects.
kit.defineForm(primitiveSchema, { ui: [] })
