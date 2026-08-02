"use client"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { createDefaultSlots } from "../default-slots/default-slots.js"
import { type ControlProps, defineControl } from "./control.js"
import { createFormKit } from "./create-form-kit.js"
import { useFormContext } from "./form-context.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	SectionSlotProps,
} from "./slots.js"

type Values = {
	readonly name: string
	readonly email: string
}

type Schema = StandardSchemaV1<Values>

const schema = {
	"~standard": {
		version: 1,
		vendor: "form-please-test",
		validate(value) {
			const input = value as Values
			return {
				issues: [
					...(input.name.trim() === ""
						? [{ message: "Name is required", path: ["name"] }]
						: []),
					...(input.email.includes("@")
						? []
						: [{ message: "Email is invalid", path: ["email"] }]),
				],
			}
		},
	},
} as Schema

const text = defineControl<string>({
	component({
		value,
		setValue,
		blur,
		input,
		meta,
		disabled,
		readOnly,
		required,
	}: ControlProps<string>) {
		return (
			<input
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => setValue(event.currentTarget.value)}
				readOnly={readOnly}
				ref={input.ref}
				required={required}
				value={value}
			/>
		)
	},
	formData: {
		mode: "native",
	},
})

const defaultSlotsKit = createFormKit({
	controls: {
		text,
	},
	slots: createDefaultSlots(),
})

const kit = createFormKit({
	controls: {
		text,
	},
	slots: {
		...createDefaultSlots(),
		Field: FieldSlot,
		Section: SectionSlot,
		Array: ArraySlot,
		ArrayItem: ArrayItemSlot,
		ErrorMessage,
	},
})

const definition = kit.defineForm(schema, {
	ui: [
		{
			kind: "section",
			id: "identity",
			columns: 2,
			children: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: "Name",
				},
				{
					kind: "field",
					path: "email",
					control: "text",
					label: "Email",
					description: "Used for receipts",
					required: true,
				},
			],
		},
	],
})

const defaultSlotsDefinition = defaultSlotsKit.defineForm(schema, {
	ui: [
		{
			kind: "section",
			id: "identity",
			columns: 2,
			children: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: "Name",
				},
				{
					kind: "field",
					path: "email",
					control: "text",
					label: "Email",
					description: "Used for receipts",
					required: true,
				},
			],
		},
	],
})

describe("generated field accessibility", () => {
	it("uses deterministic IDs, ARIA, public data state, and displayed-error invalid state", async () => {
		const form = kit.createForm(definition, {
			defaultValues: { name: "", email: "invalid" },
		})
		render(
			<kit.AutoForm form={form} id="profile">
				<ValidateEmail />
			</kit.AutoForm>,
		)

		const nameRoot = screen.getByTestId("field-name")
		const emailRoot = screen.getByTestId("field-email")
		expect(nameRoot.hasAttribute("data-invalid")).toBe(false)
		expect(nameRoot.hasAttribute("data-disabled")).toBe(false)
		expect(nameRoot.hasAttribute("data-readonly")).toBe(false)
		expect(nameRoot.hasAttribute("data-required")).toBe(false)
		expect(nameRoot.hasAttribute("data-dirty")).toBe(false)
		expect(nameRoot.hasAttribute("data-touched")).toBe(false)
		expect(nameRoot.hasAttribute("data-validating")).toBe(false)
		expect(emailRoot.hasAttribute("data-required")).toBe(true)

		fireEvent.click(screen.getByRole("button", { name: "Validate email" }))

		await waitFor(() => {
			expect(emailRoot.hasAttribute("data-invalid")).toBe(true)
		})
		expect(nameRoot.hasAttribute("data-invalid")).toBe(false)

		const email = screen.getByLabelText("Email") as HTMLInputElement
		const label = screen.getByText("Email") as HTMLLabelElement
		const description = screen.getByText("Used for receipts")
		const error = screen.getByText("Email is invalid")

		expect(label.htmlFor).toBe("profile-email")
		expect(email.id).toBe("profile-email")
		expect(description.id).toBe("profile-email-description")
		expect(error.id).toBe("profile-email-error-0")
		expect(email.getAttribute("aria-describedby")).toBe(
			"profile-email-description profile-email-error-0",
		)
		expect(email.getAttribute("aria-invalid")).toBe("true")
		expect(error.getAttribute("data-fp-node")).toBe("error-message")
		expect(error.getAttribute("data-fp-path")).toBe("email")
	})

	it("preserves generated label, description, error, and focus props with the default slots", async () => {
		const form = defaultSlotsKit.createForm(defaultSlotsDefinition, {
			defaultValues: { name: "Ada", email: "invalid" },
		})
		render(
			<defaultSlotsKit.AutoForm form={form} id="profile">
				<ValidateEmail />
			</defaultSlotsKit.AutoForm>,
		)

		const email = screen.getByLabelText("Email") as HTMLInputElement
		const fieldRoot = email.closest("[data-fp-node='field']")
		if (!(fieldRoot instanceof HTMLElement)) {
			throw new Error("Expected default field root")
		}

		expect(fieldRoot.getAttribute("data-fp-path")).toBe("email")
		expect(fieldRoot.hasAttribute("data-required")).toBe(true)
		expect(screen.getByText("Email").id).toBe("profile-email-label")
		expect(screen.getByText("Used for receipts").id).toBe(
			"profile-email-description",
		)
		expect(email.id).toBe("profile-email")
		expect(email.getAttribute("aria-describedby")).toBe(
			"profile-email-description",
		)

		fireEvent.click(screen.getByRole("button", { name: "Validate email" }))

		await waitFor(() => {
			expect(email.getAttribute("aria-invalid")).toBe("true")
		})

		const error = screen.getByRole("alert")

		expect(error.textContent).toBe("Email is invalid")
		expect(error.id).toBe("profile-email-error-0")
		expect(error.getAttribute("data-fp-node")).toBe("error-message")
		expect(error.getAttribute("data-fp-path")).toBe("email")
		expect(email.getAttribute("aria-describedby")).toBe(
			"profile-email-description profile-email-error-0",
		)
	})
})

function ValidateEmail() {
	const form = useFormContext<Schema>()

	return (
		<button
			type="button"
			onClick={() => {
				void form.validate("email")
			}}
		>
			Validate email
		</button>
	)
}

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
		<div {...rootProps} data-testid={`field-${pathFrom(rootProps)}`}>
			{label === undefined ? null : (
				<label {...labelProps} htmlFor={labelProps.htmlFor}>
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

function SectionSlot({ rootProps, layoutProps, children }: SectionSlotProps) {
	return (
		<section {...rootProps}>
			<div {...layoutProps}>{children}</div>
		</section>
	)
}

function ArraySlot({ rootProps, children }: ArraySlotProps) {
	return <div {...rootProps}>{children}</div>
}

function ArrayItemSlot({ rootProps, children }: ArrayItemSlotProps) {
	return <div {...rootProps}>{children}</div>
}

function ErrorMessage({ rootProps, issue }: ErrorMessageSlotProps) {
	return <p {...rootProps}>{issue.message}</p>
}

function pathFrom(rootProps: FieldSlotProps["rootProps"]): string {
	return String(
		(rootProps as FieldSlotProps["rootProps"] & { "data-fp-path": string })[
			"data-fp-path"
		],
	)
}
