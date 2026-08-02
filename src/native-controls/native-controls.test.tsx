"use client"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import { createDefaultSlots } from "../default-slots/default-slots.js"
import { createFormKit } from "../react/create-form-kit.js"
import { useFormContext } from "../react/form-context.js"
import { useFormState } from "../react/hooks.js"
import {
	createNativeControls,
	type NativeDateOptions,
	type NativeFileOptions,
	type NativeNumberOptions,
	type NativeSelectEmptyOption,
	type NativeSelectOption,
	type NativeSelectOptions,
	type NativeTextareaOptions,
	type NativeTextOptions,
	type NativeTextType,
	type NativeTimeOptions,
} from "./native-controls.js"

type Values = {
	readonly email?: string
	readonly bio?: string
	readonly age?: number
	readonly birthday?: string
	readonly openingTime?: string
	readonly status: "" | "draft" | "published" | "archived"
	readonly representation?: "registered" | "forming"
	readonly newsletter: boolean
	readonly avatar?: File
	readonly disabledEmail?: string
	readonly hiddenBio?: string
	readonly disabledAge?: number
	readonly hiddenBirthday?: string
	readonly hiddenTime?: string
	readonly disabledStatus: string
	readonly hiddenStatus: string
	readonly hiddenRepresentation?: "registered" | "forming"
	readonly disabledNewsletter: boolean
	readonly hiddenNewsletter: boolean
	readonly readonlyEmail?: string
	readonly readonlyBio?: string
	readonly readonlyAge?: number
	readonly readonlyBirthday?: string
	readonly readonlyTime?: string
}

type Schema = StandardSchemaV1<Values>

const schema = {
	"~standard": {
		version: 1,
		vendor: "form-please-test",
		validate(value) {
			return {
				value: value as Values,
			}
		},
	},
} as Schema

const nativeControls = createNativeControls()

const kit = createFormKit({
	controls: nativeControls,
	slots: createDefaultSlots(),
})

const editableDefinition = kit.defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "email",
			control: "text",
			label: "Email",
			description: "Used for receipts",
			required: true,
			options: {
				type: "email",
				placeholder: "ada@example.test",
				autoComplete: "email",
			},
		},
		{
			kind: "field",
			path: "bio",
			control: "textarea",
			label: "Bio",
			options: {
				placeholder: "About this person",
				autoComplete: "off",
				rows: 4,
			},
		},
		{
			kind: "field",
			path: "age",
			control: "number",
			label: "Age",
			options: {
				min: 0,
				max: 120,
				step: 1,
				placeholder: "37",
			},
		},
		{
			kind: "field",
			path: "birthday",
			control: "date",
			label: "Birthday",
			options: {
				min: "1900-01-01",
				max: "2100-12-31",
			},
		},
		{
			kind: "field",
			path: "openingTime",
			control: "time",
			label: "Opening time",
			options: {
				min: "08:00",
				max: "22:00",
				step: 900,
			},
		},
	],
})

const choiceDefinition = kit.defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "status",
			control: "select",
			label: "Status",
			description: "Publication state",
			required: true,
			options: {
				options: [
					{ value: "draft", label: "Draft" },
					{ value: "published", label: "Published", disabled: true },
					{ value: "archived", label: "Archived" },
				],
			},
		},
		{
			kind: "field",
			path: "representation",
			control: "select",
			label: "Representation",
			options: {
				emptyOption: { label: "Choose a representation", disabled: true },
				options: [
					{ value: "registered", label: "Registered" },
					{ value: "forming", label: "Forming" },
				],
			},
		},
		{
			kind: "field",
			path: "newsletter",
			control: "checkbox",
			label: "Newsletter",
			description: "Send product notes",
			required: true,
		},
		{
			kind: "field",
			path: "avatar",
			control: "file",
			label: "Avatar",
			description: "PNG only",
			options: {
				accept: "image/png",
			},
		},
	],
})

const missingSelectOptionsDefinition = kit.defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "status",
			control: "select",
			label: "Status",
		},
	],
})

const missingSelectEmptyOptionDefinition = kit.defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "representation",
			control: "select",
			label: "Representation",
			options: {
				options: [
					{ value: "registered", label: "Registered" },
					{ value: "forming", label: "Forming" },
				],
			},
		},
	],
})

