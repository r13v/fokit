import type { StandardSchemaV1 } from "@standard-schema/spec"

import {
	type ArrayItemSlotProps,
	type ArraySlotProps,
	type ControlDefinitionRegistry,
	type ControlProps,
	createForm,
	createFormKit,
	defineControl,
	type ErrorMessageSlotProps,
	type FieldSlotProps,
	type FokitCssVariable,
	type FokitStyle,
	type FormKitSlots,
	type NormalizedArrayNode,
	type Resolvable,
	type ResolvedArrayNode,
	type SectionSlotProps,
	type StructuralRootProps,
	type UiNode,
} from "../../src/index.js"
import { ActionForm } from "../../src/react19/index.js"

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false

type Expect<Condition extends true> = Condition

type ExampleInput = {
	name: string
	status: "draft" | "published"
	age: number
	nickname?: string
	maybeNull: string | null
	profile: {
		country: string
	}
}

type ExampleContext = {
	readonly locale: string
	readonly locked: boolean
}

type ExampleSchema = StandardSchemaV1<ExampleInput>
type ListInput = {
	readonly items: readonly {
		readonly value: string
	}[]
}
type ListSchema = StandardSchemaV1<ListInput>

declare const schema: ExampleSchema
declare const listSchema: ListSchema

type CallableOptions = () => string

const staticCallableOptions: Resolvable<CallableOptions, ExampleInput> = () =>
	// @ts-expect-error a top-level function is a resolver and must return the callable value
	"callback"

const derivedCallableOptions: Resolvable<CallableOptions, ExampleInput> =
	() => () =>
		"callback"

const Field = (_props: FieldSlotProps) => null
const Section = (_props: SectionSlotProps) => null
const ArraySlotComponent = (_props: ArraySlotProps) => null
const ArrayItem = (_props: ArrayItemSlotProps) => null
const ErrorMessage = (_props: ErrorMessageSlotProps) => null

const slots = {
	Field,
	Section,
	Array: ArraySlotComponent,
	ArrayItem,
	ErrorMessage,
}

type TextOptions = {
	readonly placeholder?: string
}

const text = defineControl<string | undefined, TextOptions>({
	component(props) {
		type _props = Expect<
			Equal<typeof props, ControlProps<string | undefined, TextOptions>>
		>
		return null
	},
	formData: {
		mode: "native",
	},
})

const number = defineControl<number>({
	component(_props) {
		return null
	},
	formData: {
		mode: "hidden",
		serialize(value, { name }) {
			return [{ name, value: String(value) }]
		},
	},
})

const nullableText = defineControl<string | null>({
	component(_props) {
		return null
	},
	formData: {
		mode: "native",
	},
})

const localizedText = defineControl<
	string,
	{ readonly prefix: string },
	{ readonly locale: string }
>({
	component(props) {
		type _context = Expect<
			Equal<typeof props.context, Readonly<{ readonly locale: string }>>
		>
		return null
	},
	formData: {
		mode: "native",
	},
})

type UnsafeAny = typeof JSON.parse extends (...args: never[]) => infer Result
	? Result
	: never

// @ts-expect-error control values cannot be any
defineControl<UnsafeAny>({
	component(_props: ControlProps<string>) {
		return null
	},
	formData: {
		mode: "none",
	},
})

// @ts-expect-error control values cannot be unknown
defineControl<unknown>({
	component(_props: ControlProps<string>) {
		return null
	},
	formData: {
		mode: "none",
	},
})

const kit = createFormKit({
	controls: {
		text,
		number,
		nullableText,
		localizedText,
	},
	slots,
})

const omittedSlotsKit = createFormKit({
	controls: {
		text,
	},
})

type _omittedSlotsResolve = Expect<
	Equal<typeof omittedSlotsKit.slots, FormKitSlots>
>

const partialSlotsKit = createFormKit({
	controls: {
		text,
	},
	slots: {
		Field,
	},
})

type _partialSlotsResolve = Expect<
	Equal<typeof partialSlotsKit.slots, FormKitSlots>
>

type _customSlotsResolve = Expect<Equal<typeof kit.slots, FormKitSlots>>

