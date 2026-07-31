"use client"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { FormInput, ImperativeFormIssue } from "../core/index.js"
import { FieldControl } from "./control.js"
import { createFormKit, type FormKitSlots } from "./create-form-kit.js"
import { useFormState } from "./hooks.js"
import type {
	ArraySlotProps,
	FieldSlotProps,
	SectionSlotProps,
} from "./slots.js"
import { type TestValues, testKit, textControl } from "./test-kit.js"
import { useForm } from "./use-form.js"

type TestSchema = StandardSchemaV1<TestValues>
type CollisionValues = {
	readonly "user-name": string
	readonly user: {
		readonly name: string
	}
}
type CollisionSchema = StandardSchemaV1<CollisionValues>
type RichValues = {
	readonly name: string
	readonly contacts: readonly {
		readonly value: string
	}[]
}
type RichSchema = StandardSchemaV1<RichValues>

const schema = {} as TestSchema
const collisionSchema = {} as CollisionSchema
const richSchema = {} as RichSchema

function createDefinition() {
	return testKit.defineForm(schema)({
		ui: [
			{
				kind: "field",
				path: "name",
				control: "text",
				label: "Name",
				description: "Legal name",
				required: true,
				options: {
					placeholder: "Full name",
				},
			},
		],
	})
}

function defaultValues(): FormInput<TestSchema> {
	return {
		name: "Ada",
	}
}

