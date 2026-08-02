"use client"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { fireEvent, render, screen } from "@testing-library/react"
import { StrictMode } from "react"
import { describe, expect, it, vi } from "vitest"
import { formBindingFinalizer } from "../core/feature-protocol.js"
import type {
	FormInput,
	FormMiddleware,
	ImperativeFormIssue,
} from "../core/index.js"
import { createDefaultSlots } from "../default-slots/default-slots.js"
import { createDevToolsMiddleware } from "../devtools/devtools.js"
import { FieldControl } from "./control.js"
import { createFormKit, type FormKitSlots } from "./create-form-kit.js"
import { useFormState } from "./hooks.js"
import type { RenderNodeProps } from "./render-node.js"
import type {
	ArraySlotProps,
	FieldSlotProps,
	SectionSlotProps,
} from "./slots.js"
import { type TestValues, testKit, textControl } from "./test-kit.js"

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
	return testKit.defineForm(schema, {
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
	it("exposes explicit creation and binding lifetimes without an alias", () => {
		expect(testKit.createForm).toBeTypeOf("function")
		expect(testKit.useCreateForm).toBeTypeOf("function")
		expect(testKit.useBindForm).toBeTypeOf("function")
		expect(testKit.grid).toEqual([1, 2, 3, 4])
		expect(Object.isFrozen(testKit.grid)).toBe(true)
		expect(testKit).not.toHaveProperty("useForm")
	})

	it("uses forContext as a type-only view of the same kit", () => {
		expect(testKit.forContext<{ readonly locked: boolean }>()).toBe(testKit)
	})

	it("extends the kit grid as an immutable add-only design-system scale", () => {
		const base = createFormKit({
			controls: { text: textControl },
			grid: [6, 1],
			slots: createDefaultSlots(),
		})
		const extended = base.extend({ grid: [12] })
		const baseDefinition = base.defineForm(schema, {
			ui: [
				{
					kind: "section",
					id: "base-layout",
					columns: 6,
					children: [],
				},
			],
		})
		const extendedDefinition = extended.defineForm(schema, {
			ui: [
				{
					kind: "section",
					id: "extended-layout",
					columns: 12,
					children: [
						{
							kind: "field",
							path: "name",
							control: "text",
							span: "full",
						},
					],
				},
			],
		})

		expect(base.grid).toEqual([1, 6])
		expect(extended.grid).toEqual([1, 6, 12])
		expect(baseDefinition.grid).toEqual([1, 6])
		expect(extendedDefinition.grid).toEqual([1, 6, 12])
		expect(Object.isFrozen(extended.grid)).toBe(true)
		expect(() =>
			extended.createForm(baseDefinition, {
				defaultValues: defaultValues(),
			}),
		).not.toThrow()

		const createWithBase = base.createForm as (
			definition: unknown,
			options: { defaultValues: TestValues },
		) => unknown
		expect(() =>
			createWithBase(extendedDefinition, {
				defaultValues: defaultValues(),
			}),
		).toThrow(/requires grid value 12/i)
	})

	it("rejects invalid kit grids and grid extensions at the public boundary", () => {
		const create = (grid: readonly number[]) =>
			createFormKit({
				controls: { text: textControl },
				grid,
				slots: createDefaultSlots(),
			})

		for (const grid of [[], [2, 6], [1, 2, 2], [1, -2], [1, 1.5]]) {
			expect(() => create(grid), JSON.stringify(grid)).toThrow(
				/createFormKit grid/i,
			)
		}

		const extend = testKit.extend as (options: unknown) => unknown
		expect(() => extend({ grid: [] })).toThrow(/non-empty array/i)
		expect(() => extend({ grid: [2] })).toThrow(/duplicate 2/i)
	})

	it("extends controls and resolved slots as an immutable add-only snapshot", () => {
		const controls = {
			text: textControl,
		}
		const baseKit = createFormKit({
			controls,
			slots: createDefaultSlots(),
		})
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
		const definition = localKit.defineForm(schema, {
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
		const form = localKit.createForm(definition, {
			defaultValues: defaultValues(),
		})

		render(<localKit.AutoForm form={form} />)
		expect(screen.getByText("Name").getAttribute("data-local-field")).toBe("")
	})

	it("renders base definitions through an extended kit", () => {
		const baseKit = createFormKit({
			controls: {
				text: textControl,
			},
			slots: createDefaultSlots(),
		})
		const localKit = baseKit.extend({
			controls: {
				localText: textControl,
			},
		})
		const definition = baseKit.defineForm(schema, {
			ui: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: "Name",
				},
			],
		})
		const form = localKit.createForm(definition, {
			defaultValues: defaultValues(),
		})

		render(<localKit.AutoForm form={form} />)

		expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
			"Ada",
		)
	})

	it("preserves in-progress values when useCreateForm inputs change", () => {
		const firstDefinition = createDefinition()
		const nextDefinition = testKit.defineForm(schema, { ui: [] })
		let currentForm:
			| ReturnType<typeof testKit.createForm<TestSchema, unknown>>
			| undefined

		function Editor({
			definition,
			initialName,
		}: {
			readonly definition: ReturnType<typeof createDefinition>
			readonly initialName: string
		}) {
			const form = testKit.useCreateForm<TestSchema, unknown>(definition, {
				defaultValues: { name: initialName },
			})
			currentForm = form
			const name = useFormState(form, (snapshot) => snapshot.values.name)
			return (
				<button type="button" onClick={() => form.setValue("name", "Grace")}>
					{name}
				</button>
			)
		}

		const { rerender } = render(
			<Editor definition={firstDefinition} initialName="Ada" />,
		)
		const retainedForm = currentForm
		fireEvent.click(screen.getByRole("button"))
		rerender(<Editor definition={nextDefinition} initialName="Katherine" />)

		expect(currentForm).toBe(retainedForm)
		expect(currentForm?.definition).toBe(firstDefinition)
		expect(screen.getByRole("button").textContent).toBe("Grace")
	})

	it("rejects a JavaScript-erased definition whose controls are missing", () => {
		const baseKit = createFormKit({
			controls: { text: textControl },
			slots: createDefaultSlots(),
		})
		const extendedKit = baseKit.extend({
			controls: { localText: textControl },
		})
		const definition = extendedKit.defineForm(schema, {
			ui: [{ kind: "field", path: "name", control: "localText" }],
		})
		const create = baseKit.createForm as (
			definition: unknown,
			options: { defaultValues: TestValues },
		) => unknown

		expect(() =>
			create(definition, { defaultValues: defaultValues() }),
		).toThrow(/kit\.createForm requires control "localText"/i)
	})

	it("rejects empty extensions, control replacement, and removed slots", () => {
		const kit = createFormKit({
			controls: {
				text: textControl,
			},
			slots: createDefaultSlots(),
		})
		const extend = kit.extend as (options: unknown) => unknown

		expect(() => extend({})).toThrow(/requires controls, grid, or slots/i)
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
		expect(() =>
			extend({
				slots: {
					Submit: undefined,
				},
			}),
		).toThrow(/requires a Submit slot/i)
	})

	it("normalizes definitions with an explicit complete slot registry", () => {
		const kit = createFormKit({
			controls: {
				text: textControl,
			},
			slots: createDefaultSlots(),
		})

		const definition = kit.defineForm(schema, {
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

	it("resolves render visibility and passes inherited interaction state", () => {
		function Status({ disabled, readOnly }: RenderNodeProps) {
			return (
				<button
					data-read-only={readOnly ? "true" : "false"}
					disabled={disabled}
					type="button"
				>
					Account status
				</button>
			)
		}
		const definition = testKit.defineForm(schema, {
			ui: [
				{ kind: "field", path: "name", control: "text", label: "Name" },
				{
					kind: "section",
					id: "status-section",
					disabled: true,
					readOnly: true,
					children: [
						{
							kind: "render",
							id: "status",
							component: Status,
							visible: ({ name }) => name === "Ada",
						},
					],
				},
			],
		})
		const form = testKit.createForm(definition, {
			defaultValues: defaultValues(),
		})

		render(<testKit.AutoForm form={form} />)

		const status = screen.getByRole("button", { name: "Account status" })
		expect((status as HTMLButtonElement).disabled).toBe(true)
		expect(status.getAttribute("data-read-only")).toBe("true")

		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "Grace" },
		})
		expect(screen.queryByRole("button", { name: "Account status" })).toBeNull()
	})

	it("preserves custom kits while defaulting omitted slots", () => {
		expect(() =>
			testKit.defineForm(schema, {
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
			testKit.forContext<{ readonly locked: boolean }>().defineForm(schema, {
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
				...createDefaultSlots(),
				Field,
			},
		})
		const definition = kit.defineForm(schema, {
			ui: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: "Name",
				},
			],
		})
		const form = kit.createForm(definition, {
			defaultValues: defaultValues(),
		})

		render(<kit.AutoForm form={form} id="partial" />)

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
				...createDefaultSlots(),
				Field,
				Section,
				Array: ArraySlot,
			},
		})
		const definition = kit.defineForm(richSchema, {
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
		const form = kit.createForm(definition, {
			defaultValues: {
				name: "Ada",
				contacts: [],
			},
		})

		render(<kit.AutoForm form={form} />)

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
		const form = testKit.createForm(definition, {
			defaultValues: defaultValues(),
		})

		function ControlHarness() {
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
		const definition = testKit.defineForm(collisionSchema, {
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
		const form = testKit.createForm(definition, {
			defaultValues: {
				"user-name": "Ada",
				user: { name: "Grace" },
			},
		})

		render(<testKit.AutoForm form={form} id="profile" />)

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

	it("rejects forms from base, extended, and sibling kit snapshots", () => {
		const base = createFormKit({
			controls: { text: textControl },
			slots: createDefaultSlots(),
		})
		const extended = base.extend({ controls: { extra: textControl } })
		const sibling = createFormKit({
			controls: { text: textControl },
			slots: createDefaultSlots(),
		})
		const definition = base.defineForm(schema, { ui: [] })
		const form = base.createForm(definition, {
			defaultValues: defaultValues(),
		})

		expect(() => render(<extended.Form form={form as never} />)).toThrow(
			/exact form kit/i,
		)
		expect(() => render(<sibling.AutoForm form={form as never} />)).toThrow(
			/exact form kit/i,
		)

		function BindingMismatch() {
			sibling.useBindForm(form as never, {})
			return null
		}
		expect(() => render(<BindingMismatch />)).toThrow(/exact form kit/i)
	})

	it("initializes one isolated middleware closure per form and rejects duplicates", () => {
		const commits: number[][] = []
		const middleware: FormMiddleware<TestValues, unknown> = () => (next) => {
			const local: number[] = []
			commits.push(local)
			return (transaction) => {
				local.push(local.length + 1)
				return next(transaction)
			}
		}
		const definition = createDefinition()
		const first = testKit.createForm<TestSchema, unknown>(definition, {
			defaultValues: defaultValues(),
			middleware: [middleware],
		})
		const second = testKit.createForm<TestSchema, unknown>(definition, {
			defaultValues: defaultValues(),
			middleware: [middleware],
		})

		first.setValue("name", "Grace")
		second.setValue("name", "Katherine")
		expect(commits).toEqual([[1], [1]])
		expect(() =>
			testKit.createForm<TestSchema, unknown>(definition, {
				defaultValues: defaultValues(),
				middleware: [middleware, middleware],
			}),
		).toThrow(/duplicates an earlier middleware reference/i)
	})

	it("publishes no binding activation for failed or discarded forms", () => {
		const activated = vi.fn()
		const pass = Object.assign<FormMiddleware<TestValues, unknown>, object>(
			() => (next) => (transaction) => next(transaction),
			{ [formBindingFinalizer]: activated },
		)
		const fail: FormMiddleware<TestValues, unknown> = () => {
			throw new Error("initialization failed")
		}
		const definition = createDefinition()

		expect(() =>
			testKit.createForm<TestSchema, unknown>(definition, {
				defaultValues: defaultValues(),
				middleware: [pass, fail],
			}),
		).toThrow("initialization failed")
		testKit.createForm<TestSchema, unknown>(definition, {
			defaultValues: defaultValues(),
			middleware: [pass],
		})
		expect(activated).not.toHaveBeenCalled()

		function BoundForm() {
			const form = testKit.useCreateForm<TestSchema, unknown>(definition, {
				defaultValues: defaultValues(),
				middleware: [pass],
			})
			return <testKit.AutoForm form={form} />
		}

		render(
			<StrictMode>
				<BoundForm />
			</StrictMode>,
		)
		expect(activated).toHaveBeenCalledTimes(1)
	})

	it("keeps DevTools attached to the retained Strict Mode form until explicit disconnect", () => {
		const listeners = new Set<(message: unknown) => void>()
		const unsubscribeFromMessages = vi.fn(() => listeners.clear())
		const subscribe = vi.fn((listener: (message: unknown) => void) => {
			listeners.add(listener)
			return unsubscribeFromMessages
		})
		const connect = vi.fn(() => ({
			init: vi.fn(),
			send: vi.fn(),
			error: vi.fn(),
			subscribe,
			unsubscribe: vi.fn(() => listeners.clear()),
		}))
		Object.defineProperty(window, "__REDUX_DEVTOOLS_EXTENSION__", {
			configurable: true,
			value: { connect },
		})
		const feature = createDevToolsMiddleware()
		const definition = createDefinition()
		let retainedForm:
			| ReturnType<typeof testKit.createForm<TestSchema, unknown>>
			| undefined

		function BoundForm() {
			const form = testKit.useCreateForm<TestSchema, unknown>(definition, {
				defaultValues: defaultValues(),
				middleware: [feature],
			})
			retainedForm = form
			return <testKit.AutoForm form={form} />
		}

		try {
			const { unmount } = render(
				<StrictMode>
					<BoundForm />
				</StrictMode>,
			)
			expect(connect).toHaveBeenCalledOnce()
			expect(subscribe).toHaveBeenCalledOnce()
			expect(listeners.size).toBe(1)
			expect(unsubscribeFromMessages).not.toHaveBeenCalled()

			unmount()
			expect(listeners.size).toBe(1)
			expect(unsubscribeFromMessages).not.toHaveBeenCalled()

			if (retainedForm === undefined) {
				throw new Error("Expected Strict Mode to retain a form")
			}
			feature.handle(retainedForm).disconnect()
			expect(unsubscribeFromMessages).toHaveBeenCalledOnce()
			expect(listeners.size).toBe(0)
		} finally {
			if (retainedForm !== undefined) {
				feature.handle(retainedForm).disconnect()
			}
			Reflect.deleteProperty(window, "__REDUX_DEVTOOLS_EXTENSION__")
		}
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
	expect(slots.Submit).toBeTypeOf("function")
}
