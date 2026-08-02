import type {
	AutocompleteProps,
	ButtonProps,
	CheckboxProps,
	FormControlLabelProps,
	RadioGroupProps,
	RadioProps,
	SelectProps,
	SliderProps,
	SwitchProps,
	TextFieldProps,
} from "@mui/material"
import type { SxProps, Theme } from "@mui/material/styles"
import type { ComponentPropsWithoutRef, ReactNode } from "react"

type DistributiveOmit<Value, Keys extends PropertyKey> = Value extends unknown
	? Omit<Value, Keys>
	: never

type NoAdditionalProps = Record<never, never>

type TextFieldOwnedProps =
	| "defaultValue"
	| "disabled"
	| "error"
	| "helperText"
	| "id"
	| "inputRef"
	| "label"
	| "multiline"
	| "name"
	| "required"
	| "type"
	| "value"

export type MuiTextFieldOptions = DistributiveOmit<
	TextFieldProps,
	TextFieldOwnedProps
>

export type MuiSelectChoice = {
	readonly value: string
	readonly label: ReactNode
	readonly disabled?: boolean
}

type SelectOwnedProps =
	| "defaultValue"
	| "disabled"
	| "error"
	| "id"
	| "label"
	| "labelId"
	| "multiple"
	| "name"
	| "readOnly"
	| "required"
	| "value"

export type MuiSelectOptions = DistributiveOmit<
	SelectProps<string>,
	SelectOwnedProps
> & {
	readonly choices?: readonly MuiSelectChoice[]
}

export type MuiSelectMultipleOptions = DistributiveOmit<
	SelectProps<readonly string[]>,
	SelectOwnedProps
> & {
	readonly choices?: readonly MuiSelectChoice[]
}

export type MuiRadioChoice = {
	readonly value: string
	readonly label: ReactNode
	readonly disabled?: boolean
	readonly radioProps?: Omit<
		RadioProps,
		"checked" | "disabled" | "id" | "inputRef" | "name" | "required" | "value"
	>
	readonly labelProps?: Omit<
		FormControlLabelProps,
		| "checked"
		| "control"
		| "disabled"
		| "inputRef"
		| "label"
		| "name"
		| "required"
		| "value"
	>
}

export type MuiRadioOptions = Omit<
	RadioGroupProps,
	"defaultValue" | "name" | "value"
> & {
	readonly choices?: readonly MuiRadioChoice[]
}

export type MuiCheckboxOptions = Omit<
	CheckboxProps,
	| "checked"
	| "defaultChecked"
	| "disabled"
	| "id"
	| "inputRef"
	| "name"
	| "readOnly"
	| "required"
	| "value"
>

export type MuiSwitchOptions = Omit<
	SwitchProps,
	| "checked"
	| "defaultChecked"
	| "disabled"
	| "id"
	| "inputRef"
	| "name"
	| "readOnly"
	| "required"
	| "value"
>

type AutocompleteOwnedProps =
	| "defaultValue"
	| "disabled"
	| "id"
	| "multiple"
	| "readOnly"
	| "renderInput"
	| "value"

export type MuiAutocompleteTextFieldProps = DistributiveOmit<
	TextFieldProps,
	TextFieldOwnedProps | "onBlur"
>

export type MuiAutocompleteOptions = Omit<
	AutocompleteProps<string, false, boolean, boolean>,
	AutocompleteOwnedProps
> & {
	readonly textFieldProps?: MuiAutocompleteTextFieldProps
}

export type MuiAutocompleteMultipleOptions = Omit<
	AutocompleteProps<string, true, boolean, boolean>,
	AutocompleteOwnedProps
> & {
	readonly textFieldProps?: MuiAutocompleteTextFieldProps
}

type SliderOwnedProps =
	| "defaultValue"
	| "disabled"
	| "id"
	| "name"
	| "readOnly"
	| "value"

export type MuiSliderOptions = Omit<
	SliderProps<"span", NoAdditionalProps, number>,
	SliderOwnedProps
>

export type MuiRangeSliderOptions = Omit<
	SliderProps<"span", NoAdditionalProps, readonly number[]>,
	SliderOwnedProps
>

type FileInputProps = ComponentPropsWithoutRef<"input">

export type MuiFileOptions = {
	readonly sx?: SxProps<Theme>
	readonly buttonProps?: Omit<
		ButtonProps<"label">,
		"component" | "disabled" | "role" | "tabIndex" | "type"
	>
	readonly inputProps?: Omit<
		FileInputProps,
		| "defaultValue"
		| "disabled"
		| "id"
		| "multiple"
		| "name"
		| "readOnly"
		| "ref"
		| "required"
		| "type"
		| "value"
	>
}

export type MuiFieldSlotOptions = {
	readonly sx?: SxProps<Theme>
}

export type MuiSectionSlotOptions = {
	readonly sx?: SxProps<Theme>
	readonly layoutSx?: SxProps<Theme>
}

export type MuiArraySlotOptions = {
	readonly sx?: SxProps<Theme>
	readonly itemsSx?: SxProps<Theme>
}

export type MuiFormKitI18n = {
	readonly addItem: string
	readonly removeItem: (position: number) => string
	readonly moveItemUp: (position: number) => string
	readonly moveItemDown: (position: number) => string
	readonly chooseFile: string
}

export type CreateMuiFormKitOptions = {
	readonly i18n?: Partial<MuiFormKitI18n>
}