const conflictingSelectEmptyOptionDefinition = kit.defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "representation",
			control: "select",
			label: "Representation",
			options: {
				emptyOption: { label: "Choose a representation" },
				options: [
					{ value: "", label: "Empty" },
					{ value: "registered", label: "Registered" },
				],
			},
		},
	],
})

const emptyStringSelectDefinition = kit.defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "status",
			control: "select",
			label: "Status",
			options: {
				options: [
					{ value: "draft", label: "Draft" },
					{ value: "", label: "No status" },
				],
			},
		},
	],
})

const preservationDefinition = kit.defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "disabledEmail",
			control: "text",
			label: "Disabled email",
			disabled: true,
		},
		{
			kind: "field",
			path: "hiddenBio",
			control: "textarea",
			label: "Hidden bio",
			visible: false,
		},
		{
			kind: "field",
			path: "disabledAge",
			control: "number",
			label: "Disabled age",
			disabled: true,
		},
		{
			kind: "field",
			path: "hiddenBirthday",
			control: "date",
			label: "Hidden birthday",
			visible: false,
		},
		{
			kind: "field",
			path: "hiddenTime",
			control: "time",
			label: "Hidden time",
			visible: false,
		},
		{
			kind: "field",
			path: "disabledStatus",
			control: "select",
			label: "Disabled status",
			disabled: true,
			options: {
				options: [
					{ value: "draft", label: "Draft" },
					{ value: "archived", label: "Archived" },
				],
			},
		},
		{
			kind: "field",
			path: "hiddenStatus",
			control: "select",
			label: "Hidden status",
			visible: false,
			options: {
				options: [
					{ value: "draft", label: "Draft" },
					{ value: "archived", label: "Archived" },
				],
			},
		},
		{
			kind: "field",
			path: "hiddenRepresentation",
			control: "select",
			label: "Hidden representation",
			visible: false,
			options: {
				emptyOption: { label: "Choose a representation", disabled: true },
				options: [
					{ value: "registered", label: "Registered" },
					{ value: "forming", label: "Forming" },
				],
			},
		},
		{
			kind: "field",
			path: "disabledNewsletter",
			control: "checkbox",
			label: "Disabled newsletter",
			disabled: true,
		},
		{
			kind: "field",
			path: "hiddenNewsletter",
			control: "checkbox",
			label: "Hidden newsletter",
			visible: false,
		},
	],
})

const readOnlyDefinition = kit.defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "readonlyEmail",
			control: "text",
			label: "Readonly email",
			readOnly: true,
		},
		{
			kind: "field",
			path: "readonlyBio",
			control: "textarea",
			label: "Readonly bio",
			readOnly: true,
		},
		{
			kind: "field",
			path: "readonlyAge",
			control: "number",
			label: "Readonly age",
			readOnly: true,
		},
		{
			kind: "field",
			path: "readonlyBirthday",
			control: "date",
			label: "Readonly birthday",
			readOnly: true,
		},
		{
			kind: "field",
			path: "readonlyTime",
			control: "time",
			label: "Readonly time",
			readOnly: true,
		},
	],
})

