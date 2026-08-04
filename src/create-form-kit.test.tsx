"use client"

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import {
	Controller,
	useFormContext,
	useFormState,
	useWatch,
} from "react-hook-form"
import { describe, expect, expectTypeOf, it, vi } from "vitest"
import { z } from "zod"
import { defineControl } from "./control-definition.js"
import { createFormKit } from "./create-form-kit.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldPath,
	FieldSlotProps,
	PathValue,
	SectionSlotProps,
	StandardSchema,
	SubmitSlotProps,
} from "./types.js"

const schema = z
	.object({
		name: z.string().min(2, "Enter at least two characters"),
	})
	.transform((value) => ({
		...value,
		name: value.name.trim(),
	}))

const kit = createFormKit({
	controls: {
		text: defineControl<string>({
			component: ({ value, setValue, blur, input, disabled }) => (
				<input
					aria-describedby={input["aria-describedby"]}
					disabled={disabled}
					id={input.id}
					name={input.name}
					onBlur={blur}
					onChange={(event) => setValue(event.currentTarget.value)}
					ref={input.ref}
					value={value}
				/>
			),
		}),
		select: defineControl<string, { readonly options: readonly string[] }>({
			component: ({ value, setValue, blur, input, options }) => (
				<select
					id={input.id}
					name={input.name}
					onBlur={blur}
					onChange={(event) => setValue(event.currentTarget.value)}
					ref={input.ref}
					value={value}
				>
					{options.options.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
			),
		}),
	},
	slots: {
		Field: ({
			rootProps,
			labelProps,
			label,
			control,
			errors,
		}: FieldSlotProps) => (
			<div {...rootProps}>
				<label {...labelProps} htmlFor={labelProps.htmlFor}>
					{label}
				</label>
				{control}
				{errors}
			</div>
		),
		Section: ({ rootProps, title, children }: SectionSlotProps) => (
			<section {...rootProps}>
				<h2>{title}</h2>
				{children}
			</section>
		),
		Array: ({ rootProps, label, add, canAdd, children }: ArraySlotProps) => (
			<section {...rootProps}>
				<h2>{label}</h2>
				<button disabled={!canAdd} onClick={add} type="button">
					Add speaker
				</button>
				{children}
			</section>
		),
		ArrayItem: ({
			rootProps,
			children,
			index,
			canMoveUp,
			canMoveDown,
			move,
			remove,
		}: ArrayItemSlotProps) => (
			<div {...rootProps}>
				{children}
				<button
					disabled={!canMoveUp}
					onClick={() => move(index - 1)}
					type="button"
				>
					Move speaker {index + 1} up
				</button>
				<button
					disabled={!canMoveDown}
					onClick={() => move(index + 1)}
					type="button"
				>
					Move speaker {index + 1} down
				</button>
				<button onClick={remove} type="button">
					Remove speaker {index + 1}
				</button>
			</div>
		),
		ErrorMessage: ({ rootProps, issue }: ErrorMessageSlotProps) => (
			<p {...rootProps}>{issue.message}</p>
		),
		Submit: ({ buttonProps }: SubmitSlotProps) => <button {...buttonProps} />,
	},
})

const definition = kit.defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			label: "Name",
			required: true,
		},
	],
})

