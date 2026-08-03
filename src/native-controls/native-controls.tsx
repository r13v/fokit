"use client"

import {
	type ChangeEvent,
	type ReactElement,
	useEffect,
	useRef,
	useState,
} from "react"

import { defineControl } from "../control-definition.js"
import type { ControlProps } from "../types.js"

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

export type NativeTimeOptions = {
	readonly min?: string
	readonly max?: string
	readonly step?: number | "any"
}

export type NativeSelectOption<Value extends string | undefined = string> = {
	readonly value: Exclude<Value, undefined>
	readonly label: string
	readonly disabled?: boolean
}

export type NativeSelectEmptyOption = {
	readonly label: string
	readonly disabled?: boolean
}

export type NativeSelectOptions<Value extends string | undefined = string> = {
	readonly emptyOption?: NativeSelectEmptyOption
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

function NativeTimeControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string | undefined, NativeTimeOptions>): ReactElement {
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
			step={options.step}
			type="time"
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
}: ControlProps<string | undefined, NativeSelectOptions>): ReactElement {
	const selectOptions = options.options
	if (!Array.isArray(selectOptions)) {
		throw new TypeError(
			"createNativeControls().select requires options.options",
		)
	}
	if (
		options.emptyOption !== undefined &&
		selectOptions.some((option) => option.value === "")
	) {
		throw new TypeError(
			'createNativeControls().select cannot combine options.emptyOption with an option whose value is ""',
		)
	}
	if (value === undefined && options.emptyOption === undefined) {
		throw new TypeError(
			"createNativeControls().select requires options.emptyOption to represent undefined",
		)
	}

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
					event.currentTarget.value = value ?? ""
					return
				}

				const nextValue = event.currentTarget.value
				setValue(
					nextValue === "" && options.emptyOption !== undefined
						? undefined
						: nextValue,
				)
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
			value={value ?? ""}
		>
			{options.emptyOption === undefined ? null : (
				<option disabled={options.emptyOption.disabled} value="">
					{options.emptyOption.label}
				</option>
			)}
			{selectOptions.map((option) => (
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
				if (readOnly && isActivationKey(event.key)) {
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
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<File | undefined, NativeFileOptions>): ReactElement {
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const [nativeFile, setNativeFile] = useState<File | undefined>(undefined)
	const hasSubmittableNativeFile =
		nativeFile !== undefined && Object.is(value, nativeFile)

	useEffect(() => {
		if (hasSubmittableNativeFile || fileInputRef.current === null) {
			return
		}

		fileInputRef.current.value = ""
		if (nativeFile !== undefined) {
			setNativeFile(undefined)
		}
	}, [hasSubmittableNativeFile, nativeFile])

	return (
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: File inputs have no native readOnly state, so the control exposes the locked state explicitly.
		<input
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			aria-readonly={readOnly || undefined}
			accept={options.accept}
			disabled={disabled}
			id={input.id}
			name={hasSubmittableNativeFile ? input.name : undefined}
			onBlur={blur}
			onChange={(event) => {
				if (readOnly) {
					event.preventDefault()
					return
				}

				const nextFile = event.currentTarget.files?.item(0) ?? undefined
				setNativeFile(nextFile)
				setValue(nextFile)
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
				if (readOnly && isActivationKey(event.key)) {
					preventReadOnlyEvent(event)
				}
			}}
			ref={(element) => {
				fileInputRef.current = element
				input.ref(element)
			}}
			required={required}
			type="file"
		/>
	)
}

export function createNativeControls() {
	const text = defineControl<string | undefined, NativeTextOptions>({
		component: NativeTextControl,
	})

	const textarea = defineControl<string | undefined, NativeTextareaOptions>({
		component: NativeTextareaControl,
	})

	const number = defineControl<number | undefined, NativeNumberOptions>({
		component: NativeNumberControl,
	})

	const date = defineControl<string | undefined, NativeDateOptions>({
		component: NativeDateControl,
	})

	const time = defineControl<string | undefined, NativeTimeOptions>({
		component: NativeTimeControl,
	})

	const select = defineControl<string | undefined, NativeSelectOptions>({
		component: NativeSelectControl,
	})

	const checkbox = defineControl<boolean>({
		component: NativeCheckboxControl,
	})

	const file = defineControl<File | undefined, NativeFileOptions>({
		component: NativeFileControl,
	})

	return Object.freeze({
		text,
		textarea,
		select,
		checkbox,
		number,
		date,
		time,
		file,
	})
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

function isActivationKey(key: string): boolean {
	return key === " " || key === "Enter"
}