describe("createNativeControls text-like controls", () => {
	it("creates fresh frozen registries and native control definitions", () => {
		const nextControls = createNativeControls()

		expect(nextControls).not.toBe(nativeControls)
		expect(Object.isFrozen(nativeControls)).toBe(true)
		for (const [name, control] of Object.entries(nativeControls)) {
			expect(Object.isFrozen(control)).toBe(true)
			expect(nextControls[name as keyof typeof nextControls]).not.toBe(control)
		}
	})

	it("renders native attributes, metadata, refs, blur, and supported options", async () => {
		const user = userEvent.setup()
		const form = kit.createForm(editableDefinition, {
			defaultValues: defaultValues(),
		})
		render(
			<kit.AutoForm form={form} id="native">
				<FormProbe />
			</kit.AutoForm>,
		)

		const email = screen.getByLabelText("Email") as HTMLInputElement
		const bio = screen.getByLabelText("Bio") as HTMLTextAreaElement
		const age = screen.getByLabelText("Age") as HTMLInputElement
		const birthday = screen.getByLabelText("Birthday") as HTMLInputElement
		const openingTime = screen.getByLabelText(
			"Opening time",
		) as HTMLInputElement

		expect(email.id).toBe("native-email")
		expect(email.name).toBe("email")
		expect(email.type).toBe("email")
		expect(email.placeholder).toBe("ada@example.test")
		expect(email.autocomplete).toBe("email")
		expect(email.required).toBe(true)
		expect(email.getAttribute("aria-describedby")).toBe(
			"native-email-description",
		)
		expect(email.hasAttribute("aria-invalid")).toBe(false)
		expect(bio.name).toBe("bio")
		expect(bio.placeholder).toBe("About this person")
		expect(bio.autocomplete).toBe("off")
		expect(bio.rows).toBe(4)
		expect(age.type).toBe("number")
		expect(age.min).toBe("0")
		expect(age.max).toBe("120")
		expect(age.step).toBe("1")
		expect(age.placeholder).toBe("37")
		expect(birthday.type).toBe("date")
		expect(birthday.min).toBe("1900-01-01")
		expect(birthday.max).toBe("2100-12-31")
		expect(openingTime.type).toBe("time")
		expect(openingTime.min).toBe("08:00")
		expect(openingTime.max).toBe("22:00")
		expect(openingTime.step).toBe("900")

		await user.click(screen.getByRole("button", { name: "Focus age" }))
		expect(document.activeElement).toBe(age)

		fireEvent.blur(email)
		expect(screen.getByTestId("email-touched").textContent).toBe("true")

		await user.click(screen.getByRole("button", { name: "Set email error" }))
		expect(email.getAttribute("aria-invalid")).toBe("true")
		expect(email.getAttribute("aria-describedby")).toBe(
			"native-email-description native-email-error-0",
		)
	})

	it("updates string, number, date, and time values through native events", async () => {
		const user = userEvent.setup()
		const form = kit.createForm(editableDefinition, {
			defaultValues: defaultValues(),
		})
		render(
			<kit.AutoForm form={form} id="native">
				<ValueProbe />
			</kit.AutoForm>,
		)

		const email = screen.getByLabelText("Email")
		const bio = screen.getByLabelText("Bio")
		const age = screen.getByLabelText("Age") as HTMLInputElement
		const birthday = screen.getByLabelText("Birthday")
		const openingTime = screen.getByLabelText("Opening time")

		await user.clear(email)
		await user.type(email, "grace@example.test")
		await user.clear(bio)
		await user.type(bio, "Compiler notes")
		await user.clear(age)
		expect(screen.getByTestId("age-value").textContent).toBe("undefined")
		await user.type(age, "42")
		fireEvent.change(birthday, { target: { value: "2030-05-06" } })
		fireEvent.change(openingTime, { target: { value: "10:15" } })

		expect(screen.getByTestId("email-value").textContent).toBe(
			"grace@example.test",
		)
		expect(screen.getByTestId("bio-value").textContent).toBe("Compiler notes")
		expect(screen.getByTestId("age-value").textContent).toBe("42")
		expect(screen.getByTestId("birthday-value").textContent).toBe("2030-05-06")
		expect(screen.getByTestId("opening-time-value").textContent).toBe("10:15")
		expect(new FormData(requireForm()).get("age")).toBe("42")
		expect(new FormData(requireForm()).get("birthday")).toBe("2030-05-06")
		expect(new FormData(requireForm()).get("openingTime")).toBe("10:15")

		Object.defineProperties(age, {
			value: {
				configurable: true,
				get() {
					return "1e"
				},
			},
			valueAsNumber: {
				configurable: true,
				get() {
					return Number.NaN
				},
			},
		})
		fireEvent.change(age)
		Reflect.deleteProperty(age, "value")
		Reflect.deleteProperty(age, "valueAsNumber")
		expect(screen.getByTestId("age-value").textContent).toBe("42")
		expect(screen.getByTestId("age-is-nan").textContent).toBe("false")

		await user.clear(age)
		expect(screen.getByTestId("age-value").textContent).toBe("undefined")
		expect(screen.getByTestId("age-is-nan").textContent).toBe("false")

		fireEvent.change(birthday, { target: { value: "" } })
		expect(screen.getByTestId("birthday-value").textContent).toBe("")
		expect(new FormData(requireForm()).get("birthday")).toBe("")

		fireEvent.change(openingTime, { target: { value: "" } })
		expect(screen.getByTestId("opening-time-value").textContent).toBe(
			"undefined",
		)
		expect(new FormData(requireForm()).get("openingTime")).toBe("")
	})

	it("preserves hidden and disabled values with hidden serializers", () => {
		const formInstance = kit.createForm(preservationDefinition, {
			defaultValues: defaultValues(),
		})
		render(<kit.AutoForm form={formInstance} id="preserved" />)

		const form = requireForm()
		const formData = new FormData(form)

		expect(
			(screen.getByLabelText("Disabled email") as HTMLInputElement).name,
		).toBe("disabledEmail")
		expect(
			(screen.getByLabelText("Disabled status") as HTMLSelectElement).disabled,
		).toBe(true)
		expect(
			(screen.getByLabelText("Disabled newsletter") as HTMLInputElement)
				.disabled,
		).toBe(true)
		expect(formData.get("disabledEmail")).toBe("locked@example.test")
		expect(formData.get("hiddenBio")).toBe("Private notes")
		expect(formData.get("disabledAge")).toBe("64")
		expect(formData.get("hiddenBirthday")).toBe("1962-02-03")
		expect(formData.get("hiddenTime")).toBe("07:45")
		expect(formData.get("disabledStatus")).toBe("archived")
		expect(formData.get("hiddenStatus")).toBe("draft")
		expect(formData.has("hiddenRepresentation")).toBe(false)
		expect(formData.get("disabledNewsletter")).toBe("true")
		expect(formData.get("hiddenNewsletter")).toBe("false")
	})

	it("keeps read-only text-like controls focusable and successful", async () => {
		const user = userEvent.setup()
		const formInstance = kit.createForm(readOnlyDefinition, {
			defaultValues: defaultValues(),
		})
		render(<kit.AutoForm form={formInstance} id="readonly" />)

		const email = screen.getByLabelText("Readonly email") as HTMLInputElement
		const bio = screen.getByLabelText("Readonly bio") as HTMLTextAreaElement
		const age = screen.getByLabelText("Readonly age") as HTMLInputElement
		const birthday = screen.getByLabelText(
			"Readonly birthday",
		) as HTMLInputElement
		const time = screen.getByLabelText("Readonly time") as HTMLInputElement

		expect(email.readOnly).toBe(true)
		expect(bio.readOnly).toBe(true)
		expect(age.readOnly).toBe(true)
		expect(birthday.readOnly).toBe(true)
		expect(time.readOnly).toBe(true)
		expect(email.disabled).toBe(false)
		email.focus()
		expect(document.activeElement).toBe(email)

		await user.type(email, "changed")
		await user.type(bio, "changed")
		await user.type(age, "99")
		expect(email.value).toBe("readonly@example.test")
		expect(bio.value).toBe("Readonly notes")
		expect(age.value).toBe("8")

		const formData = new FormData(requireForm())
		expect(formData.get("readonlyEmail")).toBe("readonly@example.test")
		expect(formData.get("readonlyBio")).toBe("Readonly notes")
		expect(formData.get("readonlyAge")).toBe("8")
		expect(formData.get("readonlyBirthday")).toBe("2000-01-02")
		expect(formData.get("readonlyTime")).toBe("18:30")
	})
})

