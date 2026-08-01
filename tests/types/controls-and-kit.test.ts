import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { ReactElement } from "react"

import {
	type ArrayItemSlotProps,
	type ArraySlotProps,
	type ControlDefinitionRegistry,
	type ControlProps,
	createFormKit,
	defineControl,
	type ErrorMessageSlotProps,
	type FieldSlotProps,
	type FormKitSlots,
	type FormPleaseCssVariable,
	type FormPleaseStyle,
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

type RichFieldOptions = {
	readonly tone?: "quiet" | "strong"
	readonly labelTooltip?: string
}
type RichSectionOptions = {
	readonly headingLevel?: 2 | 3
}
type RichArrayOptions = {
	readonly emptyText?: string
}

const RichField = (_props: FieldSlotProps<RichFieldOptions>) => null
const RichSection = (_props: SectionSlotProps<RichSectionOptions>) => null
const RichArray = (_props: ArraySlotProps<RichArrayOptions>) => null
const richKit = createFormKit({
	controls: {
		text,
	},
	slots: {
		Field: RichField,
		Section: RichSection,
		Array: RichArray,
	},
})

type _richSlotsResolve = Expect<
	Equal<
		typeof richKit.slots,
		FormKitSlots<RichFieldOptions, RichSectionOptions, RichArrayOptions>
	>
>

declare const richContent: ReactElement

const richDefinition = richKit.defineForm(schema)({
	ui: [
		{
			kind: "section",
			id: "profile",
			title: richContent,
			description: () => richContent,
			slotOptions: {
				headingLevel: 3,
			},
			children: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: richContent,
					description: () => richContent,
					slotOptions: ({ name }) => ({
						labelTooltip: name,
						tone: "quiet",
					}),
				},
			],
		},
	],
})

richKit.defineForm(schema)({
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			slotOptions: {
				// @ts-expect-error slot options come from the registered Field slot
				unknownOption: true,
			},
		},
	],
})

richKit.defineForm(schema)({
	ui: [
		{
			kind: "section",
			id: "profile",
			slotOptions: {
				// @ts-expect-error section options are independent from field options
				labelTooltip: "Help",
			},
			children: [],
		},
	],
})

const coreUiWithRichContent = [
	{
		kind: "field",
		path: "name",
		control: "text",
		// @ts-expect-error core UI content remains string-only
		label: richContent,
	},
] satisfies readonly UiNode<ExampleInput, typeof kit.controls>[]

void coreUiWithRichContent
void richDefinition

type BaseFieldOptions = {
	readonly tone?: "quiet" | "strong"
}
type ExtendedFieldOptions = BaseFieldOptions & {
	readonly labelTooltip?: string
}
type BaseSectionOptions = {
	readonly density?: "comfortable" | "compact"
}
type ExtendedSectionOptions = BaseSectionOptions & {
	readonly legendTooltip?: string
}
type BaseArrayOptions = {
	readonly controls?: "inline" | "stacked"
}
type ExtendedArrayOptions = BaseArrayOptions & {
	readonly addHint?: string
}

const BaseField = (_props: FieldSlotProps<BaseFieldOptions>) => null
const ExtendedField = (_props: FieldSlotProps<ExtendedFieldOptions>) => null
const BaseSection = (_props: SectionSlotProps<BaseSectionOptions>) => null
const ExtendedSection = (_props: SectionSlotProps<ExtendedSectionOptions>) =>
	null
const BaseArray = (_props: ArraySlotProps<BaseArrayOptions>) => null
const ExtendedArray = (_props: ArraySlotProps<ExtendedArrayOptions>) => null
const RequiredTooltipField = (
	_props: FieldSlotProps<
		BaseFieldOptions & {
			readonly labelTooltip: string
		}
	>,
) => null
const SiblingField = (
	_props: FieldSlotProps<
		BaseFieldOptions & { readonly leadingIcon?: ReactElement }
	>,
) => null
const basePresentationKit = createFormKit({
	controls: {
		text,
	},
	slots: {
		Field: BaseField,
		Section: BaseSection,
		Array: BaseArray,
	},
})
const extendedPresentationKit = basePresentationKit.extend({
	slots: {
		Field: ExtendedField,
		Section: ExtendedSection,
		Array: ExtendedArray,
	},
})
const _siblingPresentationKit = basePresentationKit.extend({
	slots: {
		Field: SiblingField,
	},
})
const broadPresentationKit = basePresentationKit.extend({
	slots: {
		Field: (_props: FieldSlotProps<unknown>) => null,
	},
})

type _extendedPresentationSlots = Expect<
	Equal<
		typeof extendedPresentationKit.slots,
		FormKitSlots<
			ExtendedFieldOptions,
			ExtendedSectionOptions,
			ExtendedArrayOptions
		>
	>
>

basePresentationKit.extend({
	slots: {
		// @ts-expect-error replacement slots may only add optional capabilities
		Field: RequiredTooltipField,
	},
})

