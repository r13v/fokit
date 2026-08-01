"use client"

import {
	type ArrayItemSlotProps,
	type ArraySlotProps,
	type ControlProps,
	createFormKit,
	defineControl,
	type ErrorMessageSlotProps,
	type FieldSlotProps,
	type SectionSlotProps,
	type StandardSchema,
} from "form-please"
import { ActionForm, ActionSubmit } from "form-please/react19"
import type { FormResult } from "form-please/server"
import { useState } from "react"

type ClientInput = {
	readonly name: string
}

const schema: StandardSchema<ClientInput> = {
	"~standard": {
		version: 1,
		vendor: "form-please-smoke",
		validate(value) {
			return { value: value as ClientInput }
		},
	},
}

const text = defineControl<string | undefined>({
	component({ value, setValue, input }: ControlProps<string | undefined>) {
		return (
			<input
				id={input.id}
				name={input.name}
				onChange={(event) => setValue(event.currentTarget.value)}
				ref={input.ref}
				value={value ?? ""}
			/>
		)
	},
	formData: {
		mode: "native",
	},
})

function Field({
	rootProps,
	label,
	labelProps,
	control,
	errors,
}: FieldSlotProps) {
	return (
		<div {...rootProps}>
			{label === undefined ? null : (
				<label {...labelProps} htmlFor={labelProps.htmlFor}>
					{label}
				</label>
			)}
			{control}
			{errors}
		</div>
	)
}

function Section({ rootProps, layoutProps, children }: SectionSlotProps) {
	return (
		<section {...rootProps}>
			<div {...layoutProps}>{children}</div>
		</section>
	)
}

function ArraySlot({ rootProps, children }: ArraySlotProps) {
	return <div {...rootProps}>{children}</div>
}

function ArrayItem({ rootProps, children }: ArrayItemSlotProps) {
	return <div {...rootProps}>{children}</div>
}

function ErrorMessage({ rootProps, issue }: ErrorMessageSlotProps) {
	return <p {...rootProps}>{issue.message}</p>
}

const kit = createFormKit({
	controls: {
		text,
	},
	slots: {
		Field,
		Section,
		Array: ArraySlot,
		ArrayItem,
		ErrorMessage,
	},
})

const definition = kit.defineForm(schema)({
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			label: "Name",
		},
	],
})

const actionResult: FormResult = {
	status: "success",
}

async function submit(_formData: FormData): Promise<void> {
	void actionResult
}

export function ClientForm() {
	const [form] = useState(() =>
		kit.createForm(definition, { defaultValues: { name: "Ada" } }),
	)
	return (
		<ActionForm action={submit} form={form} result={actionResult}>
			<ActionSubmit>Save</ActionSubmit>
		</ActionForm>
	)
}