describe("createNativeControls choice and file controls", () => {
	it("fails clearly when a select field omits its option list", () => {
		const form = kit.createForm(missingSelectOptionsDefinition, {
			defaultValues: defaultValues(),
		})
		expect(() =>
			render(<kit.AutoForm form={form} id="missing-select-options" />),
		).toThrow("createNativeControls().select requires options.options")
	})

	it("fails clearly when undefined has no empty option", () => {
		const form = kit.createForm(missingSelectEmptyOptionDefinition, {
			defaultValues: defaultValues(),
		})
		expect(() =>
			render(<kit.AutoForm form={form} id="missing-select-empty-option" />),
		).toThrow(
			"createNativeControls().select requires options.emptyOption to represent undefined",
		)
	})

	it("rejects an ambiguous empty option value", () => {
		const form = kit.createForm(conflictingSelectEmptyOptionDefinition, {
			defaultValues: defaultValues(),
		})
		expect(() =>
			render(<kit.AutoForm form={form} id="conflicting-select-empty-option" />),
		).toThrow(
			'createNativeControls().select cannot combine options.emptyOption with an option whose value is ""',
		)
	})

	it("preserves an empty string option when emptyOption is absent", () => {
		const form = kit.createForm(emptyStringSelectDefinition, {
			defaultValues: defaultValues(),
		})
		render(
			<kit.AutoForm form={form} id="empty-string-select">
				<ValueProbe />
			</kit.AutoForm>,
		)

		const status = screen.getByLabelText("Status") as HTMLSelectElement
		fireEvent.change(status, { target: { value: "" } })

		expect(status.value).toBe("")
		expect(screen.getByTestId("status-value-kind").textContent).toBe(
			"empty string",
		)
		expect(new FormData(requireForm()).get("status")).toBe("")
	})

	it("renders native attributes, metadata, refs, blur, and supported options", async () => {
		const user = userEvent.setup()
		const form = kit.createForm(choiceDefinition, {
			defaultValues: defaultValues(),
		})
		render(
			<kit.AutoForm form={form} id="choice">
				<ChoiceProbe />
				<ValueProbe />
			</kit.AutoForm>,
		)

		const status = screen.getByLabelText("Status") as HTMLSelectElement
		const representation = screen.getByLabelText(
			"Representation",
		) as HTMLSelectElement
		const newsletter = screen.getByLabelText("Newsletter") as HTMLInputElement
		const avatar = screen.getByLabelText("Avatar") as HTMLInputElement

		expect(status.id).toBe("choice-status")
		expect(status.name).toBe("status")
		expect(status.required).toBe(true)
		expect(status.getAttribute("aria-describedby")).toBe(
			"choice-status-description",
		)
		expect(status.hasAttribute("aria-invalid")).toBe(false)
		expect([...status.options].map((option) => option.value)).toEqual([
			"draft",
			"published",
			"archived",
		])
		expect(status.options[1]?.disabled).toBe(true)
		expect([...representation.options].map((option) => option.value)).toEqual([
			"",
			"registered",
			"forming",
		])
		expect(representation.options[0]?.disabled).toBe(true)
		expect(representation.value).toBe("")
		expect(new FormData(requireForm()).get("representation")).toBe("")
		expect(newsletter.type).toBe("checkbox")
		expect(newsletter.name).toBe("newsletter")
		expect(newsletter.value).toBe("true")
		expect(newsletter.checked).toBe(true)
		expect(newsletter.required).toBe(true)
		expect(newsletter.getAttribute("aria-describedby")).toBe(
			"choice-newsletter-description",
		)
		expect(avatar.type).toBe("file")
		expect(avatar.hasAttribute("name")).toBe(false)
		expect(avatar.accept).toBe("image/png")
		expect(avatar.getAttribute("aria-describedby")).toBe(
			"choice-avatar-description",
		)
		expect(screen.getByTestId("avatar-value").textContent).toBe("undefined")
		expect(new FormData(requireForm()).has("avatar")).toBe(false)

		await user.click(screen.getByRole("button", { name: "Focus status" }))
		expect(document.activeElement).toBe(status)
		await user.click(screen.getByRole("button", { name: "Focus newsletter" }))
		expect(document.activeElement).toBe(newsletter)
		await user.click(screen.getByRole("button", { name: "Focus avatar" }))
		expect(document.activeElement).toBe(avatar)

		fireEvent.blur(status)
		fireEvent.blur(newsletter)
		fireEvent.blur(avatar)
		expect(screen.getByTestId("status-touched").textContent).toBe("true")
		expect(screen.getByTestId("newsletter-touched").textContent).toBe("true")
		expect(screen.getByTestId("avatar-touched").textContent).toBe("true")

		await user.click(screen.getByRole("button", { name: "Set choice errors" }))
		expect(status.getAttribute("aria-invalid")).toBe("true")
		expect(status.getAttribute("aria-describedby")).toBe(
			"choice-status-description choice-status-error-0",
		)
		expect(newsletter.getAttribute("aria-invalid")).toBe("true")
		expect(newsletter.getAttribute("aria-describedby")).toBe(
			"choice-newsletter-description choice-newsletter-error-0",
		)
		expect(avatar.getAttribute("aria-invalid")).toBe("true")
		expect(avatar.getAttribute("aria-describedby")).toBe(
			"choice-avatar-description choice-avatar-error-0",
		)
	})

	it("updates select, checkbox, and single-file values through native events", async () => {
		const user = userEvent.setup()
		const form = kit.createForm(choiceDefinition, {
			defaultValues: defaultValues(),
		})
		render(
			<kit.AutoForm form={form} id="choice">
				<ValueProbe />
				<SetAvatarButton />
				<ClearAvatarButton />
			</kit.AutoForm>,
		)

		const status = screen.getByLabelText("Status") as HTMLSelectElement
		const representation = screen.getByLabelText(
			"Representation",
		) as HTMLSelectElement
		const newsletter = screen.getByLabelText("Newsletter") as HTMLInputElement
		const avatar = screen.getByLabelText("Avatar") as HTMLInputElement
		const first = new File(["one"], "one.png", { type: "image/png" })
		const second = new File(["two"], "two.png", { type: "image/png" })

		await user.click(
			screen.getByRole("button", { name: "Set avatar programmatically" }),
		)
		expect(screen.getByTestId("avatar-value").textContent).toBe(
			"programmatic.png",
		)
		expect(avatar.files).toHaveLength(0)
		expect(avatar.hasAttribute("name")).toBe(false)
		expect(new FormData(requireForm()).has("avatar")).toBe(false)

		await user.selectOptions(status, "archived")
		await user.selectOptions(representation, "registered")
		await user.click(newsletter)
		await user.upload(avatar, [first, second])

		expect(screen.getByTestId("status-value").textContent).toBe("archived")
		expect(screen.getByTestId("representation-value").textContent).toBe(
			"registered",
		)
		expect(screen.getByTestId("newsletter-value").textContent).toBe("false")
		expect(screen.getByTestId("avatar-value").textContent).toBe("one.png")
		expect(avatar.files).toHaveLength(1)
		expect(avatar.files?.item(0)).toBe(first)
		expect(avatar.name).toBe("avatar")

		const formData = new FormData(requireForm())
		expect(formData.get("status")).toBe("archived")
		expect(formData.get("representation")).toBe("registered")
		expect(formData.has("newsletter")).toBe(false)
		expect(formData.get("avatar")).toBeInstanceOf(File)

		fireEvent.change(representation, { target: { value: "" } })
		expect(screen.getByTestId("representation-value").textContent).toBe(
			"undefined",
		)
		expect(new FormData(requireForm()).get("representation")).toBe("")

		await user.click(
			screen.getByRole("button", { name: "Set avatar programmatically" }),
		)
		expect(screen.getByTestId("avatar-value").textContent).toBe(
			"programmatic.png",
		)
		expect(avatar.files).toHaveLength(0)
		expect(avatar.hasAttribute("name")).toBe(false)
		expect(new FormData(requireForm()).has("avatar")).toBe(false)

		await user.click(screen.getByRole("button", { name: "Clear avatar" }))
		expect(screen.getByTestId("avatar-value").textContent).toBe("undefined")
		expect(avatar.files).toHaveLength(0)
		expect(avatar.hasAttribute("name")).toBe(false)
		expect(new FormData(requireForm()).has("avatar")).toBe(false)
	})

	it("keeps choice and file values successful when a form becomes read-only", async () => {
		const user = userEvent.setup()
		const first = new File(["avatar"], "avatar.png", { type: "image/png" })
		const replacement = new File(["replacement"], "replacement.png", {
			type: "image/png",
		})
		const form = kit.createForm(choiceDefinition, {
			defaultValues: defaultValues(),
		})

		function LockingForm() {
			const [readOnly, setReadOnly] = useState(false)

			return (
				<kit.AutoForm form={form} id="readonly-choice" readOnly={readOnly}>
					<ValueProbe />
					<button type="button" onClick={() => setReadOnly(true)}>
						Lock form
					</button>
				</kit.AutoForm>
			)
		}

		render(<LockingForm />)
		const status = screen.getByLabelText("Status") as HTMLSelectElement
		const representation = screen.getByLabelText(
			"Representation",
		) as HTMLSelectElement
		const newsletter = screen.getByLabelText("Newsletter") as HTMLInputElement
		const avatar = screen.getByLabelText("Avatar") as HTMLInputElement

		await user.upload(avatar, first)
		expect(avatar.files?.item(0)).toBe(first)
		await user.click(screen.getByRole("button", { name: "Lock form" }))

		expect(status.disabled).toBe(false)
		expect(representation.disabled).toBe(false)
		expect(newsletter.disabled).toBe(false)
		expect(avatar.disabled).toBe(false)
		expect(status.name).toBe("status")
		expect(newsletter.name).toBe("newsletter")
		expect(avatar.name).toBe("avatar")
		expect(status.getAttribute("aria-readonly")).toBe("true")
		expect(representation.getAttribute("aria-readonly")).toBe("true")
		expect(newsletter.getAttribute("aria-readonly")).toBe("true")
		expect(avatar.getAttribute("aria-readonly")).toBe("true")

		expect(fireEvent.mouseDown(status)).toBe(false)
		expect(fireEvent.keyDown(status, { key: "ArrowDown" })).toBe(false)
		fireEvent.change(status, { target: { value: "archived" } })
		fireEvent.change(representation, { target: { value: "registered" } })
		await user.click(newsletter)
		newsletter.focus()
		expect(fireEvent.keyDown(newsletter, { key: " " })).toBe(false)
		expect(fireEvent.keyDown(avatar, { key: "Enter" })).toBe(false)
		expect(fireEvent.keyDown(avatar, { key: " " })).toBe(false)
		expect(
			fireEvent.drop(avatar, {
				dataTransfer: {
					files: [replacement],
				},
			}),
		).toBe(false)
		await user.upload(avatar, replacement)

		expect(status.value).toBe("draft")
		expect(representation.value).toBe("")
		expect(newsletter.checked).toBe(true)
		expect(avatar.files?.item(0)).toBe(first)
		expect(screen.getByTestId("status-value").textContent).toBe("draft")
		expect(screen.getByTestId("representation-value").textContent).toBe(
			"undefined",
		)
		expect(screen.getByTestId("newsletter-value").textContent).toBe("true")
		expect(screen.getByTestId("avatar-value").textContent).toBe("avatar.png")

		const formData = new FormData(requireForm())
		expect(formData.get("status")).toBe("draft")
		expect(formData.get("representation")).toBe("")
		expect(formData.get("newsletter")).toBe("true")
		expect(formData.get("avatar")).toBeInstanceOf(File)
	})
})

