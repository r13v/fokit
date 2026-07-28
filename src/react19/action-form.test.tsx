"use client"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { FormResult } from "../core/form-result.js"
import { defineControl } from "../react/control.js"
import { createFormKit } from "../react/create-form-kit.js"
import { useFormContext } from "../react/form-context.js"
import { useFormState } from "../react/hooks.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	SectionSlotProps,
} from "../react/slots.js"
import type { FormInstance } from "../react/use-form.js"
import { assertActionFormCompatible } from "./action-form.js"
import { ActionForm, ActionSubmit } from "./index.js"

type Values = {
	readonly name: string
	readonly email: string
	readonly archivedNote?: string
}

type Schema = StandardSchemaV1<Values>

const textControl = defineControl<string | undefined>({
	component({ path, value, setValue, blur, input, disabled, readOnly }) {
		return (
			<input
				aria-label={path}
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => setValue(event.currentTarget.value)}
				readOnly={readOnly}
				ref={input.ref}
				value={value ?? ""}
			/>
		)
	},
	formData: {
		mode: "native",
		serialize(value, details) {
			return value === undefined
				? []
				: [
						{
							name: details.name,
							value,
						},
					]
		},
	},
})

const unavailableControl = defineControl<string | undefined>({
	component({ path, value }) {
		return <output aria-label={path}>{value}</output>
	},
	formData: {
		mode: "none",
	},
})

const nativeWithoutSerializer = defineControl<string | undefined>({
	component({ path, value, input, disabled }) {
		return (
			<input
				aria-label={path}
				disabled={disabled}
				name={input.name}
				readOnly
				value={value ?? ""}
			/>
		)
	},
	formData: {
		mode: "native",
	},
})

const kit = createFormKit({
	controls: {
		text: textControl,
		unavailable: unavailableControl,
		nativeWithoutSerializer,
	},
	slots: {
		Field: FieldSlot,
		Section: SectionSlot,
		Array: ArraySlot,
		ArrayItem: ArrayItemSlot,
		ErrorMessage,
	},
})

const definition = kit.defineForm({
	schema: createSchema(validateValues),
	ui: [
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
		},
	],
})

