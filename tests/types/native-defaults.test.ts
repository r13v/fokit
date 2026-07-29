import {
	type ControlName,
	type ControlOptionsOf,
	type ControlValueOf,
	createDefaultSlots,
	createFormKit,
	type DefaultArrayAddI18nData,
	type DefaultArrayItemI18nData,
	type DefaultSlotI18nValue,
	type DefaultSlotsI18n,
	defineControl,
	type FormKitSlots,
	type NativeDateOptions,
	type NativeFileOptions,
	type NativeNumberOptions,
	type NativeSelectOption,
	type NativeSelectOptions,
	type NativeTextareaOptions,
	type NativeTextOptions,
	type NativeTextType,
	nativeControls,
	type StandardSchema,
} from "../../src/index.js"

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false

type Expect<Condition extends true> = Condition

type NativeValues = {
	readonly name: string
	readonly bio?: string
	readonly age?: number
	readonly birthday?: string
	readonly status: "draft" | "published"
	readonly newsletter: boolean
	readonly avatar?: File
	readonly metadata: {
		readonly id: string
	}
}

type NativeSchema = StandardSchema<NativeValues>

declare const schema: NativeSchema

const defaultSlots = createDefaultSlots({
	i18n: {
		arrayAdd({ label }) {
			return label === undefined ? "Add item" : `Add ${String(label)}`
		},
		arrayRemove: "Remove item",
		arrayMoveUp({ index, position }) {
			return `Move index ${index} at position ${position} up`
		},
		arrayMoveDown: "Move down",
	},
})

type _defaultSlotsAreComplete = Expect<Equal<typeof defaultSlots, FormKitSlots>>

const itemMessage: DefaultSlotI18nValue<DefaultArrayItemI18nData> = ({
	position,
}) => `Item ${position}`

const partialI18n = {
	arrayAdd({ label }: DefaultArrayAddI18nData) {
		return label === undefined ? "Add" : `Add ${String(label)}`
	},
	arrayRemove: itemMessage,
} satisfies Partial<DefaultSlotsI18n>

const nativeKit = createFormKit({
	controls: nativeControls,
})

type NativeControlName = ControlName<typeof nativeKit.controls>

type _nativeControlNames = Expect<
	Equal<
		NativeControlName,
		"text" | "textarea" | "select" | "checkbox" | "number" | "date" | "file"
	>
>

type _textValue = Expect<
	Equal<ControlValueOf<typeof nativeControls.text>, string | undefined>
>
type _textareaValue = Expect<
	Equal<ControlValueOf<typeof nativeControls.textarea>, string | undefined>
>
type _selectValue = Expect<
	Equal<ControlValueOf<typeof nativeControls.select>, string>
>
type _checkboxValue = Expect<
	Equal<ControlValueOf<typeof nativeControls.checkbox>, boolean>
>
type _numberValue = Expect<
	Equal<ControlValueOf<typeof nativeControls.number>, number | undefined>
>
type _dateValue = Expect<
	Equal<ControlValueOf<typeof nativeControls.date>, string | undefined>
>
type _fileValue = Expect<
	Equal<ControlValueOf<typeof nativeControls.file>, File | undefined>
>

type _textOptions = Expect<
	Equal<ControlOptionsOf<typeof nativeControls.text>, NativeTextOptions>
>
type _textareaOptions = Expect<
	Equal<ControlOptionsOf<typeof nativeControls.textarea>, NativeTextareaOptions>
>
type _selectOptions = Expect<
	Equal<ControlOptionsOf<typeof nativeControls.select>, NativeSelectOptions>
>
type _numberOptions = Expect<
	Equal<ControlOptionsOf<typeof nativeControls.number>, NativeNumberOptions>
>
type _dateOptions = Expect<
	Equal<ControlOptionsOf<typeof nativeControls.date>, NativeDateOptions>
>
type _fileOptions = Expect<
	Equal<ControlOptionsOf<typeof nativeControls.file>, NativeFileOptions>
>