function FormProbe() {
	const form = useFormContext<Schema>()
	const touched = useFormState(
		form,
		(snapshot) => snapshot.metadata.fieldsByPath.email?.touched ?? false,
	)

	return (
		<>
			<output data-testid="email-touched">{String(touched)}</output>
			<button type="button" onClick={() => form.focus("age")}>
				Focus age
			</button>
			<button
				type="button"
				onClick={() =>
					form.setErrors([
						{
							source: "manual",
							path: "email",
							message: "Email is invalid",
						},
					])
				}
			>
				Set email error
			</button>
		</>
	)
}

function ChoiceProbe() {
	const form = useFormContext<Schema>()
	const touched = useFormState(form, (snapshot) => ({
		status: snapshot.metadata.fieldsByPath.status?.touched ?? false,
		newsletter: snapshot.metadata.fieldsByPath.newsletter?.touched ?? false,
		avatar: snapshot.metadata.fieldsByPath.avatar?.touched ?? false,
	}))

	return (
		<>
			<output data-testid="status-touched">{String(touched.status)}</output>
			<output data-testid="newsletter-touched">
				{String(touched.newsletter)}
			</output>
			<output data-testid="avatar-touched">{String(touched.avatar)}</output>
			<button type="button" onClick={() => form.focus("status")}>
				Focus status
			</button>
			<button type="button" onClick={() => form.focus("newsletter")}>
				Focus newsletter
			</button>
			<button type="button" onClick={() => form.focus("avatar")}>
				Focus avatar
			</button>
			<button
				type="button"
				onClick={() =>
					form.setErrors([
						{
							source: "manual",
							path: "status",
							message: "Status is invalid",
						},
						{
							source: "manual",
							path: "newsletter",
							message: "Newsletter is invalid",
						},
						{
							source: "manual",
							path: "avatar",
							message: "Avatar is invalid",
						},
					])
				}
			>
				Set choice errors
			</button>
		</>
	)
}

