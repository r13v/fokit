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

export const nativeControls = Object.freeze({
	text,
	textarea,
	number,
	date,
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
