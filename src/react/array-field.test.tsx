"use client"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { useRef } from "react"
import { describe, expect, it } from "vitest"

import type { ImperativeFormIssue } from "../core/index.js"
import { type ControlProps, defineControl } from "./control.js"
import { createFormKit } from "./create-form-kit.js"
import { useFormContext } from "./form-context.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	SectionSlotProps,
} from "./slots.js"

type Contact = {
	readonly name: string
	readonly email: string
}

type Values = {
	readonly contacts: readonly Contact[]
	readonly lockedContacts: readonly Contact[]
	readonly groups: readonly {
		readonly name: string
		readonly members: readonly {
			readonly name: string
		}[]
	}[]
}

type Schema = StandardSchemaV1<Values>

const schema = {} as Schema
let nextMountId = 0

const text = defineControl<string>({
	component({
		value,
		setValue,
		blur,
		input,
		meta,
		disabled,
		readOnly,
	}: ControlProps<string>) {
		return (
			<input
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
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
		text,
	},
	slots: {
		Field: FieldSlot,
		Section: SectionSlot,
		Array: ArraySlot,
		ArrayItem: ArrayItemSlot,
		ErrorMessage,
	},
})

const definition = kit.defineForm(schema)({
	ui: [
		{
			kind: "array",
			path: "contacts",
			label: "Contacts",
			description: "People to notify",
			itemDefault: {
				name: "New",
				email: "",
			},
			children: [
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
		},
	],
})

const disabledDefinition = kit.defineForm(schema)({
	ui: [
		{
			kind: "array",
			path: "contacts",
			label: "Contacts",
			disabled: true,
			itemDefault: {
				name: "New",
				email: "",
			},
			children: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: "Name",
				},
			],
		},
	],
})

const readOnlyDefinition = kit.defineForm(schema)({
	ui: [
		{
			kind: "array",
			path: "lockedContacts",
			label: "Locked contacts",
			readOnly: true,
			itemDefault: {
				name: "New",
				email: "",
			},
			children: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: "Name",
				},
			],
		},
	],
})

const nestedDefinition = kit.defineForm(schema)({
	ui: [
		{
			kind: "array",
			path: "groups",
			label: "Groups",
			itemDefault: {
				name: "New group",
				members: [],
			},
			children: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: "Group name",
				},
				{
					kind: "array",
					path: "members",
					label: ({ name }) => `${name} members`,
					itemDefault: {
						name: "New member",
					},
					children: [
						{
							kind: "field",
							path: "name",
							control: "text",
							label: ({ name }) => `Member ${name}`,
						},
					],
				},
			],
		},
	],
})

