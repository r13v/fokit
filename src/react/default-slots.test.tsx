"use client"

import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { FormIssue } from "../core/index.js"
import {
	createDefaultSlots,
	type DefaultArrayAddI18nData,
	type DefaultArrayItemI18nData,
	type DefaultSlotI18nValue,
	type DefaultSlotsI18n,
} from "./default-slots.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	SectionSlotProps,
	StructuralNodeName,
	StructuralRootProps,
} from "./slots.js"

const _arrayAddMessage: DefaultSlotI18nValue<DefaultArrayAddI18nData> = ({
	label,
}) => `Add ${String(label)}`
const _arrayItemMessage: DefaultSlotI18nValue<DefaultArrayItemI18nData> = ({
	position,
}) => `Item ${position}`

void _arrayAddMessage
void _arrayItemMessage

describe("createDefaultSlots i18n", () => {
	it("uses English fallback labels for array actions", () => {
		const slots = createDefaultSlots()

		render(
			<>
				<slots.Array {...arrayProps({ label: "Contacts" })}>Rows</slots.Array>
				<slots.ArrayItem {...arrayItemProps({ index: 1 })}>Row</slots.ArrayItem>
			</>,
		)

		expect(button("Add item").disabled).toBe(false)
		expect(button("Move item 2 up").disabled).toBe(false)
		expect(button("Move item 2 down").disabled).toBe(false)
		expect(button("Remove item 2").disabled).toBe(false)
	})

	it("merges mixed string and function overrides over English defaults", () => {
		const slots = createDefaultSlots({
			i18n: {
				arrayAdd: ({ label }) => `Add ${String(label)}`,
				arrayRemove: "Delete row",
			},
		})

		render(
			<>
				<slots.Array {...arrayProps({ label: "Contact" })}>Rows</slots.Array>
				<slots.ArrayItem {...arrayItemProps({ index: 0 })}>Row</slots.ArrayItem>
			</>,
		)

		expect(button("Add Contact").disabled).toBe(false)
		expect(button("Delete row").disabled).toBe(false)
		expect(button("Move item 1 up").disabled).toBe(false)
		expect(button("Move item 1 down").disabled).toBe(false)
	})

	it("keeps English defaults when i18n entries are explicitly undefined", () => {
		const slots = createDefaultSlots({
			i18n: {
				arrayAdd: undefined,
				arrayRemove: undefined,
			},
		})

		render(
			<>
				<slots.Array {...arrayProps({ label: "Contacts" })}>Rows</slots.Array>
				<slots.ArrayItem {...arrayItemProps({ index: 0 })}>Row</slots.ArrayItem>
			</>,
		)

		expect(button("Add item").disabled).toBe(false)
		expect(button("Remove item 1").disabled).toBe(false)
	})

	it("passes readonly add and one-based array-item action data", () => {
		const actionData: {
			add?: Readonly<DefaultArrayAddI18nData>
			remove?: Readonly<DefaultArrayItemI18nData>
			moveUp?: Readonly<DefaultArrayItemI18nData>
			moveDown?: Readonly<DefaultArrayItemI18nData>
		} = {}
		const slots = createDefaultSlots({
			i18n: {
				arrayAdd(data) {
					actionData.add = data
					return "Add contact"
				},
				arrayRemove(data) {
					actionData.remove = data
					return "Remove contact"
				},
				arrayMoveUp(data) {
					actionData.moveUp = data
					return "Move contact up"
				},
				arrayMoveDown(data) {
					actionData.moveDown = data
					return "Move contact down"
				},
			},
		})

		render(
			<>
				<slots.Array {...arrayProps({ label: "Contacts" })}>Rows</slots.Array>
				<slots.ArrayItem {...arrayItemProps({ index: 2 })}>Row</slots.ArrayItem>
			</>,
		)

		expect(actionData.add).toEqual({ label: "Contacts" })
		expect(actionData.remove).toEqual({ index: 2, position: 3 })
		expect(actionData.moveUp).toEqual({ index: 2, position: 3 })
		expect(actionData.moveDown).toEqual({ index: 2, position: 3 })
		expect(Object.isFrozen(actionData.add)).toBe(true)
		expect(Object.isFrozen(actionData.remove)).toBe(true)
		expect(Object.isFrozen(actionData.moveUp)).toBe(true)
		expect(Object.isFrozen(actionData.moveDown)).toBe(true)
	})

	it("isolates merged i18n between factory calls", () => {
		const overrides: {
			arrayAdd?: DefaultSlotsI18n["arrayAdd"]
		} = {
			arrayAdd: "Add first",
		}
		const first = createDefaultSlots({ i18n: overrides })

		overrides.arrayAdd = "Mutated after creation"

		const second = createDefaultSlots({
			i18n: {
				arrayAdd: "Add second",
			},
		})

		expect(first).not.toBe(second)
		render(
			<>
				<first.Array {...arrayProps({ label: "First" })}>Rows</first.Array>
				<second.Array {...arrayProps({ label: "Second" })}>Rows</second.Array>
			</>,
		)

		expect(button("Add first").disabled).toBe(false)
		expect(button("Add second").disabled).toBe(false)
		expect(
			screen.queryByRole("button", { name: "Mutated after creation" }),
		).toBe(null)
	})
})

