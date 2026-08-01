import type { StandardSchemaV1 } from "@standard-schema/spec"
import { describe, expect, it, vi } from "vitest"

import {
	createRowIdentityStateFromEntries,
	type RowIdentityState,
} from "./array-state.js"
import { createFormDocument } from "./form-reducer.js"
import {
	createFormStore,
	type FormStoreOptions,
	getFormStoreDocument,
	restoreFormStoreDocument,
} from "./form-store.js"
import type { ControlMetadata, StandardSchema, UiNode } from "./index.js"
import { normalizeDefinition } from "./index.js"

type Values = {
	secret?: string
	groups: {
		name: string
		members: { name: string }[]
	}[]
}

type Context = {
	readonly showSecret: boolean
}

type Controls = {
	readonly text: ControlMetadata<string | undefined>
}

type Deferred<Value> = {
	readonly promise: Promise<Value>
	resolve(value: Value): void
}

const controls = {
	text: { formData: { mode: "native" } },
} satisfies Controls

const defaultValues = {
	groups: [
		{ name: "Core", members: [{ name: "Ada" }] },
		{ name: "Docs", members: [] },
	],
} satisfies Values

function createDeferred<Value>(): Deferred<Value> {
	let resolve!: (value: Value) => void
	const promise = new Promise<Value>((promiseResolve) => {
		resolve = promiseResolve
	})
	return { promise, resolve }
}

function createSchema(
	validate: StandardSchema<Values>["~standard"]["validate"],
): StandardSchema<Values> {
	return {
		"~standard": {
			version: 1,
			vendor: "form-please-restore-test",
			validate,
		},
	} as StandardSchema<Values>
}