describe("React 19 ActionForm", () => {
	it("keeps the supplied Action on the native form without prevalidating or preventing a valid dispatch", async () => {
		const validate = vi.fn(validateValues)
		const action = vi.fn()
		const submittedEvents: boolean[] = []

		render(
			<ActionForm
				aria-label="Profile"
				action={action}
				defaultValues={defaultValues()}
				definition={kit.defineForm({
					schema: createSchema(validate),
					ui: [
						{
							kind: "field",
							path: "name",
							control: "text",
						},
					],
				})}
				kit={kit}
				onSubmitCapture={(event) => {
					submittedEvents.push(event.defaultPrevented)
				}}
			>
				<StateProbe />
				<ActionSubmit>Save</ActionSubmit>
			</ActionForm>,
		)

		const form = screen.getByRole("form", { name: "Profile" })
		const event = new Event("submit", {
			bubbles: true,
			cancelable: true,
		})

		expect(form.dispatchEvent(event)).toBe(false)
		expect(submittedEvents).toEqual([false])
		expect(validate).not.toHaveBeenCalled()
		await waitFor(() => {
			expect(screen.getByTestId("submit-count").textContent).toBe("1")
			expect(screen.getByTestId("submitting").textContent).toBe("true")
		})
	})

	it("blocks only disabled or already-pending submissions", async () => {
		const action = vi.fn()

		render(
			<ActionForm
				aria-label="Disabled profile"
				action={action}
				defaultValues={defaultValues()}
				definition={definition}
				disabled
				kit={kit}
			>
				<StateProbe />
				<button type="submit">Save</button>
			</ActionForm>,
		)

		const disabledForm = screen.getByRole("form", {
			name: "Disabled profile",
		})
		const disabledEvent = new Event("submit", {
			bubbles: true,
			cancelable: true,
		})

		expect(disabledForm.dispatchEvent(disabledEvent)).toBe(false)
		expect(disabledEvent.defaultPrevented).toBe(true)
		expect(screen.getByTestId("submit-count").textContent).toBe("0")

		render(
			<ActionForm
				aria-label="Pending profile"
				action={action}
				defaultValues={defaultValues()}
				definition={definition}
				kit={kit}
			>
				<StateProbe />
				<button type="submit">Save</button>
			</ActionForm>,
		)

		const pendingForm = screen.getByRole("form", {
			name: "Pending profile",
		})
		const firstEvent = new Event("submit", {
			bubbles: true,
			cancelable: true,
		})
		const secondEvent = new Event("submit", {
			bubbles: true,
			cancelable: true,
		})

		expect(pendingForm.dispatchEvent(firstEvent)).toBe(false)
		await waitFor(() => {
			expect(screen.getAllByTestId("submit-count").at(-1)?.textContent).toBe(
				"1",
			)
		})
		expect(pendingForm.dispatchEvent(secondEvent)).toBe(false)
		expect(secondEvent.defaultPrevented).toBe(true)
	})

	it("applies hydrated error results once, exposes errors, and focuses the fallback target", async () => {
		const action = vi.fn()

		function View({ result }: { readonly result: FormResult | null }) {
			return (
				<ActionForm
					aria-label="Profile"
					action={action}
					defaultValues={defaultValues()}
					definition={kit.defineForm({
						schema: createSchema(() => ({
							value: defaultValues(),
						})),
						ui: [
							{
								kind: "field",
								path: "name",
								control: "text",
								visible: false,
							},
						],
					})}
					kit={kit}
					result={result}
				>
					<StateProbe />
					<button type="submit">Save</button>
				</ActionForm>
			)
		}

		const { rerender } = render(<View result={null} />)
		const form = screen.getByRole("form", { name: "Profile" })
		form.dispatchEvent(
			new Event("submit", {
				bubbles: true,
				cancelable: true,
			}),
		)

		rerender(
			<View
				result={{
					status: "error",
					issues: [
						{
							source: "server",
							message: "Server rejected the profile",
							path: "name",
						},
					],
				}}
			/>,
		)

		await waitFor(() => {
			expect(screen.getByText("Server rejected the profile")).toBe(
				document.activeElement,
			)
		})
		expect(screen.getByTestId("submit-count").textContent).toBe("1")
		expect(screen.getByTestId("submitting").textContent).toBe("false")
	})

	it("applies a pre-hydration error result without changing typed defaults", async () => {
		render(
			<ActionForm
				aria-label="Profile"
				action={noopAction}
				defaultValues={defaultValues()}
				definition={definition}
				kit={kit}
				result={{
					status: "error",
					issues: [
						{
							source: "schema",
							message: "Raw submitted email is invalid",
							path: "email",
						},
					],
				}}
			>
				<StateProbe />
			</ActionForm>,
		)

		await waitFor(() => {
			expect(screen.getByText("Raw submitted email is invalid")).not.toBeNull()
		})
		expect((screen.getByLabelText("name") as HTMLInputElement).value).toBe(
			"Ada",
		)
		expect(screen.getByTestId("submit-count").textContent).toBe("1")
	})

	it("renders ActionSubmit as an unstyled native submit button using Fokit and Action pending state", async () => {
		const pending = createDeferred<void>()

		render(
			<ActionForm
				aria-label="Profile"
				action={vi.fn((_formData: FormData) => pending.promise)}
				defaultValues={defaultValues()}
				definition={definition}
				kit={kit}
			>
				<ActionSubmit className="primary" disabled={false}>
					Save
				</ActionSubmit>
			</ActionForm>,
		)

		const button = screen.getByRole("button", {
			name: "Save",
		}) as HTMLButtonElement
		expect(button.type).toBe("submit")
		expect(button.className).toBe("primary")
		expect(button.disabled).toBe(false)

		await userEvent.click(button)
		await waitFor(() => {
			expect(button.disabled).toBe(true)
		})
		pending.resolve()
	})

	it("throws before dispatch when active controls cannot be represented in Action FormData", () => {
		let snapshot: ReturnType<FormInstance<Schema>["getSnapshot"]> | undefined

		function UnavailableView() {
			return (
				<ActionForm
					aria-label="Profile"
					action={noopAction}
					defaultValues={{
						name: "Ada",
						email: "ada@example.test",
						archivedNote: "keep me",
					}}
					definition={kit.defineForm({
						schema: createSchema(validateValues),
						ui: [
							{
								kind: "field",
								path: "archivedNote",
								control: "unavailable",
							},
						],
					})}
					kit={kit}
				>
					<SnapshotProbe
						onSnapshot={(nextSnapshot) => {
							snapshot = nextSnapshot
						}}
					/>
				</ActionForm>
			)
		}

		render(<UnavailableView />)

		expect(() =>
			assertActionFormCompatible(requireSnapshot(snapshot), kit.controls),
		).toThrow(/cannot submit field "archivedNote".*mode "none"/i)
	})

	it("rejects preserved disabled native controls without serializers", () => {
		let snapshot: ReturnType<FormInstance<Schema>["getSnapshot"]> | undefined

		render(
			<ActionForm
				aria-label="Profile"
				action={noopAction}
				defaultValues={defaultValues({
					archivedNote: "hidden",
				})}
				definition={kit.defineForm({
					schema: createSchema(validateValues),
					ui: [
						{
							kind: "field",
							path: "archivedNote",
							control: "nativeWithoutSerializer",
							disabled: true,
						},
					],
				})}
				kit={kit}
			>
				<SnapshotProbe
					onSnapshot={(nextSnapshot) => {
						snapshot = nextSnapshot
					}}
				/>
			</ActionForm>,
		)

		expect(() =>
			assertActionFormCompatible(requireSnapshot(snapshot), kit.controls),
		).toThrow(/without a serializer/i)
	})

	it("rejects owned native form and submit props", () => {
		const forbiddenFormProps = {
			onSubmit: () => undefined,
		}
		const forbiddenSubmitProps = {
			type: "button",
		}

		expect(() =>
			render(
				<ActionForm
					action={noopAction}
					defaultValues={defaultValues()}
					definition={definition}
					kit={kit}
					{...forbiddenFormProps}
				/>,
			),
		).toThrow(/Fokit owns the onSubmit form prop/)

		expect(() =>
			render(<ActionSubmit {...forbiddenSubmitProps}>Save</ActionSubmit>),
		).toThrow(/Fokit owns the type submit prop/)
	})
})

