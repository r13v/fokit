import { describe, expect, expectTypeOf, it } from "vitest"

import { createRowIdentityStateFromEntries } from "./array-state.js"
import type {
	FormEvent,
	FormRuntimeEvent,
	ValidationResolvedEvent,
} from "./form-events.js"
import type { FormModel } from "./form-model.js"
import {
	createDocumentCommittedEvent,
	createDocumentRestoredEvent,
	createFormDocument,
	reduceFormDocument,
} from "./form-reducer.js"
import type { ResolvedUiState } from "./resolve-ui.js"
import {
	createFieldBlurredEvent,
	createFieldTouchedEvent,
	createFormRuntimeState,
	createIssuesChangedEvent,
	createRuntimeReplacedEvent,
	createSubmissionFinishedEvent,
	createSubmissionStartedEvent,
	createValidationFailedEvent,
	createValidationResolvedEvent,
	createValidationStartedEvent,
	reduceFormRuntime,
} from "./runtime-reducer.js"

type Values = {
	name: string
	rows: string[]
}

type Context = {
	readonly locale: string
}

const runtimeOptions = Object.freeze({
	disabled: false,
	readOnly: false,
	validation: Object.freeze({
		mode: "submit" as const,
		revalidateMode: "change" as const,
		asyncDebounceMs: 0,
	}),
})

function createDocument(name = "Ada") {
	return createFormDocument<Values>(
		{ name, rows: [] },
		createRowIdentityStateFromEntries([
			{ path: "rows", keys: [], nextKeyIndex: 0 },
		]),
	)
}

function createResolvedUi(
	context: Context,
	disabled = false,
): ResolvedUiState<Context> {
	return Object.freeze({
		context,
		disabled,
		readOnly: false,
		ui: Object.freeze([]),
		nodes: Object.freeze([]),
		nodesById: Object.freeze(Object.create(null)),
		fieldsByPath: Object.freeze(Object.create(null)),
		arraysByPath: Object.freeze(Object.create(null)),
		computedCache: Object.freeze(Object.create(null)),
	})
}

function createRuntime(document = createDocument()) {
	const context = Object.freeze({ locale: "en" })
	return createFormRuntimeState({
		baselineDocument: document,
		context,
		options: runtimeOptions,
		resolvedUi: createResolvedUi(context),
	})
}