describe("createDefaultSlots components", () => {
	it("renders the field slot with semantic labels, descriptions, controls, errors, and root props", () => {
		const slots = createDefaultSlots()
		const rootRef = vi.fn()
		const { container } = render(
			<slots.Field
				{...fieldProps({
					rootProps: rootProps("field", {
						"data-testid": "field-root",
						id: "field-name",
						ref: rootRef,
					}),
					label: "Display name",
					labelProps: {
						htmlFor: "profile-name",
						id: "profile-name-label",
					},
					description: "Shown publicly",
					descriptionProps: {
						id: "profile-name-description",
					},
					control: (
						<input
							aria-describedby="profile-name-description profile-name-error-0"
							id="profile-name"
							name="name"
						/>
					),
					errors: [
						<span id="profile-name-error-0" key="required" role="alert">
							Name is required
						</span>,
					],
				})}
			/>,
		)

		const root = screen.getByTestId("field-root")
		const input = screen.getByLabelText("Display name") as HTMLInputElement

		expect(
			container.querySelectorAll("[data-testid='field-root']"),
		).toHaveLength(1)
		expect(root.getAttribute("data-fokit-node")).toBe("field")
		expect(root.id).toBe("field-name")
		expect(rootRef).toHaveBeenLastCalledWith(root)
		expect(input.id).toBe("profile-name")
		expect(input.getAttribute("aria-describedby")).toBe(
			"profile-name-description profile-name-error-0",
		)
		expect(screen.getByText("Display name").id).toBe("profile-name-label")
		expect(screen.getByText("Shown publicly").id).toBe(
			"profile-name-description",
		)
		expect(screen.getByRole("alert").id).toBe("profile-name-error-0")
	})

	it("renders the section slot as a semantic section with its layout wrapper", () => {
		const slots = createDefaultSlots()
		const { container } = render(
			<slots.Section
				{...sectionProps({
					rootProps: rootProps("section", {
						"data-testid": "section-root",
						id: "identity",
					}),
					layoutProps: {
						"data-fokit-layout": "grid",
						"data-fokit-columns": 2,
					},
					title: "Identity",
					description: "Basic profile fields",
					children: <span data-testid="section-child">Name field</span>,
				})}
			/>,
		)

		const section = screen.getByTestId("section-root")
		const layout = container.querySelector("[data-fokit-layout='grid']")
		if (!(layout instanceof HTMLElement)) {
			throw new Error("Expected section layout root")
		}

		expect(
			container.querySelectorAll("[data-testid='section-root']"),
		).toHaveLength(1)
		expect(section.tagName).toBe("SECTION")
		expect(section.getAttribute("data-fokit-node")).toBe("section")
		expect(screen.getByRole("heading", { level: 2, name: "Identity" })).toBe(
			screen.getByText("Identity"),
		)
		expect(screen.getByText("Basic profile fields").tagName).toBe("P")
		expect(layout.getAttribute("data-fokit-layout")).toBe("grid")
		expect(layout.getAttribute("data-fokit-columns")).toBe("2")
		expect(within(layout).getByTestId("section-child")).toBeTruthy()
	})

	it("renders array relationships, children, errors, and a guarded add button", () => {
		const slots = createDefaultSlots()
		const add = vi.fn()
		const { container, rerender } = render(
			<slots.Array
				{...arrayProps({
					rootProps: rootProps("array", {
						"aria-describedby": "contacts-description contacts-error-0",
						"aria-labelledby": "contacts-label",
						"data-testid": "array-root",
						id: "contacts",
					}),
					label: "Contacts",
					labelProps: {
						id: "contacts-label",
					},
					description: "People to notify",
					descriptionProps: {
						id: "contacts-description",
					},
					errors: [
						<span id="contacts-error-0" key="minimum" role="alert">
							Add at least one contact
						</span>,
					],
					add,
					children: <span data-testid="array-child">Ada</span>,
				})}
			/>,
		)

		const root = screen.getByTestId("array-root")

		expect(
			container.querySelectorAll("[data-testid='array-root']"),
		).toHaveLength(1)
		expect(root.getAttribute("data-fokit-node")).toBe("array")
		expect(root.getAttribute("aria-labelledby")).toBe("contacts-label")
		expect(root.getAttribute("aria-describedby")).toBe(
			"contacts-description contacts-error-0",
		)
		expect(screen.getByText("Contacts").id).toBe("contacts-label")
		expect(screen.getByText("People to notify").id).toBe("contacts-description")
		expect(screen.getByRole("alert").id).toBe("contacts-error-0")
		expect(screen.getByTestId("array-child").textContent).toBe("Ada")

		fireEvent.click(button("Add item"))
		expect(add).toHaveBeenCalledTimes(1)

		rerender(
			<slots.Array
				{...arrayProps({
					add,
					canAdd: false,
					children: <span>Rows</span>,
				})}
			/>,
		)

		expect(button("Add item").disabled).toBe(true)
		fireEvent.click(button("Add item"))
		expect(add).toHaveBeenCalledTimes(1)
	})

	it("renders array-item actions with callbacks, i18n labels, and disabled states", () => {
		const slots = createDefaultSlots()
		const move = vi.fn()
		const remove = vi.fn()
		const { container, rerender } = render(
			<slots.ArrayItem
				{...arrayItemProps({
					rootProps: rootProps("array-item", {
						"data-testid": "item-root",
						id: "contacts.1",
					}),
					index: 1,
					move,
					remove,
					children: <span data-testid="item-child">Grace</span>,
				})}
			/>,
		)

		const root = screen.getByTestId("item-root")

		expect(
			container.querySelectorAll("[data-testid='item-root']"),
		).toHaveLength(1)
		expect(root.getAttribute("data-fokit-node")).toBe("array-item")
		expect(root.id).toBe("contacts.1")
		expect(screen.getByTestId("item-child").textContent).toBe("Grace")

		fireEvent.click(button("Move item 2 up"))
		fireEvent.click(button("Move item 2 down"))
		fireEvent.click(button("Remove item 2"))
		expect(move).toHaveBeenNthCalledWith(1, 0)
		expect(move).toHaveBeenNthCalledWith(2, 2)
		expect(remove).toHaveBeenCalledTimes(1)

		rerender(
			<slots.ArrayItem
				{...arrayItemProps({
					disabled: true,
					index: 1,
					move,
					remove,
				})}
			/>,
		)

		expect(button("Move item 2 up").disabled).toBe(true)
		expect(button("Move item 2 down").disabled).toBe(true)
		expect(button("Remove item 2").disabled).toBe(true)

		rerender(
			<slots.ArrayItem
				{...arrayItemProps({
					index: 1,
					move,
					readOnly: true,
					remove,
				})}
			/>,
		)

		expect(button("Move item 2 up").disabled).toBe(true)
		expect(button("Move item 2 down").disabled).toBe(true)
		expect(button("Remove item 2").disabled).toBe(true)

		rerender(
			<slots.ArrayItem
				{...arrayItemProps({
					canMoveDown: false,
					canMoveUp: false,
					index: 1,
					move,
					remove,
				})}
			/>,
		)

		expect(button("Move item 2 up").disabled).toBe(true)
		expect(button("Move item 2 down").disabled).toBe(true)
		expect(button("Remove item 2").disabled).toBe(false)
	})

	it("renders default error messages as focusable alerts with root identification props", () => {
		const slots = createDefaultSlots()
		const rootRef = vi.fn()
		const { container } = render(
			<slots.ErrorMessage
				{...errorMessageProps({
					rootProps: rootProps("error-message", {
						"data-testid": "error-root",
						id: "profile-email-error-0",
						ref: rootRef,
						tabIndex: -1,
					}),
					issue: issue("Email is invalid"),
				})}
			/>,
		)

		const alert = screen.getByRole("alert")

		expect(
			container.querySelectorAll("[data-testid='error-root']"),
		).toHaveLength(1)
		expect(alert.tagName).toBe("P")
		expect(alert.id).toBe("profile-email-error-0")
		expect(alert.tabIndex).toBe(-1)
		expect(alert.getAttribute("data-fokit-node")).toBe("error-message")
		expect(alert.textContent).toBe("Email is invalid")
		expect(rootRef).toHaveBeenLastCalledWith(alert)
	})

	it("omits optional labels and descriptions when callers do not supply them", () => {
		const slots = createDefaultSlots()
		const { container } = render(
			<>
				<slots.Field
					{...fieldProps({
						control: <input aria-label="Unlabelled generated field" />,
					})}
				/>
				<slots.Section {...sectionProps()} />
				<slots.Array {...arrayProps()} />
			</>,
		)

		expect(container.querySelector("label")).toBeNull()
		expect(container.querySelector("h2")).toBeNull()
		expect(container.querySelector("p")).toBeNull()
		expect(screen.getByLabelText("Unlabelled generated field")).toBeTruthy()
		expect(button("Add item").disabled).toBe(false)
	})
})

