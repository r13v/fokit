import { describe, expect, it, vi } from "vitest"

import type {
	ControlMetadata,
	FormStoreOptions,
	StandardSchema,
	UiNode,
} from "./index.js"
import { createFormStore, normalizeDefinition } from "./index.js"

type ProfileValues = {
	name: string
	email: string
	nickname?: string
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

const defaultValues = {
	name: "Ada",
	email: "ada@example.test",
	nickname: "Countess",
} satisfies ProfileValues

const definition = normalizeDefinition({
	schema,
	controls,
	ui: [
		{ kind: "field", path: "name", control: "text" },
		{ kind: "field", path: "email", control: "text" },
		{ kind: "field", path: "nickname", control: "text" },
	] satisfies readonly UiNode<ProfileValues, ProfileControls>[],
})

function createProfileStore(
	options: {
		readonly beforeUpdate?: FormStoreOptions<typeof schema>["beforeUpdate"]
		readonly afterUpdate?: FormStoreOptions<typeof schema>["afterUpdate"]
	} = {},
) {
	return createFormStore({
		definition,
		defaultValues,
		beforeUpdate: options.beforeUpdate,
		afterUpdate: options.afterUpdate,
	})
}

describe("form reset", () => {
	it("clears touched metadata for a same-value reset without update hooks", () => {
		const beforeUpdate = vi.fn()
		const afterUpdate = vi.fn()
		const form = createProfileStore({ beforeUpdate, afterUpdate })
		const listener = vi.fn()

		form.blur("name")
		form.subscribe((snapshot) => snapshot.isTouched, listener)

		form.reset()

		expect(form.getValues()).toEqual(defaultValues)
		expect(form.getSnapshot().isTouched).toBe(false)
		expect(form.getSnapshot().isDirty).toBe(false)
		expect(form.getSnapshot().metadata.fieldsByPath.name.touched).toBe(false)
		expect(beforeUpdate).not.toHaveBeenCalled()
		expect(afterUpdate).not.toHaveBeenCalled()
		expect(listener).toHaveBeenCalledTimes(1)
		expect(listener).toHaveBeenLastCalledWith(false, true)
	})

	it("distinguishes restoring the stored baseline from installing same current values", () => {
		const restoreBeforeUpdate = vi.fn()
		const restoreAfterUpdate = vi.fn()
		const restore = createProfileStore({
			beforeUpdate: restoreBeforeUpdate,
			afterUpdate: restoreAfterUpdate,
		})
		restore.setValue("name", "Grace")
		restore.blur("name")
		restoreBeforeUpdate.mockClear()
		restoreAfterUpdate.mockClear()

		restore.reset()

		expect(restore.getValues()).toEqual(defaultValues)
		expect(restore.getSnapshot().isDirty).toBe(false)
		expect(restore.getSnapshot().isTouched).toBe(false)
		expect(restoreBeforeUpdate).toHaveBeenCalledTimes(1)
		expect(restoreAfterUpdate).toHaveBeenCalledTimes(1)

		const installBeforeUpdate = vi.fn()
		const installAfterUpdate = vi.fn()
		const install = createProfileStore({
			beforeUpdate: installBeforeUpdate,
			afterUpdate: installAfterUpdate,
		})
		install.setValue("name", "Grace")
		install.blur("name")
		installBeforeUpdate.mockClear()
		installAfterUpdate.mockClear()
		const currentValues = install.getValues()

		install.reset(currentValues)

		expect(install.getValues()).toEqual(currentValues)
		expect(install.getSnapshot().isDirty).toBe(false)
		expect(install.getSnapshot().isTouched).toBe(false)
		expect(installBeforeUpdate).not.toHaveBeenCalled()
		expect(installAfterUpdate).not.toHaveBeenCalled()

		install.setValue("name", "Ada")
		expect(install.getSnapshot().isDirty).toBe(true)
	})

	it("passes changed reset values through hooks and makes committed values the clean baseline", () => {
		const beforeUpdate = vi.fn()
		const afterUpdate = vi.fn()
		const form = createProfileStore({ beforeUpdate, afterUpdate })

		form.blur("email")
		form.reset({
			name: "Grace",
			email: "grace@example.test",
		})

		expect(form.getValues()).toEqual({
			name: "Grace",
			email: "grace@example.test",
		})
		expect(form.getSnapshot().isDirty).toBe(false)
		expect(form.getSnapshot().isTouched).toBe(false)
		expect(form.getSnapshot().metadata.fieldsByPath.name.dirty).toBe(false)
		expect(form.getSnapshot().metadata.fieldsByPath.email.dirty).toBe(false)
		expect(form.getSnapshot().metadata.fieldsByPath.nickname.dirty).toBe(false)
		expect(beforeUpdate).toHaveBeenCalledTimes(1)
		expect(afterUpdate).toHaveBeenCalledTimes(1)
		expect(beforeUpdate.mock.calls[0]?.[0]).toMatchObject({
			source: "reset",
			currentValues: defaultValues,
			nextValues: {
				name: "Grace",
				email: "grace@example.test",
			},
		})
		expect(afterUpdate.mock.calls[0]?.[0]).toMatchObject({
			source: "reset",
			previousValues: defaultValues,
			values: {
				name: "Grace",
				email: "grace@example.test",
			},
		})

		form.setValue("name", "Katherine")

		expect(form.getSnapshot().isDirty).toBe(true)
		expect(form.getSnapshot().metadata.fieldsByPath.name.dirty).toBe(true)
		expect(form.getSnapshot().metadata.fieldsByPath.email.dirty).toBe(false)
	})

	it("applies no reset metadata when beforeUpdate cancels the value transaction", () => {
		const afterUpdate = vi.fn()
		const form = createProfileStore({
			beforeUpdate: () => false,
			afterUpdate,
		})

		form.blur("name")
		form.reset({
			name: "Grace",
			email: "grace@example.test",
		})

		expect(form.getValues()).toEqual(defaultValues)
		expect(form.getSnapshot().isTouched).toBe(true)
		expect(form.getSnapshot().metadata.fieldsByPath.name.touched).toBe(true)
		expect(form.getSnapshot().isDirty).toBe(false)
		expect(afterUpdate).not.toHaveBeenCalled()
	})

	it("uses beforeUpdate replacement values as the new reset baseline", () => {
		const afterUpdate = vi.fn()
		const form = createProfileStore({
			beforeUpdate: (event) =>
				event.source === "reset"
					? [
							{
								type: "set",
								path: "name",
								value: "Katherine",
							},
							{
								type: "unset",
								path: "nickname",
							},
						]
					: undefined,
			afterUpdate,
		})

		form.blur("nickname")
		form.reset({
			name: "Grace",
			email: "grace@example.test",
		})

		expect(form.getValues()).toEqual({
			name: "Katherine",
			email: "ada@example.test",
		})
		expect(form.getSnapshot().isDirty).toBe(false)
		expect(form.getSnapshot().isTouched).toBe(false)
		expect(afterUpdate).toHaveBeenCalledTimes(1)
		expect(afterUpdate.mock.calls[0]?.[0].changes).toEqual([
			{
				type: "set",
				path: "name",
				value: "Katherine",
			},
			{
				type: "unset",
				path: "nickname",
			},
		])

		form.setValue("email", "kat@example.test")

		expect(form.getSnapshot().isDirty).toBe(true)
		expect(form.getSnapshot().metadata.fieldsByPath.name.dirty).toBe(false)
		expect(form.getSnapshot().metadata.fieldsByPath.email.dirty).toBe(true)
		expect(form.getSnapshot().metadata.fieldsByPath.nickname.dirty).toBe(false)

		const noopAfterUpdate = vi.fn()
		const replacedWithNoop = createProfileStore({
			beforeUpdate: (event) => (event.source === "reset" ? [] : undefined),
			afterUpdate: noopAfterUpdate,
		})
		replacedWithNoop.blur("name")

		replacedWithNoop.reset({
			name: "Grace",
			email: "grace@example.test",
		})

		expect(replacedWithNoop.getValues()).toEqual(defaultValues)
		expect(replacedWithNoop.getSnapshot().isDirty).toBe(false)
		expect(replacedWithNoop.getSnapshot().isTouched).toBe(false)
		expect(noopAfterUpdate).not.toHaveBeenCalled()
	})
})
