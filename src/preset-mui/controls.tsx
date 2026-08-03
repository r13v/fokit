"use client"

import type {
	AutocompleteRenderInputParams,
	TextFieldProps,
} from "@mui/material"
import {
	Autocomplete,
	Button,
	Checkbox,
	FormControlLabel,
	MenuItem,
	Radio,
	RadioGroup,
	Select,
	Slider,
	Switch,
	TextField,
} from "@mui/material"
import { type ReactElement, useEffect, useRef, useState } from "react"

import { defineControl } from "../control-definition.js"
import type { ControlProps } from "../types.js"
import type {
	MuiAutocompleteMultipleOptions,
	MuiAutocompleteOptions,
	MuiCheckboxOptions,
	MuiFileOptions,
	MuiFormKitI18n,
	MuiRadioOptions,
	MuiRangeSliderOptions,
	MuiSelectMultipleOptions,
	MuiSelectOptions,
	MuiSliderOptions,
	MuiSwitchOptions,
	MuiTextFieldOptions,
} from "./types.js"
import { mergeSx } from "./utils.js"

type TextInputType = "email" | "password" | "search" | "tel" | "text" | "url"

type DateInputType = "date" | "datetime-local" | "time"

const visuallyHiddenInputStyle = {
	clip: "rect(0 0 0 0)",
	clipPath: "inset(50%)",
	height: 1,
	overflow: "hidden",
	position: "absolute",
	whiteSpace: "nowrap",
	width: 1,
} as const

export function createMuiControls(i18n: MuiFormKitI18n) {
	const text = defineControl<string | undefined, MuiTextFieldOptions>({
		component: createMuiTextControl("text"),
	})
	const textarea = defineControl<string | undefined, MuiTextFieldOptions>({
		component: MuiTextareaControl,
	})
	const password = defineControl<string | undefined, MuiTextFieldOptions>({
		component: createMuiTextControl("password"),
	})
	const email = defineControl<string | undefined, MuiTextFieldOptions>({
		component: createMuiTextControl("email"),
	})
	const url = defineControl<string | undefined, MuiTextFieldOptions>({
		component: createMuiTextControl("url"),
	})
	const tel = defineControl<string | undefined, MuiTextFieldOptions>({
		component: createMuiTextControl("tel"),
	})
	const search = defineControl<string | undefined, MuiTextFieldOptions>({
		component: createMuiTextControl("search"),
	})
	const number = defineControl<number | undefined, MuiTextFieldOptions>({
		component: MuiNumberControl,
	})
	const date = defineControl<string | undefined, MuiTextFieldOptions>({
		component: createMuiDateControl("date"),
	})
	const time = defineControl<string | undefined, MuiTextFieldOptions>({
		component: createMuiDateControl("time"),
	})
	const datetimeLocal = defineControl<string | undefined, MuiTextFieldOptions>({
		component: createMuiDateControl("datetime-local"),
	})
	const select = defineControl<string | undefined, MuiSelectOptions>({
		component: MuiSelectControl,
	})
	const selectMultiple = defineControl<
		readonly string[],
		MuiSelectMultipleOptions
	>({
		component: MuiSelectMultipleControl,
	})
	const radio = defineControl<string | undefined, MuiRadioOptions>({
		component: MuiRadioControl,
	})
	const checkbox = defineControl<boolean, MuiCheckboxOptions>({
		component: MuiCheckboxControl,
	})
	const switchControl = defineControl<boolean, MuiSwitchOptions>({
		component: MuiSwitchControl,
	})
	const autocomplete = defineControl<
		string | undefined,
		MuiAutocompleteOptions
	>({
		component: MuiAutocompleteControl,
	})
	const autocompleteMultiple = defineControl<
		readonly string[],
		MuiAutocompleteMultipleOptions
	>({
		component: MuiAutocompleteMultipleControl,
	})
	const file = defineControl<File | undefined, MuiFileOptions>({
		component: (props) => <MuiFileControl {...props} i18n={i18n} />,
	})
	const files = defineControl<readonly File[], MuiFileOptions>({
		component: (props) => <MuiFilesControl {...props} i18n={i18n} />,
	})
	const slider = defineControl<number, MuiSliderOptions>({
		component: MuiSliderControl,
	})
	const rangeSlider = defineControl<readonly number[], MuiRangeSliderOptions>({
		component: MuiRangeSliderControl,
	})

	return Object.freeze({
		text,
		textarea,
		password,
		email,
		url,
		tel,
		search,
		number,
		date,
		time,
		"datetime-local": datetimeLocal,
		select,
		"select-multiple": selectMultiple,
		radio,
		checkbox,
		switch: switchControl,
		autocomplete,
		"autocomplete-multiple": autocompleteMultiple,
		file,
		files,
		slider,
		"range-slider": rangeSlider,
	})
}

