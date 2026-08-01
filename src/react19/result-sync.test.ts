"use client"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { describe, expect, it, vi } from "vitest"
import { startActionSubmission } from "../core/form-store.js"
import {
	createFormStore,
	type FormStore,
	type FormStoreOptions,
	normalizeDefinition,
} from "../core/index.js"
import { defineControl } from "../react/control.js"
import { syncActionResult } from "./result-sync.js"

type Values = {
	readonly name: string
	readonly email: string
}

type Schema = StandardSchemaV1<Values>

const textControl = defineControl<string>({
	component() {
		return null
	},
	formData: {
		mode: "native",
	},
})

const controls = {
	text: textControl,
} as const

const ui = [
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
] as const

describe("React 19 Action result synchronization", () => {
	it("records a pre-hydration error result as one displayed submit attempt without echoing raw values", () => {
		const form = createStore()

		syncActionResult(form, {
			status: "error",
			issues: [
				{
					source: "server",
					message: "Saved payload is invalid",
					path: "email",
				},
			],
		})

		const snapshot = form.getSnapshot()
		expect(snapshot.values).toEqual(defaultValues())
		expect(snapshot.submitCount).toBe(1)
		expect(snapshot.displayErrors.fields.get("email")?.[0]?.message).toBe(
			"Saved payload is invalid",
		)
	})

	it("filters stale returned issues after pending edits and schedules current schema validation", async () => {
		const validate = vi.fn(validateValues)
		const form = createStore({ validate })
		const attempt = startActionSubmission(form)

		form.setValue("email", "fixed@example.test")
		attempt.recordChanges(["email"])

		syncActionResult(
			form,
			{
				status: "error",
				issues: [
					{
						source: "schema",
						message: "Submitted email is invalid",
						path: "email",
					},
					{
						source: "server",
						message: "Submitted form is stale",
					},
					{
						source: "server",
						message: "Name still needs review",
						path: "name",
					},
				],
			},
			attempt,
		)

		await flushMicrotasks()

		const snapshot = form.getSnapshot()
		expect(snapshot.submitCount).toBe(1)
		expect(snapshot.isSubmitting).toBe(false)
		expect(snapshot.displayErrors.fields.get("email")).toBeUndefined()
		expect(snapshot.displayErrors.form).toEqual([])
		expect(snapshot.displayErrors.fields.get("name")?.[0]?.message).toBe(
			"Name still needs review",
		)
		expect(validate).toHaveBeenCalledTimes(1)
	})

	it("uses effective committed paths when requested Action edits are replaced", () => {
		let attempt: ReturnType<typeof startActionSubmission<Schema>> | undefined
		const afterUpdate = vi.fn<
			NonNullable<FormStoreOptions<Schema>["afterUpdate"]>
		>((event) => {
			// Restore will intentionally suppress this hook. The future commit timeline
			// must preserve the effective-path behavior characterized here.
			attempt?.recordChanges(event.changes.map((change) => change.path))
		})
		const form = createStore({
			beforeUpdate: (event) =>
				event.source === "imperative"
					? [
							{
								type: "set",
								path: "email",
								value: "grace@example.test",
							},
						]
					: undefined,
			afterUpdate,
		})
		attempt = startActionSubmission(form)

		form.setValue("name", "Grace")

		expect(form.getSnapshot().values).toEqual({
			name: "Ada",
			email: "grace@example.test",
		})
		expect([...attempt.changedPaths]).toEqual(["email"])
		expect(afterUpdate).toHaveBeenCalledTimes(1)

		syncActionResult(
			form,
			{
				status: "error",
				issues: [
					{
						source: "server",
						message: "Requested name is invalid",
						path: "name",
					},
					{
						source: "server",
						message: "Committed email is invalid",
						path: "email",
					},
				],
			},
			attempt,
		)

		const snapshot = form.getSnapshot()
		expect(snapshot.errors.fields.get("name")).toEqual([
			expect.objectContaining({ message: "Requested name is invalid" }),
		])
		expect(snapshot.errors.fields.has("email")).toBe(false)
	})

	it("keeps pending edits while making the submitted snapshot the reset baseline", () => {
		const form = createStore()
		const attempt = startActionSubmission(form)

		form.setValue("name", "Grace")
		attempt.recordChanges(["name"])

		syncActionResult(
			form,
			{
				status: "success",
				reset: "submitted",
			},
			attempt,
		)

		const snapshot = form.getSnapshot()
		expect(snapshot.values).toEqual({
			name: "Grace",
			email: "ada@example.test",
		})
		expect(snapshot.isDirty).toBe(true)
		expect(snapshot.metadata.fieldsByPath.name?.dirty).toBe(true)
		expect(snapshot.isSubmitting).toBe(false)
	})

	it("resets to defaults and clears metadata after a successful default reset", () => {
		const form = createStore()
		const attempt = startActionSubmission(form)

		form.setValue("name", "Grace")
		form.blur("name")
		form.setErrors([
			{
				source: "server",
				path: "name",
				message: "Needs review",
			},
		])

		syncActionResult(
			form,
			{
				status: "success",
				reset: "defaults",
			},
			attempt,
		)

		const snapshot = form.getSnapshot()
		expect(snapshot.values).toEqual(defaultValues())
		expect(snapshot.isDirty).toBe(false)
		expect(snapshot.isTouched).toBe(false)
		expect(snapshot.errors.fields.size).toBe(0)
		expect(snapshot.isSubmitting).toBe(false)
	})

	it("treats submitted reset without a hydrated typed snapshot as a no-op", () => {
		const form = createStore()

		syncActionResult(form, {
			status: "success",
			reset: "submitted",
		})

		expect(form.getSnapshot().values).toEqual(defaultValues())
		expect(form.getSnapshot().submitCount).toBe(0)
	})

	it.each([
		[
			"bad status",
			{ status: "pending" },
			'Unsupported form result status "pending"',
		],
		[
			"bad reset",
			{ status: "success", reset: "current" },
			'Unsupported form result reset "current"',
		],
		[
			"bad issues",
			{ status: "error", issues: {} },
			"Error form result issues must be an array",
		],
		[
			"bad issue source",
			{
				status: "error",
				issues: [{ source: "manual", message: "Nope" }],
			},
			'Unsupported submission issue source "manual"',
		],
		[
			"bad issue message",
			{
				status: "error",
				issues: [{ source: "server" }],
			},
			"Submission issue message must be a string",
		],
	])("rejects malformed Action result: %s", (_name, result, message) => {
		const form = createStore()

		expect(() => syncActionResult(form, result as never)).toThrow(message)

		const snapshot = form.getSnapshot()
		expect(snapshot.values).toEqual(defaultValues())
		expect(snapshot.errors.fields.size).toBe(0)
		expect(snapshot.submitCount).toBe(0)
	})
})