function ValueProbe() {
	const form = useFormContext<Schema>()
	const values = useFormState(form, (snapshot) => snapshot.values)

	return (
		<>
			<output data-testid="email-value">{values.email}</output>
			<output data-testid="bio-value">{values.bio}</output>
			<output data-testid="age-value">
				{values.age === undefined ? "undefined" : String(values.age)}
			</output>
			<output data-testid="age-is-nan">
				{String(Number.isNaN(values.age))}
			</output>
			<output data-testid="birthday-value">{values.birthday}</output>
			<output data-testid="opening-time-value">
				{values.openingTime ?? "undefined"}
			</output>
			<output data-testid="status-value">{values.status}</output>
			<output data-testid="status-value-kind">
				{values.status === "" ? "empty string" : "non-empty string"}
			</output>
			<output data-testid="representation-value">
				{values.representation ?? "undefined"}
			</output>
			<output data-testid="newsletter-value">
				{String(values.newsletter)}
			</output>
			<output data-testid="avatar-value">
				{values.avatar?.name ?? "undefined"}
			</output>
		</>
	)
}

function ClearAvatarButton() {
	const form = useFormContext<Schema>()

	return (
		<button type="button" onClick={() => form.setValue("avatar", undefined)}>
			Clear avatar
		</button>
	)
}

