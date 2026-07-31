import { describe, expect, it, vi } from "vitest"
import { registerErrorSummaryFocusTarget } from "./form-store.js"
import type { ControlMetadata, StandardSchema, UiNode } from "./index.js"
import {
	createFormStore,
	type FormStore,
	normalizeDefinition,
} from "./index.js"

type AccountValues = {
	name: string
	kind: "person" | "company"
	companyName?: string
	contacts: {
		value: string
	}[]
}

type AccountContext = {
	readonly locked: boolean
	readonly showCompany: boolean
}

type AccountControls = {
	readonly text: ControlMetadata<string | undefined>
	readonly select: ControlMetadata<AccountValues["kind"]>
}

const schema = {} as StandardSchema<AccountValues>

const controls = {
	text: {
		formData: {
			mode: "native",
		},
	},
	select: {
		formData: {
			mode: "native",
		},
	},
} satisfies AccountControls

function createDefinition() {
	return normalizeDefinition<typeof schema, AccountControls, AccountContext>({
		schema,
		controls,
		ui: [
			{
				kind: "field",
				path: "name",
				control: "text",
				label: "Name",
			},
			{
				kind: "field",
				path: "kind",
				control: "select",
				label: "Kind",
			},
			{
				kind: "field",
				path: "companyName",
				control: "text",
				label: "Company name",
				visible: (_values, { context }) => context.showCompany,
				disabled: (_values, { context }) => context.locked,
			},
		] satisfies readonly UiNode<
			AccountValues,
			AccountControls,
			AccountContext
		>[],
	})
}

function createStore(
	options: {
		readonly defaultValues?: AccountValues
		readonly context?: AccountContext
		readonly beforeUpdate?: () => undefined
		readonly afterUpdate?: () => void
	} = {},
): FormStore<typeof schema, AccountContext> {
	return createFormStore({
		definition: createDefinition(),
		defaultValues: options.defaultValues ?? {
			name: "Ada",
			kind: "person",
			contacts: [{ value: "ada@example.test" }],
		},
		context: options.context ?? {
			locked: false,
			showCompany: true,
		},
		beforeUpdate: options.beforeUpdate,
		afterUpdate: options.afterUpdate,
	})
}