const nativeDefinition = nativeKit.defineForm({
	schema,
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			options: {
				type: "email",
				placeholder: "ada@example.test",
				autoComplete: "email",
			},
		},
		{
			kind: "field",
			path: "bio",
			control: "textarea",
			options: {
				placeholder: "Bio",
				autoComplete: "off",
				rows: 4,
			},
		},
		{
			kind: "field",
			path: "age",
			control: "number",
			options: {
				min: 0,
				max: 120,
				step: "any",
				placeholder: "Age",
			},
		},
		{
			kind: "field",
			path: "birthday",
			control: "date",
			options: {
				min: "1900-01-01",
				max: "2100-12-31",
			},
		},
		{
			kind: "field",
			path: "status",
			control: "select",
			options: {
				options: [
					{ value: "draft", label: "Draft" },
					{ value: "published", label: "Published", disabled: true },
				],
			},
		},
		{
			kind: "field",
			path: "newsletter",
			control: "checkbox",
		},
		{
			kind: "field",
			path: "avatar",
			control: "file",
			options: {
				accept: "image/png",
			},
		},
	],
})

nativeKit.defineForm({
	schema,
	ui: [
		{
			kind: "field",
			path: "newsletter",
			// @ts-expect-error string controls are incompatible with boolean paths
			control: "text",
		},
	],
})

nativeKit.defineForm({
	schema,
	ui: [
		{
			kind: "field",
			path: "name",
			// @ts-expect-error number controls are incompatible with string paths
			control: "number",
		},
	],
})

nativeKit.defineForm({
	schema,
	ui: [
		{
			kind: "field",
			path: "name",
			// @ts-expect-error file controls are incompatible with string paths
			control: "file",
		},
	],
})

const money = defineControl<number | undefined, { readonly currency: "USD" }>({
	component() {
		return null
	},
	formData: {
		mode: "hidden",
		serialize(value, { name }) {
			return value === undefined ? [] : [{ name, value: String(value) }]
		},
	},
})

const mixedKit = createFormKit({
	controls: {
		...nativeControls,
		money,
	},
})

type _mixedControlNames = Expect<
	Equal<ControlName<typeof mixedKit.controls>, NativeControlName | "money">
>

type _moneyOptions = Expect<
	Equal<
		ControlOptionsOf<typeof mixedKit.controls.money>,
		{ readonly currency: "USD" }
	>
>

const mixedDefinition = mixedKit.defineForm({
	schema,
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
			path: "age",
			control: "money",
			options: {
				currency: "USD",
			},
		},
	],
})

mixedKit.defineForm({
	schema,
	ui: [
		{
			kind: "field",
			path: "age",
			control: "money",
			options: {
				// @ts-expect-error custom control options keep their literal values
				currency: "EUR",
			},
		},
	],
})

type _nativeTextType = Expect<
	Equal<
		NativeTextType,
		"text" | "email" | "password" | "search" | "tel" | "url"
	>
>

const searchType: NativeTextType = "search"

// @ts-expect-error hidden inputs are not text-like visible controls
const hiddenTextType: NativeTextType = "hidden"
// @ts-expect-error checkboxes are not text-like controls
const checkboxTextType: NativeTextType = "checkbox"
// @ts-expect-error file inputs use the dedicated file control
const fileTextType: NativeTextType = "file"
// @ts-expect-error numbers use the dedicated number control
const numberTextType: NativeTextType = "number"
// @ts-expect-error dates use the dedicated date control
const dateTextType: NativeTextType = "date"
// @ts-expect-error buttons are not value controls
const buttonTextType: NativeTextType = "button"

const selectOptions = {
	options: [
		{ value: "draft", label: "Draft" },
		{ value: "published", label: "Published", disabled: true },
	],
} satisfies NativeSelectOptions<NativeValues["status"]>

const selectOption = {
	value: "draft",
	label: "Draft",
} satisfies NativeSelectOption<"draft">

const badSelectOptions = {
	options: [
		{
			// @ts-expect-error native select option values must be strings
			value: 1,
			label: "One",
		},
	],
} satisfies NativeSelectOptions

type CoreExports = typeof import("../../src/core/index.js")
type ServerExports = typeof import("../../src/server/index.js")

// @ts-expect-error React defaults must stay out of the core entry
type _noCoreDefaultSlots = CoreExports["createDefaultSlots"]
// @ts-expect-error native React controls must stay out of the core entry
type _noCoreNativeControls = CoreExports["nativeControls"]
// @ts-expect-error React defaults must stay out of the server entry
type _noServerDefaultSlots = ServerExports["createDefaultSlots"]
// @ts-expect-error native React controls must stay out of the server entry
type _noServerNativeControls = ServerExports["nativeControls"]

void defaultSlots
void partialI18n
void nativeDefinition
void mixedDefinition
void searchType
void hiddenTextType
void checkboxTextType
void fileTextType
void numberTextType
void dateTextType
void buttonTextType
void selectOptions
void selectOption
void badSelectOptions