function StateProbe() {
	const form = useFormContext<Schema>()
	const state = useFormState(form, (snapshot) => ({
		isSubmitting: snapshot.isSubmitting,
		submitCount: snapshot.submitCount,
	}))

	return (
		<>
			<output data-testid="submitting">{String(state.isSubmitting)}</output>
			<output data-testid="submit-count">{String(state.submitCount)}</output>
		</>
	)
}

function SnapshotProbe({
	onSnapshot,
}: {
	readonly onSnapshot: (
		snapshot: ReturnType<FormInstance<Schema>["getSnapshot"]>,
	) => void
}) {
	const form = useFormContext<Schema>()
	onSnapshot(form.getSnapshot())
	return null
}

function requireSnapshot(
	snapshot: ReturnType<FormInstance<Schema>["getSnapshot"]> | undefined,
) {
	if (snapshot === undefined) {
		throw new Error("No Fokit form snapshot was available")
	}

	return snapshot
}

function defaultValues(values: Partial<Values> = {}): Values {
	return {
		name: "Ada",
		email: "ada@example.test",
		...values,
	}
}

function createSchema(validate: Schema["~standard"]["validate"]): Schema {
	return {
		"~standard": {
			version: 1,
			vendor: "fokit-test",
			validate,
		},
	} as Schema
}

function validateValues(value: unknown): StandardSchemaV1.Result<Values> {
	return {
		value: value as Values,
	}
}

function noopAction(_formData: FormData): void {}

type Deferred<Value> = {
	readonly promise: Promise<Value>
	resolve(value: Value): void
}

function createDeferred<Value>(): Deferred<Value> {
	let resolve!: (value: Value) => void
	const promise = new Promise<Value>((promiseResolve) => {
		resolve = promiseResolve
	})

	return {
		promise,
		resolve,
	}
}

function FieldSlot({
	rootProps,
	label,
	labelProps,
	control,
	errors,
}: FieldSlotProps) {
	return (
		<div {...rootProps}>
			{label === undefined ? null : (
				<label {...labelProps} htmlFor={labelProps.htmlFor ?? "field"}>
					{label}
				</label>
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