function SetAvatarButton() {
	const form = useFormContext<Schema>()

	return (
		<button
			type="button"
			onClick={() =>
				form.setValue(
					"avatar",
					new File(["programmatic"], "programmatic.png", {
						type: "image/png",
					}),
				)
			}
		>
			Set avatar programmatically
		</button>
	)
}

function defaultValues(): Values {
	return {
		email: "ada@example.test",
		bio: "First compiler",
		age: 37,
		birthday: "1815-12-10",
		openingTime: "09:30",
		status: "draft",
		newsletter: true,
		disabledEmail: "locked@example.test",
		hiddenBio: "Private notes",
		disabledAge: 64,
		hiddenBirthday: "1962-02-03",
		hiddenTime: "07:45",
		disabledStatus: "archived",
		hiddenStatus: "draft",
		disabledNewsletter: true,
		hiddenNewsletter: false,
		readonlyEmail: "readonly@example.test",
		readonlyBio: "Readonly notes",
		readonlyAge: 8,
		readonlyBirthday: "2000-01-02",
		readonlyTime: "18:30",
	}
}

function requireForm(): HTMLFormElement {
	const form = document.querySelector("form")
	if (form === null) {
		throw new Error("Expected form")
	}

	return form
}

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false

type Expect<Condition extends true> = Condition