const basePresentationDefinition = basePresentationKit.defineForm(schema)({
	ui: [
		{
			kind: "section",
			id: "profile",
			slotOptions: {
				density: "compact",
			},
			children: [
				{
					kind: "field",
					path: "name",
					control: "text",
					slotOptions: {
						tone: "quiet",
					},
				},
			],
		},
	],
})
const extendedPresentationDefinition = extendedPresentationKit.defineForm(
	schema,
)({
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			slotOptions: {
				tone: "strong",
				labelTooltip: "Legal name",
			},
		},
	],
})
const _extendedSectionPresentationDefinition =
	extendedPresentationKit.defineForm(schema)({
		ui: [
			{
				kind: "section",
				id: "profile",
				slotOptions: {
					density: "comfortable",
					legendTooltip: "Profile fields",
				},
				children: [
					{
						kind: "field",
						path: "name",
						control: "text",
						slotOptions: {
							tone: "strong",
						},
					},
				],
			},
		],
	})
const baseArrayPresentationDefinition = basePresentationKit.defineForm(
	listSchema,
)({
	ui: [
		{
			kind: "array",
			path: "items",
			slotOptions: {
				controls: "inline",
			},
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
	],
})
const _extendedArrayPresentationDefinition = extendedPresentationKit.defineForm(
	listSchema,
)({
	ui: [
		{
			kind: "array",
			path: "items",
			slotOptions: {
				controls: "stacked",
				addHint: "Add another item",
			},
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
	],
})
declare const presentationDefaultValues: ExampleInput
declare const listPresentationDefaultValues: ListInput

const basePresentationForm = basePresentationKit.createForm(
	basePresentationDefinition,
	{
		defaultValues: presentationDefaultValues,
	},
)
const extendedPresentationForm = extendedPresentationKit.createForm(
	extendedPresentationDefinition,
	{ defaultValues: presentationDefaultValues },
)
const extendedBasePresentationForm = extendedPresentationKit.createForm(
	basePresentationDefinition,
	{ defaultValues: presentationDefaultValues },
)
const broadPresentationForm = broadPresentationKit.createForm(
	basePresentationDefinition,
	{ defaultValues: presentationDefaultValues },
)
const extendedArrayPresentationForm = extendedPresentationKit.createForm(
	baseArrayPresentationDefinition,
	{ defaultValues: listPresentationDefaultValues },
)

extendedPresentationKit.AutoForm({ form: extendedBasePresentationForm })
broadPresentationKit.AutoForm({ form: broadPresentationForm })
extendedPresentationKit.AutoForm({ form: extendedArrayPresentationForm })

extendedPresentationKit.Form({
	// Structurally compatible kit types still receive an exact runtime identity check.
	form: basePresentationForm,
})
basePresentationKit.Form({
	// @ts-expect-error a base kit cannot render an extension-owned form
	form: extendedPresentationForm,
})
ActionForm({
	kit: extendedPresentationKit,
	definition: basePresentationDefinition,
	defaultValues: presentationDefaultValues,
	action: (_formData: FormData) => undefined,
})
ActionForm({
	kit: basePresentationKit,
	// @ts-expect-error ActionForm keeps structural slot capabilities
	definition: extendedPresentationDefinition,
	defaultValues: presentationDefaultValues,
	action: (_formData: FormData) => undefined,
})

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
const _siblingKit = kit.extend({
	controls: {
		siblingText: text,
	},
})
const _compatibleSiblingKit = kit.extend({
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

const extendedBaseForm = extendedKit.createForm(exampleDefinition, {
	defaultValues: exampleDefaultValues,
	context: { locale: "en", locked: false },
})
extendedKit.AutoForm({
	form: extendedBaseForm,
	context: { locale: "en", locked: false },
})

ActionForm({
	kit: extendedKit,
	definition: extendedDefinition,
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

const baseForm = kit.createForm(exampleDefinition, {
	defaultValues: exampleDefaultValues,
	context: {
		locale: "en",
		locked: false,
	},
})
const extendedForm = extendedKit.createForm(extendedDefinition, {
	defaultValues: exampleDefaultValues,
	context: {
		locale: "en",
		locked: false,
	},
})

extendedKit.Form({
	// @ts-expect-error exact base and extended kit ownership differs
	form: baseForm,
})
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

const completeBaseForm = kit.createForm(exampleDefinition, {
	defaultValues: {
		name: "Ada",
		status: "draft",
		age: 37,
		maybeNull: null,
		profile: {
			country: "GB",
		},
	},
	context: { locale: "en", locked: false },
})
kit.AutoForm({
	form: completeBaseForm,
	context: { locale: "en", locked: false },
})

kit.createForm(exampleDefinition, {
	// @ts-expect-error kit.createForm defaultValues must include required schema properties
	defaultValues: {
		name: "Ada",
		status: "draft",
		age: 37,
	},
	context: { locale: "en", locked: false },
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
		FormPleaseCssVariable,
		| "--fp-column-gap"
		| "--fp-row-gap"
		| "--fp-stack-gap"
		| "--fp-array-item-gap"
	>
>

const style: FormPleaseStyle = {
	"--fp-column-gap": "1rem",
	color: "CanvasText",
}

const rootProps = {
	"data-fp-node": "field",
	className: "field",
	style,
} satisfies StructuralRootProps

void rootProps
void staticCallableOptions
void derivedCallableOptions