describe("generated arrays", () => {
	it("renders array and array-item slots with direct array errors only", () => {
		render(
			<kit.AutoForm
				defaultValues={defaultValues()}
				definition={definition}
				id="profile"
			>
				<ShowErrors />
			</kit.AutoForm>,
		)

		fireEvent.click(screen.getByRole("button", { name: "Show errors" }))

		expect(screen.getByTestId("array-contacts")).toBeTruthy()
		expect(screen.getByTestId("item-contacts.0")).toBeTruthy()
		expect(screen.getByText("Contacts").id).toBe("profile-contacts-label")
		expect(screen.getByText("People to notify").id).toBe(
			"profile-contacts-description",
		)
		expect(screen.getAllByText("Add at least one contact")).toHaveLength(1)
		expect(screen.getAllByText("Email rejected")).toHaveLength(1)
		expect(screen.getByText("Add at least one contact").id).toBe(
			"profile-contacts-error-0",
		)
		expect(
			screen.getByText("Email rejected").getAttribute("data-fp-path"),
		).toBe("contacts.0.email")
		expect(input("contacts.0.name").value).toBe("Ada")
		expect(input("contacts.0.email").getAttribute("aria-describedby")).toBe(
			"profile-contacts%2E0%2Eemail-error-0",
		)
	})

	it("uses item defaults, relative paths, guarded actions, and stable row keys", () => {
		nextMountId = 0
		const { container } = render(
			<kit.AutoForm
				defaultValues={defaultValues()}
				definition={definition}
				id="profile"
			/>,
		)
		const adaRow = rowForValue(container, "Ada")
		const adaMountId = adaRow.dataset.mountId
		const adaRenderCount = adaRow.dataset.renders

		expect(
			(screen.getByTestId("up-contacts.0") as HTMLButtonElement).disabled,
		).toBe(true)
		expect(
			(screen.getByTestId("down-contacts.0") as HTMLButtonElement).disabled,
		).toBe(false)
		expect(
			(screen.getByTestId("down-contacts.1") as HTMLButtonElement).disabled,
		).toBe(true)

		fireEvent.click(screen.getByTestId("add-contacts"))
		expect(input("contacts.2.name").value).toBe("New")
		expect(adaRow.dataset.renders).toBe(adaRenderCount)

		fireEvent.change(input("contacts.2.name"), {
			target: {
				value: "Linus",
			},
		})
		fireEvent.click(screen.getByTestId("add-contacts"))
		expect(input("contacts.2.name").value).toBe("Linus")
		expect(input("contacts.3.name").value).toBe("New")
		expect(adaRow.dataset.renders).toBe(adaRenderCount)

		fireEvent.click(within(adaRow).getByRole("button", { name: "Move down" }))
		const movedAdaRow = rowForValue(container, "Ada")
		expect(movedAdaRow.dataset.mountId).toBe(adaMountId)
		expect(movedAdaRow.getAttribute("data-fp-path")).toBe("contacts.1")
		expect(input("contacts.1.name").value).toBe("Ada")

		fireEvent.click(within(movedAdaRow).getByRole("button", { name: "Remove" }))
		expect(queryInput("contacts.1.name")?.value).not.toBe("Ada")
	})

	it("guards disabled and read-only arrays and lets slots render empty fallback", () => {
		const { unmount } = render(
			<kit.AutoForm
				defaultValues={{
					contacts: [],
					groups: [],
					lockedContacts: [],
				}}
				definition={disabledDefinition}
				id="profile"
			/>,
		)

		expect(screen.getByText("No rows")).toBeTruthy()
		expect(
			screen.getByTestId("array-contacts").hasAttribute("data-disabled"),
		).toBe(true)
		expect(screen.getByTestId("add-contacts").textContent).toBe("Cannot add")
		fireEvent.click(screen.getByTestId("add-contacts"))
		expect(screen.queryByTestId("item-contacts.0")).toBeNull()

		unmount()
		render(
			<kit.AutoForm
				defaultValues={{
					contacts: [],
					groups: [],
					lockedContacts: [
						{
							name: "Ada",
							email: "ada@example.test",
						},
					],
				}}
				definition={readOnlyDefinition}
				id="profile"
			/>,
		)

		const lockedRow = screen.getByTestId("item-lockedContacts.0")
		expect(
			screen.getByTestId("array-lockedContacts").hasAttribute("data-readonly"),
		).toBe(true)
		fireEvent.click(within(lockedRow).getByRole("button", { name: "Remove" }))
		expect(input("lockedContacts.0.name").value).toBe("Ada")
		fireEvent.click(screen.getByTestId("add-lockedContacts"))
		expect(queryInput("lockedContacts.1.name")).toBeNull()
	})

	it("renders nested arrays with concrete paths and row-scoped derived labels", () => {
		render(
			<kit.AutoForm
				defaultValues={defaultValues()}
				definition={nestedDefinition}
				id="profile"
			/>,
		)

		expect(screen.getByText("Core members")).toBeTruthy()
		expect(screen.getByText("Docs members")).toBeTruthy()
		expect(screen.getByText("Member Ada")).toBeTruthy()
		expect(input("groups.0.members.0.name").value).toBe("Ada")

		fireEvent.change(input("groups.1.name"), {
			target: { value: "Guides" },
		})

		expect(screen.getByText("Core members")).toBeTruthy()
		expect(screen.queryByText("Docs members")).toBeNull()
		expect(screen.getByText("Guides members")).toBeTruthy()

		fireEvent.click(screen.getByTestId("add-groups.0.members"))

		expect(input("groups.0.members.1.name").value).toBe("New member")
		expect(screen.getByText("Member New member")).toBeTruthy()

		fireEvent.click(
			within(screen.getByTestId("item-groups.0.members.0")).getByRole(
				"button",
				{ name: "Remove" },
			),
		)

		expect(queryInput("groups.0.members.0.name")?.value).toBe("New member")
	})
})