describe("createFormKit", () => {
	it("extends controls and resolved slots as an immutable add-only snapshot", () => {
		const controls = {
			text: textControl,
		}
		const baseKit = createFormKit({ controls })
		const LocalField = ({ rootProps, label, control }: FieldSlotProps) => (
			<div {...rootProps} data-local-field="">
				{label}
				{control}
			</div>
		)
		const localKit = baseKit.extend({
			controls: {
				localText: textControl,
			},
			slots: {
				Field: LocalField,
			},
		})
		const chainedKit = localKit.extend({
			controls: {
				secondaryText: textControl,
			},
		})
		const definition = localKit.defineForm(schema)({
			ui: [
				{
					kind: "field",
					path: "name",
					control: "localText",
					label: "Name",
				},
			],
		})

		Object.assign(controls, { lateText: textControl })

		expect(Object.isFrozen(localKit.controls)).toBe(true)
		expect(localKit.controls).toHaveProperty("text", textControl)
		expect(localKit.controls).toHaveProperty("localText", textControl)
		expect(localKit.controls).not.toHaveProperty("lateText")
		expect(localKit.slots.Field).toBe(LocalField)
		expect(localKit.slots.Section).toBe(baseKit.slots.Section)
		expect(chainedKit.controls).toHaveProperty("localText", textControl)
		expect(chainedKit.controls).toHaveProperty("secondaryText", textControl)

		render(
			<localKit.AutoForm
				defaultValues={defaultValues()}
				definition={definition}
			/>,
		)
		expect(screen.getByText("Name").getAttribute("data-local-field")).toBe("")
	})

	it("renders base definitions through an extended kit", () => {
		const baseKit = createFormKit({
			controls: {
				text: textControl,
			},
		})
		const localKit = baseKit.extend({
			controls: {
				localText: textControl,
			},
		})
		const definition = baseKit.defineForm(schema)({
			ui: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: "Name",
				},
			],
		})

		render(
			<localKit.AutoForm
				defaultValues={defaultValues()}
				definition={definition}
			/>,
		)

		expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
			"Ada",
		)
	})

	it("rejects empty extensions, control replacement, and removed slots", () => {
		const kit = createFormKit({
			controls: {
				text: textControl,
			},
		})
		const extend = kit.extend as (options: unknown) => unknown

		expect(() => extend({})).toThrow(/requires controls or slots/i)
		expect(() =>
			extend({
				controls: {
					text: textControl,
				},
			}),
		).toThrow(/cannot replace control "text"/i)
		expect(() =>
			extend({
				slots: {
					Field: undefined,
				},
			}),
		).toThrow(/requires a Field slot/i)
	})

	it("normalizes definitions with kit controls when slots are omitted", () => {
		const kit = createFormKit({
			controls: {
				text: textControl,
			},
		})

		const definition = kit.defineForm(schema)({
			ui: [
				{
					kind: "field",
					path: "name",
					control: "text",
				},
			],
		})

		expect(definition.schema).toBe(schema)
		expectResolvedSlots(kit.slots)
		expect(Object.isFrozen(kit.slots)).toBe(true)
	})

	it("preserves custom kits while defaulting omitted slots", () => {
		expect(() =>
			testKit.defineForm(schema)({
				ui: [
					{
						kind: "field",
						path: "name",
						control: "text",
					},
				],
			}),
		).not.toThrow()

		expect(() =>
			testKit.defineForm(schema).withContext<{ readonly locked: boolean }>({
				ui: [
					{
						kind: "field",
						path: "nickname",
						control: "text",
						valuePolicy: "unset",
					},
				],
			}),
		).not.toThrow()

		const Field = ({ rootProps, label, control }: FieldSlotProps) => (
			<div {...rootProps} data-custom-field="">
				{label}
				{control}
			</div>
		)
		const kit = createFormKit({
			controls: {
				text: textControl,
			},
			slots: {
				Field,
			},
		})
		const definition = kit.defineForm(schema)({
			ui: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: "Name",
				},
			],
		})

		render(
			<kit.AutoForm
				defaultValues={defaultValues()}
				definition={definition}
				id="partial"
			/>,
		)

		expect(screen.getByText("Name").getAttribute("data-custom-field")).toBe("")
		expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
			"Ada",
		)
		expect(kit.slots.Field).toBe(Field)
		expectResolvedSlots(kit.slots)
	})

	it("renders rich structural content and passes resolved slot options", () => {
		type FieldOptions = {
			readonly tooltip?: string
		}
		type SectionOptions = {
			readonly headingLevel?: 2 | 3
		}
		type ArrayOptions = {
			readonly emptyText?: string
		}

		function Field({
			rootProps,
			label,
			labelProps,
			description,
			descriptionProps,
			slotOptions,
			control,
		}: FieldSlotProps<FieldOptions>) {
			return (
				<div {...rootProps}>
					<label {...labelProps} htmlFor={labelProps.htmlFor}>
						{label}
						{slotOptions?.tooltip === undefined ? null : (
							<span title={slotOptions.tooltip}>?</span>
						)}
					</label>
					{description === undefined ? null : (
						<div {...descriptionProps}>{description}</div>
					)}
					{control}
				</div>
			)
		}

		function Section({
			rootProps,
			layoutProps,
			title,
			description,
			slotOptions,
			children,
		}: SectionSlotProps<SectionOptions>) {
			return (
				<section {...rootProps} data-heading-level={slotOptions?.headingLevel}>
					<h2>{title}</h2>
					<div>{description}</div>
					<div {...layoutProps}>{children}</div>
				</section>
			)
		}

		function ArraySlot({
			rootProps,
			label,
			labelProps,
			description,
			descriptionProps,
			slotOptions,
			children,
		}: ArraySlotProps<ArrayOptions>) {
			return (
				<div {...rootProps}>
					<div {...labelProps}>{label}</div>
					<div {...descriptionProps}>{description}</div>
					<output>{slotOptions?.emptyText}</output>
					{children}
				</div>
			)
		}

		const kit = createFormKit({
			controls: {
				text: textControl,
			},
			slots: {
				Field,
				Section,
				Array: ArraySlot,
			},
		})
		const definition = kit.defineForm(richSchema)({
			ui: [
				{
					kind: "section",
					id: "profile",
					title: (
						<>
							Profile <small>optional details</small>
						</>
					),
					description: <a href="/profile-help">How profile data is used</a>,
					slotOptions: {
						headingLevel: 3,
					},
					children: [
						{
							kind: "field",
							path: "name",
							control: "text",
							label: <span>Display name</span>,
							description: <a href="/names">Naming policy</a>,
							slotOptions: ({ name }) => ({
								tooltip: `Shown as ${name}`,
							}),
						},
					],
				},
				{
					kind: "array",
					path: "contacts",
					label: <strong>Contacts</strong>,
					description: <a href="/contacts">Supported contact types</a>,
					slotOptions: {
						emptyText: "No contacts yet",
					},
					itemDefault: {
						value: "",
					},
					children: [
						{
							kind: "field",
							path: "value",
							control: "text",
							label: "Contact",
						},
					],
				},
			],
		})

		render(
			<kit.AutoForm
				defaultValues={{
					name: "Ada",
					contacts: [],
				}}
				definition={definition}
			/>,
		)

		expect(screen.getByText("optional details")).toBeTruthy()
		expect(
			screen
				.getByText("How profile data is used")
				.closest("a")
				?.getAttribute("href"),
		).toBe("/profile-help")
		expect(screen.getByText("?").getAttribute("title")).toBe("Shown as Ada")
		expect(
			screen.getByText("Naming policy").closest("a")?.getAttribute("href"),
		).toBe("/names")
		expect(
			screen
				.getByText("optional details")
				.closest("section")
				?.getAttribute("data-heading-level"),
		).toBe("3")
		expect(
			screen
				.getByText("Supported contact types")
				.closest("a")
				?.getAttribute("href"),
		).toBe("/contacts")
		expect(screen.getByText("No contacts yet")).toBeTruthy()
	})

	it("throws when an explicit slot override removes a resolved slot", () => {
		const create = createFormKit as (options: unknown) => unknown

		expect(() =>
			create({
				controls: {
					text: textControl,
				},
				slots: {
					Field: undefined,
				},
			}),
		).toThrow(/Field slot/i)
	})

	it("passes resolved control props with deterministic names, IDs, ARIA, and meta", () => {
		const definition = createDefinition()

		function ControlHarness() {
			const form = useForm(definition, {
				defaultValues: defaultValues(),
			})
			const displayErrors = useFormState(
				form,
				(snapshot) => snapshot.displayErrors.fields.get("name") ?? [],
			)

			return (
				<testKit.Form form={form} id="profile">
					<FieldControl
						controls={{
							text: textControl,
						}}
						descriptionId="profile-name-description"
						form={form}
						path="name"
					/>
					<button
						type="button"
						onClick={() => {
							form.setErrors([issue("name", "Enter a name")])
						}}
					>
						error
					</button>
					<output>{displayErrors.length}</output>
				</testKit.Form>
			)
		}

		render(<ControlHarness />)

		const input = screen.getByLabelText("Name") as HTMLInputElement
		expect(input.id).toBe("profile-name")
		expect(input.name).toBe("name")
		expect(input.getAttribute("aria-describedby")).toBe(
			"profile-name-description",
		)
		expect(input.placeholder).toBe("Full name")
		expect(input.required).toBe(true)
		expect(input.value).toBe("Ada")

		fireEvent.change(input, { target: { value: "Grace" } })
		expect(input.value).toBe("Grace")

		fireEvent.click(screen.getByRole("button", { name: "error" }))
		expect(input.getAttribute("aria-invalid")).toBe("true")
		expect(input.getAttribute("data-errors")).toBe("Enter a name")
		expect(input.getAttribute("data-display-errors")).toBe("Enter a name")
	})

	it("keeps generated DOM IDs distinct for dashed and nested paths", () => {
		const definition = testKit.defineForm(collisionSchema)({
			ui: [
				{
					kind: "field",
					path: "user-name",
					control: "text",
					label: "Dashed",
				},
				{
					kind: "field",
					path: "user.name",
					control: "text",
					label: "Nested",
				},
			],
		})

		render(
			<testKit.AutoForm
				defaultValues={{
					"user-name": "Ada",
					user: {
						name: "Grace",
					},
				}}
				definition={definition}
				id="profile"
			/>,
		)

		const dashed = document.querySelector<HTMLInputElement>(
			'input[name="user-name"]',
		)
		const nested = document.querySelector<HTMLInputElement>(
			'input[name="user.name"]',
		)

		expect(dashed?.id).toBe("profile-user-name")
		expect(nested?.id).toBe("profile-user%2Ename")
		expect(dashed?.id).not.toBe(nested?.id)
	})
})

function issue(path: string, message: string): ImperativeFormIssue {
	return {
		source: "manual",
		path,
		message,
	}
}

function expectResolvedSlots(slots: FormKitSlots) {
	expect(slots.Field).toBeTypeOf("function")
	expect(slots.Section).toBeTypeOf("function")
	expect(slots.Array).toBeTypeOf("function")
	expect(slots.ArrayItem).toBeTypeOf("function")
	expect(slots.ErrorMessage).toBeTypeOf("function")
}
