import type { StandardSchemaV1 } from "@standard-schema/spec"

import {
	type ArrayItemSlotProps,
	type ArraySlotProps,
	type ControlProps,
	createFormKit,
	defineControl,
	type ErrorMessageSlotProps,
	type FieldSlotProps,
	type FokitCssVariable,
	type FokitStyle,
	type FormKitSlots,
	type SectionSlotProps,
	type StructuralRootProps,
} from "../../src/index.js"

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
}

type ExampleContext = {
	readonly locale: string
	readonly locked: boolean
}

type ExampleSchema = StandardSchemaV1<ExampleInput>

declare const schema: ExampleSchema

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

const exampleDefinition = kit
	.defineForm(schema)
	.withContext<ExampleContext>((computed) => ({
		ui: [
			{
				kind: "field",
				path: "name",
				control: "text",
				disabled: computed([], (_values, { context }) => {
					type _context = Expect<
						Equal<typeof context, Readonly<ExampleContext>>
					>
					return context.locked
				}),
				visible: computed(["status"], ({ status }) => {
					type _status = Expect<Equal<typeof status, ExampleInput["status"]>>
					return status === "published"
				}),
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
	}))

kit.AutoForm({
	definition: exampleDefinition,
	defaultValues: {
		name: "Ada",
		status: "draft",
		age: 37,
		maybeNull: null,
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

// @ts-expect-error visible computed resolvers must return booleans
kit.defineForm(schema)((computed) => ({
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			visible: computed([], () => "visible"),
		},
	],
}))

kit.defineForm(schema)((computed) => ({
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			visible: computed(
				// @ts-expect-error computed dependencies must be valid schema paths
				["missing"],
				() => true,
			),
		},
	],
}))

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
