import { describe, expect, it, vi } from "vitest"

import type {
	ControlMetadata,
	FormStoreOptions,
	StandardSchema,
	UiNode,
} from "./index.js"
import { createFormStore, normalizeDefinition } from "./index.js"
import {
	createIssueState,
	deriveFormErrors,
	exposeAllIssues,
	exposeIssuePaths,
	normalizeStandardSchemaIssue,
} from "./issues.js"

type AccountValues = {
	name: string
	profile: {
		email: string
	}
	contacts: {
		value: string
	}[]
	hiddenNote?: string
}

type AccountContext = {
	readonly showHidden: boolean
}

type AccountControls = {
	readonly text: ControlMetadata<string | undefined>
}

const schema = {} as StandardSchema<AccountValues>
const controls = {
	text: {
		formData: {
			mode: "native",
		},
	},
} satisfies AccountControls

const defaultValues = {
	name: "Ada",
	profile: {
		email: "ada@example.test",
	},
	contacts: [{ value: "ada@example.test" }],
	hiddenNote: "internal",
} satisfies AccountValues

function createDefinition() {
	return normalizeDefinition<typeof schema, AccountControls, AccountContext>({
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
				path: "profile.email",
				control: "text",
			},
			{
				kind: "array",
				path: "contacts",
				itemDefault: { value: "" },
				children: [{ kind: "field", path: "value", control: "text" }],
			},
			{
				kind: "field",
				path: "hiddenNote",
				control: "text",
				visible: (_values, { context }) => context.showHidden,
			},
		] satisfies readonly UiNode<
			AccountValues,
			AccountControls,
			AccountContext
		>[],
	})
}

function createAccountStore(
	options: {
		readonly beforeUpdate?: FormStoreOptions<
			typeof schema,
			AccountContext
		>["beforeUpdate"]
		readonly context?: AccountContext
		readonly onUpdate?: FormStoreOptions<
			typeof schema,
			AccountContext
		>["onUpdate"]
	} = {},
) {
	return createFormStore({
		definition: createDefinition(),
		defaultValues,
		context: options.context ?? {
			showHidden: false,
		},
		beforeUpdate: options.beforeUpdate,
		onUpdate: options.onUpdate,
	})
}

