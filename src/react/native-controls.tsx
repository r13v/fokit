"use client"

import type { ChangeEvent, ReactElement } from "react"

import { type ControlProps, defineControl } from "./control.js"

export type NativeTextType =
	| "text"
	| "email"
	| "password"
	| "search"
	| "tel"
	| "url"

export type NativeTextOptions = {
	readonly type?: NativeTextType
	readonly placeholder?: string
	readonly autoComplete?: string
}

export type NativeTextareaOptions = {
	readonly placeholder?: string
	readonly autoComplete?: string
	readonly rows?: number
}

export type NativeNumberOptions = {
	readonly min?: number
	readonly max?: number
	readonly step?: number | "any"
	readonly placeholder?: string
}

export type NativeDateOptions = {
	readonly min?: string
	readonly max?: string
}

export type NativeSelectOption<Value extends string = string> = {
	readonly value: Value
	readonly label: string
	readonly disabled?: boolean
}

export type NativeSelectOptions<Value extends string = string> = {
	readonly options: readonly NativeSelectOption<Value>[]
}

export type NativeFileOptions = {
	readonly accept?: string
}

function NativeTextControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string | undefined, NativeTextOptions>): ReactElement {
	return (
		<input
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			autoComplete={options.autoComplete}
			disabled={disabled}
			id={input.id}
			name={input.name}
			onBlur={blur}
			onChange={(event) => setValue(event.currentTarget.value)}
			placeholder={options.placeholder}
			readOnly={readOnly}
			ref={input.ref}
			required={required}
			type={options.type ?? "text"}
			value={value ?? ""}
		/>
	)
}

function NativeTextareaControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string | undefined, NativeTextareaOptions>): ReactElement {
	return (
		<textarea
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			autoComplete={options.autoComplete}
			disabled={disabled}
			id={input.id}
			name={input.name}
			onBlur={blur}
			onChange={(event) => setValue(event.currentTarget.value)}
			placeholder={options.placeholder}
			readOnly={readOnly}
			ref={input.ref}
			required={required}
			rows={options.rows}
			value={value ?? ""}
		/>
	)
}

function NativeNumberControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<number | undefined, NativeNumberOptions>): ReactElement {
	function handleChange(event: ChangeEvent<HTMLInputElement>): void {
		if (event.currentTarget.value === "") {
			setValue(undefined)
			return
		}

		const nextValue = event.currentTarget.valueAsNumber
		if (!Number.isNaN(nextValue)) {
			setValue(nextValue)
		}
	}

	return (
		<input
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			disabled={disabled}
			id={input.id}
			max={options.max}
			min={options.min}
			name={input.name}
			onBlur={blur}
			onChange={handleChange}
			placeholder={options.placeholder}
			readOnly={readOnly}
			ref={input.ref}
			required={required}
			step={options.step}
			type="number"
			value={value === undefined ? "" : String(value)}
		/>
	)
}

function NativeDateControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string | undefined, NativeDateOptions>): ReactElement {
	return (
		<input
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			disabled={disabled}
			id={input.id}
			max={options.max}
			min={options.min}
			name={input.name}
			onBlur={blur}
			onChange={(event) =>
				setValue(
					event.currentTarget.value === ""
						? undefined
						: event.currentTarget.value,
				)
			}
			readOnly={readOnly}
			ref={input.ref}
			required={required}
			type="date"
			value={value ?? ""}
		/>
	)
}

function NativeSelectControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string, NativeSelectOptions>): ReactElement {
	return (
		<select
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			aria-readonly={readOnly || undefined}
			disabled={disabled}
			id={input.id}
			name={input.name}
			onBlur={blur}
			onChange={(event) => {
				if (readOnly) {
					event.preventDefault()
					event.currentTarget.value = value
					return
				}

				setValue(event.currentTarget.value)
			}}
			onKeyDown={(event) => {
				if (readOnly && isSelectMutationKey(event.key)) {
					preventReadOnlyEvent(event)
				}
			}}
			onMouseDown={(event) => {
				if (readOnly) {
					preventReadOnlyEvent(event)
				}
			}}
			ref={input.ref}
			required={required}
			value={value}
		>
			{options.options.map((option) => (
				<option
					disabled={option.disabled}
					key={option.value}
					value={option.value}
				>
					{option.label}
				</option>
			))}
		</select>
	)
}

