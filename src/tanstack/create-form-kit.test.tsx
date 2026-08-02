"use client"

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
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
			component: ({ value, setValue, blur, input }) => (
				<input
					aria-describedby={input["aria-describedby"]}
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

describe("TanStack form kit", () => {
	it("types array items with TanStack bracket paths", () => {
		type Input = { readonly speakers: readonly { readonly name: string }[] }

		expectTypeOf<"speakers[0].name">().toMatchTypeOf<FieldPath<Input>>()
		expectTypeOf<PathValue<Input, "speakers[0].name">>().toEqualTypeOf<string>()
	})

	it("keeps TanStack components under kit.tf and submits parsed output", async () => {
		const onSubmit = vi.fn()

		function View() {
			const form = kit.useForm(definition, {
				defaultValues: { name: "" },
				onSubmit,
			})

			return (
				<kit.AutoForm form={form}>
					<kit.tf.Subscribe selector={(state) => state.submissionAttempts}>
						{(attempts) => <output aria-label="Attempts">{attempts}</output>}
					</kit.tf.Subscribe>
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

	it("rejects definitions that use unset value policy", () => {
		const define = kit.defineForm as (
			schema: unknown,
			source: unknown,
		) => unknown

		expect(() =>
			define(schema, {
				ui: [
					{
						kind: "field",
						path: "name",
						control: "text",
						valuePolicy: "unset",
					},
				],
			}),
		).toThrow(/does not support valuePolicy "unset"/i)
	})

	it("keeps conditional fields, array operations, and nested validation on TanStack state", async () => {
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
					<kit.tf.Field name="format">
						{(field) => (
							<output aria-label="Manual format">{field.state.value}</output>
						)}
					</kit.tf.Field>
					<kit.tf.FormGroup name="speakers">
						{(group) => <output aria-label="Form group">{group.name}</output>}
					</kit.tf.FormGroup>
					<kit.tf.Subscribe selector={(state) => state.values.speakers}>
						{(speakers: readonly { readonly name: string }[]) => (
							<output aria-label="Speaker order">
								{speakers.map((speaker) => speaker.name).join(",")}
							</output>
						)}
					</kit.tf.Subscribe>
					<kit.Submit>Save complex form</kit.Submit>
				</kit.Form>
			)
		}

		render(<View />)
		expect(screen.queryByLabelText("Room")).toBeNull()
		expect(screen.getByLabelText("Manual format").textContent).toBe("remote")
		expect(screen.getByLabelText("Form group").textContent).toBe("speakers")

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
		expect(invalidSpeaker.getAttribute("name")).toBe("speakers[2].name")
		expect(
			invalidSpeaker
				.closest('[data-fp-node="field"]')
				?.getAttribute("data-fp-path"),
		).toBe("speakers[2].name")
		expect(
			invalidSpeaker
				.closest('[data-fp-node="array-item"]')
				?.getAttribute("data-fp-path"),
		).toBe("speakers[2]")
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
		expect(await screen.findByLabelText("Room")).toBeTruthy()
	})
})