describe("form store construction and snapshots", () => {
	it("constructs from complete defaultValues with cached immutable state reads", () => {
		const defaultValues: AccountValues = {
			name: "Ada",
			kind: "person",
			contacts: [{ value: "ada@example.test" }],
		}
		const form = createStore({ defaultValues })

		const snapshot = form.getSnapshot()
		const sameSnapshot = form.getSnapshot()

		expect(sameSnapshot).toBe(snapshot)
		expect(form.getServerSnapshot()).toBe(snapshot)
		expect(form.definition.schema).toBe(schema)
		expect(form.schema).toBe(schema)
		expect(form.getValues()).toEqual(snapshot.values)
		expect(form.getValue("contacts.0.value")).toBe("ada@example.test")
		expect(snapshot.values).toEqual(defaultValues)
		expect(snapshot.values).not.toBe(defaultValues)
		expect(snapshot.values.contacts).not.toBe(defaultValues.contacts)
		expect(snapshot.errors.form).toEqual([])
		expect(snapshot.errors.fields.size).toBe(0)
		expect(snapshot.isDirty).toBe(false)
		expect(snapshot.isTouched).toBe(false)
		expect(snapshot.isValidating).toBe(false)
		expect(snapshot.isSubmitting).toBe(false)
		expect(snapshot.validationStatus).toBe("unvalidated")
		expect(snapshot.submitCount).toBe(0)
		expect(snapshot.metadata.fieldsByPath.name).toEqual({
			dirty: false,
			touched: false,
			validating: false,
		})
		expect(snapshot.resolvedUi.fieldsByPath.companyName.visible).toBe(true)
		expect(Object.isFrozen(snapshot)).toBe(true)
		expect(Object.isFrozen(snapshot.values)).toBe(true)
		expect(Object.isFrozen(snapshot.values.contacts)).toBe(true)

		expect(() => {
			;(snapshot.values as { name: string }).name = "Grace"
		}).toThrow(TypeError)
		expect(() => {
			;(snapshot.errors.fields as Map<string, readonly unknown[]>).set(
				"name",
				[],
			)
		}).toThrow(TypeError)

		defaultValues.name = "Grace"
		defaultValues.contacts[0].value = "grace@example.test"

		expect(form.getValues()).toEqual({
			name: "Ada",
			kind: "person",
			contacts: [{ value: "ada@example.test" }],
		})
	})

	it("keeps mutable native values outside internal state reads", () => {
		type NativeValues = {
			createdAt: Date
			pattern: RegExp
		}
		const nativeSchema = {} as StandardSchema<NativeValues>
		const nativeDefinition = normalizeDefinition({
			schema: nativeSchema,
			controls: {},
			ui: [],
		})
		const createdAt = new Date("2026-07-28T00:00:00.000Z")
		const pattern = /ada/g
		pattern.lastIndex = 1
		const form = createFormStore({
			definition: nativeDefinition,
			defaultValues: {
				createdAt,
				pattern,
			},
			context: {},
		})

		createdAt.setTime(0)
		pattern.lastIndex = 0

		expect((form.getValue("createdAt") as Date).toISOString()).toBe(
			"2026-07-28T00:00:00.000Z",
		)
		expect((form.getValue("pattern") as RegExp).lastIndex).toBe(1)
		expect(form.getSnapshot().isDirty).toBe(false)

		form.getSnapshot().values.createdAt.setTime(0)
		form.getSnapshot().values.pattern.lastIndex = 0
		form.getValues().createdAt.setTime(1)

		expect((form.getValue("createdAt") as Date).toISOString()).toBe(
			"2026-07-28T00:00:00.000Z",
		)
		expect((form.getValue("pattern") as RegExp).lastIndex).toBe(1)
		expect(form.getSnapshot().isDirty).toBe(false)
	})

	it("keeps baseline and metadata outside submitted values while tracking blur metadata", () => {
		const form = createStore()
		const listener = vi.fn()
		form.subscribe((snapshot) => snapshot.isTouched, listener)

		form.blur("name")
		const snapshot = form.getSnapshot()

		expect(listener).toHaveBeenCalledTimes(1)
		expect(listener).toHaveBeenLastCalledWith(true, false)
		expect(snapshot.isTouched).toBe(true)
		expect(snapshot.metadata.fieldsByPath.name.touched).toBe(true)
		expect(snapshot.metadata.fieldsByPath.companyName.touched).toBe(false)
		expect(form.getValues()).toEqual({
			name: "Ada",
			kind: "person",
			contacts: [{ value: "ada@example.test" }],
		})
		expect(Object.hasOwn(form.getValues() as object, "__fp")).toBe(false)
	})

	it("registers focus refs and focuses only mounted visible editable fields", () => {
		const form = createStore({
			context: {
				locked: true,
				showCompany: true,
			},
		})
		const element = { focus: vi.fn() }

		form.registerFieldRef("companyName", element)
		form.focus("companyName")

		expect(element.focus).not.toHaveBeenCalled()

		form.replaceContext({
			locked: false,
			showCompany: true,
		})
		form.focus("companyName")
		form.registerFieldRef("companyName", null)
		form.focus("companyName")

		expect(element.focus).toHaveBeenCalledTimes(1)
	})

	it("focuses the first editable displayed error before a matching summary", () => {
		const form = createStore({
			context: {
				locked: true,
				showCompany: true,
			},
		})
		const company = { focus: vi.fn() }
		const name = { focus: vi.fn() }
		const firstSummary = { focus: vi.fn() }
		const matchingSummary = { focus: vi.fn() }
		form.registerFieldRef("companyName", company)
		form.registerFieldRef("name", name)
		registerErrorSummaryFocusTarget(form, 0, firstSummary)
		registerErrorSummaryFocusTarget(form, 1, matchingSummary)
		form.setErrors([
			{ source: "manual", path: "companyName", message: "Company is locked" },
			{ source: "manual", path: "name", message: "Name is required" },
			{ source: "manual", path: "missing", message: "Missing data" },
			{ source: "manual", path: "contacts", message: "Contacts need review" },
		])

		expect(form.focusFirstError(["companyName"])).toBe(false)
		expect(form.focusFirstError()).toBe(true)
		expect(company.focus).not.toHaveBeenCalled()
		expect(name.focus).toHaveBeenCalledTimes(1)
		expect(firstSummary.focus).not.toHaveBeenCalled()
		expect(matchingSummary.focus).not.toHaveBeenCalled()

		expect(form.focusFirstError(["contacts"])).toBe(true)
		expect(firstSummary.focus).not.toHaveBeenCalled()
		expect(matchingSummary.focus).toHaveBeenCalledTimes(1)
		expect(form.focusFirstError([])).toBe(false)
	})

	it("reevaluates context-dependent UI without changing values, dirty state, or update hooks", () => {
		const beforeUpdate = vi.fn()
		const afterUpdate = vi.fn()
		const form = createStore({ beforeUpdate, afterUpdate })
		const values = form.getValues()
		const resolvedUi = form.getSnapshot().resolvedUi

		form.replaceContext({
			locked: true,
			showCompany: true,
		})
		const snapshot = form.getSnapshot()

		expect(snapshot.values).toEqual(values)
		expect(snapshot.isDirty).toBe(false)
		expect(snapshot.metadata.fieldsByPath.name.dirty).toBe(false)
		expect(snapshot.resolvedUi).not.toBe(resolvedUi)
		expect(snapshot.resolvedUi.fieldsByPath.companyName.disabled).toBe(true)
		expect(beforeUpdate).not.toHaveBeenCalled()
		expect(afterUpdate).not.toHaveBeenCalled()
	})
})
