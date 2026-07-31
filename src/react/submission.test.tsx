"use client"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { defineControl } from "./control.js"
import { createFormKit } from "./create-form-kit.js"
import { useFormContext } from "./form-context.js"
import { useFormState } from "./hooks.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	SectionSlotProps,
} from "./slots.js"
import type { FormInstance } from "./use-form.js"
import { createForm, useForm } from "./use-form.js"

type ProfileInput = {
	readonly name: string
	readonly email: string
}

type ProfileOutput = ProfileInput & {
	readonly slug: string
}

type TestSchema = StandardSchemaV1<ProfileInput, ProfileOutput>

type Deferred<Value> = {
	readonly promise: Promise<Value>
	resolve(value: Value): void
	reject(error: unknown): void
}

const textControl = defineControl<string>({
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
				value={value}
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
	},
	slots: {
		Field: FieldSlot,
		Section: SectionSlot,
		Array: ArraySlot,
		ArrayItem: ArrayItemSlot,
		ErrorMessage,
	},
})

const profileUi = [
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
] as const

const definition = kit.defineForm(createSchema(validateProfile))({
	ui: profileUi,
})

function defaultValues(values: Partial<ProfileInput> = {}): ProfileInput {
	return {
		name: "Ada",
		email: "ada@example.test",
		...values,
	}
}

