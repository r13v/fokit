import type { StandardSchemaV1 } from "@standard-schema/spec"

import type {
	ControlMetadata,
	FormInput,
	UiNode,
} from "../../src/core/index.js"
import { normalizeDefinition } from "../../src/core/index.js"
import {
	type ArrayBinding,
	createForm,
	type FieldBinding,
	type FormInstance,
	type FormRuntimeOptions,
	useArrayField,
	useField,
	useForm,
	useFormState,
	useValue,
} from "../../src/index.js"

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false

type Expect<Condition extends true> = Condition

type ExampleInput = {
	kind: "person" | "company"
	profile: {
		first: string
		last: string
		middle?: string
	}
	companyName?: string
	contacts: readonly {
		value: string
		note?: string
	}[]
	flags?: {
		newsletter: boolean
	}
}

type ExampleContext = {
	readonly locked: boolean
}

type ExampleSchema = StandardSchemaV1<ExampleInput>

type ExampleControls = {
	readonly text: ControlMetadata<string | undefined>
	readonly kind: ControlMetadata<ExampleInput["kind"]>
}

declare const schema: ExampleSchema

const controls = {
	text: {
		formData: {
			mode: "native",
		},
	},
	kind: {
		formData: {
			mode: "native",
		},
	},
} satisfies ExampleControls

const definition = normalizeDefinition<
	ExampleSchema,
	ExampleControls,
	ExampleContext
>({
	schema,
	controls,
	ui: [
		{
			kind: "field",
			path: "kind",
			control: "kind",
		},
		{
			kind: "field",
			path: "profile.first",
			control: "text",
		},
		{
			kind: "array",
			path: "contacts",
			itemDefault: {
				value: "",
			},
			children: [
				{
					kind: "field",
					path: "value",
					control: "text",
				},
			],
		},
	] satisfies readonly UiNode<ExampleInput, ExampleControls, ExampleContext>[],
})

const exampleContext: ExampleContext = {
	locked: false,
}

const externalForm = createForm(definition, {
	defaultValues: {
		kind: "person",
		profile: {
			first: "Grace",
			last: "Hopper",
		},
		contacts: [],
	},
	context: exampleContext,
})

const externalRuntimeOptions = {
	context: exampleContext,
	disabled: false,
} satisfies FormRuntimeOptions<ExampleSchema, ExampleContext>

type _formInput = Expect<Equal<FormInput<ExampleSchema>, ExampleInput>>

function TypeHarness() {
	const form = useForm(definition, {
		defaultValues: {
			kind: "person",
			profile: {
				first: "Grace",
				last: "Hopper",
			},
			contacts: [{ value: "grace@example.test" }],
		},
		context: exampleContext,
		beforeUpdate(event) {
			type _values = Expect<
				Equal<typeof event.nextValues, Readonly<ExampleInput>>
			>
			type _context = Expect<
				Equal<typeof event.context, Readonly<ExampleContext>>
			>
			return [{ type: "set", path: "profile.first", value: "Ada" }]
		},
	})

	type _form = Expect<
		Equal<typeof form, FormInstance<ExampleSchema, ExampleContext>>
	>

	const boundExternalForm = useForm(externalForm, externalRuntimeOptions)
	type _externalForm = Expect<
		Equal<typeof boundExternalForm, FormInstance<ExampleSchema, ExampleContext>>
	>

	externalForm.replaceContext({
		locked: true,
	})
	externalForm.replaceOptions({
		beforeUpdate(event) {
			type _context = Expect<
				Equal<typeof event.context, Readonly<ExampleContext>>
			>
		},
		onSubmit({ form: submittedForm, value }) {
			type _value = Expect<Equal<typeof value, ExampleInput>>
			type _form = Expect<
				Equal<typeof submittedForm, FormInstance<ExampleSchema, ExampleContext>>
			>
		},
	})

	externalForm.replaceOptions({
		// @ts-expect-error context is replaced through replaceContext
		context: exampleContext,
	})

	// @ts-expect-error an existing instance already owns defaultValues
	useForm(externalForm, {
		defaultValues: {
			kind: "person",
			profile: {
				first: "Grace",
				last: "Hopper",
			},
			contacts: [],
		},
	})

	const first = useValue(form, "profile.first")
	type _valueInference = Expect<Equal<typeof first, string>>

	const field = useField(form, "profile.middle")
	type _fieldInference = Expect<
		Equal<typeof field, FieldBinding<string | undefined>>
	>

	field.setValue("Amazing")
	field.setValue(undefined)

	// @ts-expect-error field setter requires the selected path value
	field.setValue(42)

	const contacts = useArrayField(form, "contacts")
	type _arrayInference = Expect<
		Equal<
			typeof contacts,
			ArrayBinding<{
				value: string
				note?: string
			}>
		>
	>

	contacts.append({ value: "ada@example.test" })
	contacts.insert(0, { value: "ada@example.test", note: "work" })

	// @ts-expect-error array item commands require the selected item type
	contacts.append({ note: "missing value" })

	const selected = useFormState(form, (state) => state.values.kind)
	type _selectorInference = Expect<Equal<typeof selected, "person" | "company">>

	useFormState(
		form,
		(state) => ({
			dirty: state.isDirty,
		}),
		{
			equalityFn: (previous, next) => previous.dirty === next.dirty,
		},
	)

	useValue(form, "contacts.0.value", {
		equalityFn: (previous, next) =>
			previous.toLowerCase() === next.toLowerCase(),
	})

	const wrongStringEquality = (previous: number, next: number) =>
		previous === next

	useValue(form, "contacts.0.value", {
		// @ts-expect-error equality functions receive the selected value type
		equalityFn: wrongStringEquality,
	})

	// @ts-expect-error unknown paths are rejected
	useField(form, "profile.nickname")

	// @ts-expect-error array hooks accept array paths only
	useArrayField(form, "profile.first")

	// @ts-expect-error defaultValues is required
	useForm(definition, {
		context: {
			locked: false,
		},
	})

	useForm(definition, {
		defaultValues: {
			kind: "person",
			// @ts-expect-error defaultValues must include required nested properties
			profile: {
				first: "Grace",
			},
			contacts: [],
		},
		context: exampleContext,
	})

	useForm(definition, {
		defaultValues: {
			kind: "person",
			profile: {
				first: "Grace",
				last: "Hopper",
			},
			contacts: [],
		},
		context: {
			locked: false,
		},
	})

	return null
}

void TypeHarness
