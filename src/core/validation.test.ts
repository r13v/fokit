import type { StandardSchemaV1 } from "@standard-schema/spec"
import { describe, expect, it, vi } from "vitest"

import type {
	ControlMetadata,
	StandardSchema,
	UiNode,
	ValidationResult,
} from "./index.js"
import { createFormStore, normalizeDefinition } from "./index.js"

type AccountInput = {
	name: string
	email: string
	contacts: {
		value: string
	}[]
}

type AccountOutput = AccountInput & {
	slug: string
}

type AccountControls = {
	readonly text: ControlMetadata<string>
}

type TestSchema = StandardSchema<AccountInput, AccountOutput>

type GroupInput = {
	groups: {
		name: string
		members: {
			name: string
		}[]
	}[]
}

type Deferred<Value> = {
	readonly promise: Promise<Value>
	resolve(value: Value): void
	reject(error: unknown): void
}

const controls = {
	text: {
		formData: {
			mode: "native",
		},
	},
} satisfies AccountControls

const validValues = {
	name: "Ada",
	email: "ada@example.test",
	contacts: [{ value: "ada@example.test" }],
} satisfies AccountInput

function createDeferred<Value>(): Deferred<Value> {
	let resolve!: (value: Value) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<Value>((promiseResolve, promiseReject) => {
		resolve = promiseResolve
		reject = promiseReject
	})

	return { promise, resolve, reject }
}

function createSchema(
	validate: TestSchema["~standard"]["validate"],
): TestSchema {
	return {
		"~standard": {
			version: 1,
			vendor: "form-please-test",
			validate,
		},
	} as TestSchema
}

function validateAccount(value: unknown) {
	const input = value as AccountInput
	const issues = createAccountIssues(input)

	return issues.length === 0
		? {
				value: {
					...input,
					slug: input.name.toLowerCase(),
				},
			}
		: { issues }
}

function createAccountIssues(input: AccountInput) {
	const issues: StandardSchemaV1.Issue[] = []

	if (input.name.trim() === "") {
		issues.push({
			message: "Name is required",
			path: ["name"],
		})
	}

	if (!input.email.includes("@")) {
		issues.push({
			message: "Email is invalid",
			path: ["email"],
		})
	}

	input.contacts.forEach((contact, index) => {
		if (!contact.value.includes("@")) {
			issues.push({
				message: `Contact ${index} is invalid`,
				path: ["contacts", index, "value"],
			})
		}
	})

	return issues
}

function createAccountForm(
	options: {
		readonly schema?: TestSchema
		readonly defaultValues?: AccountInput
		readonly validation?: {
			readonly mode?: "submit" | "blur" | "change"
			readonly revalidateMode?: "submit" | "blur" | "change"
			readonly asyncDebounceMs?: number
		}
	} = {},
) {
	const schema = options.schema ?? createSchema(validateAccount)
	const definition = normalizeDefinition({
		schema,
		controls,
		ui: [
			{ kind: "field", path: "name", control: "text" },
			{ kind: "field", path: "email", control: "text" },
			{
				kind: "array",
				path: "contacts",
				itemDefault: { value: "" },
				children: [{ kind: "field", path: "value", control: "text" }],
			},
		] satisfies readonly UiNode<AccountInput, AccountControls>[],
	})

	return createFormStore({
		definition,
		defaultValues: options.defaultValues ?? validValues,
		validation: options.validation,
	})
}

async function flushMicrotasks() {
	await Promise.resolve()
	await Promise.resolve()
}

