"use client"

import type { FormIssue } from "../core/index.js"
import { type ControlProps, defineControl } from "./control.js"
import { createFormKit } from "./create-form-kit.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	SectionSlotProps,
} from "./slots.js"

export type TestValues = {
	readonly name: string
	readonly nickname?: string
}

export type TextOptions = {
	readonly placeholder?: string
}

function TextControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string | undefined, TextOptions>) {
	return (
		<input
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			aria-label="Name"
			data-display-errors={messages(meta.displayErrors)}
			data-errors={messages(meta.errors)}
			data-touched={meta.touched || undefined}
			disabled={disabled}
			id={input.id}
			name={input.name}
			onBlur={blur}
			onChange={(event) => setValue(event.currentTarget.value)}
			placeholder={options.placeholder}
			readOnly={readOnly}
			ref={input.ref}
			required={required}
			value={value ?? ""}
		/>
	)
}

export const textControl = defineControl<string | undefined, TextOptions>({
	component: TextControl,
	formData: {
		mode: "native",
	},
})

function FieldSlot({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	control,
	errors,
}: FieldSlotProps) {
	return (
		<div {...rootProps}>
			{label === undefined ? null : (
				<label {...labelProps} htmlFor={labelProps.htmlFor ?? "test-field"}>
					{label}
				</label>
			)}
			{description === undefined ? null : (
				<p {...descriptionProps}>{description}</p>
			)}
			{control}
			{errors}
		</div>
	)
}

function SectionSlot({
	rootProps,
	layoutProps,
	title,
	description,
	children,
}: SectionSlotProps) {
	return (
		<section {...rootProps}>
			{title === undefined ? null : <h2>{title}</h2>}
			{description === undefined ? null : <p>{description}</p>}
			<div {...layoutProps}>{children}</div>
		</section>
	)
}

function ArraySlot({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	errors,
	children,
}: ArraySlotProps) {
	return (
		<div {...rootProps}>
			{label === undefined ? null : <div {...labelProps}>{label}</div>}
			{description === undefined ? null : (
				<p {...descriptionProps}>{description}</p>
			)}
			{errors}
			{children}
		</div>
	)
}

function ArrayItemSlot({ rootProps, children }: ArrayItemSlotProps) {
	return <div {...rootProps}>{children}</div>
}

function ErrorMessageSlot({ rootProps, issue }: ErrorMessageSlotProps) {
	return <p {...rootProps}>{issue.message}</p>
}

export const testKit = createFormKit({
	controls: {
		text: textControl,
	},
	slots: {
		Field: FieldSlot,
		Section: SectionSlot,
		Array: ArraySlot,
		ArrayItem: ArrayItemSlot,
		ErrorMessage: ErrorMessageSlot,
	},
})

function messages(issues: readonly FormIssue[]): string {
	return issues.map((issue) => issue.message).join(",")
}
