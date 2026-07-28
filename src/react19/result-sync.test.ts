"use client"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { describe, expect, it, vi } from "vitest"

import {
	createFormStore,
	type FormStore,
	normalizeDefinition,
} from "../core/index.js"
import { defineControl } from "../react/control.js"
import {
	recordActionAttemptChanges,
	startHydratedActionAttempt,
	syncActionResult,
} from "./result-sync.js"

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
		const attempt = startHydratedActionAttempt(form)

		form.setValue("email", "fixed@example.test")
		recordActionAttemptChanges(attempt, ["email"])

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

	it("keeps pending edits while making the submitted snapshot the reset baseline", () => {
		const form = createStore()
		const attempt = startHydratedActionAttempt(form)

		form.setValue("name", "Grace")
		recordActionAttemptChanges(attempt, ["name"])

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

	it("treats submitted reset without a hydrated typed snapshot as a no-op", () => {
		const form = createStore()

		syncActionResult(form, {
			status: "success",
			reset: "submitted",
		})

		expect(form.getSnapshot().values).toEqual(defaultValues())
		expect(form.getSnapshot().submitCount).toBe(0)
	})
})

function createStore(
	options: { readonly validate?: Schema["~standard"]["validate"] } = {},
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
			vendor: "fokit-test",
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