describe("reduceFormRuntime", () => {
	it("models idle and active validation and submission attempts explicitly", () => {
		const document = createDocument()
		let runtime = createRuntime(document)

		expect(runtime.validation).toEqual({
			status: "idle",
			documentRevision: 0,
			validationStatus: "unvalidated",
		})
		expect(runtime.submission).toEqual({ status: "idle", submitCount: 0 })

		runtime = reduceFormRuntime(
			runtime,
			createValidationStartedEvent({
				sequence: 1,
				attemptId: 7,
				documentRevision: 0,
				kind: "nonSubmit",
				exposePaths: ["name"],
			}),
			document,
		)
		expect(runtime.validation).toEqual({
			status: "validating",
			attemptId: 7,
			documentRevision: 0,
			kind: "nonSubmit",
			exposeAll: false,
			exposePaths: ["name"],
			validationStatus: "unvalidated",
		})

		runtime = reduceFormRuntime(
			runtime,
			createSubmissionStartedEvent({
				sequence: 2,
				attemptId: 4,
				documentRevision: 0,
			}),
			document,
		)
		expect(runtime.submission).toEqual({
			status: "submitting",
			attemptId: 4,
			documentRevision: 0,
			submitCount: 1,
		})
	})

	it("replaces context and options without running effects in the reducer", () => {
		const document = createDocument()
		const initial = createRuntime(document)
		const context = Object.freeze({ locale: "fr" })
		const options = {
			...runtimeOptions,
			disabled: true,
			validation: {
				...runtimeOptions.validation,
				mode: "blur" as const,
			},
		}
		const resolvedUi = createResolvedUi(context, true)
		const event = createRuntimeReplacedEvent({
			sequence: 1,
			context,
			runtimeOptions: options,
			resolvedUi,
		})

		const next = reduceFormRuntime(initial, event, document)

		expect(next.context).toBe(context)
		expect(next.options).toEqual(options)
		expect(next.resolvedUi).toBe(resolvedUi)
		expect(next.baselineDocument).toBe(initial.baselineDocument)
		expect(Object.isFrozen(event)).toBe(true)
		expect(Object.isFrozen(event.options)).toBe(true)
	})

	it("commits touch once and every forwarded blur, including identity blur reduction", () => {
		const document = createDocument()
		const initial = createRuntime(document)
		const touch = createFieldTouchedEvent({ sequence: 1, path: "name" })
		const touched = reduceFormRuntime(initial, touch, document)
		const repeatedTouch = reduceFormRuntime(touched, touch, document)

		expect([...touched.touchedPaths]).toEqual(["name"])
		expect(repeatedTouch).toBe(touched)

		const blur = createFieldBlurredEvent({ sequence: 2, path: "name" })
		const blurred = reduceFormRuntime(touched, blur, document)
		const repeatedBlurEvent = createFieldBlurredEvent({
			sequence: 3,
			path: "name",
		})
		const repeatedBlur = reduceFormRuntime(blurred, repeatedBlurEvent, document)

		expect(blurred.issues.exposure.paths).toEqual(new Set(["name"]))
		expect(repeatedBlur).toBe(blurred)
		expect(repeatedBlurEvent).toEqual({
			type: "field/blurred",
			sequence: 3,
			path: "name",
		})
		expect(Object.isFrozen(repeatedBlurEvent)).toBe(true)
	})

	it("reduces setErrors and clearErrors and preserves true issue no-ops", () => {
		const document = createDocument()
		const initial = createRuntime(document)
		const setErrors = createIssuesChangedEvent({
			sequence: 1,
			change: {
				type: "imperative/set",
				issues: [{ source: "manual", path: "name", message: "Review name" }],
			},
		})
		const withIssue = reduceFormRuntime(initial, setErrors, document)
		const clearMissing = createIssuesChangedEvent({
			sequence: 2,
			change: { type: "imperative/clear", path: "rows" },
		})
		const unchanged = reduceFormRuntime(withIssue, clearMissing, document)
		const clearErrors = createIssuesChangedEvent({
			sequence: 3,
			change: { type: "imperative/clear", path: "name" },
		})

		expect(withIssue.issues.issues).toEqual([
			expect.objectContaining({ source: "manual", path: "name" }),
		])
		expect(unchanged).toBe(withIssue)
		expect(
			reduceFormRuntime(withIssue, clearErrors, document).issues.issues,
		).toEqual([])
		expect(Object.isFrozen(setErrors.change)).toBe(true)
		if (setErrors.change.type !== "imperative/set") {
			throw new TypeError("Expected an imperative set event")
		}
		expect(Object.isFrozen(setErrors.change.issues)).toBe(true)
	})

	it("handles manual, server, and schema issue transitions with exposure", () => {
		const document = createDocument()
		let runtime = createRuntime(document)

		runtime = reduceFormRuntime(
			runtime,
			createIssuesChangedEvent({
				sequence: 1,
				change: {
					type: "server/replace",
					exposeAll: true,
					issues: [{ source: "server", path: "name", message: "Unavailable" }],
				},
			}),
			document,
		)
		runtime = reduceFormRuntime(
			runtime,
			createIssuesChangedEvent({
				sequence: 2,
				change: {
					type: "schema/replace",
					exposePaths: ["name"],
					issues: [{ source: "schema", path: "name", message: "Required" }],
				},
			}),
			document,
		)

		expect(runtime.issues.issues.map((issue) => issue.source)).toEqual([
			"server",
			"schema",
		])
		expect(runtime.issues.exposure.all).toBe(true)
		expect(runtime.issues.exposure.paths).toEqual(new Set(["name"]))

		runtime = reduceFormRuntime(
			runtime,
			createIssuesChangedEvent({
				sequence: 3,
				change: { type: "server/clearChanged", paths: ["name"] },
			}),
			document,
		)
		expect(runtime.issues.issues.map((issue) => issue.source)).toEqual([
			"schema",
		])
	})

	it("installs only the latest current validation result", () => {
		const document = createDocument()
		let runtime = createRuntime(document)
		const firstStart = createValidationStartedEvent({
			sequence: 1,
			attemptId: 1,
			documentRevision: 0,
			kind: "nonSubmit",
		})
		const secondStart = createValidationStartedEvent({
			sequence: 2,
			attemptId: 2,
			documentRevision: 0,
			kind: "nonSubmit",
			exposeAll: true,
		})
		runtime = reduceFormRuntime(runtime, firstStart, document)
		runtime = reduceFormRuntime(runtime, secondStart, document)

		const staleSuccess = createValidationResolvedEvent({
			sequence: 3,
			attemptId: 1,
			documentRevision: 0,
			status: "valid",
		})
		const afterStaleSuccess = reduceFormRuntime(runtime, staleSuccess, document)
		expect(afterStaleSuccess).toBe(runtime)

		const currentFailure = createValidationFailedEvent({
			sequence: 4,
			attemptId: 2,
			documentRevision: 0,
		})
		runtime = reduceFormRuntime(runtime, currentFailure, document)
		expect(runtime.validation).toEqual({
			status: "idle",
			documentRevision: 0,
			validationStatus: "unvalidated",
		})

		runtime = reduceFormRuntime(runtime, secondStart, document)
		runtime = reduceFormRuntime(
			runtime,
			createValidationResolvedEvent({
				sequence: 5,
				attemptId: 2,
				documentRevision: 0,
				status: "invalid",
				issues: [{ source: "schema", path: "name", message: "Required" }],
			}),
			document,
		)
		expect(runtime.validation.validationStatus).toBe("invalid")
		expect(runtime.issues.issues).toEqual([
			expect.objectContaining({ source: "schema", message: "Required" }),
		])
	})

	it("makes captured validation stale after a newer document revision", () => {
		let document = createDocument()
		let runtime = createRuntime(document)
		runtime = reduceFormRuntime(
			runtime,
			createValidationStartedEvent({
				sequence: 1,
				attemptId: 1,
				documentRevision: 0,
				kind: "nonSubmit",
			}),
			document,
		)

		const commit = createDocumentCommittedEvent<Values>({
			sequence: 2,
			source: "imperative",
			changes: [{ type: "set", path: "name", value: "Grace" }],
		})
		document = reduceFormDocument(document, commit)
		runtime = reduceFormRuntime(runtime, commit, document)
		expect(runtime.documentRevision).toBe(1)
		expect(runtime.validation.validationStatus).toBe("unvalidated")

		const staleFailure = createValidationFailedEvent({
			sequence: 3,
			attemptId: 0,
			documentRevision: 0,
		})
		expect(reduceFormRuntime(runtime, staleFailure, document)).toBe(runtime)

		const capturedSuccess = createValidationResolvedEvent({
			sequence: 4,
			attemptId: 1,
			documentRevision: 0,
			status: "valid",
		})
		runtime = reduceFormRuntime(runtime, capturedSuccess, document)
		expect(runtime.validation).toEqual({
			status: "idle",
			documentRevision: 1,
			validationStatus: "unvalidated",
		})
	})

	it("never gives transformed schema output a runtime path back into FormInput", () => {
		const document = createDocument()
		let runtime = createRuntime(document)
		runtime = reduceFormRuntime(
			runtime,
			createValidationStartedEvent({
				sequence: 1,
				attemptId: 1,
				documentRevision: 0,
				kind: "submit",
			}),
			document,
		)
		runtime = reduceFormRuntime(
			runtime,
			createValidationResolvedEvent({
				sequence: 2,
				attemptId: 1,
				documentRevision: 0,
				status: "valid",
			}),
			document,
		)

		expect(document.values).toEqual({ name: "Ada", rows: [] })
		expect(runtime.validation.validationStatus).toBe("valid")
		expectTypeOf<ValidationResolvedEvent>().not.toHaveProperty("value")
	})

	it("keeps the newest submission active until its matching finish event", () => {
		const document = createDocument()
		let runtime = createRuntime(document)
		const first = createSubmissionStartedEvent({
			sequence: 1,
			attemptId: 1,
			documentRevision: 0,
		})
		const second = createSubmissionStartedEvent({
			sequence: 2,
			attemptId: 2,
			documentRevision: 0,
		})
		runtime = reduceFormRuntime(runtime, first, document)
		runtime = reduceFormRuntime(runtime, second, document)

		const olderFinish = createSubmissionFinishedEvent({
			sequence: 3,
			attemptId: 1,
			documentRevision: 0,
		})
		expect(reduceFormRuntime(runtime, olderFinish, document)).toBe(runtime)

		runtime = reduceFormRuntime(
			runtime,
			createSubmissionFinishedEvent({
				sequence: 4,
				attemptId: 2,
				documentRevision: 0,
			}),
			document,
		)
		expect(runtime.submission).toEqual({ status: "idle", submitCount: 2 })
	})

	it("installs a committed clean baseline and resets ephemeral clean state", () => {
		let document = createDocument()
		let runtime = createRuntime(document)
		runtime = reduceFormRuntime(
			runtime,
			createFieldBlurredEvent({ sequence: 1, path: "name" }),
			document,
		)
		runtime = reduceFormRuntime(
			runtime,
			createIssuesChangedEvent({
				sequence: 2,
				change: {
					type: "imperative/set",
					issues: [{ source: "manual", path: "name", message: "Review" }],
				},
			}),
			document,
		)
		runtime = reduceFormRuntime(
			runtime,
			createSubmissionStartedEvent({
				sequence: 3,
				attemptId: 1,
				documentRevision: 0,
			}),
			document,
		)

		const resetCommit = createDocumentCommittedEvent<Values>({
			sequence: 4,
			source: "reset",
			changes: [{ type: "set", path: "name", value: "Grace" }],
			baseline: "replaced",
		})
		document = reduceFormDocument(document, resetCommit)
		runtime = reduceFormRuntime(runtime, resetCommit, document)

		expect(runtime.baselineDocument).toBe(document)
		expect(runtime.touchedPaths.size).toBe(0)
		expect(runtime.issues.issues).toEqual([])
		expect(runtime.validation).toEqual({
			status: "idle",
			documentRevision: 1,
			validationStatus: "unvalidated",
		})
		expect(runtime.submission).toEqual({ status: "idle", submitCount: 0 })
	})

	it("keeps document and runtime ownership separate across event families", () => {
		const document = createDocument()
		let model: FormModel<Values, Context> = {
			document,
			runtime: createRuntime(document),
		}
		const runtimeEvent = createFieldTouchedEvent({ sequence: 1, path: "name" })
		model = {
			...model,
			runtime: reduceFormRuntime(model.runtime, runtimeEvent, model.document),
		}
		expect(model.document).toBe(document)

		const baseline = model.runtime.baselineDocument
		const touched = model.runtime.touchedPaths
		const context = model.runtime.context
		const restore = createDocumentRestoredEvent({
			sequence: 2,
			document: createDocument("Grace"),
			origin: "undo",
			history: "skip",
		})
		model = {
			document: reduceFormDocument(model.document, restore),
			runtime: reduceFormRuntime(model.runtime, restore, restore.document),
		}

		expect(model.document.values.name).toBe("Grace")
		expect(model.runtime.baselineDocument).toBe(baseline)
		expect(model.runtime.touchedPaths).toBe(touched)
		expect(model.runtime.context).toBe(context)
		expect(model.runtime.documentRevision).toBe(1)
	})

	it("covers every runtime event discriminator", () => {
		function discriminate(event: FormRuntimeEvent<Context>): string {
			switch (event.type) {
				case "runtime/replaced":
				case "runtime/reset":
				case "validation/started":
				case "validation/resolved":
				case "validation/failed":
				case "submission/started":
				case "submission/finished":
				case "field/touched":
				case "field/blurred":
				case "issues/changed":
					return event.type
				default: {
					const exhaustive: never = event
					return exhaustive
				}
			}
		}

		expect(
			discriminate(createFieldBlurredEvent({ sequence: 1, path: "name" })),
		).toBe("field/blurred")
		expectTypeOf<FormEvent<Values, Context>>().toMatchTypeOf<
			| FormRuntimeEvent<Context>
			| { readonly type: "document/committed" }
			| { readonly type: "document/restored" }
		>()
	})
})
