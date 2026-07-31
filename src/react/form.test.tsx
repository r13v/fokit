"use client"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { type TestValues, testKit } from "./test-kit.js"
import type { FormInstance } from "./use-form.js"
import { useForm } from "./use-form.js"

type TestSchema = StandardSchemaV1<TestValues>

const schema = {} as TestSchema

const definition = testKit.defineForm(schema)({
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
		},
	],
})

function defaultValues(): TestValues {
	return {
		name: "Ada",
	}
}

describe("kit.Form and kit.Submit", () => {
	it("renders a native noValidate form with safe passthrough props and state data", () => {
		function View() {
			const form = useForm(definition, {
				defaultValues: defaultValues(),
			})

			return (
				<testKit.Form
					aria-label="Profile"
					className="profile-form"
					data-custom="consumer"
					data-fp-node="consumer"
					form={form}
					id="profile"
					style={{ "--fp-row-gap": "12px" }}
				>
					<button type="button" onClick={() => form.setValue("name", "Grace")}>
						Change
					</button>
				</testKit.Form>
			)
		}

		render(<View />)

		const form = screen.getByRole("form", {
			name: "Profile",
		}) as HTMLFormElement
		expect(form.id).toBe("profile")
		expect(form.classList.contains("profile-form")).toBe(true)
		expect(form.getAttribute("data-custom")).toBe("consumer")
		expect(form.getAttribute("data-fp-node")).toBe("form")
		expect(form.getAttribute("data-validation-status")).toBe("unvalidated")
		expect(form.noValidate).toBe(true)
		expect(form.hasAttribute("data-dirty")).toBe(false)

		fireEvent.click(screen.getByRole("button", { name: "Change" }))
		expect(form.hasAttribute("data-dirty")).toBe(true)
	})

	it.each(["action", "onSubmit", "onReset", "noValidate"] as const)(
		"rejects attempts to replace owned %s",
		(prop) => {
			function View() {
				const form = useForm(definition, {
					defaultValues: defaultValues(),
				})
				const forbiddenProps = {
					[prop]: prop === "noValidate" ? false : () => undefined,
				}

				return <testKit.Form form={form} {...forbiddenProps} />
			}

			expect(() => render(<View />)).toThrow(
				new RegExp(`Form Please owns the ${prop} form prop`),
			)
		},
	)

	it("keeps kit.Submit disabled for disabled or submitting forms", () => {
		function View() {
			const form = useForm(definition, {
				defaultValues: defaultValues(),
				disabled: true,
			})

			return (
				<testKit.Form form={form}>
					<testKit.Submit disabled={false}>Save</testKit.Submit>
				</testKit.Form>
			)
		}

		render(<View />)

		expect(
			(screen.getByRole("button", { name: "Save" }) as HTMLButtonElement)
				.disabled,
		).toBe(true)
	})

	it("guards custom submit buttons through the owned form handler", () => {
		function View() {
			const form = useForm(definition, {
				defaultValues: defaultValues(),
				disabled: true,
			})

			return (
				<testKit.Form aria-label="Profile" form={form}>
					<button type="submit">Design-system submit</button>
				</testKit.Form>
			)
		}

		render(<View />)

		const form = screen.getByRole("form", { name: "Profile" })
		const event = new Event("submit", {
			bubbles: true,
			cancelable: true,
		})

		expect(form.dispatchEvent(event)).toBe(false)
		expect(event.defaultPrevented).toBe(true)
	})

	it("prevents native submission before rethrowing compatibility errors", () => {
		let mountedForm: FormInstance<TestSchema> | undefined

		function View() {
			const form = useForm(definition, {
				defaultValues: defaultValues(),
			})
			mountedForm = form

			return <testKit.Form aria-label="Profile" form={form} />
		}

		render(<View />)

		if (mountedForm === undefined) {
			throw new Error("Expected form to mount")
		}

		const snapshot = mountedForm.getSnapshot()
		const nameField = snapshot.resolvedUi.fieldsByPath.name
		Object.defineProperty(mountedForm, "getSnapshot", {
			configurable: true,
			value: () => ({
				...snapshot,
				resolvedUi: {
					...snapshot.resolvedUi,
					fieldsByPath: {
						...snapshot.resolvedUi.fieldsByPath,
						name: {
							...nameField,
							disabled: true,
						},
					},
				},
			}),
		})

		const form = screen.getByRole("form", { name: "Profile" })
		const event = new Event("submit", {
			bubbles: true,
			cancelable: true,
		})
		const errors: Error[] = []
		function handleError(errorEvent: ErrorEvent): void {
			errors.push(errorEvent.error as Error)
			errorEvent.preventDefault()
		}

		window.addEventListener("error", handleError)
		form.dispatchEvent(event)
		window.removeEventListener("error", handleError)

		expect(errors[0]?.message).toContain(
			'Classic form cannot preserve field "name"',
		)
		expect(event.defaultPrevented).toBe(true)
	})
})