function createMuiTextControl(type: TextInputType) {
	return function MuiTextControl(
		props: ControlProps<string | undefined, MuiTextFieldOptions>,
	): ReactElement {
		return <MuiStringTextField {...props} type={type} />
	}
}

function createMuiDateControl(type: DateInputType) {
	return function MuiDateControl(
		props: ControlProps<string | undefined, MuiTextFieldOptions>,
	): ReactElement {
		return <MuiStringTextField {...props} emptyIsUndefined type={type} />
	}
}

function MuiTextareaControl(
	props: ControlProps<string | undefined, MuiTextFieldOptions>,
): ReactElement {
	return <MuiStringTextField {...props} multiline type="text" />
}

function MuiStringTextField({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
	type,
	multiline = false,
	emptyIsUndefined = false,
}: ControlProps<string | undefined, MuiTextFieldOptions> & {
	readonly type: TextInputType | DateInputType
	readonly multiline?: boolean
	readonly emptyIsUndefined?: boolean
}): ReactElement {
	const { onBlur, onChange, slotProps, ...muiProps } = options as TextFieldProps
	return (
		<TextField
			fullWidth
			{...muiProps}
			disabled={disabled}
			error={meta.invalid}
			id={input.id}
			inputRef={input.ref}
			multiline={multiline}
			name={input.name}
			onBlur={(event) => {
				blur()
				onBlur?.(event)
			}}
			onChange={(event) => {
				const nextValue = event.currentTarget.value
				setValue(emptyIsUndefined && nextValue === "" ? undefined : nextValue)
				onChange?.(event)
			}}
			required={required}
			slotProps={mergeTextFieldSlotProps(slotProps, {
				"aria-describedby": input["aria-describedby"],
				"aria-invalid": meta.invalid || undefined,
				defaultValue: undefined,
				disabled,
				id: input.id,
				name: input.name,
				readOnly,
				ref: input.ref,
				required,
				value: value ?? "",
			})}
			type={type}
			value={value ?? ""}
		/>
	)
}

function MuiNumberControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<number | undefined, MuiTextFieldOptions>): ReactElement {
	const { onBlur, onChange, slotProps, ...muiProps } = options as TextFieldProps
	return (
		<TextField
			fullWidth
			{...muiProps}
			disabled={disabled}
			error={meta.invalid}
			id={input.id}
			inputRef={input.ref}
			name={input.name}
			onBlur={(event) => {
				blur()
				onBlur?.(event)
			}}
			onChange={(event) => {
				const nextValue = event.currentTarget.value
				if (nextValue === "") {
					setValue(undefined)
				} else {
					const numberValue = (event.currentTarget as HTMLInputElement)
						.valueAsNumber
					if (!Number.isNaN(numberValue)) setValue(numberValue)
				}
				onChange?.(event)
			}}
			required={required}
			slotProps={mergeTextFieldSlotProps(slotProps, {
				"aria-describedby": input["aria-describedby"],
				"aria-invalid": meta.invalid || undefined,
				defaultValue: undefined,
				disabled,
				id: input.id,
				name: input.name,
				readOnly,
				ref: input.ref,
				required,
				value: value === undefined ? "" : String(value),
			})}
			type="number"
			value={value === undefined ? "" : String(value)}
		/>
	)
}

function MuiSelectControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string | undefined, MuiSelectOptions>): ReactElement {
	const { choices, children, inputProps, onBlur, onChange, ...muiProps } =
		options
	return (
		<Select<string>
			fullWidth
			{...muiProps}
			disabled={disabled}
			error={meta.invalid}
			id={input.id}
			inputProps={{
				...inputProps,
				"aria-describedby": input["aria-describedby"],
				"aria-invalid": meta.invalid || undefined,
				"aria-readonly": readOnly || undefined,
				defaultValue: undefined,
				disabled,
				error: meta.invalid,
				id: undefined,
				name: input.name,
				readOnly,
				required,
				value: value ?? "",
			}}
			inputRef={input.ref}
			name={input.name}
			onBlur={(event) => {
				blur()
				onBlur?.(event)
			}}
			onChange={(event, child) => {
				setValue(event.target.value === "" ? undefined : event.target.value)
				onChange?.(event, child)
			}}
			readOnly={readOnly}
			required={required}
			value={value ?? ""}
		>
			{children ?? renderSelectChoices(choices)}
		</Select>
	)
}

function MuiSelectMultipleControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<readonly string[], MuiSelectMultipleOptions>): ReactElement {
	const { choices, children, inputProps, onBlur, onChange, ...muiProps } =
		options
	return (
		<Select<readonly string[]>
			fullWidth
			{...muiProps}
			disabled={disabled}
			error={meta.invalid}
			id={input.id}
			inputProps={{
				...inputProps,
				"aria-describedby": input["aria-describedby"],
				"aria-invalid": meta.invalid || undefined,
				"aria-readonly": readOnly || undefined,
				defaultValue: undefined,
				disabled,
				error: meta.invalid,
				id: undefined,
				name: undefined,
				readOnly,
				required,
				value,
			}}
			inputRef={input.ref}
			multiple
			name={undefined}
			onBlur={(event) => {
				blur()
				onBlur?.(event)
			}}
			onChange={(event, child) => {
				const nextValue = event.target.value
				setValue(
					typeof nextValue === "string" ? nextValue.split(",") : nextValue,
				)
				onChange?.(event, child)
			}}
			readOnly={readOnly}
			required={required}
			value={value}
		>
			{children ?? renderSelectChoices(choices)}
		</Select>
	)
}

function renderSelectChoices(
	choices: MuiSelectOptions["choices"] | MuiSelectMultipleOptions["choices"],
) {
	return choices?.map((choice) => (
		<MenuItem
			disabled={choice.disabled}
			key={choice.value}
			value={choice.value}
		>
			{choice.label}
		</MenuItem>
	))
}

function MuiRadioControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string | undefined, MuiRadioOptions>): ReactElement {
	const { choices, children, onBlur, onChange, ...muiProps } = options
	return (
		<RadioGroup
			{...muiProps}
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			aria-labelledby={`${input.id}-label`}
			aria-readonly={readOnly || undefined}
			id={input.id}
			name={input.name}
			onBlur={(event) => {
				if (children !== undefined) blur()
				onBlur?.(event)
			}}
			onChange={(event, nextValue) => {
				if (children !== undefined && !readOnly) setValue(nextValue)
				onChange?.(event, nextValue)
			}}
			ref={children === undefined ? undefined : input.ref}
			tabIndex={-1}
			value={value ?? ""}
		>
			{children ??
				choices?.map((choice, index) => {
					const {
						onBlur: onRadioBlur,
						onChange: onRadioChange,
						onClick: onRadioClick,
						onKeyDown: onRadioKeyDown,
						slotProps,
						...radioProps
					} = choice.radioProps ?? {}
					const { onChange: onLabelChange, ...labelProps } =
						choice.labelProps ?? {}
					const radioId = `${input.id}-${index}`
					return (
						<FormControlLabel
							{...labelProps}
							control={
								<Radio
									{...radioProps}
									disabled={disabled || choice.disabled}
									id={radioId}
									onBlur={(event) => {
										blur()
										onRadioBlur?.(event)
									}}
									onChange={(event, checked) => {
										if (!readOnly && checked) setValue(choice.value)
										onRadioChange?.(event, checked)
										onLabelChange?.(event, checked)
									}}
									onClick={(event) => {
										if (readOnly) event.preventDefault()
										onRadioClick?.(event)
									}}
									onKeyDown={(event) => {
										if (readOnly && isActivationKey(event.key)) {
											event.preventDefault()
										}
										onRadioKeyDown?.(event)
									}}
									required={required}
									slotProps={{
										...slotProps,
										input: mergeSlotProps(slotProps?.input, {
											"aria-describedby": input["aria-describedby"],
											"aria-invalid": meta.invalid || undefined,
											"aria-readonly": readOnly || undefined,
											checked: value === choice.value,
											defaultChecked: undefined,
											disabled: disabled || choice.disabled,
											id: radioId,
											name: input.name,
											ref: index === 0 ? input.ref : undefined,
											required,
											value: choice.value,
										}),
									}}
								/>
							}
							disabled={disabled || choice.disabled}
							key={choice.value}
							label={choice.label}
							required={required}
							value={choice.value}
						/>
					)
				})}
		</RadioGroup>
	)
}

function MuiCheckboxControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<boolean, MuiCheckboxOptions>): ReactElement {
	const { onBlur, onChange, onClick, slotProps, sx, ...muiProps } = options
	return (
		<Checkbox
			{...muiProps}
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			checked={value}
			disabled={disabled}
			id={input.id}
			name={input.name}
			onBlur={(event) => {
				blur()
				onBlur?.(event)
			}}
			onChange={(event, checked) => {
				if (!readOnly) setValue(checked)
				onChange?.(event, checked)
			}}
			onClick={(event) => {
				if (readOnly) event.preventDefault()
				onClick?.(event)
			}}
			required={required}
			slotProps={{
				...slotProps,
				input: mergeSlotProps(slotProps?.input, {
					"aria-describedby": input["aria-describedby"],
					"aria-invalid": meta.invalid || undefined,
					"aria-readonly": readOnly || undefined,
					checked: value,
					defaultChecked: undefined,
					disabled,
					id: input.id,
					name: input.name,
					ref: input.ref,
					required,
					value: "true",
				}),
			}}
			sx={mergeSx({ alignSelf: "flex-start" }, sx)}
			value="true"
		/>
	)
}

function MuiSwitchControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<boolean, MuiSwitchOptions>): ReactElement {
	const { onBlur, onChange, onClick, slotProps, ...muiProps } = options
	return (
		<Switch
			{...muiProps}
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			checked={value}
			disabled={disabled}
			id={input.id}
			name={input.name}
			onBlur={(event) => {
				blur()
				onBlur?.(event)
			}}
			onChange={(event, checked) => {
				if (!readOnly) setValue(checked)
				onChange?.(event, checked)
			}}
			onClick={(event) => {
				if (readOnly) event.preventDefault()
				onClick?.(event)
			}}
			required={required}
			slotProps={{
				...slotProps,
				input: mergeSlotProps(slotProps?.input, {
					"aria-describedby": input["aria-describedby"],
					"aria-invalid": meta.invalid || undefined,
					"aria-readonly": readOnly || undefined,
					checked: value,
					defaultChecked: undefined,
					disabled,
					id: input.id,
					name: input.name,
					ref: input.ref,
					required,
					value: "true",
				}),
			}}
			value="true"
		/>
	)
}

function MuiAutocompleteControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string | undefined, MuiAutocompleteOptions>): ReactElement {
	const { textFieldProps, onBlur, onChange, ...muiProps } = options
	return (
		<Autocomplete<string, false, boolean, boolean>
			fullWidth
			{...muiProps}
			disabled={disabled}
			id={input.id}
			multiple={false}
			onBlur={(event) => {
				blur()
				onBlur?.(event)
			}}
			onChange={(event, nextValue, reason, details) => {
				setValue(nextValue ?? undefined)
				onChange?.(event, nextValue, reason, details)
			}}
			readOnly={readOnly}
			renderInput={(params) =>
				renderAutocompleteInput({
					params,
					textFieldProps,
					input,
					invalid: meta.invalid,
					disabled,
					readOnly,
					required,
				})
			}
			value={value ?? null}
		/>
	)
}

function MuiAutocompleteMultipleControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<
	readonly string[],
	MuiAutocompleteMultipleOptions
>): ReactElement {
	const { textFieldProps, onBlur, onChange, ...muiProps } = options
	return (
		<Autocomplete<string, true, boolean, boolean>
			fullWidth
			{...muiProps}
			disabled={disabled}
			id={input.id}
			multiple
			onBlur={(event) => {
				blur()
				onBlur?.(event)
			}}
			onChange={(event, nextValue, reason, details) => {
				setValue(nextValue)
				onChange?.(event, nextValue, reason, details)
			}}
			readOnly={readOnly}
			renderInput={(params) =>
				renderAutocompleteInput({
					params,
					textFieldProps,
					input,
					invalid: meta.invalid,
					disabled,
					readOnly,
					required,
				})
			}
			value={[...value]}
		/>
	)
}

function renderAutocompleteInput({
	params,
	textFieldProps,
	input,
	invalid,
	disabled,
	readOnly,
	required,
}: {
	readonly params: AutocompleteRenderInputParams
	readonly textFieldProps:
		| MuiAutocompleteOptions["textFieldProps"]
		| MuiAutocompleteMultipleOptions["textFieldProps"]
	readonly input: ControlProps<unknown>["input"]
	readonly invalid: boolean
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly required: boolean
}): ReactElement {
	const { slotProps, ...muiTextFieldProps } = (textFieldProps ??
		{}) as TextFieldProps
	return (
		<TextField
			{...params}
			{...muiTextFieldProps}
			disabled={disabled}
			error={invalid}
			id={input.id}
			required={required}
			slotProps={{
				...slotProps,
				inputLabel: mergeSlotProps(
					slotProps?.inputLabel,
					params.slotProps.inputLabel,
				),
				input: mergeSlotProps(slotProps?.input, params.slotProps.input),
				htmlInput: mergeSlotProps(
					mergeSlotProps(slotProps?.htmlInput, params.slotProps.htmlInput),
					{
						"aria-describedby": input["aria-describedby"],
						"aria-invalid": invalid || undefined,
						id: input.id,
						name: undefined,
						readOnly,
						ref: mergeRefs(params.slotProps.htmlInput.ref, input.ref),
					},
				),
			}}
		/>
	)
}

function MuiSliderControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<number, MuiSliderOptions>): ReactElement {
	const { onBlur, onChange, onKeyDown, onMouseDown, slotProps, ...muiProps } =
		options
	return (
		<Slider
			{...muiProps}
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			aria-labelledby={`${input.id}-label`}
			disabled={disabled}
			name={undefined}
			onBlur={(event) => {
				blur()
				onBlur?.(event)
			}}
			onChange={(event, nextValue, activeThumb) => {
				if (!readOnly) setValue(nextValue)
				onChange?.(event, nextValue, activeThumb)
			}}
			onKeyDown={(event) => {
				if (readOnly && isSliderMutationKey(event.key)) event.preventDefault()
				onKeyDown?.(event)
			}}
			onMouseDown={(event) => {
				if (readOnly) event.preventDefault()
				onMouseDown?.(event)
			}}
			slotProps={{
				...slotProps,
				input: mergeSlotProps(
					slotProps?.input,
					{
						"aria-describedby": input["aria-describedby"],
						"aria-invalid": meta.invalid || undefined,
						"aria-labelledby": `${input.id}-label`,
						"aria-readonly": readOnly || undefined,
						id: input.id,
						name: undefined,
						ref: input.ref,
						required,
					},
					["aria-valuenow", "defaultValue", "value"],
				),
			}}
			value={value}
		/>
	)
}

function MuiRangeSliderControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<readonly number[], MuiRangeSliderOptions>): ReactElement {
	const { onBlur, onChange, onKeyDown, onMouseDown, slotProps, ...muiProps } =
		options
	return (
		<Slider
			{...muiProps}
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			aria-labelledby={`${input.id}-label`}
			disabled={disabled}
			id={input.id}
			name={undefined}
			onBlur={(event) => {
				blur()
				onBlur?.(event)
			}}
			onChange={(event, nextValue, activeThumb) => {
				if (!readOnly) setValue(nextValue as readonly number[])
				onChange?.(event, nextValue, activeThumb)
			}}
			onKeyDown={(event) => {
				if (readOnly && isSliderMutationKey(event.key)) event.preventDefault()
				onKeyDown?.(event)
			}}
			onMouseDown={(event) => {
				if (readOnly) event.preventDefault()
				onMouseDown?.(event)
			}}
			slotProps={{
				...slotProps,
				input: mergeSlotProps(
					slotProps?.input,
					{
						"aria-describedby": input["aria-describedby"],
						"aria-invalid": meta.invalid || undefined,
						"aria-labelledby": `${input.id}-label`,
						"aria-readonly": readOnly || undefined,
						id: undefined,
						name: undefined,
						ref: input.ref,
						required,
					},
					["aria-valuenow", "defaultValue", "value"],
				),
			}}
			value={[...value]}
		/>
	)
}

function MuiFileControl(
	props: ControlProps<File | undefined, MuiFileOptions> & {
		readonly i18n: MuiFormKitI18n
	},
): ReactElement {
	const inputElement = useRef<HTMLInputElement | null>(null)
	const [nativeValue, setNativeValue] = useState<File | undefined>()
	const hasNativeValue =
		nativeValue !== undefined && props.value === nativeValue

	useEffect(() => {
		if (hasNativeValue || inputElement.current === null) return
		inputElement.current.value = ""
		if (nativeValue !== undefined) setNativeValue(undefined)
	}, [hasNativeValue, nativeValue])

	return (
		<MuiFileButton
			{...props}
			hasNativeValue={hasNativeValue}
			inputElement={inputElement}
			label={props.value?.name ?? props.i18n.chooseFile}
			onFiles={(files) => {
				const nextFile = files?.item(0) ?? undefined
				setNativeValue(nextFile)
				props.setValue(nextFile)
			}}
		/>
	)
}

function MuiFilesControl(
	props: ControlProps<readonly File[], MuiFileOptions> & {
		readonly i18n: MuiFormKitI18n
	},
): ReactElement {
	const inputElement = useRef<HTMLInputElement | null>(null)
	const [nativeValue, setNativeValue] = useState<readonly File[]>([])
	const hasNativeValue = sameFiles(props.value, nativeValue)
	const label =
		props.value.length === 0
			? props.i18n.chooseFile
			: props.value.map((file) => file.name).join(", ")

	useEffect(() => {
		if (hasNativeValue || inputElement.current === null) return
		inputElement.current.value = ""
		if (nativeValue.length > 0) setNativeValue([])
	}, [hasNativeValue, nativeValue])

	return (
		<MuiFileButton
			{...props}
			hasNativeValue={hasNativeValue && props.value.length > 0}
			inputElement={inputElement}
			label={label}
			multiple
			onFiles={(files) => {
				const nextFiles = files === null ? [] : Array.from(files)
				setNativeValue(nextFiles)
				props.setValue(nextFiles)
			}}
		/>
	)
}