function createStore(
	options: {
		readonly validate?: Schema["~standard"]["validate"]
		readonly beforeUpdate?: FormStoreOptions<Schema>["beforeUpdate"]
		readonly afterUpdate?: FormStoreOptions<Schema>["afterUpdate"]
	} = {},
): FormStore<Schema> {
	const schema = createSchema(options.validate ?? validateValues)
	const definition = normalizeDefinition({
		schema,
		ui,
		controls,
	})

	return createFormStore({
		definition,
		defaultValues: defaultValues(),
		beforeUpdate: options.beforeUpdate,
		afterUpdate: options.afterUpdate,
	})
}

function defaultValues(): Values {
	return {
		name: "Ada",
		email: "ada@example.test",
	}
}

function createSchema(validate: Schema["~standard"]["validate"]): Schema {
	return {
		"~standard": {
			version: 1,
			vendor: "form-please-test",
			validate,
		},
	} as Schema
}

function validateValues(value: unknown): StandardSchemaV1.Result<Values> {
	const input = value as Values
	return input.email.includes("@")
		? {
				value: input,
			}
		: {
				issues: [
					{
						message: "Current email is invalid",
						path: ["email"],
					},
				],
			}
}

async function flushMicrotasks(): Promise<void> {
	await Promise.resolve()
	await Promise.resolve()
}