const exampleDefinition = kit.defineForm(schema).withContext<ExampleContext>({
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			label: ({ "profile.country": country }) => {
				type _country = Expect<Equal<typeof country, string>>
				return country
			},
			disabled: (_values, { context }) => {
				type _context = Expect<Equal<typeof context, Readonly<ExampleContext>>>
				return context.locked
			},
			visible: ({ status }) => {
				type _status = Expect<Equal<typeof status, ExampleInput["status"]>>
				return status === "published"
			},
		},
		{
			kind: "field",
			path: "status",
			control: "text",
		},
		{
			kind: "field",
			path: "age",
			control: "number",
		},
		{
			kind: "field",
			path: "maybeNull",
			control: "nullableText",
		},
	],
})

const exampleDefaultValues: ExampleInput = {
	name: "Ada",
	status: "draft",
	age: 37,
	maybeNull: null,
	profile: {
		country: "GB",
	},
}

const extendedKit = kit.extend({
	controls: {
		extraText: text,
	},
	slots: {
		Field,
	},
})
const slotsOnlyKit = kit.extend({
	slots: {
		Field,
	},
})
const chainedKit = extendedKit.extend({
	controls: {
		secondaryText: text,
	},
})
const siblingKit = kit.extend({
	controls: {
		siblingText: text,
	},
})
const compatibleSiblingKit = kit.extend({
	controls: {
		extraText: text,
	},
})
const broadControls: ControlDefinitionRegistry = {
	text,
}
const broadKit = createFormKit({
	controls: broadControls,
})
const broadExtendedKit = broadKit.extend({
	controls: {
		extraText: text,
	},
})

type _extendedControlNames = Expect<
	Equal<
		keyof typeof extendedKit.controls,
		keyof typeof kit.controls | "extraText"
	>
>
type _slotsOnlyControls = Expect<
	Equal<typeof slotsOnlyKit.controls, typeof kit.controls>
>
type _chainedControlNames = Expect<
	Equal<
		keyof typeof chainedKit.controls,
		keyof typeof kit.controls | "extraText" | "secondaryText"
	>
>
type _coreUiNodeWithoutRender = Expect<
	Equal<
		Extract<
			UiNode<ListInput, typeof kit.controls>,
			{ readonly kind: "render" }
		>,
		never
	>
>
type _normalizedArrayWithoutRender = Expect<
	Equal<
		Extract<
			NormalizedArrayNode["children"][number],
			{ readonly kind: "render" }
		>,
		never
	>
>
type _resolvedArrayWithoutRender = Expect<
	Equal<
		Extract<ResolvedArrayNode["children"][number], { readonly kind: "render" }>,
		never
	>
>

void broadExtendedKit

// @ts-expect-error extensions must add controls instead of replacing them
kit.extend({ controls: { text } })

// @ts-expect-error an extension must provide controls or slots
kit.extend({})

const extendedDefinition = extendedKit
	.defineForm(schema)
	.withContext<ExampleContext>({
		ui: [
			{
				kind: "render",
				id: "name-preview",
				component: () => null,
			},
			{
				kind: "section",
				id: "account",
				children: [
					{
						kind: "render",
						id: "account-preview",
						component: () => null,
					},
					{
						kind: "field",
						path: "name",
						control: "extraText",
					},
				],
			},
		],
	})

extendedKit.defineForm(schema)({
	ui: [
		{
			kind: "render",
			id: "invalid-preview",
			// @ts-expect-error render components receive no props
			component: (_props: { value: string }) => null,
		},
	],
})

extendedKit.AutoForm({
	definition: exampleDefinition,
	defaultValues: exampleDefaultValues,
	context: {
		locale: "en",
		locked: false,
	},
})

kit.AutoForm({
	// @ts-expect-error a base kit cannot render a definition owned by its extension
	definition: extendedDefinition,
	defaultValues: exampleDefaultValues,
	context: {
		locale: "en",
		locked: false,
	},
})

siblingKit.AutoForm({
	// @ts-expect-error sibling extensions do not inherit each other's controls
	definition: extendedDefinition,
	defaultValues: exampleDefaultValues,
	context: {
		locale: "en",
		locked: false,
	},
})

