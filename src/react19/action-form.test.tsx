"use client"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { getFormFeatureCapability } from "../core/feature-protocol.js"
import type { FormResult } from "../core/form-result.js"
import { createHistoryMiddleware } from "../history/index.js"
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

type NestedValues = {
	readonly items: readonly {
		readonly archivedNote?: string
	}[]
}

type Schema = StandardSchemaV1<Values>
type NestedSchema = StandardSchemaV1<NestedValues>

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

const definition = kit.defineForm(createSchema(validateValues))({
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
	it("renders render nodes while keeping them outside ActionForm compatibility", async () => {
		function NamePreview() {
			const form = useFormContext<Schema>()
			const name = useFormState(form, (snapshot) => snapshot.values.name)
			return <output data-testid="action-preview">{name}</output>
		}
		const action = vi.fn((_formData: FormData) => undefined)
		const renderDefinition = kit.defineForm(createSchema(validateValues))({
			ui: [
				{
					kind: "render",
					id: "name-preview",
					component: NamePreview,
				},
				{
					kind: "field",
					path: "name",
					control: "text",
				},
			],
		})
		const form = kit.createForm(renderDefinition, {
			defaultValues: defaultValues(),
		})

		render(
			<ActionForm action={action} form={form}>
				<ActionSubmit>Save</ActionSubmit>
			</ActionForm>,
		)

		expect(screen.getByTestId("action-preview").textContent).toBe("Ada")
		await userEvent.click(screen.getByRole("button", { name: "Save" }))
		await waitFor(() => {
			expect(action).toHaveBeenCalledTimes(1)
		})
	})

	it("keeps the supplied Action on the native form without prevalidating or preventing a valid dispatch", async () => {
		const validate = vi.fn(validateValues)
		const action = vi.fn((_formData: FormData) => undefined)
		const submittedEvents: boolean[] = []
		const form = kit.createForm(
			kit.defineForm(createSchema(validate))({
				ui: [
					{
						kind: "field",
						path: "name",
						control: "text",
					},
				],
			}),
			{ defaultValues: defaultValues() },
		)

		render(
			<ActionForm
				aria-label="Profile"
				action={action}
				form={form}
				onSubmitCapture={(event) => {
					submittedEvents.push(event.defaultPrevented)
				}}
			>
				<StateProbe />
				<ActionSubmit>Save</ActionSubmit>
			</ActionForm>,
		)

		await userEvent.click(screen.getByRole("button", { name: "Save" }))

		await waitFor(() => {
			expect(action).toHaveBeenCalledTimes(1)
		})
		const formData = action.mock.calls[0]?.[0]
		expect(formData).toBeInstanceOf(FormData)
		expect((formData as FormData).get("name")).toBe("Ada")
		expect(submittedEvents).toEqual([false])
		expect(validate).not.toHaveBeenCalled()
		await waitFor(() => {
			expect(screen.getByTestId("submit-count").textContent).toBe("1")
		})
		expect(screen.getByTestId("submitting").textContent).toBe("false")
	})

	it("blocks only disabled or already-pending submissions", async () => {
		const action = vi.fn()
		const disabledFormInstance = kit.createForm(definition, {
			defaultValues: defaultValues(),
		})

		render(
			<ActionForm
				aria-label="Disabled profile"
				action={action}
				disabled
				form={disabledFormInstance}
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

		const pendingFormInstance = kit.createForm(definition, {
			defaultValues: defaultValues(),
		})
		render(
			<ActionForm
				aria-label="Pending profile"
				action={action}
				form={pendingFormInstance}
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
		const hiddenDefinition = kit.defineForm(
			createSchema(() => ({ value: defaultValues() })),
		)({
			ui: [
				{
					kind: "field",
					path: "name",
					control: "text",
					visible: false,
				},
			],
		})
		const formInstance = kit.createForm(hiddenDefinition, {
			defaultValues: defaultValues(),
		})

		function View({ result }: { readonly result: FormResult | null }) {
			return (
				<ActionForm
					aria-label="Profile"
					action={action}
					form={formInstance}
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
		const form = kit.createForm(definition, { defaultValues: defaultValues() })
		render(
			<ActionForm
				aria-label="Profile"
				action={noopAction}
				form={form}
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

	it("renders ActionSubmit as an unstyled native submit button using Form Please and Action pending state", async () => {
		const pending = createDeferred<void>()
		const form = kit.createForm(definition, { defaultValues: defaultValues() })

		render(
			<ActionForm
				aria-label="Profile"
				action={vi.fn((_formData: FormData) => pending.promise)}
				form={form}
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
		await waitFor(() => {
			expect(button.disabled).toBe(false)
		})
	})

	it.each(["unmount", "form switch"] as const)(
		"finishes an outstanding Action attempt on %s",
		async (lifecycle) => {
			const pending = createDeferred<void>()
			const first = kit.createForm(definition, {
				defaultValues: defaultValues(),
			})
			const second = kit.createForm(definition, {
				defaultValues: defaultValues({ name: "Grace" }),
			})
			const action = vi.fn(() => pending.promise)
			const view = render(
				<ActionForm action={action} form={first}>
					<ActionSubmit>Save</ActionSubmit>
				</ActionForm>,
			)

			await userEvent.click(screen.getByRole("button", { name: "Save" }))
			await waitFor(() => {
				expect(first.getSnapshot().isSubmitting).toBe(true)
			})

			if (lifecycle === "unmount") {
				view.unmount()
			} else {
				view.rerender(
					<ActionForm action={action} form={second}>
						<ActionSubmit>Save</ActionSubmit>
					</ActionForm>,
				)
			}

			expect(first.getSnapshot().isSubmitting).toBe(false)
			pending.resolve()
		},
	)

	it("uses effective restored paths when a history restore happens during a pending Action", async () => {
		const pending = createDeferred<void>()
		const historyFeature = createHistoryMiddleware()
		const form = kit.createForm(definition, {
			defaultValues: defaultValues(),
			middleware: [historyFeature],
		})
		form.setValue("name", "Grace")
		const history = historyFeature.handle(form)

		function View({ result }: { readonly result?: FormResult }) {
			return (
				<ActionForm
					action={vi.fn(() => pending.promise)}
					form={form}
					result={result}
				>
					<ActionSubmit>Save</ActionSubmit>
				</ActionForm>
			)
		}

		const { rerender } = render(<View />)
		await userEvent.click(screen.getByRole("button", { name: "Save" }))
		await waitFor(() => {
			expect(form.getSnapshot().isSubmitting).toBe(true)
		})
		expect(history.undo()).toBe("applied")
		expect(form.getSnapshot().values.name).toBe("Ada")

		rerender(
			<View
				result={{
					status: "error",
					issues: [
						{
							source: "server",
							message: "Stale name error",
							path: "name",
						},
					],
				}}
			/>,
		)
		await waitFor(() => {
			expect(form.getSnapshot().isSubmitting).toBe(false)
		})
		expect(screen.queryByText("Stale name error")).toBeNull()
		pending.resolve()
	})

	it("renders controls and slots from each supplied base, extended, and sibling form", () => {
		const baseControl = defineControl<string>({
			component: () => <output data-testid="base-owned-control" />,
			formData: { mode: "native" },
		})
		const extendedControl = defineControl<string>({
			component: () => <output data-testid="extended-owned-control" />,
			formData: { mode: "native" },
		})
		const siblingControl = defineControl<string>({
			component: () => <output data-testid="sibling-owned-control" />,
			formData: { mode: "native" },
		})
		const baseKit = createFormKit({
			controls: { baseText: baseControl },
			slots: { Field: BaseOwnedField },
		})
		const extendedKit = baseKit.extend({
			controls: { extendedText: extendedControl },
			slots: { Field: ExtendedOwnedField },
		})
		const siblingKit = baseKit.extend({
			controls: { siblingText: siblingControl },
			slots: { Field: SiblingOwnedField },
		})
		const ownedSchema = createSchema(validateValues)
		const baseDefinition = baseKit.defineForm(ownedSchema)({
			ui: [{ kind: "field", path: "name", control: "baseText" }],
		})
		const extendedDefinition = extendedKit.defineForm(ownedSchema)({
			ui: [{ kind: "field", path: "name", control: "extendedText" }],
		})
		const siblingDefinition = siblingKit.defineForm(ownedSchema)({
			ui: [{ kind: "field", path: "name", control: "siblingText" }],
		})
		const baseForm = baseKit.createForm(baseDefinition, {
			defaultValues: defaultValues(),
		})
		const extendedForm = extendedKit.createForm(extendedDefinition, {
			defaultValues: defaultValues(),
		})
		const siblingForm = siblingKit.createForm(siblingDefinition, {
			defaultValues: defaultValues(),
		})
		expect(getFormFeatureCapability(baseForm).getDocument().values).toEqual(
			defaultValues(),
		)

		render(
			<>
				<ActionForm action={noopAction} form={baseForm} />
				<ActionForm action={noopAction} form={extendedForm} />
				<ActionForm action={noopAction} form={siblingForm} />
			</>,
		)

		expect(screen.getByTestId("base-owned-field")).not.toBeNull()
		expect(screen.getByTestId("extended-owned-field")).not.toBeNull()
		expect(screen.getByTestId("sibling-owned-field")).not.toBeNull()
		expect(screen.getByTestId("base-owned-control")).not.toBeNull()
		expect(screen.getByTestId("extended-owned-control")).not.toBeNull()
		expect(screen.getByTestId("sibling-owned-control")).not.toBeNull()
	})

	it("throws before dispatch when active controls cannot be represented in Action FormData", () => {
		let snapshot: ReturnType<FormInstance<Schema>["getSnapshot"]> | undefined
		const unavailableDefinition = kit.defineForm(createSchema(validateValues))({
			ui: [
				{
					kind: "field",
					path: "archivedNote",
					control: "unavailable",
				},
			],
		})
		const form = kit.createForm(unavailableDefinition, {
			defaultValues: defaultValues({ archivedNote: "keep me" }),
		})

		function UnavailableView() {
			return (
				<ActionForm aria-label="Profile" action={noopAction} form={form}>
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
		const incompatibleDefinition = kit.defineForm(createSchema(validateValues))(
			{
				ui: [
					{
						kind: "field",
						path: "archivedNote",
						control: "nativeWithoutSerializer",
						disabled: true,
					},
				],
			},
		)
		const form = kit.createForm(incompatibleDefinition, {
			defaultValues: defaultValues({ archivedNote: "hidden" }),
		})
		expect(() => {
			render(
				<ActionForm aria-label="Profile" action={noopAction} form={form} />,
			)
		}).toThrow(/ActionForm cannot preserve field "archivedNote".*serializer/i)
	})

	it("rejects incompatible controls inside array rows", () => {
		let snapshot:
			| ReturnType<FormInstance<NestedSchema>["getSnapshot"]>
			| undefined
		const nestedSchema = createSchema<NestedValues>((value) => ({
			value: value as NestedValues,
		}))
		const nestedDefinition = kit.defineForm(nestedSchema)({
			ui: [
				{
					kind: "array",
					path: "items",
					itemDefault: {},
					children: [
						{
							kind: "field",
							path: "archivedNote",
							control: "unavailable",
						},
					],
				},
			],
		})
		const form = kit.createForm(nestedDefinition, {
			defaultValues: { items: [{ archivedNote: "keep me" }] },
		})

		render(
			<ActionForm aria-label="Profile" action={noopAction} form={form}>
				<NestedSnapshotProbe
					onSnapshot={(nextSnapshot) => {
						snapshot = nextSnapshot
					}}
				/>
			</ActionForm>,
		)

		expect(() =>
			assertActionFormCompatible(requireSnapshot(snapshot), kit.controls),
		).toThrow(/cannot submit field "items.0.archivedNote".*mode "none"/i)
	})

	it("rejects owned native form and submit props", () => {
		const forbiddenFormProps = {
			onSubmit: () => undefined,
		}
		const forbiddenSubmitProps = {
			type: "button",
		}
		const form = kit.createForm(definition, { defaultValues: defaultValues() })

		expect(() =>
			render(
				<ActionForm action={noopAction} form={form} {...forbiddenFormProps} />,
			),
		).toThrow(/Form Please owns the onSubmit form prop/)

		expect(() =>
			render(<ActionSubmit {...forbiddenSubmitProps}>Save</ActionSubmit>),
		).toThrow(/Form Please owns the type submit prop/)
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

function NestedSnapshotProbe({
	onSnapshot,
}: {
	readonly onSnapshot: (
		snapshot: ReturnType<FormInstance<NestedSchema>["getSnapshot"]>,
	) => void
}) {
	const form = useFormContext<NestedSchema>()
	onSnapshot(form.getSnapshot())
	return null
}

function requireSnapshot<Snapshot>(snapshot: Snapshot | undefined): Snapshot {
	if (snapshot === undefined) {
		throw new Error("No Form Please form snapshot was available")
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

function createSchema<Input>(
	validate: StandardSchemaV1<Input>["~standard"]["validate"],
): StandardSchemaV1<Input> {
	return {
		"~standard": {
			version: 1,
			vendor: "form-please-test",
			validate,
		},
	} as StandardSchemaV1<Input>
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

function BaseOwnedField(props: FieldSlotProps) {
	return (
		<div data-testid="base-owned-field">
			<FieldSlot {...props} />
		</div>
	)
}

function ExtendedOwnedField(props: FieldSlotProps) {
	return (
		<div data-testid="extended-owned-field">
			<FieldSlot {...props} />
		</div>
	)
}

function SiblingOwnedField(props: FieldSlotProps) {
	return (
		<div data-testid="sibling-owned-field">
			<FieldSlot {...props} />
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