function ShowErrors() {
	const form = useFormContext<Schema>()

	return (
		<button
			type="button"
			onClick={() => {
				form.setErrors([
					issue("contacts", "Add at least one contact"),
					issue("contacts.0.email", "Email rejected"),
				])
			}}
		>
			Show errors
		</button>
	)
}

function FieldSlot({
	rootProps,
	label,
	labelProps,
	control,
	errors,
}: FieldSlotProps) {
	return (
		<div {...rootProps} data-testid={`field-${pathFrom(rootProps)}`}>
			{label === undefined ? null : (
				<label {...labelProps} htmlFor={labelProps.htmlFor}>
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

function ArraySlot({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	errors,
	canAdd,
	add,
	children,
}: ArraySlotProps) {
	return (
		<div {...rootProps} data-testid={`array-${pathFrom(rootProps)}`}>
			{label === undefined ? null : <div {...labelProps}>{label}</div>}
			{description === undefined ? null : (
				<p {...descriptionProps}>{description}</p>
			)}
			{errors}
			<button
				data-testid={`add-${pathFrom(rootProps)}`}
				onClick={add}
				type="button"
			>
				{canAdd ? "Add" : "Cannot add"}
			</button>
			{children}
			{childrenCount(children) === 0 ? <p>No rows</p> : null}
		</div>
	)
}

function ArrayItemSlot({
	rootProps,
	index,
	canMoveUp,
	canMoveDown,
	remove,
	move,
	children,
}: ArrayItemSlotProps) {
	const mountId = useRef(++nextMountId)
	const renders = useRef(0)
	renders.current += 1
	const path = pathFrom(rootProps)

	return (
		<div
			{...rootProps}
			data-mount-id={mountId.current}
			data-renders={renders.current}
			data-testid={`item-${path}`}
		>
			<span>Row {index + 1}</span>
			<button onClick={remove} type="button">
				Remove
			</button>
			<button
				data-testid={`up-${path}`}
				disabled={!canMoveUp}
				onClick={() => move(index - 1)}
				type="button"
			>
				Move up
			</button>
			<button
				data-testid={`down-${path}`}
				disabled={!canMoveDown}
				onClick={() => move(index + 1)}
				type="button"
			>
				Move down
			</button>
			{children}
		</div>
	)
}

function ErrorMessage({ rootProps, issue }: ErrorMessageSlotProps) {
	return <p {...rootProps}>{issue.message}</p>
}

function defaultValues(): Values {
	return {
		contacts: [
			{
				name: "Ada",
				email: "ada@example.test",
			},
			{
				name: "Grace",
				email: "grace@example.test",
			},
		],
		lockedContacts: [],
		groups: [
			{
				name: "Core",
				members: [{ name: "Ada" }],
			},
			{
				name: "Docs",
				members: [],
			},
		],
	}
}

function issue(path: string, message: string): ImperativeFormIssue {
	return {
		source: "manual",
		path,
		message,
	}
}

function input(name: string): HTMLInputElement {
	const element = queryInput(name)
	if (element === null) {
		throw new Error(`Expected input named ${name}`)
	}

	return element
}

function queryInput(name: string): HTMLInputElement | null {
	return document.querySelector(`input[name="${name}"]`)
}

function rowForValue(container: HTMLElement, value: string): HTMLElement {
	const element = Array.from(container.querySelectorAll("input")).find(
		(inputElement) => inputElement.value === value,
	)
	const row = element?.closest("[data-fp-node='array-item']")
	if (!(row instanceof HTMLElement)) {
		throw new Error(`Expected row for value ${value}`)
	}

	return row
}

function childrenCount(children: ArraySlotProps["children"]): number {
	return Array.isArray(children)
		? children.length
		: children === undefined
			? 0
			: 1
}

function pathFrom(rootProps: FieldSlotProps["rootProps"]): string {
	return String(
		(rootProps as FieldSlotProps["rootProps"] & { "data-fp-path": string })[
			"data-fp-path"
		],
	)
}