function NativeCheckboxControl({
	value,
	setValue,
	blur,
	input,
	meta,
	disabled,
	readOnly,
	required,
}: ControlProps<boolean>): ReactElement {
	return (
		<input
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			aria-readonly={readOnly || undefined}
			checked={value}
			disabled={disabled}
			id={input.id}
			name={input.name}
			onBlur={blur}
			onChange={(event) => {
				if (readOnly) {
					event.preventDefault()
					event.currentTarget.checked = value
					return
				}

				setValue(event.currentTarget.checked)
			}}
			onClick={(event) => {
				if (readOnly) {
					preventReadOnlyEvent(event)
				}
			}}
			onKeyDown={(event) => {
				if (readOnly && isCheckboxMutationKey(event.key)) {
					preventReadOnlyEvent(event)
				}
			}}
			ref={input.ref}
			required={required}
			type="checkbox"
			value="true"
		/>
	)
}

function NativeFileControl({
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<File | undefined, NativeFileOptions>): ReactElement {
	return (
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: File inputs have no native readOnly state, so the control exposes the locked state explicitly.
		<input
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			aria-readonly={readOnly || undefined}
			accept={options.accept}
			disabled={disabled}
			id={input.id}
			name={input.name}
			onBlur={blur}
			onChange={(event) => {
				if (readOnly) {
					event.preventDefault()
					return
				}

				setValue(event.currentTarget.files?.item(0) ?? undefined)
			}}
			onClick={(event) => {
				if (readOnly) {
					preventReadOnlyEvent(event)
				}
			}}
			onDrop={(event) => {
				if (readOnly) {
					preventReadOnlyEvent(event)
				}
			}}
			onKeyDown={(event) => {
				if (readOnly && isFileActivationKey(event.key)) {
					preventReadOnlyEvent(event)
				}
			}}
			ref={input.ref}
			required={required}
			type="file"
		/>
	)
}

const text = defineControl<string | undefined, NativeTextOptions>({
	component: NativeTextControl,
	formData: {
		mode: "native",
		serialize: serializeOptionalString,
	},
})

const textarea = defineControl<string | undefined, NativeTextareaOptions>({
	component: NativeTextareaControl,
	formData: {
		mode: "native",
		serialize: serializeOptionalString,
	},
})

const number = defineControl<number | undefined, NativeNumberOptions>({
	component: NativeNumberControl,
	formData: {
		mode: "native",
		serialize(value, details) {
			return value === undefined || Number.isNaN(value)
				? []
				: [
						{
							name: details.name,
							value: String(value),
						},
					]
		},
	},
})

const date = defineControl<string | undefined, NativeDateOptions>({
	component: NativeDateControl,
	formData: {
		mode: "native",
		serialize: serializeOptionalString,
	},
})

const select = defineControl<string, NativeSelectOptions>({
	component: NativeSelectControl,
	formData: {
		mode: "native",
		serialize(value, details) {
			return [
				{
					name: details.name,
					value,
				},
			]
		},
	},
})

const checkbox = defineControl<boolean>({
	component: NativeCheckboxControl,
	formData: {
		mode: "native",
		serialize(value, details) {
			return [
				{
					name: details.name,
					value: String(value),
				},
			]
		},
	},
})

const file = defineControl<File | undefined, NativeFileOptions>({
	component: NativeFileControl,
	formData: {
		mode: "native",
	},
})

export const nativeControls = Object.freeze({
	text,
	textarea,
	select,
	checkbox,
	number,
	date,
	file,
})

function serializeOptionalString(
	value: string | undefined,
	details: { readonly name: string },
) {
	return value === undefined
		? []
		: [
				{
					name: details.name,
					value,
				},
			]
}

function preventReadOnlyEvent(event: {
	preventDefault(): void
	stopPropagation(): void
}): void {
	event.preventDefault()
	event.stopPropagation()
}

function isSelectMutationKey(key: string): boolean {
	return [
		" ",
		"Enter",
		"ArrowDown",
		"ArrowUp",
		"End",
		"Home",
		"PageDown",
		"PageUp",
	].includes(key)
}

function isCheckboxMutationKey(key: string): boolean {
	return key === " " || key === "Enter"
}

function isFileActivationKey(key: string): boolean {
	return key === " " || key === "Enter"
}
