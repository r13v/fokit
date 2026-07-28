import "fokit/layout.css"

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
	Submit,
} from "fokit"
import { ActionForm, ActionSubmit } from "fokit/react19"
import type { FormResult } from "fokit/server"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

type ProfileInput = {
	readonly name: string
}

const schema: StandardSchema<ProfileInput> = {
	"~standard": {
		version: 1,
		vendor: "fokit-smoke",
		validate(value) {
			return { value: value as ProfileInput }
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

const definition = kit.defineForm({
	schema,
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
	reset: "submitted",
}

async function saveProfile(_formData: FormData): Promise<void> {
	void actionResult
}

function App() {
	return (
		<ActionForm
			action={saveProfile}
			defaultValues={{ name: "Ada" }}
			definition={definition}
			kit={kit}
			result={actionResult}
		>
			<ActionSubmit>Save</ActionSubmit>
			<Submit>Classic submit also remains importable</Submit>
		</ActionForm>
	)
}

createRoot(document.getElementById("root") ?? document.body).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
