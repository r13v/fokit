"use client"

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { act, StrictMode } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
	type ControlMetadata,
	type ImperativeFormIssue,
	normalizeDefinition,
	type StandardSchema,
	type UiNode,
} from "../core/index.js"
import { useArrayField, useField, useFormState, useValue } from "./hooks.js"
import type { FormInstance } from "./use-form.js"
import { useForm } from "./use-form.js"

type ProfileValues = {
	name: string
	email: string
	companyName?: string
	contacts: readonly {
		value: string
	}[]
}

type ProfileContext = {
	readonly locked: boolean
}

type ProfileControls = {
	readonly text: ControlMetadata<string | undefined>
}

const schema = {} as StandardSchema<ProfileValues>
const controls = {
	text: {
		formData: {
			mode: "native",
		},
	},
} satisfies ProfileControls

const definition = normalizeDefinition<
	typeof schema,
	ProfileControls,
	ProfileContext
>({
	schema,
	controls,
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
		},
		{
			kind: "field",
			path: "email",
			control: "text",
		},
		{
			kind: "field",
			path: "companyName",
			control: "text",
			disabled: (_values, { context }) => context.locked,
		},
		{
			kind: "array",
			path: "contacts",
			itemDefault: {
				value: "",
			},
			children: [
				{
					kind: "field",
					path: "value",
					control: "text",
				},
			],
		},
	] satisfies readonly UiNode<ProfileValues, ProfileControls, ProfileContext>[],
})

function defaultValues(): ProfileValues {
	return {
		name: "Ada",
		email: "ada@example.test",
		contacts: [{ value: "ada@example.test" }],
	}
}

function context(locked = false): ProfileContext {
	return {
		locked,
	}
}