describe("form issues and display exposure", () => {
	it("keeps raw errors separate from overlap and submit displayErrors", () => {
		const form = createAccountStore()
		const issueState = createIssueState([
			{
				source: "schema",
				path: "profile",
				message: "Profile is inconsistent",
			},
			{
				source: "schema",
				path: "profile.email",
				message: "Email is invalid",
			},
			{
				source: "schema",
				path: "name",
				message: "Name is required",
			},
			{
				source: "server",
				message: "Submission failed",
			},
		])

		const hidden = deriveFormErrors(issueState, form.getSnapshot().resolvedUi)
		expect(hidden.errors.form).toEqual([
			expect.objectContaining({ message: "Submission failed" }),
		])
		expect(hidden.errors.fields.get("profile")).toEqual([
			expect.objectContaining({ message: "Profile is inconsistent" }),
		])
		expect(hidden.displayErrors.form).toEqual([])
		expect(hidden.displayErrors.fields.size).toBe(0)

		const exposedByPath = deriveFormErrors(
			exposeIssuePaths(issueState, ["profile.email"]),
			form.getSnapshot().resolvedUi,
		)
		expect(exposedByPath.displayErrors.fields.get("profile")).toEqual([
			expect.objectContaining({ message: "Profile is inconsistent" }),
		])
		expect(exposedByPath.displayErrors.fields.get("profile.email")).toEqual([
			expect.objectContaining({ message: "Email is invalid" }),
		])
		expect(exposedByPath.displayErrors.fields.has("name")).toBe(false)
		expect(exposedByPath.displayErrors.form).toEqual([])

		const exposedBySubmit = deriveFormErrors(
			exposeAllIssues(issueState),
			form.getSnapshot().resolvedUi,
		)
		expect(exposedBySubmit.displayErrors.form).toEqual([
			expect.objectContaining({ message: "Submission failed" }),
		])
		expect(exposedBySubmit.displayErrors.fields.get("name")).toEqual([
			expect.objectContaining({ message: "Name is required" }),
		])
	})

	it("routes visible-array descendant issues without exact owners to the summary", () => {
		const form = createAccountStore()

		form.setErrors([
			{
				source: "manual",
				path: "contacts.0",
				message: "Contact row needs review",
			},
			{
				source: "manual",
				path: "contacts.0.hidden",
				message: "Hidden contact detail needs review",
			},
		])

		const snapshot = form.getSnapshot()
		expect(snapshot.displayErrors.fields.get("contacts.0")).toEqual([
			expect.objectContaining({ message: "Contact row needs review" }),
		])
		expect(snapshot.displayErrors.fields.get("contacts.0.hidden")).toEqual([
			expect.objectContaining({
				message: "Hidden contact detail needs review",
			}),
		])
		expect(snapshot.displayErrors.summary).toEqual([
			expect.objectContaining({ message: "Contact row needs review" }),
			expect.objectContaining({
				message: "Hidden contact detail needs review",
			}),
		])
	})

	it("immediately exposes manual and server errors and routes invisible owners to the summary", () => {
		const form = createAccountStore()

		form.setErrors([
			{
				source: "manual",
				path: "name",
				message: "Use your legal name",
			},
			{
				source: "manual",
				path: "hiddenNote",
				message: "Hidden note needs review",
			},
			{
				source: "server",
				message: "Server rejected the account",
			},
		])

		const snapshot = form.getSnapshot()
		expect(snapshot.errors.fields.get("name")).toEqual([
			expect.objectContaining({ message: "Use your legal name" }),
		])
		expect(snapshot.displayErrors.fields.get("name")).toEqual([
			expect.objectContaining({ message: "Use your legal name" }),
		])
		expect(snapshot.displayErrors.fields.get("hiddenNote")).toEqual([
			expect.objectContaining({ message: "Hidden note needs review" }),
		])
		expect(snapshot.displayErrors.summary).toEqual([
			expect.objectContaining({ message: "Hidden note needs review" }),
			expect.objectContaining({ message: "Server rejected the account" }),
		])
	})

	it("replaces imperative sources atomically and clears only imperative exposure", () => {
		const beforeUpdate = vi.fn()
		const onUpdate = vi.fn()
		const form = createAccountStore({ beforeUpdate, onUpdate })
		const listener = vi.fn()
		form.subscribe((snapshot) => snapshot.errors, listener)

		form.setErrors([
			{
				source: "manual",
				path: "name",
				message: "Manual name issue",
			},
			{
				source: "server",
				path: "profile.email",
				message: "Server email issue",
			},
		])
		const afterSet = form.getSnapshot()

		expect(() =>
			form.setErrors([
				{
					source: "schema",
					path: "name",
					message: "Cannot forge schema issues",
				} as never,
			]),
		).toThrow(/manual or server/)
		expect(form.getSnapshot()).toBe(afterSet)

		form.blur("name")
		form.setErrors([
			{
				source: "manual",
				path: "profile.email",
				message: "Replacement manual issue",
			},
		])

		expect(form.getSnapshot().errors.fields.get("name")).toBeUndefined()
		expect(form.getSnapshot().errors.fields.get("profile.email")).toEqual([
			expect.objectContaining({ message: "Server email issue" }),
			expect.objectContaining({ message: "Replacement manual issue" }),
		])

		form.clearErrors("profile")
		expect(
			form.getSnapshot().errors.fields.get("profile.email"),
		).toBeUndefined()
		expect(form.getSnapshot().displayErrors.fields.has("profile.email")).toBe(
			false,
		)

		expect(form.getSnapshot().displayErrors.fields.has("name")).toBe(false)
		expect(beforeUpdate).not.toHaveBeenCalled()
		expect(onUpdate).not.toHaveBeenCalled()
		expect(listener).toHaveBeenCalledTimes(4)
	})

	it("clears imperative errors when setErrors receives an empty list", () => {
		const form = createAccountStore()

		form.setErrors([
			{
				source: "manual",
				path: "name",
				message: "Manual name issue",
			},
			{
				source: "server",
				message: "Submission rejected",
			},
		])

		form.setErrors([])

		expect(form.getSnapshot().errors.form).toEqual([])
		expect(form.getSnapshot().errors.fields.size).toBe(0)
		expect(form.getSnapshot().displayErrors.summary).toEqual([])
	})

	it("clears stale server errors on edits and clears all issue state on reset", () => {
		const beforeUpdate = vi.fn()
		const onUpdate = vi.fn()
		const form = createAccountStore({ beforeUpdate, onUpdate })

		form.setErrors([
			{
				source: "server",
				message: "Submission rejected",
			},
			{
				source: "server",
				path: "profile.email",
				message: "Server email issue",
			},
			{
				source: "manual",
				path: "profile.email",
				message: "Manual email issue",
			},
		])

		form.setValue("profile.email", "grace@example.test")

		expect(form.getSnapshot().errors.form).toEqual([])
		expect(form.getSnapshot().errors.fields.get("profile.email")).toEqual([
			expect.objectContaining({ message: "Manual email issue" }),
		])

		form.reset()

		expect(form.getSnapshot().errors.form).toEqual([])
		expect(form.getSnapshot().errors.fields.size).toBe(0)
		expect(form.getSnapshot().displayErrors.summary).toEqual([])
		expect(beforeUpdate).toHaveBeenCalledTimes(2)
		expect(onUpdate).toHaveBeenCalledTimes(2)
	})

	it("maps unsupported Standard Schema paths to form-level issues", () => {
		expect(
			normalizeStandardSchemaIssue({
				message: "Email is invalid",
				path: [{ key: "profile" }, { key: "email" }],
			}),
		).toEqual({
			source: "schema",
			path: "profile.email",
			message: "Email is invalid",
		})
		expect(
			normalizeStandardSchemaIssue({
				message: "Array item is invalid",
				path: ["contacts", 0, "value"],
			}),
		).toEqual({
			source: "schema",
			path: "contacts.0.value",
			message: "Array item is invalid",
		})

		for (const path of [
			["profile.email"],
			["__proto__", "polluted"],
			[Symbol("secret")],
			["contacts", "0", "value"],
		]) {
			expect(
				normalizeStandardSchemaIssue({
					message: "Unsafe path",
					path,
				}),
			).toEqual({
				source: "schema",
				message: "Unsafe path",
			})
		}
	})
})
