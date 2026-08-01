import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { FormMiddleware } from "../../src/core/index.js"
import { createFormStore } from "../../src/core/index.js"
import type * as RootPublic from "../../src/index.js"
import {
	createFormKit,
	defineControl,
	extendValueChanges,
	type FormInput,
	type FormRuntimeOptions,
	useArrayField,
	useField,
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
type _noGlobalCreateForm = Expect<
	Equal<"createForm" extends keyof typeof RootPublic ? true : false, false>
>
type _noGlobalUseForm = Expect<
	Equal<"useForm" extends keyof typeof RootPublic ? true : false, false>
>
type _noGlobalKitForm = Expect<
	Equal<"KitForm" extends keyof typeof RootPublic ? true : false, false>
>
type _noGlobalSubmit = Expect<
	Equal<"Submit" extends keyof typeof RootPublic ? true : false, false>
>
type _noGlobalCreateFormStore = Expect<
	Equal<"createFormStore" extends keyof typeof RootPublic ? true : false, false>
>
// @ts-expect-error UseFormOptions was removed without an alias
type _removedUseFormOptions = RootPublic.UseFormOptions

type ExampleInput = {
	kind: "person" | "company"
	profile: { first: string; last: string; middle?: string }
	contacts: readonly { value: string; note?: string }[]
}
type ExampleContext = { readonly locked: boolean }
type ExampleSchema = StandardSchemaV1<ExampleInput>

declare const schema: ExampleSchema
const text = defineControl<string | undefined>({
	component: () => null,
	formData: { mode: "native" },
})
const kind = defineControl<ExampleInput["kind"]>({
	component: () => null,
	formData: { mode: "native" },
})
const kit = createFormKit({ controls: { text, kind } })
const siblingKit = createFormKit({ controls: { text, kind } })
const incompatibleKit = createFormKit({ controls: { text } })
createFormKit({
	controls: { text, kind },
	// @ts-expect-error middleware belongs to each kit.createForm call
	middleware: [],
})
// @ts-expect-error middleware is not kit extension configuration
kit.extend({
	controls: { extra: text },
	middleware: [],
})
const definition = kit.defineForm(schema).withContext<ExampleContext>({
	ui: [
		{ kind: "field", path: "kind", control: "kind" },
		{ kind: "field", path: "profile.first", control: "text" },
		{
			kind: "array",
			path: "contacts",
			itemDefault: { value: "" },
			children: [{ kind: "field", path: "value", control: "text" }],
		},
	],
})
kit.defineForm(schema)({
	ui: [],
	// @ts-expect-error normalized definitions do not retain middleware
	middleware: [],
})
const exampleContext: ExampleContext = { locked: false }
const defaults: ExampleInput = {
	kind: "person",
	profile: { first: "Grace", last: "Hopper" },
	contacts: [],
}

const middleware: FormMiddleware<ExampleInput, ExampleContext> =
	() => (next) => (transaction) =>
		next(transaction)
const wrongMiddleware: FormMiddleware<{ count: number }, ExampleContext> =
	() => (next) => (transaction) =>
		next(transaction)

const form = kit.createForm(definition, {
	defaultValues: defaults,
	context: exampleContext,
	middleware: [middleware],
	beforeUpdate(event) {
		type _values = Expect<
			Equal<typeof event.nextValues, Readonly<ExampleInput>>
		>
		type _context = Expect<
			Equal<typeof event.context, Readonly<ExampleContext>>
		>
		return extendValueChanges(event, [
			{ type: "set", path: "profile.first", value: "Ada" },
		])
	},
})

type _input = Expect<Equal<FormInput<ExampleSchema>, ExampleInput>>
type _values = Expect<Equal<ReturnType<typeof form.getValues>, ExampleInput>>

kit.createForm(definition, {
	defaultValues: defaults,
	context: exampleContext,
	// @ts-expect-error middleware input must match the form schema input
	middleware: [wrongMiddleware],
})

const runtimeOptions = {
	context: exampleContext,
	disabled: false,
} satisfies FormRuntimeOptions<ExampleSchema, ExampleContext>

function TypeHarness() {
	const bound = kit.useForm(form, runtimeOptions)
	type _sameForm = Expect<Equal<typeof bound, typeof form>>

	kit.Form({ form })
	kit.AutoForm({ form, context: exampleContext })

	// @ts-expect-error a kit with an incompatible control snapshot cannot bind this form
	incompatibleKit.useForm(form, runtimeOptions)
	// Structurally equal sibling kits are rejected by the runtime identity check.
	siblingKit.useForm(form, runtimeOptions)

	const first = useValue(form, "profile.first")
	type _value = Expect<Equal<typeof first, string>>
	const middle = useField(form, "profile.middle")
	middle.setValue(undefined)
	// @ts-expect-error field values remain path typed
	middle.setValue(42)

	const contacts = useArrayField(form, "contacts")
	contacts.append({ value: "ada@example.test" })
	// @ts-expect-error array items require value
	contacts.append({ note: "missing" })

	const selected = useFormState(form, (state) => state.values.kind)
	type _selected = Expect<Equal<typeof selected, "person" | "company">>
	return null
}

void TypeHarness

// Core construction remains available only from form-please/core.
createFormStore({
	definition,
	defaultValues: defaults,
	context: exampleContext,
})
createFormStore({
	definition,
	defaultValues: defaults,
	context: exampleContext,
	// @ts-expect-error the React-free store does not configure middleware
	middleware: [],
})