describe("Standard Schema validation", () => {
	it("returns transformed full results without replacing input values", async () => {
		const form = createAccountForm()

		const result = await form.validate()

		expect(result).toEqual({
			success: true,
			value: {
				...validValues,
				slug: "ada",
			},
		} satisfies ValidationResult<AccountOutput>)
		expect(form.getValues()).toEqual(validValues)
		expect(form.getSnapshot().validationStatus).toBe("valid")
		expect(form.getSnapshot().errors.fields.size).toBe(0)
	})

	it("runs the full schema for path validation but returns only overlapping issues", async () => {
		const form = createAccountForm({
			defaultValues: {
				name: "",
				email: "not-an-email",
				contacts: [{ value: "ada@example.test" }],
			},
		})

		const issues = await form.validate("email")
		const snapshot = form.getSnapshot()

		expect(issues).toEqual([
			expect.objectContaining({
				source: "schema",
				path: "email",
				message: "Email is invalid",
			}),
		])
		expect(snapshot.validationStatus).toBe("invalid")
		expect(snapshot.errors.fields.get("name")).toEqual([
			expect.objectContaining({ message: "Name is required" }),
		])
		expect(snapshot.errors.fields.get("email")).toEqual([
			expect.objectContaining({ message: "Email is invalid" }),
		])
		expect(snapshot.displayErrors.fields.has("name")).toBe(false)
		expect(snapshot.displayErrors.fields.get("email")).toEqual([
			expect.objectContaining({ message: "Email is invalid" }),
		])
	})

	it("validates several path groups in one schema pass", async () => {
		const form = createAccountForm({
			defaultValues: {
				name: "",
				email: "not-an-email",
				contacts: [{ value: "not-an-email" }],
			},
		})

		const issues = await form.validatePaths(["name", "email"])
		const snapshot = form.getSnapshot()

		expect(issues.map((issue) => issue.path)).toEqual(["name", "email"])
		expect(snapshot.errors.fields.has("contacts.0.value")).toBe(true)
		expect(snapshot.displayErrors.fields.has("contacts.0.value")).toBe(false)
	})

	it("validates unrendered schema paths and filters overlapping path subsets", async () => {
		type WorkflowInput = {
			profile: {
				name: string
			}
			billing: {
				code: string
			}
		}
		const workflowSchema = {
			"~standard": {
				version: 1,
				vendor: "form-please-test",
				validate() {
					return {
						issues: [
							{ message: "Workflow is unavailable" },
							{ message: "Profile needs review", path: ["profile"] },
							{ message: "Billing code is invalid", path: ["billing", "code"] },
						],
					}
				},
			},
		} as StandardSchema<WorkflowInput>
		const definition = normalizeDefinition({
			schema: workflowSchema,
			controls: {},
			ui: [],
		})
		const createWorkflowForm = () =>
			createFormStore({
				definition,
				defaultValues: {
					profile: { name: "" },
					billing: { code: "" },
				},
			})

		const singlePathForm = createWorkflowForm()
		await expect(singlePathForm.validate("profile")).resolves.toEqual([
			expect.objectContaining({ message: "Profile needs review" }),
		])

		const subsetForm = createWorkflowForm()
		await expect(subsetForm.validatePaths(["profile.name"])).resolves.toEqual([
			expect.objectContaining({ message: "Profile needs review" }),
		])
		expect(subsetForm.getSnapshot().errors.fields.get("billing.code")).toEqual([
			expect.objectContaining({ message: "Billing code is invalid" }),
		])
		expect(subsetForm.getSnapshot().errors.form).toEqual([
			expect.objectContaining({ message: "Workflow is unavailable" }),
		])
		expect(subsetForm.getSnapshot().displayErrors.form).toEqual([])
		expect(
			subsetForm.getSnapshot().displayErrors.fields.has("billing.code"),
		).toBe(false)
		expect(() => subsetForm.validatePaths([])).toThrow(
			"validatePaths requires at least one field path",
		)
	})

	it("uses submit as the default first mode and change as the default revalidation mode", async () => {
		const validate = vi.fn(validateAccount)
		const form = createAccountForm({
			schema: createSchema(validate),
			defaultValues: {
				name: "Ada",
				email: "bad",
				contacts: [],
			},
		})

		form.setValue("email", "still-bad")
		form.blur("email")
		await flushMicrotasks()

		expect(validate).not.toHaveBeenCalled()

		await form.validate()
		expect(form.getSnapshot().validationStatus).toBe("invalid")
		expect(validate).toHaveBeenCalledTimes(1)

		form.setValue("email", "ada@example.test")
		await flushMicrotasks()

		expect(validate).toHaveBeenCalledTimes(2)
		expect(form.getSnapshot().validationStatus).toBe("valid")
	})

	it("uses updated validation options for later automatic validation", async () => {
		const validate = vi.fn(validateAccount)
		const form = createAccountForm({
			schema: createSchema(validate),
			defaultValues: {
				name: "Ada",
				email: "bad",
				contacts: [],
			},
			validation: {
				mode: "submit",
				revalidateMode: "submit",
			},
		})

		form.setValue("email", "still-bad")
		await flushMicrotasks()
		expect(validate).not.toHaveBeenCalled()

		form.replaceOptions({
			validation: {
				mode: "change",
				revalidateMode: "change",
			},
		})
		form.setValue("email", "also-bad")
		await flushMicrotasks()

		expect(validate).toHaveBeenCalledTimes(1)
		expect(form.getSnapshot().validationStatus).toBe("invalid")
	})

	it("debounces change validation, aborts stale attempts, and keeps the latest result", async () => {
		vi.useFakeTimers()
		const attempts: {
			readonly value: AccountInput
			readonly signal: AbortSignal | undefined
			readonly deferred: Deferred<ReturnType<typeof validateAccount>>
		}[] = []
		const schema = createSchema((value, options) => {
			const deferred = createDeferred<ReturnType<typeof validateAccount>>()
			attempts.push({
				value: value as AccountInput,
				signal: options?.libraryOptions?.signal as AbortSignal | undefined,
				deferred,
			})
			return deferred.promise
		})
		const form = createAccountForm({
			schema,
			validation: {
				mode: "change",
				revalidateMode: "change",
				asyncDebounceMs: 25,
			},
		})

		form.setValue("email", "first")
		await vi.advanceTimersByTimeAsync(24)
		form.setValue("email", "second")
		await vi.advanceTimersByTimeAsync(24)

		expect(attempts).toHaveLength(0)
		expect(form.getSnapshot().isValidating).toBe(false)

		await vi.advanceTimersByTimeAsync(1)

		expect(attempts).toHaveLength(1)
		expect(attempts[0]?.value.email).toBe("second")
		expect(form.getSnapshot().isValidating).toBe(true)
		expect(form.getSnapshot().metadata.fieldsByPath.email.validating).toBe(true)

		form.setValue("email", "ada@example.test")

		expect(attempts[0]?.signal?.aborted).toBe(true)
		expect(form.getSnapshot().isValidating).toBe(false)
		expect(form.getSnapshot().validationStatus).toBe("unvalidated")

		attempts[0]?.deferred.resolve({
			issues: [{ message: "Stale email", path: ["email"] }],
		})
		await flushMicrotasks()

		expect(form.getSnapshot().errors.fields.has("email")).toBe(false)

		await vi.advanceTimersByTimeAsync(25)
		expect(attempts).toHaveLength(2)
		attempts[1]?.deferred.resolve(validateAccount(attempts[1].value))
		await flushMicrotasks()

		expect(form.getSnapshot().isValidating).toBe(false)
		expect(form.getSnapshot().validationStatus).toBe("valid")

		vi.useRealTimers()
	})

	it("runs blur validation immediately and reports automatic exceptions to the host", async () => {
		const reportError = vi.fn()
		vi.stubGlobal("reportError", reportError)
		const failure = new Error("schema exploded")
		const form = createAccountForm({
			schema: createSchema(() => {
				throw failure
			}),
			validation: {
				mode: "blur",
				revalidateMode: "blur",
				asyncDebounceMs: 1_000,
			},
		})

		form.blur("email")
		await flushMicrotasks()

		expect(reportError).toHaveBeenCalledWith(failure)
		expect(form.getSnapshot().validationStatus).toBe("unvalidated")
		expect(form.getSnapshot().isValidating).toBe(false)

		vi.unstubAllGlobals()
	})

	it("does not report expected aborts from stale automatic validation", async () => {
		const reportError = vi.fn()
		vi.stubGlobal("reportError", reportError)
		const attempts: Deferred<ReturnType<typeof validateAccount>>[] = []
		const schema = createSchema((_value, options) => {
			const deferred = createDeferred<ReturnType<typeof validateAccount>>()
			attempts.push(deferred)
			const signal = options?.libraryOptions?.signal as AbortSignal | undefined
			signal?.addEventListener(
				"abort",
				() => {
					deferred.reject(new DOMException("Validation aborted", "AbortError"))
				},
				{ once: true },
			)
			return deferred.promise
		})
		const form = createAccountForm({
			schema,
			validation: {
				mode: "change",
				revalidateMode: "change",
			},
		})

		form.setValue("email", "first")
		await flushMicrotasks()
		form.setValue("email", "second")
		await flushMicrotasks()

		expect(attempts).toHaveLength(2)
		expect(reportError).not.toHaveBeenCalled()

		attempts[1]?.resolve(validateAccount(form.getValues()))
		await flushMicrotasks()

		expect(form.getSnapshot().isValidating).toBe(false)
		vi.unstubAllGlobals()
	})

	it("rejects imperative exceptions and does not install stale captured results", async () => {
		const first = createDeferred<ReturnType<typeof validateAccount>>()
		const second = createDeferred<ReturnType<typeof validateAccount>>()
		const validate = vi
			.fn<TestSchema["~standard"]["validate"]>()
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise)
			.mockImplementation(() => {
				throw new Error("unexpected schema failure")
			})
		const form = createAccountForm({
			schema: createSchema(validate),
			defaultValues: {
				name: "Ada",
				email: "bad",
				contacts: [],
			},
		})

		const staleResult = form.validate()
		form.setValue("email", "ada@example.test")
		first.resolve({
			issues: [{ message: "Old email is invalid", path: ["email"] }],
		})

		await expect(staleResult).resolves.toEqual({
			success: false,
			issues: [
				expect.objectContaining({
					source: "schema",
					path: "email",
					message: "Old email is invalid",
				}),
			],
		})
		expect(form.getSnapshot().validationStatus).toBe("unvalidated")
		expect(form.getSnapshot().errors.fields.has("email")).toBe(false)

		const installedResult = form.validate()
		second.resolve({
			issues: [{ message: "Current email is invalid", path: ["email"] }],
		})
		await installedResult
		expect(form.getSnapshot().errors.fields.get("email")).toEqual([
			expect.objectContaining({ message: "Current email is invalid" }),
		])

		await expect(form.validate()).rejects.toThrow("unexpected schema failure")
		expect(form.getSnapshot().validationStatus).toBe("unvalidated")
		expect(form.getSnapshot().errors.fields.get("email")).toEqual([
			expect.objectContaining({ message: "Current email is invalid" }),
		])
		expect(form.getSnapshot().isValidating).toBe(false)
	})

	it("validates concrete nested array paths for current rows", async () => {
		const groupSchema = {
			"~standard": {
				version: 1,
				vendor: "form-please-test",
				validate() {
					return {
						issues: [
							{
								message: "Member list needs review",
								path: ["groups", 0, "members"],
							},
						],
					}
				},
			},
		} as StandardSchema<GroupInput>
		const form = createFormStore({
			definition: normalizeDefinition({
				schema: groupSchema,
				controls,
				ui: [
					{
						kind: "array",
						path: "groups",
						itemDefault: {
							name: "",
							members: [],
						},
						children: [
							{ kind: "field", path: "name", control: "text" },
							{
								kind: "array",
								path: "members",
								itemDefault: { name: "" },
								children: [{ kind: "field", path: "name", control: "text" }],
							},
						],
					},
				] satisfies readonly UiNode<GroupInput, AccountControls>[],
			}),
			defaultValues: {
				groups: [
					{
						name: "Core",
						members: [{ name: "Ada" }],
					},
				],
			},
		})

		const issues = await form.validate("groups.0.members")

		expect(issues).toEqual([
			expect.objectContaining({ message: "Member list needs review" }),
		])
		expect(
			form.getSnapshot().displayErrors.fields.get("groups.0.members"),
		).toEqual([
			expect.objectContaining({ message: "Member list needs review" }),
		])
	})

	it("reindexes displayable schema issues by array row key", async () => {
		const form = createAccountForm({
			defaultValues: {
				name: "Ada",
				email: "ada@example.test",
				contacts: [{ value: "ada@example.test" }, { value: "bad-contact" }],
			},
			validation: {
				mode: "submit",
				revalidateMode: "submit",
			},
		})

		await form.validate()

		expect(
			form.getSnapshot().displayErrors.fields.get("contacts.1.value"),
		).toEqual([expect.objectContaining({ message: "Contact 1 is invalid" })])

		form.move("contacts", 1, 0)

		expect(
			form.getSnapshot().displayErrors.fields.get("contacts.0.value"),
		).toEqual([expect.objectContaining({ message: "Contact 1 is invalid" })])
		expect(
			form.getSnapshot().displayErrors.fields.has("contacts.1.value"),
		).toBe(false)

		form.remove("contacts", 0)

		expect(
			form.getSnapshot().displayErrors.fields.has("contacts.0.value"),
		).toBe(false)
	})
})