describe("document restore", () => {
	it("rejects missing and unexpected array identity before restoring", () => {
		const schema = createSchema((value) => ({ value: value as Values }))
		const definition = normalizeDefinition<typeof schema, Controls, Context>({
			schema,
			controls,
			ui: [
				{
					kind: "array",
					path: "groups",
					itemDefault: { name: "", members: [] },
					children: [
						{
							kind: "array",
							path: "members",
							itemDefault: { name: "" },
							children: [],
						},
					],
				},
			],
		})
		const form = createFormStore({
			definition,
			defaultValues,
			context: { showSecret: true },
		})
		const current = getFormStoreDocument(form)
		const missing = createFormDocument(
			current.values,
			createRowIdentityStateFromEntries([]),
		)
		expect(() => restoreFormStoreDocument(form, missing, "replay")).toThrow(
			/missing array path/i,
		)

		const entries = Object.entries(
			current.rowIdentity as RowIdentityState as unknown as Record<
				string,
				{ readonly keys: readonly string[]; readonly nextKeyIndex: number }
			>,
		).map(([path, entry]) => ({ path, ...entry }))
		const unexpected = createFormDocument(
			{ ...current.values, untracked: [] } as Values,
			createRowIdentityStateFromEntries([
				...entries,
				{ path: "untracked", keys: [], nextKeyIndex: 0 },
			]),
		)
		expect(() => restoreFormStoreDocument(form, unexpected, "replay")).toThrow(
			/unexpected array path/i,
		)
	})

	it("restores one nested atomic document while reconciling runtime without mutation effects", async () => {
		const validation = createDeferred<
			| { readonly value: Values }
			| { readonly issues: readonly StandardSchemaV1.Issue[] }
		>()
		const validate = vi
			.fn<StandardSchema<Values>["~standard"]["validate"]>()
			.mockImplementation(() => validation.promise)
		const itemDefault = vi.fn(() => ({ name: "Generated" }))
		const schema = createSchema(validate)
		const definition = normalizeDefinition<typeof schema, Controls, Context>({
			schema,
			controls,
			ui: [
				{
					kind: "field",
					path: "secret",
					control: "text",
					visible: (_values, { context }) => context.showSecret,
					valuePolicy: "unset",
				},
				{
					kind: "array",
					path: "groups",
					itemDefault: { name: "", members: [] },
					children: [
						{ kind: "field", path: "name", control: "text" },
						{
							kind: "array",
							path: "members",
							itemDefault,
							children: [{ kind: "field", path: "name", control: "text" }],
						},
					],
				},
			] satisfies readonly UiNode<Values, Controls, Context>[],
		})
		const planner = createFormStore({
			definition,
			defaultValues,
			context: { showSecret: true },
		})
		planner.setValue("secret", "kept without valuePolicy")
		planner.move("groups", 0, 1)
		planner.append("groups.1.members", { name: "Grace" })
		const target = getFormStoreDocument(planner)
		const targetSnapshot = planner.getSnapshot()

		const beforeUpdate = vi.fn()
		const afterUpdate = vi.fn()
		const context = { showSecret: false }
		const options = {
			definition,
			defaultValues,
			context,
			disabled: true,
			validation: { mode: "change" as const, asyncDebounceMs: 0 },
			beforeUpdate,
			afterUpdate,
		} satisfies FormStoreOptions<typeof schema, Context>
		const form = createFormStore(options)
		const baselineValues = form.getSnapshot().values
		form.blur("groups.0.name")
		form.blur("groups.0.members.0.name")
		form.setErrors([
			{
				source: "manual",
				path: "groups.0.name",
				message: "Keep with Core",
			},
			{
				source: "manual",
				path: "groups.0.members.0.name",
				message: "Keep with Ada",
			},
			{
				source: "server",
				path: "groups.0.name",
				message: "Stale server result",
			},
		])
		const staleValidation = form.validate()
		const signal = validate.mock.calls[0]?.[1]?.libraryOptions?.signal as
			| AbortSignal
			| undefined
		const listener = vi.fn((snapshot: typeof targetSnapshot) => {
			expect(snapshot.values).toEqual(target.values)
			expect(snapshot.isValidating).toBe(false)
			expect(
				snapshot.metadata.arraysByPath.groups.items.map((item) => item.key),
			).toEqual(
				targetSnapshot.metadata.arraysByPath.groups.items.map(
					(item) => item.key,
				),
			)
		})
		form.subscribe((snapshot) => snapshot, listener)
		beforeUpdate.mockClear()
		afterUpdate.mockClear()
		itemDefault.mockClear()

		restoreFormStoreDocument(form, target, "undo")

		const snapshot = form.getSnapshot()
		expect(snapshot.values).toEqual({
			secret: "kept without valuePolicy",
			groups: [
				{ name: "Docs", members: [] },
				{
					name: "Core",
					members: [{ name: "Ada" }, { name: "Grace" }],
				},
			],
		})
		expect(snapshot.context).toBe(context)
		expect(snapshot.resolvedUi.disabled).toBe(true)
		expect(snapshot.resolvedUi.fieldsByPath.secret.visible).toBe(false)
		expect(snapshot.isDirty).toBe(true)
		expect(baselineValues).toEqual(defaultValues)
		expect(snapshot.metadata.fieldsByPath["groups.1.name"].touched).toBe(true)
		expect(
			snapshot.metadata.fieldsByPath["groups.1.members.0.name"].touched,
		).toBe(true)
		expect(snapshot.metadata.fieldsByPath["groups.0.name"].touched).toBe(false)
		expect(snapshot.errors.fields.get("groups.1.name")).toEqual([
			expect.objectContaining({ source: "manual", message: "Keep with Core" }),
		])
		expect(snapshot.errors.fields.get("groups.1.members.0.name")).toEqual([
			expect.objectContaining({ source: "manual", message: "Keep with Ada" }),
		])
		expect(
			[...snapshot.errors.fields.values()]
				.flat()
				.some((issue) => issue.source === "server"),
		).toBe(false)
		expect(snapshot.validationStatus).toBe("unvalidated")
		expect(snapshot.isValidating).toBe(false)
		expect(signal?.aborted).toBe(true)
		expect(listener).toHaveBeenCalledTimes(1)
		expect(beforeUpdate).not.toHaveBeenCalled()
		expect(afterUpdate).not.toHaveBeenCalled()
		expect(itemDefault).not.toHaveBeenCalled()
		expect(validate).toHaveBeenCalledTimes(1)

		validation.resolve({
			issues: [
				{ message: "Captured stale issue", path: ["groups", 0, "name"] },
			],
		})
		await staleValidation

		expect(form.getSnapshot().errors.fields.has("groups.0.name")).toBe(false)
		expect(validate).toHaveBeenCalledTimes(1)
		expect(listener).toHaveBeenCalledTimes(1)
	})
})
