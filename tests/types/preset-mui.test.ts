import type {
	ControlName,
	ControlOptionsOf,
	ControlValueOf,
} from "../../src/index.js"
import { createMuiFormKit } from "../../src/preset-mui/index.js"

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false

type Expect<Condition extends true> = Condition

const kit = createMuiFormKit({
	i18n: {
		addItem: "Add",
		chooseFile: "Choose",
		moveItemDown: (position) => `Down ${position}`,
		moveItemUp: (position) => `Up ${position}`,
		removeItem: (position) => `Remove ${position}`,
	},
})

type _muiPresetControlNames = Expect<
	Equal<
		ControlName<typeof kit.controls>,
		| "autocomplete"
		| "autocomplete-multiple"
		| "checkbox"
		| "date"
		| "datetime-local"
		| "email"
		| "file"
		| "files"
		| "number"
		| "password"
		| "radio"
		| "range-slider"
		| "search"
		| "select"
		| "select-multiple"
		| "slider"
		| "switch"
		| "tel"
		| "text"
		| "textarea"
		| "time"
		| "url"
	>
>

type _autocompleteValue = Expect<
	Equal<
		ControlValueOf<(typeof kit.controls)["autocomplete"]>,
		string | undefined
	>
>
type _autocompleteMultipleValue = Expect<
	Equal<
		ControlValueOf<(typeof kit.controls)["autocomplete-multiple"]>,
		readonly string[]
	>
>
type _rangeSliderValue = Expect<
	Equal<
		ControlValueOf<(typeof kit.controls)["range-slider"]>,
		readonly number[]
	>
>
type _filesValue = Expect<
	Equal<ControlValueOf<(typeof kit.controls)["files"]>, readonly File[]>
>

const textOptions = {
	color: "secondary",
	fullWidth: true,
	slotProps: { htmlInput: { inputMode: "text" } },
	sx: { maxWidth: 480 },
} satisfies ControlOptionsOf<(typeof kit.controls)["text"]>

const radioOptions = {
	choices: [
		{
			label: "Remote",
			labelProps: { sx: { gap: 1 } },
			radioProps: { color: "secondary", sx: { p: 1 } },
			value: "remote",
		},
	],
	sx: { gap: 1 },
} satisfies ControlOptionsOf<(typeof kit.controls)["radio"]>

const autocompleteOptions = {
	freeSolo: true,
	options: ["react", "typescript"],
	renderOption: (_props, option) => option,
	sx: { maxWidth: 640 },
	textFieldProps: { placeholder: "Search", sx: { minWidth: 240 } },
} satisfies ControlOptionsOf<(typeof kit.controls)["autocomplete"]>

const fileOptions = {
	buttonProps: { color: "secondary", variant: "contained" },
	inputProps: { accept: ".pdf" },
	sx: { mt: 1 },
} satisfies ControlOptionsOf<(typeof kit.controls)["file"]>

type RootExports = typeof import("../../src/index.js")
type MuiExports = typeof import("../../src/preset-mui/index.js")

// @ts-expect-error the MUI preset must stay out of the headless root entry
type _noRootMuiPreset = RootExports["createMuiFormKit"]

// @ts-expect-error the public MUI entry creates configured kits instead of exporting a singleton
type _noMuiSingleton = MuiExports["muiFormKit"]

// @ts-expect-error low-level MUI registry factories are not public API
type _noPublicMuiControlsFactory = MuiExports["createMuiControls"]

void autocompleteOptions
void fileOptions
void radioOptions
void textOptions