function MuiFileButton<Value extends File | undefined | readonly File[]>({
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
	hasNativeValue,
	inputElement,
	label,
	multiple = false,
	onFiles,
}: ControlProps<Value, MuiFileOptions> & {
	readonly i18n: MuiFormKitI18n
	readonly hasNativeValue: boolean
	readonly inputElement: { current: HTMLInputElement | null }
	readonly label: string
	readonly multiple?: boolean
	onFiles(files: FileList | null): void
}): ReactElement {
	const { buttonProps = {}, inputProps = {}, sx } = options
	const {
		children,
		onClick: onButtonClick,
		sx: buttonSx,
		...restButtonProps
	} = buttonProps
	const { onBlur, onChange, onClick, onDrop, onKeyDown, ...restInputProps } =
		inputProps
	return (
		// biome-ignore lint/a11y/useValidAriaRole: MUI adds role="button" to a label root; explicit undefined keeps only the native file input interactive.
		<Button
			component="label"
			variant="outlined"
			{...restButtonProps}
			aria-disabled={readOnly || undefined}
			disabled={disabled}
			onClick={(event) => {
				if (readOnly) event.preventDefault()
				onButtonClick?.(event)
			}}
			role={undefined}
			sx={mergeSx(sx, buttonSx)}
			tabIndex={-1}
			type="button"
		>
			{children ?? label}
			{/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: File inputs have no native readOnly state, so the control exposes the locked state explicitly. */}
			<input
				{...restInputProps}
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
				aria-readonly={readOnly || undefined}
				disabled={disabled}
				id={input.id}
				multiple={multiple}
				name={hasNativeValue ? input.name : undefined}
				onBlur={(event) => {
					blur()
					onBlur?.(event)
				}}
				onChange={(event) => {
					if (!readOnly) onFiles(event.currentTarget.files)
					onChange?.(event)
				}}
				onClick={(event) => {
					if (readOnly) event.preventDefault()
					onClick?.(event)
				}}
				onDrop={(event) => {
					if (readOnly) event.preventDefault()
					onDrop?.(event)
				}}
				onKeyDown={(event) => {
					if (readOnly && isActivationKey(event.key)) event.preventDefault()
					onKeyDown?.(event)
				}}
				ref={(element) => {
					inputElement.current = element
					input.ref(element)
				}}
				required={required}
				style={visuallyHiddenInputStyle}
				type="file"
			/>
		</Button>
	)
}

function mergeTextFieldSlotProps(
	slotProps: TextFieldProps["slotProps"],
	ownedInputProps: Record<string, unknown>,
): TextFieldProps["slotProps"] {
	return {
		...slotProps,
		htmlInput: mergeSlotProps(slotProps?.htmlInput, ownedInputProps),
	}
}

function mergeSlotProps(
	supplied: unknown,
	owned: unknown,
	omitted: readonly string[] = [],
):
	| Record<string, unknown>
	| ((ownerState: unknown) => Record<string, unknown>) {
	const ownedProps = (owned ?? {}) as Record<string, unknown>
	const merge = (suppliedProps: Record<string, unknown>) => {
		const merged = { ...suppliedProps }
		for (const key of omitted) delete merged[key]
		return { ...merged, ...ownedProps }
	}
	if (typeof supplied === "function") {
		return (ownerState) =>
			merge(supplied(ownerState) as Record<string, unknown>)
	}
	return merge((supplied ?? {}) as Record<string, unknown>)
}

function mergeRefs<Value>(
	first:
		| ((value: Value | null) => void)
		| { current: Value | null }
		| null
		| undefined,
	second: (value: Value | null) => void,
): (value: Value | null) => void {
	return (value) => {
		if (typeof first === "function") first(value)
		else if (first != null) first.current = value
		second(value)
	}
}

function sameFiles(left: readonly File[], right: readonly File[]): boolean {
	return (
		left.length === right.length &&
		left.every((file, index) => file === right[index])
	)
}

function isActivationKey(key: string): boolean {
	return key === " " || key === "Enter"
}

function isSliderMutationKey(key: string): boolean {
	return [
		"ArrowDown",
		"ArrowLeft",
		"ArrowRight",
		"ArrowUp",
		"End",
		"Home",
		"PageDown",
		"PageUp",
	].includes(key)
}