describe("classic React submission", () => {
	it("submits an instance created outside React", async () => {
		const onSubmit = vi.fn()
		const form = createForm(definition, {
			defaultValues: defaultValues(),
			onSubmit,
		})

		render(
			<kit.Form aria-label="Profile" form={form}>
				<kit.Fields />
				<button type="submit">Save</button>
			</kit.Form>,
		)

		await form.submit()

		expect(onSubmit).toHaveBeenCalledTimes(1)
		expect(onSubmit.mock.calls[0]?.[0].form).toBe(form)
		expect(onSubmit.mock.calls[0]?.[0].value).toEqual({
			...defaultValues(),
			slug: "ada",
		})
	})

	it("restores an external submit callback after React unmounts", async () => {
		const externalOnSubmit = vi.fn()
		const reactOnSubmit = vi.fn()
		const form = createForm(definition, {
			defaultValues: defaultValues(),
			onSubmit: externalOnSubmit,
		})

		function BoundForm() {
			const boundForm = useForm(form, {
				onSubmit: reactOnSubmit,
			})
			return (
				<kit.Form form={boundForm}>
					<kit.Fields />
				</kit.Form>
			)
		}

		const mounted = render(<BoundForm />)
		await form.submit()
		expect(reactOnSubmit).toHaveBeenCalledTimes(1)
		expect(externalOnSubmit).not.toHaveBeenCalled()

		mounted.unmount()
		render(
			<kit.Form form={form}>
				<kit.Fields />
			</kit.Form>,
		)
		await form.submit()

		expect(reactOnSubmit).toHaveBeenCalledTimes(1)
		expect(externalOnSubmit).toHaveBeenCalledTimes(1)
	})

	it("captures input, native FormData, and the submitter before pending UI changes", async () => {
		const validation = createDeferred<StandardSchemaV1.Result<ProfileOutput>>()
		const schema = createSchema(() => validation.promise)
		const onSubmit = vi.fn()

		function View() {
			return (
				<kit.AutoForm
					aria-label="Profile"
					definition={kit.defineForm(schema)({
						ui: profileUi,
					})}
					defaultValues={defaultValues()}
					onSubmit={onSubmit}
				>
					<StateProbe />
					<kit.Submit name="intent" value="save">
						Save
					</kit.Submit>
				</kit.AutoForm>
			)
		}

		render(<View />)
		await userEvent.click(screen.getByRole("button", { name: "Save" }))

		expect(screen.getByTestId("submitting").textContent).toBe("true")
		expect(screen.getByTestId("submit-count").textContent).toBe("1")
		expect(
			(screen.getByRole("button", { name: "Save" }) as HTMLButtonElement)
				.disabled,
		).toBe(true)
		expect(onSubmit).not.toHaveBeenCalled()

		validation.resolve({
			value: {
				...defaultValues(),
				slug: "ada",
			},
		})

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledTimes(1)
		})
		const submitContext = onSubmit.mock.calls[0]?.[0]
		expect(submitContext.input).toEqual(defaultValues())
		expect(submitContext.value).toEqual({
			...defaultValues(),
			slug: "ada",
		})
		expect(submitContext.formData.get("name")).toBe("Ada")
		expect(submitContext.formData.get("intent")).toBe("save")
		expect(screen.getByTestId("submitting").textContent).toBe("false")
		expect(screen.getByDisplayValue("Ada")).not.toBeNull()
	})

	it("skips disabled forms without validation or submit callbacks", async () => {
		const validate = vi.fn(validateProfile)
		const onSubmit = vi.fn()

		render(
			<kit.AutoForm
				aria-label="Profile"
				definition={kit.defineForm(createSchema(validate))({
					ui: profileUi,
				})}
				defaultValues={defaultValues()}
				disabled
				onSubmit={onSubmit}
			>
				<StateProbe />
				<button type="submit">Save</button>
			</kit.AutoForm>,
		)

		fireEvent.submit(screen.getByRole("form", { name: "Profile" }))
		await flushMicrotasks()

		expect(validate).not.toHaveBeenCalled()
		expect(onSubmit).not.toHaveBeenCalled()
		expect(screen.getByTestId("submitting").textContent).toBe("false")
		expect(screen.getByTestId("submit-count").textContent).toBe("0")
	})

	it("focuses the first editable invalid field, then falls back to summary issues", async () => {
		const fieldFocus = vi.spyOn(HTMLElement.prototype, "focus")

		render(
			<kit.AutoForm
				aria-label="Profile"
				definition={definition}
				defaultValues={defaultValues({
					name: "",
					email: "invalid",
				})}
			>
				<button type="submit">Save</button>
			</kit.AutoForm>,
		)

		await userEvent.click(screen.getByRole("button", { name: "Save" }))

		await waitFor(() => {
			expect(document.activeElement).toBe(screen.getByLabelText("name"))
		})
		expect(screen.getByText("Name is required")).not.toBeNull()
		fieldFocus.mockRestore()

		render(
			<kit.AutoForm
				aria-label="Form-level profile"
				definition={kit.defineForm(
					createSchema(() => ({
						issues: [
							{
								message: "The profile cannot be saved",
							},
						],
					})),
				)({ ui: profileUi })}
				defaultValues={defaultValues()}
			>
				<button type="submit">Save</button>
			</kit.AutoForm>,
		)

		await userEvent.click(
			screen.getAllByRole("button", { name: "Save" }).at(-1) as HTMLElement,
		)

		await waitFor(() => {
			expect(document.activeElement?.textContent).toBe(
				"The profile cannot be saved",
			)
		})
	})

	it("keeps duplicate summary issues independently keyed and focusable", async () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
		try {
			render(
				<kit.AutoForm
					aria-label="Duplicate summary"
					definition={kit.defineForm(
						createSchema(() => ({
							issues: [
								{ message: "The profile cannot be saved" },
								{ message: "The profile cannot be saved" },
							],
						})),
					)({ ui: profileUi })}
					defaultValues={defaultValues()}
				>
					<button type="submit">Save duplicates</button>
				</kit.AutoForm>,
			)

			await userEvent.click(
				screen.getByRole("button", { name: "Save duplicates" }),
			)

			await waitFor(() => {
				const issues = screen.getAllByText("The profile cannot be saved")
				expect(issues).toHaveLength(2)
				expect(document.activeElement).toBe(issues[0])
			})
			expect(
				consoleError.mock.calls.some((call) =>
					String(call[0]).includes("same key"),
				),
			).toBe(false)
		} finally {
			consoleError.mockRestore()
		}
	})

	it("keeps submit validation authoritative without installing stale issues after edits", async () => {
		const validation = createDeferred<StandardSchemaV1.Result<ProfileOutput>>()
		const validate = vi.fn(() => validation.promise)
		const onSubmit = vi.fn()
		let form: FormInstance<TestSchema> | undefined

		function View() {
			form = useForm(
				kit.defineForm(createSchema(validate))({
					ui: profileUi,
				}),
				{
					defaultValues: defaultValues({
						email: "bad",
					}),
					onSubmit,
				},
			)

			return (
				<kit.Form aria-label="Profile" form={form}>
					<kit.Fields />
					<button type="submit">Save</button>
				</kit.Form>
			)
		}

		render(<View />)
		await userEvent.click(screen.getByRole("button", { name: "Save" }))
		expect(validate).toHaveBeenCalledTimes(1)
		expect(form?.getSnapshot().submitCount).toBe(1)

		form?.setValue("email", "fixed@example.test")
		validation.resolve({
			issues: [
				{
					message: "Email is invalid",
					path: ["email"],
				},
			],
		})

		await waitFor(() => {
			expect(screen.queryByText("Email is invalid")).toBeNull()
		})
		expect(onSubmit).not.toHaveBeenCalled()
		expect(form?.getSnapshot().validationStatus).toBe("unvalidated")
		expect(form?.getSnapshot().isSubmitting).toBe(false)
	})

	it("shares one in-flight lifecycle across concurrent native and imperative submits", async () => {
		const validation = createDeferred<StandardSchemaV1.Result<ProfileOutput>>()
		const validate = vi.fn(() => validation.promise)
		const onSubmit = vi.fn(() => Promise.resolve())
		let form: FormInstance<TestSchema> | undefined

		function View() {
			form = useForm(
				kit.defineForm(createSchema(validate))({
					ui: profileUi,
				}),
				{
					defaultValues: defaultValues(),
					onSubmit,
				},
			)

			return (
				<kit.Form aria-label="Profile" form={form}>
					<kit.Fields />
					<kit.Submit>Save</kit.Submit>
				</kit.Form>
			)
		}

		render(<View />)
		await userEvent.click(screen.getByRole("button", { name: "Save" }))
		const imperativePromise = form?.submit()

		expect(validate).toHaveBeenCalledTimes(1)
		expect(form?.getSnapshot().submitCount).toBe(1)

		validation.resolve({
			value: {
				...defaultValues(),
				slug: "ada",
			},
		})
		await imperativePromise

		expect(onSubmit).toHaveBeenCalledTimes(1)
		expect(form?.getSnapshot().isSubmitting).toBe(false)
	})

	it("propagates submit callback failures after restoring pending state", async () => {
		const failure = new Error("save failed")
		const onSubmit = vi.fn(() => Promise.reject(failure))
		let form: FormInstance<TestSchema> | undefined

		function View() {
			form = useForm(definition, {
				defaultValues: defaultValues(),
				onSubmit,
			})

			return (
				<kit.Form aria-label="Profile" form={form}>
					<kit.Fields />
					<button type="submit">Save</button>
				</kit.Form>
			)
		}

		render(<View />)

		await expect(form?.submit()).rejects.toThrow(failure)
		expect(form?.getSnapshot().isSubmitting).toBe(false)
		expect(screen.getByDisplayValue("Ada")).not.toBeNull()
	})

	it("rejects imperative submit when compatibility validation prevents submission", async () => {
		let form: FormInstance<TestSchema> | undefined

		function View() {
			form = useForm(definition, {
				defaultValues: defaultValues(),
			})

			return (
				<kit.Form aria-label="Profile" form={form}>
					<kit.Fields />
				</kit.Form>
			)
		}

		render(<View />)

		if (form === undefined) {
			throw new Error("Expected form to mount")
		}

		const snapshot = form.getSnapshot()
		const nameField = snapshot.resolvedUi.fieldsByPath.name
		Object.defineProperty(form, "getSnapshot", {
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
		const errors: Error[] = []
		function handleError(errorEvent: ErrorEvent): void {
			errors.push(errorEvent.error as Error)
			errorEvent.preventDefault()
		}

		window.addEventListener("error", handleError)
		await expect(form.submit()).rejects.toThrow(
			'Classic form cannot preserve field "name"',
		)
		window.removeEventListener("error", handleError)

		expect(errors[0]?.message).toContain(
			'Classic form cannot preserve field "name"',
		)
	})

	it("rejects imperative submit when no native form is mounted", async () => {
		let form: FormInstance<TestSchema> | undefined

		function View() {
			form = useForm(definition, {
				defaultValues: defaultValues(),
			})

			return null
		}

		render(<View />)

		await expect(form?.submit()).rejects.toThrow(
			"Cannot submit a Form Please form before kit.Form is mounted",
		)
	})
})