type _nativeTextType = Expect<
	Equal<
		NativeTextType,
		"text" | "email" | "password" | "search" | "tel" | "url"
	>
>

const textOptions = {
	type: "email",
	placeholder: "Email",
	autoComplete: "email",
} satisfies NativeTextOptions

const textareaOptions = {
	placeholder: "Bio",
	autoComplete: "off",
	rows: 5,
} satisfies NativeTextareaOptions

const numberOptions = {
	min: 0,
	max: 10,
	step: "any",
	placeholder: "Count",
} satisfies NativeNumberOptions

const dateOptions = {
	min: "2020-01-01",
	max: "2030-01-01",
} satisfies NativeDateOptions

const timeOptions = {
	min: "08:00",
	max: "22:00",
	step: "any",
} satisfies NativeTimeOptions

const selectOptions = {
	emptyOption: { label: "Choose a status", disabled: true },
	options: [
		{ value: "draft", label: "Draft" },
		{ value: "published", label: "Published", disabled: true },
	],
} satisfies NativeSelectOptions<"draft" | "published">

const selectEmptyOption = {
	label: "Choose a status",
	disabled: true,
} satisfies NativeSelectEmptyOption

const selectOption = {
	value: "draft",
	label: "Draft",
	disabled: false,
} satisfies NativeSelectOption<"draft">

const fileOptions = {
	accept: "image/png",
} satisfies NativeFileOptions

const badSelectOptions = {
	options: [
		{
			// @ts-expect-error native select option values must be strings
			value: 1,
			label: "One",
		},
	],
} satisfies NativeSelectOptions

// @ts-expect-error hidden inputs are not text-like visible controls
const hiddenTextType: NativeTextType = "hidden"
// @ts-expect-error checkboxes are not text-like controls
const checkboxTextType: NativeTextType = "checkbox"
// @ts-expect-error file inputs are not text-like controls
const fileTextType: NativeTextType = "file"
// @ts-expect-error number inputs use the dedicated number control
const numberTextType: NativeTextType = "number"
// @ts-expect-error date inputs use the dedicated date control
const dateTextType: NativeTextType = "date"
// @ts-expect-error time inputs use the dedicated time control
const timeTextType: NativeTextType = "time"
// @ts-expect-error button inputs are not value controls
const buttonTextType: NativeTextType = "button"

void textOptions
void textareaOptions
void numberOptions
void dateOptions
void timeOptions
void selectOptions
void selectEmptyOption
void selectOption
void fileOptions
void badSelectOptions
void hiddenTextType
void checkboxTextType
void fileTextType
void numberTextType
void dateTextType
void timeTextType
void buttonTextType
