"use client"

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

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

function rootProps(node: StructuralNodeName): StructuralRootProps {
	return {
		"data-fokit-node": node,
	}
}

function button(name: string): HTMLButtonElement {
	return screen.getByRole("button", { name }) as HTMLButtonElement
}