describe("form kit", () => {
	it("rejects a form binding owned by another form kit", () => {
		const otherKit = createFormKit({ controls: kit.controls, slots: kit.slots })

		function View() {
			const form = kit.useForm(definition, { defaultValues: { name: "Ada" } })
			return <otherKit.Form form={form} />
		}

		expect(() => render(<View />)).toThrow(
			"Form binding is not mounted by this form kit",
		)
	})

	it("uses React Hook Form dot paths for array items", () => {
		type Input = { readonly speakers: readonly { readonly name: string }[] }

		expectTypeOf<"speakers.0.name">().toMatchTypeOf<FieldPath<Input>>()
		expectTypeOf<PathValue<Input, "speakers.0.name">>().toEqualTypeOf<string>()

		expect(() =>
			kit.defineForm(
				z.object({ speakers: z.array(z.object({ name: z.string() })) }),
				{
					ui: [
						{
							kind: "field",
							path: "speakers[0].name" as never,
							control: "text",
						},
					],
				},
			),
		).toThrow("invalid React Hook Form syntax")
	})

	it("provides raw RHF context and submits parsed output", async () => {
		const onSubmit = vi.fn()

		function ManualState() {
			const api = useFormContext<{ name: string }>()
			const name = useWatch({ control: api.control, name: "name" })
			const state = useFormState({ control: api.control })
			return (
				<>
					<output aria-label="Watched name">{name}</output>
					<output aria-label="Attempts">{state.submitCount}</output>
				</>
			)
		}

		function View() {
			const form = kit.useForm(definition, {
				defaultValues: { name: "" },
				onSubmit,
			})

			return (
				<kit.AutoForm form={form}>
					<ManualState />
					<kit.Submit>Save</kit.Submit>
				</kit.AutoForm>
			)
		}

		render(<View />)

		fireEvent.click(screen.getByRole("button", { name: "Save" }))
		expect(
			await screen.findByText("Enter at least two characters"),
		).toBeTruthy()
		expect(screen.getByLabelText("Attempts").textContent).toBe("1")
		expect(onSubmit).not.toHaveBeenCalled()

		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "  Ada  " },
		})
		expect(screen.getByLabelText("Watched name").textContent).toBe("  Ada  ")
		const submit = screen.getByRole("button", { name: "Save" })
		await waitFor(() => {
			expect(screen.queryByText("Enter at least two characters")).toBeNull()
			expect((submit as HTMLButtonElement).disabled).toBe(false)
		})
		fireEvent.click(submit)

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					input: { name: "  Ada  " },
					value: { name: "Ada" },
				}),
			)
		})
	})

	it("supports manual register and Controller fields in FormProvider", async () => {
		const ecosystemSchema = z.object({
			controlled: z.string().min(1),
			generated: z.string().min(1),
			manual: z.string().min(1),
		})
		type EcosystemInput = z.input<typeof ecosystemSchema>
		const ecosystemDefinition = kit.defineForm(ecosystemSchema, {
			ui: [
				{
					kind: "field",
					path: "generated",
					control: "text",
					label: "Generated field",
				},
			],
		})
		const onSubmit = vi.fn()

		function ManualFields() {
			const form = useFormContext<EcosystemInput>()
			return (
				<>
					<input aria-label="Registered field" {...form.register("manual")} />
					<Controller
						control={form.control}
						name="controlled"
						render={({ field }) => (
							<input aria-label="Controller field" {...field} />
						)}
					/>
				</>
			)
		}

		function View() {
			const form = kit.useForm(ecosystemDefinition, {
				defaultValues: { controlled: "", generated: "Ada", manual: "" },
				onSubmit,
			})
			return (
				<kit.AutoForm form={form}>
					<ManualFields />
					<kit.Submit>Submit ecosystem form</kit.Submit>
				</kit.AutoForm>
			)
		}

		render(<View />)
		fireEvent.change(screen.getByLabelText("Registered field"), {
			target: { value: "Grace" },
		})
		fireEvent.change(screen.getByLabelText("Controller field"), {
			target: { value: "Lin" },
		})
		fireEvent.click(
			screen.getByRole("button", { name: "Submit ecosystem form" }),
		)

		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				input: { controlled: "Lin", generated: "Ada", manual: "Grace" },
				value: { controlled: "Lin", generated: "Ada", manual: "Grace" },
			}),
		)
	})

	it("keeps disabled generated values in validation and blocks a disabled form", async () => {
		const disabledSchema = z.object({
			editable: z.string(),
			locked: z.string().min(1),
		})
		const disabledDefinition = kit.defineForm(disabledSchema, {
			ui: [
				{
					kind: "field",
					path: "locked",
					control: "text",
					label: "Locked value",
					disabled: true,
				},
			],
		})
		const onSubmit = vi.fn()

		function View({ disabled }: { readonly disabled: boolean }) {
			const form = kit.useForm(disabledDefinition, {
				defaultValues: { editable: "open", locked: "preserved" },
				disabled,
				onSubmit,
			})
			return (
				<kit.AutoForm form={form}>
					<kit.Submit>Submit disabled state</kit.Submit>
				</kit.AutoForm>
			)
		}

		const view = render(<View disabled />)
		fireEvent.submit(
			screen.getByRole("button").closest("form") as HTMLFormElement,
		)
		expect(onSubmit).not.toHaveBeenCalled()

		view.rerender(<View disabled={false} />)
		fireEvent.click(
			screen.getByRole("button", { name: "Submit disabled state" }),
		)
		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				input: { editable: "open", locked: "preserved" },
				value: { editable: "open", locked: "preserved" },
			}),
		)
	})

	it("keeps conditional fields, RHF arrays, and nested validation in one store", async () => {
		const complexSchema = z.object({
			format: z.enum(["remote", "in-person"]),
			room: z.string(),
			speakers: z.array(
				z.object({
					name: z.string().min(2, "Enter the speaker name"),
				}),
			),
		})
		const complexDefinition = kit.defineForm(complexSchema, {
			ui: [
				{
					kind: "field",
					path: "format",
					control: "select",
					label: "Format",
					options: { options: ["remote", "in-person"] },
				},
				{
					kind: "field",
					path: "room",
					control: "text",
					label: "Room",
					visible: (values) => values.format === "in-person",
				},
				{
					kind: "array",
					path: "speakers",
					label: "Speakers",
					itemDefault: { name: "" },
					children: [
						{
							kind: "field",
							path: "name",
							control: "text",
							label: "Speaker name",
						},
					],
				},
			],
		})
		type ComplexInput = z.input<typeof complexSchema>

		function ComplexState() {
			const api = useFormContext<ComplexInput>()
			const values = useWatch({ control: api.control })
			return (
				<>
					<output aria-label="Manual format">{values.format}</output>
					<output aria-label="Speaker order">
						{values.speakers?.map((speaker) => speaker?.name).join(",") ?? ""}
					</output>
				</>
			)
		}

		function View() {
			const form = kit.useForm(complexDefinition, {
				defaultValues: {
					format: "remote",
					room: "A-12",
					speakers: [{ name: "Ada" }, { name: "Grace" }],
				},
			})
			return (
				<kit.Form form={form}>
					<kit.Fields />
					<ComplexState />
					<kit.Submit>Save complex form</kit.Submit>
				</kit.Form>
			)
		}

		render(<View />)
		expect(screen.queryByLabelText("Room")).toBeNull()
		expect(screen.getByLabelText("Manual format").textContent).toBe("remote")

		fireEvent.click(screen.getByRole("button", { name: "Move speaker 1 down" }))
		expect(screen.getByLabelText("Speaker order").textContent).toBe("Grace,Ada")

		fireEvent.click(screen.getByRole("button", { name: "Add speaker" }))
		expect(screen.getAllByLabelText("Speaker name")).toHaveLength(3)
		fireEvent.click(screen.getByRole("button", { name: "Save complex form" }))
		expect(await screen.findByText("Enter the speaker name")).toBeTruthy()
		const invalidSpeaker = screen.getAllByLabelText("Speaker name").at(-1)
		if (invalidSpeaker === undefined) {
			throw new Error("Expected the added speaker field")
		}
		expect(invalidSpeaker.getAttribute("name")).toBe("speakers.2.name")
		expect(
			invalidSpeaker
				.closest('[data-fp-node="field"]')
				?.getAttribute("data-fp-path"),
		).toBe("speakers.2.name")
		expect(
			invalidSpeaker
				.closest('[data-fp-node="array-item"]')
				?.getAttribute("data-fp-path"),
		).toBe("speakers.2")
		expect(document.activeElement).toBe(invalidSpeaker)
		fireEvent.change(invalidSpeaker, {
			target: { value: "Lin" },
		})
		await waitFor(() => {
			expect(screen.queryByText("Enter the speaker name")).toBeNull()
		})

		fireEvent.change(screen.getByLabelText("Format"), {
			target: { value: "in-person" },
		})
		expect(
			((await screen.findByLabelText("Room")) as HTMLInputElement).value,
		).toBe("A-12")
	})

	it("parses once and keeps raw handleSubmit independent from the wrapper", async () => {
		let validations = 0
		const oneParseSchema: StandardSchema<
			{ readonly name: string },
			{ readonly normalizedName: string }
		> = {
			"~standard": {
				version: 1,
				vendor: "one-parse-test",
				validate(value) {
					validations += 1
					return {
						value: {
							normalizedName: String(
								(value as { readonly name: string }).name,
							).trim(),
						},
					}
				},
			},
		}
		const oneParseDefinition = kit.defineForm(oneParseSchema, { ui: [] })
		const onSubmit = vi.fn()
		const onRawSubmit = vi.fn()
		let submitRaw: (() => Promise<void>) | undefined

		function View() {
			const form = kit.useForm(oneParseDefinition, {
				defaultValues: { name: "  Ada  " },
				onSubmit,
			})
			submitRaw = form.api.handleSubmit(async (value) => {
				onRawSubmit(value)
			})
			return (
				<kit.Form form={form}>
					<kit.Submit>Submit once</kit.Submit>
				</kit.Form>
			)
		}

		render(<View />)
		fireEvent.click(screen.getByRole("button", { name: "Submit once" }))
		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
		expect(validations).toBe(1)
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				input: { name: "  Ada  " },
				value: { normalizedName: "Ada" },
			}),
		)

		await act(async () => {
			await submitRaw?.()
		})
		expect(validations).toBe(2)
		expect(onRawSubmit).toHaveBeenCalledWith({ normalizedName: "Ada" })
		expect(onSubmit).toHaveBeenCalledTimes(1)
	})

	it("submits matching input and output while async validation is pending", async () => {
		let release: () => void = () => undefined
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		const asyncSchema: StandardSchema<{ readonly name: string }> = {
			"~standard": {
				version: 1,
				vendor: "async-submit-snapshot-test",
				async validate(value) {
					await gate
					return {
						value: { name: (value as { readonly name: string }).name },
					}
				},
			},
		}
		const asyncDefinition = kit.defineForm(asyncSchema, {
			ui: [{ kind: "field", path: "name", control: "text", label: "Name" }],
		})
		const onSubmit = vi.fn()

		function View() {
			const form = kit.useForm(asyncDefinition, {
				defaultValues: { name: "Before validation" },
				onSubmit,
			})
			return (
				<kit.AutoForm form={form}>
					<kit.Submit>Submit async form</kit.Submit>
				</kit.AutoForm>
			)
		}

		render(<View />)
		fireEvent.click(screen.getByRole("button", { name: "Submit async form" }))
		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "Changed while validating" },
		})
		await act(async () => release())

		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				input: { name: "Before validation" },
				value: { name: "Before validation" },
			}),
		)
	})

	it("preserves browser values in the editable input snapshot", async () => {
		const upload = new File(["notes"], "notes.txt", { type: "text/plain" })
		const fileSchema: StandardSchema<{
			readonly attachment: File
		}> = {
			"~standard": {
				version: 1,
				vendor: "file-snapshot-test",
				validate(value) {
					return { value: value as { readonly attachment: File } }
				},
			},
		}
		const fileDefinition = kit.defineForm(fileSchema, { ui: [] })
		const onSubmit = vi.fn()

		function View() {
			const form = kit.useForm(fileDefinition, {
				defaultValues: { attachment: upload },
				onSubmit,
			})
			return (
				<kit.Form form={form}>
					<kit.Submit>Submit file</kit.Submit>
				</kit.Form>
			)
		}

		render(<View />)
		fireEvent.click(screen.getByRole("button", { name: "Submit file" }))
		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
		expect(onSubmit.mock.calls[0]?.[0].input.attachment).toBe(upload)
		expect(onSubmit.mock.calls[0]?.[0].value.attachment).toBe(upload)
	})

	it("focuses the error summary when no generated control owns the issue", async () => {
		const formSchema: StandardSchema<{ readonly name: string }> = {
			"~standard": {
				version: 1,
				vendor: "summary-test",
				validate() {
					return { issues: [{ message: "Form is unavailable" }] }
				},
			},
		}
		const summaryDefinition = kit.defineForm(formSchema, { ui: [] })

		function View() {
			const form = kit.useForm(summaryDefinition, {
				defaultValues: { name: "Ada" },
			})
			return (
				<kit.AutoForm form={form}>
					<kit.Submit>Submit unavailable form</kit.Submit>
				</kit.AutoForm>
			)
		}

		render(<View />)
		fireEvent.click(
			screen.getByRole("button", { name: "Submit unavailable form" }),
		)
		const summary = await screen.findByText("Form is unavailable")
		await waitFor(() => expect(document.activeElement).toBe(summary))
		expect(summary.getAttribute("tabindex")).toBe("-1")
		expect(summary.getAttribute("data-fp-path")).toBeNull()
	})

	it("summarizes hidden fields whose paths overlap RHF error metadata", async () => {
		const metadataSchema = z.object({
			message: z.string().min(1, "Enter the hidden message"),
			group: z.object({ root: z.string().min(1, "Enter the nested root") }),
		})
		const metadataDefinition = kit.defineForm(metadataSchema, {
			ui: [
				{
					kind: "field",
					path: "message",
					control: "text",
					visible: false,
				},
				{
					kind: "field",
					path: "group.root",
					control: "text",
					visible: false,
				},
			],
		})

		function View() {
			const form = kit.useForm(metadataDefinition, {
				defaultValues: { message: "", group: { root: "" } },
			})
			return (
				<kit.AutoForm form={form}>
					<kit.Submit>Submit hidden metadata fields</kit.Submit>
				</kit.AutoForm>
			)
		}

		render(<View />)
		fireEvent.click(
			screen.getByRole("button", { name: "Submit hidden metadata fields" }),
		)

		const message = await screen.findByText("Enter the hidden message")
		const root = await screen.findByText("Enter the nested root")
		expect(message.getAttribute("data-fp-path")).toBe("message")
		expect(root.getAttribute("data-fp-path")).toBe("group.root")
	})

	it("does not lose schema errors for a top-level root field", async () => {
		const rootSchema = z.object({
			root: z.object({ name: z.string().min(1, "Enter the root name") }),
		})
		const rootDefinition = kit.defineForm(rootSchema, {
			ui: [
				{
					kind: "field",
					path: "root.name",
					control: "text",
					label: "Root name",
				},
			],
		})
		const onSubmit = vi.fn()

		function View() {
			const form = kit.useForm(rootDefinition, {
				defaultValues: { root: { name: "" } },
				onSubmit,
			})
			return (
				<kit.AutoForm form={form}>
					<kit.Submit>Submit root field</kit.Submit>
				</kit.AutoForm>
			)
		}

		render(<View />)
		fireEvent.click(screen.getByRole("button", { name: "Submit root field" }))
		const summary = await screen.findByText("Enter the root name", {
			selector: '[data-fp-node="error-message"][tabindex="-1"]',
		})
		expect(summary.getAttribute("data-fp-path")).toBe("root.name")
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it("leaves invalid focus order to RHF registration order", async () => {
		const conditionalSchema = z.object({
			first: z.string().min(1, "Enter first"),
			mode: z.enum(["hide", "show"]),
			second: z.string().min(1, "Enter second"),
		})
		const conditionalDefinition = kit.defineForm(conditionalSchema, {
			ui: [
				{
					kind: "field",
					path: "first",
					control: "text",
					label: "First conditional field",
					visible: (values) => values.mode === "show",
				},
				{
					kind: "field",
					path: "mode",
					control: "select",
					label: "Conditional mode",
					options: { options: ["hide", "show"] },
				},
				{
					kind: "field",
					path: "second",
					control: "text",
					label: "Second conditional field",
				},
			],
		})

		function View() {
			const form = kit.useForm(conditionalDefinition, {
				defaultValues: { first: "", mode: "hide", second: "" },
			})
			return (
				<kit.AutoForm form={form}>
					<kit.Submit>Submit conditional form</kit.Submit>
				</kit.AutoForm>
			)
		}

		render(<View />)
		expect(screen.queryByLabelText("First conditional field")).toBeNull()
		fireEvent.change(screen.getByLabelText("Conditional mode"), {
			target: { value: "show" },
		})
		await screen.findByLabelText("First conditional field")
		fireEvent.click(
			screen.getByRole("button", { name: "Submit conditional form" }),
		)
		const second = screen.getByLabelText("Second conditional field")
		await waitFor(() => expect(document.activeElement).toBe(second))
	})

	it("falls back to the summary when RHF cannot focus its first error", async () => {
		const disabledSchema = z.object({
			first: z.string().min(1, "Enter first"),
			second: z.string().min(1, "Enter second"),
		})
		const disabledDefinition = kit.defineForm(disabledSchema, {
			ui: [
				{
					kind: "field",
					path: "first",
					control: "text",
					label: "Disabled invalid field",
					disabled: true,
				},
				{
					kind: "field",
					path: "second",
					control: "text",
					label: "Focusable invalid field",
				},
			],
		})

		function View() {
			const form = kit.useForm(disabledDefinition, {
				defaultValues: { first: "", second: "" },
			})
			return (
				<kit.AutoForm form={form}>
					<kit.Submit>Submit disabled form</kit.Submit>
				</kit.AutoForm>
			)
		}

		render(<View />)
		fireEvent.click(
			screen.getByRole("button", { name: "Submit disabled form" }),
		)
		const summary = await screen.findByText("Enter first", {
			selector: '[data-fp-node="error-message"][tabindex="-1"]',
		})
		await waitFor(() => expect(document.activeElement).toBe(summary))

		const focusable = screen.getByLabelText("Focusable invalid field")
		fireEvent.change(focusable, { target: { value: "Valid" } })
		await waitFor(() => {
			expect(screen.queryByText("Enter second")).toBeNull()
		})
		fireEvent.click(
			screen.getByRole("button", { name: "Submit disabled form" }),
		)
		const remainingSummary = document.querySelector(
			'[data-fp-node="error-message"][tabindex="-1"]',
		)
		expect(remainingSummary).toBeInstanceOf(HTMLElement)
		await waitFor(() => expect(document.activeElement).toBe(remainingSummary))
	})

	it("keeps the initial definition until React remounts the hook", () => {
		const first = kit.defineForm(schema, {
			ui: [{ kind: "field", path: "name", control: "text", label: "First" }],
		})
		const second = kit.defineForm(schema, {
			ui: [{ kind: "field", path: "name", control: "text", label: "Second" }],
		})
		let activeDefinition: unknown

		function View({ definition }: { readonly definition: typeof first }) {
			const form = kit.useForm(definition, {
				defaultValues: { name: "Ada" },
			})
			activeDefinition = form.definition
			return <kit.AutoForm form={form} />
		}

		const view = render(<View definition={first} />)
		expect(activeDefinition).toBe(first)
		view.rerender(<View definition={second} />)
		expect(activeDefinition).toBe(first)
		expect(screen.getByLabelText("First")).toBeTruthy()
		expect(screen.queryByLabelText("Second")).toBeNull()
	})
})