// Sibling kits with the same complete registry contract are structurally compatible.
compatibleSiblingKit.AutoForm({
	definition: extendedDefinition,
	defaultValues: exampleDefaultValues,
	context: {
		locale: "en",
		locked: false,
	},
})

ActionForm({
	kit: extendedKit,
	definition: exampleDefinition,
	defaultValues: exampleDefaultValues,
	context: {
		locale: "en",
		locked: false,
	},
	action: (_formData: FormData) => undefined,
})

ActionForm({
	kit,
	// @ts-expect-error ActionForm keeps the selected kit's registry ownership
	definition: extendedDefinition,
	defaultValues: exampleDefaultValues,
	context: {
		locale: "en",
		locked: false,
	},
	action: (_formData: FormData) => undefined,
})

const baseForm = createForm(exampleDefinition, {
	defaultValues: exampleDefaultValues,
	context: {
		locale: "en",
		locked: false,
	},
})
const extendedForm = createForm(extendedDefinition, {
	defaultValues: exampleDefaultValues,
	context: {
		locale: "en",
		locked: false,
	},
})

extendedKit.Form({ form: baseForm })
kit.Form({
	// @ts-expect-error manual composition preserves the definition's kit ownership
	form: extendedForm,
})

extendedKit.defineForm(listSchema)({
	ui: [
		{
			kind: "array",
			path: "items",
			itemDefault: {
				value: "",
			},
			children: [
				{
					// @ts-expect-error render nodes are not available inside array rows
					kind: "render",
					id: "row-preview",
					component: () => null,
				},
			],
		},
	],
})

kit.AutoForm({
	definition: exampleDefinition,
	defaultValues: {
		name: "Ada",
		status: "draft",
		age: 37,
		maybeNull: null,
		profile: {
			country: "GB",
		},
	},
	context: {
		locale: "en",
		locked: false,
	},
})

kit.AutoForm({
	definition: exampleDefinition,
	// @ts-expect-error kit.AutoForm defaultValues must include required schema properties
	defaultValues: {
		name: "Ada",
		status: "draft",
		age: 37,
	},
	context: {
		locale: "en",
		locked: false,
	},
})

kit.defineForm(schema).withContext<ExampleContext>({
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			options: {
				placeholder: "Name",
			},
		},
		{
			kind: "field",
			path: "status",
			control: "text",
		},
		{
			kind: "field",
			path: "age",
			control: "number",
		},
		{
			kind: "field",
			path: "maybeNull",
			control: "nullableText",
		},
		{
			kind: "field",
			path: "name",
			control: "localizedText",
			options: {
				prefix: "en",
			},
		},
	],
})

kit.defineForm(schema)({
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			// @ts-expect-error visible resolvers must return booleans
			visible: () => "visible",
		},
	],
})

kit.defineForm(schema)({
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			// @ts-expect-error resolver values must use valid schema paths
			visible: ({ missing }) => Boolean(missing),
		},
	],
})

kit.defineForm(schema).withContext<ExampleContext>({
	ui: [
		{
			kind: "field",
			path: "name",
			// @ts-expect-error path value must be assignable to the selected control
			control: "number",
		},
	],
})

kit.defineForm(schema).withContext<ExampleContext>({
	ui: [
		{
			kind: "field",
			path: "maybeNull",
			// @ts-expect-error nullable paths require a control that accepts null
			control: "text",
		},
	],
})

kit.defineForm(schema)({
	ui: [
		{
			kind: "field",
			path: "name",
			// @ts-expect-error context-aware controls require a satisfying form context
			control: "localizedText",
		},
	],
})

kit.defineForm(schema).withContext<ExampleContext>({
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			options: {
				// @ts-expect-error options are specific to the selected control
				missing: true,
			},
		},
	],
})

type _cssVariable = Expect<
	Equal<
		FokitCssVariable,
		| "--fokit-column-gap"
		| "--fokit-row-gap"
		| "--fokit-stack-gap"
		| "--fokit-array-item-gap"
	>
>

const style: FokitStyle = {
	"--fokit-column-gap": "1rem",
	color: "CanvasText",
}

const rootProps = {
	"data-fokit-node": "field",
	className: "field",
	style,
} satisfies StructuralRootProps

void rootProps
void staticCallableOptions
void derivedCallableOptions
