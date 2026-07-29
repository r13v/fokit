"use client"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { createFormKit } from "./create-form-kit.js"
import { useFormContext } from "./form-context.js"
import { useFormState } from "./hooks.js"
import {
	type NativeDateOptions,
	type NativeNumberOptions,
	type NativeTextareaOptions,
	type NativeTextOptions,
	type NativeTextType,
	nativeControls,
} from "./native-controls.js"

type Values = {
	readonly email?: string
	readonly bio?: string
	readonly age?: number
	readonly birthday?: string
	readonly disabledEmail?: string
	readonly hiddenBio?: string
	readonly disabledAge?: number
	readonly hiddenBirthday?: string
	readonly readonlyEmail?: string
	readonly readonlyBio?: string
	readonly readonlyAge?: number
	readonly readonlyBirthday?: string
}

type Schema = StandardSchemaV1<Values>

const schema = {
	"~standard": {
		version: 1,
		vendor: "fokit-test",
		validate(value) {
			return {
				value: value as Values,
			}
		},
	},
} as Schema

const kit = createFormKit({
	controls: nativeControls,
})

const editableDefinition = kit.defineForm({
	schema,
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
	],
})

const preservationDefinition = kit.defineForm({
	schema,
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
	],
})

const readOnlyDefinition = kit.defineForm({
	schema,
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
	],
})

describe("nativeControls text-like controls", () => {
	it("renders native attributes, metadata, refs, blur, and supported options", async () => {
		const user = userEvent.setup()
		render(
			<kit.AutoForm
				defaultValues={defaultValues()}
				definition={editableDefinition}
				id="native"
			>
				<FormProbe />
			</kit.AutoForm>,
		)

		const email = screen.getByLabelText("Email") as HTMLInputElement
		const bio = screen.getByLabelText("Bio") as HTMLTextAreaElement
		const age = screen.getByLabelText("Age") as HTMLInputElement
		const birthday = screen.getByLabelText("Birthday") as HTMLInputElement

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

	it("updates string, number, and date values through native events", async () => {
		const user = userEvent.setup()
		render(
			<kit.AutoForm
				defaultValues={defaultValues()}
				definition={editableDefinition}
				id="native"
			>
				<ValueProbe />
			</kit.AutoForm>,
		)

		const email = screen.getByLabelText("Email")
		const bio = screen.getByLabelText("Bio")
		const age = screen.getByLabelText("Age") as HTMLInputElement
		const birthday = screen.getByLabelText("Birthday")

		await user.clear(email)
		await user.type(email, "grace@example.test")
		await user.clear(bio)
		await user.type(bio, "Compiler notes")
		await user.clear(age)
		expect(screen.getByTestId("age-value").textContent).toBe("undefined")
		await user.type(age, "42")
		fireEvent.change(birthday, { target: { value: "2030-05-06" } })

		expect(screen.getByTestId("email-value").textContent).toBe(
			"grace@example.test",
		)
		expect(screen.getByTestId("bio-value").textContent).toBe("Compiler notes")
		expect(screen.getByTestId("age-value").textContent).toBe("42")
		expect(screen.getByTestId("birthday-value").textContent).toBe("2030-05-06")

		await user.clear(age)
		expect(screen.getByTestId("age-value").textContent).toBe("undefined")
		expect(screen.getByTestId("age-is-nan").textContent).toBe("false")
	})

	it("preserves hidden and disabled values with hidden serializers", () => {
		render(
			<kit.AutoForm
				defaultValues={defaultValues()}
				definition={preservationDefinition}
				id="preserved"
			/>,
		)

		const form = requireForm()
		const formData = new FormData(form)

		expect(
			(screen.getByLabelText("Disabled email") as HTMLInputElement).name,
		).toBe("disabledEmail")
		expect(formData.get("disabledEmail")).toBe("locked@example.test")
		expect(formData.get("hiddenBio")).toBe("Private notes")
		expect(formData.get("disabledAge")).toBe("64")
		expect(formData.get("hiddenBirthday")).toBe("1962-02-03")
	})

	it("keeps read-only text-like controls focusable and successful", async () => {
		const user = userEvent.setup()
		render(
			<kit.AutoForm
				defaultValues={defaultValues()}
				definition={readOnlyDefinition}
				id="readonly"
			/>,
		)

		const email = screen.getByLabelText("Readonly email") as HTMLInputElement
		const bio = screen.getByLabelText("Readonly bio") as HTMLTextAreaElement
		const age = screen.getByLabelText("Readonly age") as HTMLInputElement
		const birthday = screen.getByLabelText(
			"Readonly birthday",
		) as HTMLInputElement

		expect(email.readOnly).toBe(true)
		expect(bio.readOnly).toBe(true)
		expect(age.readOnly).toBe(true)
		expect(birthday.readOnly).toBe(true)
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
		</>
	)
}

function defaultValues(): Values {
	return {
		email: "ada@example.test",
		bio: "First compiler",
		age: 37,
		birthday: "1815-12-10",
		disabledEmail: "locked@example.test",
		hiddenBio: "Private notes",
		disabledAge: 64,
		hiddenBirthday: "1962-02-03",
		readonlyEmail: "readonly@example.test",
		readonlyBio: "Readonly notes",
		readonlyAge: 8,
		readonlyBirthday: "2000-01-02",
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
// @ts-expect-error button inputs are not value controls
const buttonTextType: NativeTextType = "button"

void textOptions
void textareaOptions
void numberOptions
void dateOptions
void hiddenTextType
void checkboxTextType
void fileTextType
void numberTextType
void dateTextType
void buttonTextType