describe("React form hooks", () => {
	it("keeps one useForm instance while using the latest option callbacks", () => {
		const firstBeforeUpdate = vi.fn()
		const latestBeforeUpdate = vi.fn(() => [
			{ type: "set" as const, path: "name", value: "Katherine" },
		])
		const firstOnUpdate = vi.fn()
		const latestOnUpdate = vi.fn()
		const seen: FormInstance<typeof schema, ProfileContext>[] = []

		function View({
			beforeUpdate,
			onUpdate,
		}: {
			readonly beforeUpdate?: typeof firstBeforeUpdate
			readonly onUpdate?: typeof firstOnUpdate
		}) {
			const form = useForm(definition, {
				defaultValues: defaultValues(),
				context: context(),
				beforeUpdate,
				onUpdate,
			})
			seen.push(form)
			const value = useValue(form, "name")

			return (
				<button type="button" onClick={() => form.setValue("name", "Grace")}>
					{value}
				</button>
			)
		}

		const { rerender } = render(
			<View beforeUpdate={firstBeforeUpdate} onUpdate={firstOnUpdate} />,
		)
		rerender(
			<View beforeUpdate={latestBeforeUpdate} onUpdate={latestOnUpdate} />,
		)
		fireEvent.click(screen.getByRole("button"))

		expect(new Set(seen).size).toBe(1)
		expect(firstBeforeUpdate).not.toHaveBeenCalled()
		expect(firstOnUpdate).not.toHaveBeenCalled()
		expect(latestBeforeUpdate).toHaveBeenCalledTimes(1)
		expect(latestOnUpdate).toHaveBeenCalledTimes(1)
		expect(screen.getByRole("button").textContent).toBe("Katherine")
	})

	it("replaces context after commit without recreating the form", async () => {
		const seen: FormInstance<typeof schema, ProfileContext>[] = []

		function View({ locked }: { readonly locked: boolean }) {
			const form = useForm(definition, {
				defaultValues: defaultValues(),
				context: context(locked),
			})
			seen.push(form)
			const disabled = useFormState(
				form,
				(snapshot) => snapshot.resolvedUi.fieldsByPath.companyName?.disabled,
			)

			return <output>{String(disabled)}</output>
		}

		const { rerender } = render(<View locked={false} />)
		expect(screen.getByText("false").textContent).toBe("false")

		rerender(<View locked={true} />)

		await waitFor(() => {
			expect(screen.getByText("true").textContent).toBe("true")
		})
		expect(new Set(seen).size).toBe(1)
	})

	it("updates root disabled and read-only options without recreating the form", async () => {
		const seen: FormInstance<typeof schema, ProfileContext>[] = []

		function View({
			disabled,
			readOnly,
		}: {
			readonly disabled: boolean
			readonly readOnly: boolean
		}) {
			const form = useForm(definition, {
				defaultValues: defaultValues(),
				context: context(),
				disabled,
				readOnly,
			})
			seen.push(form)
			const state = useFormState(
				form,
				(snapshot) =>
					`${String(snapshot.resolvedUi.fieldsByPath.name?.disabled)}:${String(
						snapshot.resolvedUi.fieldsByPath.name?.readOnly,
					)}`,
			)

			return <output>{state}</output>
		}

		const { rerender } = render(<View disabled={false} readOnly={false} />)
		expect(screen.getByText("false:false").textContent).toBe("false:false")

		rerender(<View disabled={true} readOnly={true} />)

		await waitFor(() => {
			expect(screen.getByText("true:true").textContent).toBe("true:true")
		})
		expect(new Set(seen).size).toBe(1)
	})

	it("rerenders only hooks whose selected path changes", () => {
		let form: FormInstance<typeof schema, ProfileContext> | undefined
		const counters = {
			name: 0,
			email: 0,
			field: 0,
		}

		function NameValue() {
			if (form === undefined) {
				throw new Error("form missing")
			}
			counters.name += 1
			return <span data-testid="name">{useValue(form, "name")}</span>
		}

		function EmailValue() {
			if (form === undefined) {
				throw new Error("form missing")
			}
			counters.email += 1
			return <span data-testid="email">{useValue(form, "email")}</span>
		}

		function EmailField() {
			if (form === undefined) {
				throw new Error("form missing")
			}
			counters.field += 1
			const field = useField(form, "email")
			return <span data-testid="field">{String(field.meta.dirty)}</span>
		}

		function View() {
			form = useForm(definition, {
				defaultValues: defaultValues(),
				context: context(),
			})

			return (
				<>
					<NameValue />
					<EmailValue />
					<EmailField />
					<button type="button" onClick={() => form?.setValue("name", "Grace")}>
						change
					</button>
				</>
			)
		}

		render(<View />)
		fireEvent.click(screen.getByRole("button", { name: "change" }))

		expect(screen.getByTestId("name").textContent).toBe("Grace")
		expect(screen.getByTestId("email").textContent).toBe("ada@example.test")
		expect(counters).toEqual({
			name: 2,
			email: 1,
			field: 1,
		})
	})

	it("exposes direct field and array metadata with stable row items", () => {
		let form: FormInstance<typeof schema, ProfileContext> | undefined
		const seenKeys: string[][] = []

		function Contacts() {
			if (form === undefined) {
				throw new Error("form missing")
			}
			const array = useArrayField(form, "contacts")
			const field = useField(form, "contacts.0.value")
			seenKeys.push(array.items.map((item) => item.key))

			return (
				<>
					<output data-testid="array-errors">
						{array.meta.errors.map((issue) => issue.message).join(",")}
					</output>
					<output data-testid="field-errors">
						{field.meta.errors.map((issue) => issue.message).join(",")}
					</output>
					<output data-testid="rows">
						{array.items.map((item) => `${item.key}:${item.index}`).join("|")}
					</output>
					<button
						type="button"
						onClick={() =>
							form?.setErrors([
								directIssue("contacts", "Array issue"),
								directIssue("contacts.0.value", "Child issue"),
							])
						}
					>
						errors
					</button>
					<button type="button" onClick={() => array.append({ value: "new" })}>
						append
					</button>
					<button type="button" onClick={() => array.move(0, 1)}>
						move
					</button>
				</>
			)
		}

		function View() {
			form = useForm(definition, {
				defaultValues: defaultValues(),
				context: context(),
			})
			return <Contacts />
		}

		render(<View />)
		const firstKey = seenKeys.at(-1)?.[0]

		fireEvent.click(screen.getByRole("button", { name: "errors" }))
		expect(screen.getByTestId("array-errors").textContent).toBe("Array issue")
		expect(screen.getByTestId("field-errors").textContent).toBe("Child issue")

		fireEvent.click(screen.getByRole("button", { name: "append" }))
		const keysAfterAppend = seenKeys.at(-1)
		expect(keysAfterAppend?.[0]).toBe(firstKey)
		expect(keysAfterAppend).toHaveLength(2)

		fireEvent.click(screen.getByRole("button", { name: "move" }))
		const keysAfterMove = seenKeys.at(-1)
		expect(keysAfterMove?.[1]).toBe(firstKey)
		expect(screen.getByTestId("rows").textContent).toContain(":1")
	})

	it("registers mounted refs and unregisters them on unmount", () => {
		let form: FormInstance<typeof schema, ProfileContext> | undefined
		const focus = vi.spyOn(HTMLElement.prototype, "focus")

		function Field() {
			if (form === undefined) {
				throw new Error("form missing")
			}
			const field = useField(form, "name")
			return (
				<input
					aria-label="Name"
					ref={field.ref}
					value={field.value ?? ""}
					readOnly
				/>
			)
		}

		function View({ show }: { readonly show: boolean }) {
			form = useForm(definition, {
				defaultValues: defaultValues(),
				context: context(),
			})
			return show ? <Field /> : null
		}

		const { rerender } = render(<View show={true} />)
		form?.focus("name")
		rerender(<View show={false} />)
		form?.focus("name")

		expect(focus).toHaveBeenCalledTimes(1)
		focus.mockRestore()
	})

	it("uses the server snapshot for equivalent hydration and skips lifecycle hooks during Strict Mode replay", async () => {
		const beforeUpdate = vi.fn()
		const onUpdate = vi.fn()

		function View() {
			const form = useForm(definition, {
				defaultValues: defaultValues(),
				context: context(),
				beforeUpdate,
				onUpdate,
			})
			const name = useValue(form, "name")
			const dirty = useFormState(form, (snapshot) => snapshot.isDirty)

			return (
				<StrictMode>
					<span>
						{name}:{String(dirty)}
					</span>
				</StrictMode>
			)
		}

		const html = renderToString(<View />)
		const container = document.createElement("div")
		container.innerHTML = html

		await act(async () => {
			hydrateRoot(container, <View />)
		})

		expect(container.textContent).toBe("Ada:false")
		expect(beforeUpdate).not.toHaveBeenCalled()
		expect(onUpdate).not.toHaveBeenCalled()
	})
})

function directIssue(path: string, message: string): ImperativeFormIssue {
	return {
		source: "manual",
		path,
		message,
	}
}
