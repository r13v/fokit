import type { StandardSchemaV1 } from "@standard-schema/spec"

import {
	createFormKit,
	defineControl,
	type FieldPath,
	type FormBinding,
	type FormKitSlots,
	type FormMiddleware,
	type FormUpdateRecipe,
	type PathValue,
	useSnapshot,
	type ValueTransaction,
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

const externalSnapshot = { count: 1, status: "ready" as const }
const externalStore = {
	getSnapshot: () => externalSnapshot,
	subscribe: (_listener: () => void) => () => undefined,
}

function useExternalSnapshot() {
	const snapshot = useSnapshot(externalStore)
	snapshot.count satisfies number
	snapshot.status satisfies "ready"
	// @ts-expect-error The snapshot type comes from the store getter.
	snapshot.missing
}

void useExternalSnapshot

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

const middleware: FormMiddleware<Input, Context> =
	(api) => (next) => (transaction) => {
		transaction.nextValues.profile.country satisfies string
		transaction.context.locale satisfies string
		transaction.patches[0]?.path satisfies readonly (string | number)[]
		api.getValues().speakers[0]?.name satisfies string | undefined
		// @ts-expect-error Transaction values are readonly middleware views.
		transaction.nextValues.profile.country = "FR"
		// @ts-expect-error Middleware context is deeply readonly.
		transaction.context.permissions.push("admin")
		return next(transaction.patches)
	}

const replaceName: FormUpdateRecipe<Input> = (draft): void => {
	draft.name = "Grace"
}

function useTypedBinding() {
	const form = kit.useForm(definition, {
		beforeUpdate(draft, transaction) {
			draft.profile.country = "FR"
			transaction.nextValues.profile.country satisfies string
			transaction.context.locale satisfies string
			// @ts-expect-error The original proposal remains readonly.
			transaction.nextValues.profile.country = "DE"
			if (transaction.source.type === "control") return false
		},
		afterUpdate(transaction) {
			transaction.nextValues.profile.country satisfies string
			transaction.context.permissions satisfies readonly string[]
			// @ts-expect-error The committed transaction remains readonly.
			transaction.context.permissions.push("admin")
		},
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
		middleware: [middleware],
	})
	form.api.subscribe satisfies object
	form.update(replaceName)
	const updateResult = form.update((draft) => {
		draft.profile.country = "FR"
	})
	updateResult satisfies unknown
	// @ts-expect-error Redux middleware may replace the terminal result.
	const transaction: ValueTransaction<Input, Context> = updateResult
	void transaction
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
