import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { FormMiddleware } from "../../src/core/index.js"
import { createFormStore } from "../../src/core/index.js"
import { createDefaultSlots } from "../../src/default-slots/index.js"
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
type _noGlobalUseCreateForm = Expect<
	Equal<"useCreateForm" extends keyof typeof RootPublic ? true : false, false>
>
type _noGlobalUseBindForm = Expect<
	Equal<"useBindForm" extends keyof typeof RootPublic ? true : false, false>
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
const slots = createDefaultSlots()
const kit = createFormKit({ controls: { text, kind }, slots })
const siblingKit = createFormKit({ controls: { text, kind }, slots })
const incompatibleKit = createFormKit({ controls: { text }, slots })
const extendedKit = kit.extend({ controls: { extra: text } })
const contextualKit = kit.forContext<ExampleContext>()
contextualKit.forContext<ExampleContext & { readonly actor: string }>()
// @ts-expect-error a contextual kit can refine, but not weaken, its contract
contextualKit.forContext<object>()
const contextualExtendedKit = contextualKit.extend({
	controls: { contextualExtra: text },
})
createFormKit({
	controls: { text, kind },
	slots,
	// @ts-expect-error middleware belongs to each kit.createForm call
	middleware: [],
})
// @ts-expect-error middleware is not kit extension configuration
kit.extend({
	controls: { extra: text },
	middleware: [],
})
const definition = kit.forContext<ExampleContext>().defineForm(schema, {
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
// @ts-expect-error defineForm now receives schema and definition together
kit.defineForm(schema)

const contextFreeDefinition = kit.defineForm(schema, { ui: [] })
contextualExtendedKit.defineForm(schema, {
	ui: [
		{
			kind: "section",
			id: "contextual-section",
			disabled: (_values, { context }) => {
				type _extendedContext = Expect<
					Equal<typeof context, Readonly<ExampleContext>>
				>
				return context.locked
			},
			children: [],
		},
	],
})
const extendedDefinition = extendedKit
	.forContext<ExampleContext>()
	.defineForm(schema, {
		ui: [{ kind: "field", path: "profile.first", control: "extra" }],
	})
kit.defineForm(schema, {
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
type RichContext = ExampleContext & { readonly actor: string }
const richDefinition = kit
	.forContext<RichContext>()
	.defineForm(schema, { ui: [] })
const _baseDefinitionCanUseRichContext: typeof richDefinition = definition
// @ts-expect-error a rich definition cannot weaken its context requirement
const _richDefinitionCannotUseBaseContext: typeof definition = richDefinition

// @ts-expect-error extending a contextual kit preserves its required context
contextualExtendedKit.createForm(contextFreeDefinition, {
	defaultValues: defaults,
})

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

// @ts-expect-error a contextual definition requires context at creation
kit.createForm(definition, { defaultValues: defaults })

kit.createForm(definition, {
	defaultValues: defaults,
	// @ts-expect-error runtime context must satisfy the definition contract
	context: {},
})

const richForm = kit.createForm(definition, {
	defaultValues: defaults,
	context: { locked: false, actor: "Ada" },
})
type _richContext = Expect<
	Equal<ReturnType<typeof richForm.getSnapshot>["context"]["actor"], string>
>
type _richContextRequirement = Expect<
	ReturnType<typeof richForm.getSnapshot>["context"] extends ExampleContext
		? true
		: false
>
extendedKit.createForm(definition, {
	defaultValues: defaults,
	context: exampleContext,
})
// @ts-expect-error a base kit cannot create a form from an extended-kit definition
kit.createForm(extendedDefinition, {
	defaultValues: defaults,
	context: exampleContext,
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
	const created = kit.useCreateForm(definition, {
		defaultValues: defaults,
		context: exampleContext,
		middleware: [middleware],
	})
	type _createdForm = Expect<Equal<typeof created, typeof form>>
	extendedKit.useCreateForm(definition, {
		defaultValues: defaults,
		context: exampleContext,
	})
	// @ts-expect-error a base kit cannot create a form from an extended-kit definition
	kit.useCreateForm(extendedDefinition, {
		defaultValues: defaults,
		context: exampleContext,
	})
	kit.useCreateForm(definition, {
		defaultValues: defaults,
		context: exampleContext,
		// @ts-expect-error middleware input must match the form schema input
		middleware: [wrongMiddleware],
	})

	const bound = kit.useBindForm(form, runtimeOptions)
	type _sameForm = Expect<Equal<typeof bound, typeof form>>
	// @ts-expect-error binding a contextual form requires context
	kit.useBindForm(form, {})

	kit.Form({ form })
	kit.AutoForm({ form, context: exampleContext })
	// @ts-expect-error AutoForm binds the form lifecycle and requires context
	kit.AutoForm({ form })

	// @ts-expect-error a kit with an incompatible control snapshot cannot bind this form
	incompatibleKit.useBindForm(form, runtimeOptions)
	// Structurally equal sibling kits are rejected by the runtime identity check.
	siblingKit.useBindForm(form, runtimeOptions)
	// @ts-expect-error kit.useForm was removed without an alias
	kit.useForm(form, runtimeOptions)

	const first = useValue(form, "profile.first")
	type _value = Expect<Equal<typeof first, string>>
	// @ts-expect-error value paths must exist in the schema input
	useValue(form, "profile.unknown")
	useValue(form, "profile.first", {
		// @ts-expect-error equality callbacks receive the selected path value
		equalityFn: (left: number, right: number) => left === right,
	})
	const middle = useField(form, "profile.middle")
	// @ts-expect-error field paths must exist in the schema input
	useField(form, "missing")
	middle.setValue(undefined)
	// @ts-expect-error field values remain path typed
	middle.setValue(42)

	const contacts = useArrayField(form, "contacts")
	// @ts-expect-error array hooks accept only array-valued paths
	useArrayField(form, "profile.first")
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
const contextualStore = createFormStore({
	definition,
	defaultValues: defaults,
	context: exampleContext,
})
// @ts-expect-error a store preserves the definition's lifecycle context contract
createFormStore({
	definition: contextualStore.definition,
	defaultValues: defaults,
})
// @ts-expect-error core creation enforces the definition's context contract
createFormStore({ definition, defaultValues: defaults })
createFormStore({
	definition,
	defaultValues: defaults,
	// @ts-expect-error core context must satisfy the definition contract
	context: {},
})
createFormStore({
	definition,
	defaultValues: defaults,
	context: exampleContext,
	// @ts-expect-error the React-free store does not configure middleware
	middleware: [],
})