function StateProbe() {
	const contextForm = useRequiredForm()
	const state = useFormState(contextForm, (snapshot) => ({
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

function useRequiredForm(): FormInstance<TestSchema> {
	return useFormContext() as FormInstance<TestSchema>
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
				<label {...labelProps} htmlFor={labelProps.htmlFor ?? "test-field"}>
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

function createDeferred<Value>(): Deferred<Value> {
	let resolve!: (value: Value) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<Value>((promiseResolve, promiseReject) => {
		resolve = promiseResolve
		reject = promiseReject
	})

	return {
		promise,
		resolve,
		reject,
	}
}

function createSchema(
	validate: TestSchema["~standard"]["validate"],
): TestSchema {
	return {
		"~standard": {
			version: 1,
			vendor: "form-please-test",
			validate,
		},
	} as TestSchema
}

function validateProfile(
	value: unknown,
): StandardSchemaV1.Result<ProfileOutput> {
	const input = value as ProfileInput
	const issues: StandardSchemaV1.Issue[] = []

	if (input.name.trim() === "") {
		issues.push({
			message: "Name is required",
			path: ["name"],
		})
	}

	if (!input.email.includes("@")) {
		issues.push({
			message: "Email is invalid",
			path: ["email"],
		})
	}

	return issues.length === 0
		? {
				value: {
					...input,
					slug: input.name.toLowerCase(),
				},
			}
		: {
				issues,
			}
}

async function flushMicrotasks(): Promise<void> {
	await Promise.resolve()
	await Promise.resolve()
}
