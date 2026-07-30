import { describe, expect, it, vi } from "vitest"

import type { ControlMetadata, StandardSchema, UiNode } from "./index.js"
import { createFormStore, normalizeDefinition } from "./index.js"

type ProfileValues = {
	name: string
	email: string
	companyName?: string
}

type ProfileContext = {
	readonly locked: boolean
	readonly showCompany: boolean
}

type ProfileControls = {
	readonly text: ControlMetadata<string | undefined>
}

const schema = {} as StandardSchema<ProfileValues>
const controls = {
	text: {
		formData: {
			mode: "native",
		},
	},
} satisfies ProfileControls

function createProfileForm() {
	const definition = normalizeDefinition<
		typeof schema,
		ProfileControls,
		ProfileContext
	>({
		schema,
		controls,
		ui: [
			{
				kind: "field",
				path: "name",
				control: "text",
			},
			{
				kind: "field",
				path: "email",
				control: "text",
			},
			{
				kind: "field",
				path: "companyName",
				control: "text",
				visible: (_values, { context }) => context.showCompany,
				disabled: (_values, { context }) => context.locked,
			},
		] satisfies readonly UiNode<
			ProfileValues,
			ProfileControls,
			ProfileContext
		>[],
	})

	return createFormStore({
		definition,
		defaultValues: {
			name: "Ada",
			email: "ada@example.test",
		},
		context: {
			locked: false,
			showCompany: true,
		},
	})
}

describe("form store subscriptions", () => {
	it("notifies only selector results changed by a committed metadata update", () => {
		const form = createProfileForm()
		const nameTouched = vi.fn()
		const emailTouched = vi.fn()
		const nameValue = vi.fn()
		const resolvedUi = vi.fn()

		form.subscribe(
			(snapshot) => snapshot.metadata.fieldsByPath.name.touched,
			nameTouched,
		)
		form.subscribe(
			(snapshot) => snapshot.metadata.fieldsByPath.email.touched,
			emailTouched,
		)
		form.subscribe((snapshot) => snapshot.values.name, nameValue)
		form.subscribe((snapshot) => snapshot.resolvedUi, resolvedUi)

		form.blur("name")

		expect(nameTouched).toHaveBeenCalledTimes(1)
		expect(nameTouched).toHaveBeenLastCalledWith(true, false)
		expect(emailTouched).not.toHaveBeenCalled()
		expect(nameValue).not.toHaveBeenCalled()
		expect(resolvedUi).not.toHaveBeenCalled()
	})

	it("uses Object.is selector equality by default", () => {
		const form = createProfileForm()
		const contextListener = vi.fn()
		const valuesListener = vi.fn()
		const valueListener = vi.fn()

		form.subscribe((snapshot) => snapshot.context, contextListener)
		form.subscribe((snapshot) => snapshot.values, valuesListener)
		form.subscribe((snapshot) => snapshot.values.name, valueListener)

		form.replaceContext({
			locked: false,
			showCompany: true,
		})

		expect(contextListener).toHaveBeenCalledTimes(1)
		expect(valuesListener).not.toHaveBeenCalled()
		expect(valueListener).not.toHaveBeenCalled()
	})

	it("supports custom equality and unsubscribe", () => {
		const form = createProfileForm()
		const lockedListener = vi.fn()
		const touchedListener = vi.fn()

		form.subscribe((snapshot) => snapshot.context, lockedListener, {
			equalityFn: (previous, next) => previous.locked === next.locked,
		})
		const unsubscribe = form.subscribe(
			(snapshot) => snapshot.isTouched,
			touchedListener,
		)

		form.replaceContext({
			locked: false,
			showCompany: false,
		})
		form.replaceContext({
			locked: true,
			showCompany: false,
		})
		form.blur("name")
		unsubscribe()
		form.blur("email")

		expect(lockedListener).toHaveBeenCalledTimes(1)
		expect(lockedListener.mock.calls[0]?.[0]).toEqual({
			locked: true,
			showCompany: false,
		})
		expect(touchedListener).toHaveBeenCalledTimes(1)
	})

	it("does not notify for no-op commits or focus ref registration", () => {
		const form = createProfileForm()
		const listener = vi.fn()
		const context = form.getSnapshot().context

		form.subscribe((snapshot) => snapshot, listener)

		form.replaceContext(context)
		form.registerFieldRef("name", { focus: vi.fn() })
		form.blur("name")
		form.blur("name")

		expect(listener).toHaveBeenCalledTimes(1)
	})
})