function fieldProps(props: Partial<FieldSlotProps> = {}): FieldSlotProps {
	return {
		rootProps: rootProps("field"),
		labelProps: {},
		descriptionProps: {},
		control: null,
		errors: [],
		disabled: false,
		readOnly: false,
		required: false,
		...props,
	}
}

function sectionProps(props: Partial<SectionSlotProps> = {}): SectionSlotProps {
	return {
		rootProps: rootProps("section"),
		layoutProps: {
			"data-fokit-layout": "grid",
			"data-fokit-columns": 1,
		},
		children: null,
		...props,
	}
}

function arrayProps(props: Partial<ArraySlotProps> = {}): ArraySlotProps {
	return {
		rootProps: rootProps("array"),
		labelProps: {},
		descriptionProps: {},
		errors: [],
		invalid: false,
		canAdd: true,
		add: vi.fn(),
		children: null,
		...props,
	}
}

function arrayItemProps(
	props: Partial<ArrayItemSlotProps> = {},
): ArrayItemSlotProps {
	return {
		rootProps: rootProps("array-item"),
		index: 0,
		disabled: false,
		readOnly: false,
		canMoveUp: true,
		canMoveDown: true,
		remove: vi.fn(),
		move: vi.fn(),
		children: null,
		...props,
	}
}

function errorMessageProps(
	props: Partial<ErrorMessageSlotProps> = {},
): ErrorMessageSlotProps {
	return {
		rootProps: rootProps("error-message"),
		issue: issue("Invalid value"),
		...props,
	}
}

function rootProps(
	node: StructuralNodeName,
	props: Record<string, unknown> = {},
): StructuralRootProps {
	return {
		"data-fokit-node": node,
		...props,
	} as StructuralRootProps
}

function issue(message: string): FormIssue {
	return {
		source: "manual",
		message,
	}
}

function button(name: string): HTMLButtonElement {
	return screen.getByRole("button", { name }) as HTMLButtonElement
}
