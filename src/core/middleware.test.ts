import { describe, expect, it, vi } from "vitest"
import type { ControlMetadata } from "./control-types.js"
import { normalizeDefinition } from "./definition.js"
import { createFormDocument } from "./form-reducer.js"
import {
	createFormStoreWithMiddleware,
	getFormStoreDocument,
	restoreFormStoreDocument,
	startFormSubmission,
} from "./form-store.js"
import type { AnyFormMiddleware, FormMiddleware } from "./middleware.js"
import type { StandardSchema } from "./standard-schema.js"
import type { ValidationOptions } from "./validation.js"

type Values = {
	name: string
	note?: string
	items: { value: string }[]
}

type Context = { readonly locale: string }

const schema = {
	"~standard": {
		version: 1,
		vendor: "form-please-middleware-test",
		validate: vi.fn((value: Values) => ({ value })),
	},
} as StandardSchema<Values>

type Controls = { readonly text: ControlMetadata<string | undefined> }

const definition = normalizeDefinition<typeof schema, Controls, Context>({
	schema,
	controls: { text: { formData: { mode: "native" } } },
	ui: [{ kind: "field", path: "name", control: "text" }],
})

function createStore(
	middleware: readonly FormMiddleware<Values, Context>[] = [],
	options: {
		readonly beforeUpdate?: () => undefined
		readonly afterUpdate?: () => void
		readonly onCommitFinalized?: (type: string) => void
		readonly validation?: Partial<ValidationOptions>
	} = {},
) {
	return createFormStoreWithMiddleware(
		{
			definition,
			defaultValues: {
				name: "Ada",
				items: [{ value: "first" }],
			},
			context: { locale: "en" },
			beforeUpdate: options.beforeUpdate,
			afterUpdate: options.afterUpdate,
			validation: options.validation,
		},
		middleware as unknown as readonly AnyFormMiddleware[],
		(event) => options.onCommitFinalized?.(event.type),
	)
}

const cancelled = Object.freeze({ status: "cancelled" as const })

function createDeferred<Value>() {
	let resolve!: (value: Value) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<Value>((promiseResolve, promiseReject) => {
		resolve = promiseResolve
		reject = promiseReject
	})
	return { promise, resolve, reject }
}

describe("form middleware", () => {
	it("preserves explicit undefined array commands and moves undefined items", () => {
		type OptionalItems = { items: (string | undefined)[] }
		const optionalSchema = {} as StandardSchema<OptionalItems>
		const optionalDefinition = normalizeDefinition({
			schema: optionalSchema,
			controls: {},
			ui: [
				{
					kind: "array",
					path: "items",
					itemDefault: "fallback",
					children: [],
				},
			],
		})
		let appendUndefined: () => void = () => {
			throw new Error("Middleware was not initialized")
		}
		const middleware: FormMiddleware<OptionalItems, unknown> =
			(api) => (next) => {
				appendUndefined = () =>
					api.dispatch({
						type: "array/append",
						path: "items",
						value: undefined,
					})
				return (transaction) => next(transaction)
			}
		const form = createFormStoreWithMiddleware(
			{
				definition: optionalDefinition,
				defaultValues: { items: [undefined, "existing"] },
			},
			[middleware] as unknown as readonly AnyFormMiddleware[],
		)

		appendUndefined()
		expect(form.getValues().items).toEqual([undefined, "existing", undefined])

		form.move("items", 0, 1)
		expect(form.getValues().items).toEqual(["existing", undefined, undefined])
	})

	it("runs in declared order, unwinds in reverse, and publishes after finalization", () => {
		const order: string[] = []
		const first: FormMiddleware<Values, Context> =
			(api) => (next) => (transaction) => {
				expect(Object.isFrozen(transaction)).toBe(true)
				order.push("first:before")
				const result = next(transaction)
				if (result.status === "committed") {
					expect(Object.isFrozen(result.event)).toBe(true)
				}
				expect(api.getSnapshot().values.name).toBe("Grace")
				order.push("first:after")
				return result
			}
		const second: FormMiddleware<Values, Context> =
			() => (next) => (transaction) => {
				order.push("second:before")
				const result = next(transaction)
				order.push("second:after")
				return result
			}
		const form = createStore([first, second], {
			beforeUpdate: () => {
				order.push("beforeUpdate")
				return undefined
			},
			afterUpdate: () => order.push("afterUpdate"),
			onCommitFinalized: () => order.push("finalize"),
		})
		form.subscribe(
			(snapshot) => snapshot.values.name,
			() => order.push("publish"),
		)

		form.setValue("name", "Grace")

		expect(order).toEqual([
			"beforeUpdate",
			"first:before",
			"second:before",
			"second:after",
			"first:after",
			"finalize",
			"publish",
			"afterUpdate",
		])
	})

	it("copies the immutable middleware list at form creation", () => {
		const observed = vi.fn()
		const observer: FormMiddleware<Values, Context> =
			() => (next) => (transaction) => {
				observed()
				return next(transaction)
			}
		const later: FormMiddleware<Values, Context> = () => () => () => cancelled
		const middleware = [observer]
		const form = createStore(middleware)
		middleware.push(later)

		form.setValue("name", "Grace")

		expect(observed).toHaveBeenCalledOnce()
		expect(form.getSnapshot().values.name).toBe("Grace")
	})

	it("allows cancellation and transaction replacement", () => {
		const middleware: FormMiddleware<Values, Context> =
			() => (next) => (transaction) => {
				if (transaction.type === "field/touched") return cancelled
				if (transaction.type !== "document/committed") {
					return next(transaction)
				}
				return next(
					Object.freeze({
						...transaction,
						changes: Object.freeze([
							Object.freeze({
								type: "set" as const,
								path: "name",
								value: "Lin",
							}),
						]),
					}),
				)
			}
		const form = createStore([middleware])

		form.touch("name")
		form.setValue("name", "Grace")

		expect(form.getSnapshot().isTouched).toBe(false)
		expect(form.getSnapshot().values.name).toBe("Lin")
	})

	it("keeps the document atomic when restored values make UI resolution fail", () => {
		const failure = new Error("resolver failed")
		const failingDefinition = normalizeDefinition<
			typeof schema,
			Controls,
			Context
		>({
			schema,
			controls: { text: { formData: { mode: "native" } } },
			ui: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: (values) => {
						if (values.name === "Grace") throw failure
						return values.name
					},
				},
			],
		})
		const finalized = vi.fn()
		const form = createFormStoreWithMiddleware(
			{
				definition: failingDefinition,
				defaultValues: { name: "Ada", items: [] },
				context: { locale: "en" },
			},
			[],
			finalized,
		)
		const initialDocument = getFormStoreDocument(form)
		const initialSnapshot = form.getSnapshot()
		const target = createFormDocument(
			{ ...initialDocument.values, name: "Grace" },
			initialDocument.rowIdentity,
		)

		expect(() => restoreFormStoreDocument(form, target, "undo")).toThrow(
			failure,
		)
		expect(form.getValues().name).toBe("Ada")
		expect(form.getSnapshot()).toBe(initialSnapshot)
		expect(finalized).not.toHaveBeenCalled()
	})

	it("exposes reset, runtime, validation, issues, blur, and restore transactions", async () => {
		const seen: string[] = []
		const observer: FormMiddleware<Values, Context> =
			() => (next) => (transaction) => {
				seen.push(transaction.type)
				return next(transaction)
			}
		const form = createStore([observer])
		const target = getFormStoreDocument(form)

		form.setErrors([{ source: "manual", message: "Problem" }])
		form.blur("name")
		form.replaceContext({ locale: "fr" })
		await form.validate()
		form.reset({ name: "Reset", items: [] })
		restoreFormStoreDocument(form, target, "undo")

		expect(seen).toContain("issues/changed")
		expect(seen).toContain("field/blurred")
		expect(seen).toContain("runtime/replaced")
		expect(seen).toContain("validation/started")
		expect(seen).toContain("validation/resolved")
		expect(seen).toContain("document/committed")
		expect(seen).toContain("document/restored")
	})

	it("queues nested command dispatch FIFO until publication completes", () => {
		const publications: string[] = []
		const middleware: FormMiddleware<Values, Context> =
			(api) => (next) => (transaction) => {
				const result = next(transaction)
				if (
					transaction.type === "document/committed" &&
					transaction.changes.some(
						(change) => change.type === "set" && change.value === "Grace",
					)
				) {
					api.dispatch({ type: "value/set", path: "name", value: "Lin" })
					api.dispatch({ type: "value/set", path: "name", value: "Hopper" })
				}
				return result
			}
		const form = createStore([middleware])
		form.subscribe(
			(snapshot) => snapshot.values.name,
			(name) => publications.push(name),
		)

		form.setValue("name", "Grace")

		expect(publications).toEqual(["Grace", "Lin", "Hopper"])
		expect(form.getSnapshot().values.name).toBe("Hopper")
	})

	it("reports validation failures from middleware's void command dispatch", async () => {
		const failure = new Error("middleware validation failed")
		const reportError = vi.fn()
		vi.stubGlobal("reportError", reportError)
		const failingSchema = {
			"~standard": {
				version: 1,
				vendor: "middleware-validation-test",
				validate: () => {
					throw failure
				},
			},
		} as StandardSchema<Values>
		const failingDefinition = normalizeDefinition({
			schema: failingSchema,
			controls: {},
			ui: [],
		})
		let runValidation: () => void = () => {
			throw new Error("Middleware was not initialized")
		}
		const middleware: FormMiddleware<Values, unknown> = (api) => (next) => {
			runValidation = () => api.dispatch({ type: "validation/run" })
			return (transaction) => next(transaction)
		}
		createFormStoreWithMiddleware(
			{
				definition: failingDefinition,
				defaultValues: { name: "Ada", items: [] },
			},
			[middleware] as unknown as readonly AnyFormMiddleware[],
		)

		runValidation()
		await Promise.resolve()
		await Promise.resolve()

		expect(reportError).toHaveBeenCalledWith(failure)
		vi.unstubAllGlobals()
	})

	it("rejects duplicate references and protocol violations", () => {
		const pass: FormMiddleware<Values, Context> =
			() => (next) => (transaction) =>
				next(transaction)
		expect(() => createStore([pass, pass])).toThrow(/duplicates/i)

		const twice: FormMiddleware<Values, Context> =
			() => (next) => (transaction) => {
				next(transaction)
				return next(transaction)
			}
		expect(() => createStore([twice]).setValue("name", "Grace")).toThrow(
			/more than once/i,
		)

		const invalid = (() => () => () => ({
			status: "wat",
		})) as unknown as FormMiddleware<Values, Context>
		expect(() => createStore([invalid]).setValue("name", "Grace")).toThrow(
			/valid.*dispatch result/i,
		)

		const promise = (() => () => async () =>
			cancelled) as unknown as FormMiddleware<Values, Context>
		expect(() => createStore([promise]).setValue("name", "Grace")).toThrow(
			/Promise/i,
		)

		const forged = (() => () => () => ({
			status: "committed",
			event: {},
		})) as unknown as FormMiddleware<Values, Context>
		expect(() => createStore([forged]).setValue("name", "Grace")).toThrow(
			/without calling next/i,
		)
	})

	it("rejects delayed next calls", () => {
		let delayedNext: (() => unknown) | undefined
		const middleware: FormMiddleware<Values, Context> =
			() => (next) => (transaction) => {
				delayedNext = () => next(transaction)
				return cancelled
			}
		const form = createStore([middleware])
		form.setValue("name", "Grace")

		expect(delayedNext).toBeDefined()
		expect(() => delayedNext?.()).toThrow(/asynchronously/i)
		expect(form.getSnapshot().values.name).toBe("Ada")
	})

	it.each(["before", "after"] as const)(
		"finalizes and publishes once when a %s observer surrounds a post-commit error",
		(position) => {
			const finalized = vi.fn()
			const published = vi.fn()
			const observed = vi.fn()
			const observer: FormMiddleware<Values, Context> =
				() => (next) => (transaction) => {
					const result = next(transaction)
					observed()
					return result
				}
			const throwing: FormMiddleware<Values, Context> =
				() => (next) => (transaction) => {
					next(transaction)
					throw new Error("post-commit")
				}
			const middleware =
				position === "before" ? [observer, throwing] : [throwing, observer]
			const form = createStore(middleware, {
				onCommitFinalized: finalized,
			})
			form.subscribe((snapshot) => snapshot.values.name, published)

			expect(() => form.setValue("name", "Grace")).toThrow("post-commit")
			expect(form.getSnapshot().values.name).toBe("Grace")
			expect(finalized).toHaveBeenCalledTimes(1)
			expect(published).toHaveBeenCalledTimes(1)
			expect(observed).toHaveBeenCalledTimes(position === "after" ? 1 : 0)
		},
	)

	it("publishes, runs update effects, and validates before rethrowing a finalizer error", async () => {
		const validate = schema["~standard"].validate as ReturnType<typeof vi.fn>
		validate.mockClear()
		const order: string[] = []
		const finalizerError = new Error("finalizer failed")
		const form = createStore([], {
			afterUpdate: () => order.push("afterUpdate"),
			onCommitFinalized: (type) => {
				if (type === "document/committed") throw finalizerError
			},
			validation: { mode: "change" },
		})
		form.subscribe(
			(snapshot) => snapshot.values.name,
			() => order.push("publish"),
		)

		expect(() => form.setValue("name", "Grace")).toThrow(finalizerError)
		await Promise.resolve()

		expect(order).toEqual(["publish", "afterUpdate"])
		expect(validate).toHaveBeenCalledOnce()
		expect(form.getSnapshot().validationStatus).toBe("valid")
	})

	it.each(["before", "after"] as const)(
		"clears validation publication suppression after a %s-next started-event error",
		(position) => {
			const failure = new Error(`${position}-next validation start`)
			const middleware: FormMiddleware<Values, Context> =
				() => (next) => (transaction) => {
					if (transaction.type !== "validation/started") {
						return next(transaction)
					}
					if (position === "after") next(transaction)
					throw failure
				}
			const form = createStore([middleware])
			const validatingStates: boolean[] = []
			const names: string[] = []
			form.subscribe(
				(snapshot) => snapshot.isValidating,
				(isValidating) => validatingStates.push(isValidating),
			)
			form.subscribe(
				(snapshot) => snapshot.values.name,
				(name) => names.push(name),
			)

			expect(() => form.validate()).toThrow(failure)
			expect(form.getSnapshot().isValidating).toBe(false)
			expect(form.getSnapshot().validationStatus).toBe("unvalidated")
			form.setValue("name", "Grace")

			expect(names).toEqual(["Grace"])
			expect(validatingStates).toEqual(
				position === "after" ? [true, false] : [],
			)
		},
	)

	it("preserves scheduled and active validation when runtime replacement is cancelled", async () => {
		vi.useFakeTimers()
		const attempt = createDeferred<{ value: Values }>()
		let signal: AbortSignal | undefined
		const asyncSchema = {
			"~standard": {
				version: 1,
				vendor: "runtime-cancellation-test",
				validate: vi.fn((_value: Values, options) => {
					signal = options?.libraryOptions?.signal as AbortSignal | undefined
					return attempt.promise
				}),
			},
		} as StandardSchema<Values>
		const asyncDefinition = normalizeDefinition({
			schema: asyncSchema,
			controls: { text: { formData: { mode: "native" } } },
			ui: [{ kind: "field", path: "name", control: "text" }],
		})
		const cancelReplacement: FormMiddleware<Values, Context> =
			() => (next) => (transaction) =>
				transaction.type === "runtime/replaced" ? cancelled : next(transaction)
		const form = createFormStoreWithMiddleware(
			{
				definition: asyncDefinition,
				defaultValues: { name: "Ada", items: [] },
				context: { locale: "en" },
				validation: { mode: "change", asyncDebounceMs: 20 },
			},
			[cancelReplacement] as unknown as readonly AnyFormMiddleware[],
		)

		form.setValue("name", "Grace")
		form.replaceOptions({ validation: { mode: "submit" } })
		await vi.advanceTimersByTimeAsync(20)

		expect(asyncSchema["~standard"].validate).toHaveBeenCalledOnce()
		expect(form.getSnapshot().isValidating).toBe(true)
		form.replaceOptions({ validation: { mode: "submit" } })
		expect(signal?.aborted).toBe(false)
		expect(form.getSnapshot().isValidating).toBe(true)

		attempt.resolve({ value: form.getValues() })
		await Promise.resolve()
		await Promise.resolve()
		expect(form.getSnapshot().validationStatus).toBe("valid")
		vi.useRealTimers()
	})

	it("cleans active validation when runtime replacement commits before middleware throws", async () => {
		const attempt = createDeferred<{ value: Values }>()
		let signal: AbortSignal | undefined
		const asyncSchema = {
			"~standard": {
				version: 1,
				vendor: "runtime-commit-test",
				validate: (_value: Values, options: { libraryOptions?: unknown }) => {
					signal = (
						options.libraryOptions as { signal?: AbortSignal } | undefined
					)?.signal
					signal?.addEventListener(
						"abort",
						() => attempt.reject(new DOMException("aborted", "AbortError")),
						{ once: true },
					)
					return attempt.promise
				},
			},
		} as StandardSchema<Values>
		const asyncDefinition = normalizeDefinition({
			schema: asyncSchema,
			controls: { text: { formData: { mode: "native" } } },
			ui: [{ kind: "field", path: "name", control: "text" }],
		})
		const failure = new Error("runtime post-commit")
		const throwingReplacement: FormMiddleware<Values, Context> =
			() => (next) => (transaction) => {
				const result = next(transaction)
				if (transaction.type === "runtime/replaced") throw failure
				return result
			}
		const form = createFormStoreWithMiddleware(
			{
				definition: asyncDefinition,
				defaultValues: { name: "Ada", items: [] },
				context: { locale: "en" },
			},
			[throwingReplacement] as unknown as readonly AnyFormMiddleware[],
		)
		const validation = form.validate()

		expect(form.getSnapshot().isValidating).toBe(true)
		expect(() =>
			form.replaceOptions({ validation: { mode: "change" } }),
		).toThrow(failure)
		expect(signal?.aborted).toBe(true)
		expect(form.getSnapshot().isValidating).toBe(false)
		await expect(validation).rejects.toMatchObject({ name: "AbortError" })
	})

	it("keeps active validation when a same-value runtime reset is cancelled", async () => {
		const attempt = createDeferred<{ value: Values }>()
		let signal: AbortSignal | undefined
		const asyncSchema = {
			"~standard": {
				version: 1,
				vendor: "reset-cancellation-test",
				validate: (_value: Values, options: { libraryOptions?: unknown }) => {
					signal = (
						options.libraryOptions as { signal?: AbortSignal } | undefined
					)?.signal
					return attempt.promise
				},
			},
		} as StandardSchema<Values>
		const asyncDefinition = normalizeDefinition({
			schema: asyncSchema,
			controls: { text: { formData: { mode: "native" } } },
			ui: [{ kind: "field", path: "name", control: "text" }],
		})
		const cancelReset: FormMiddleware<Values, Context> =
			() => (next) => (transaction) =>
				transaction.type === "runtime/reset" ? cancelled : next(transaction)
		const form = createFormStoreWithMiddleware(
			{
				definition: asyncDefinition,
				defaultValues: { name: "Ada", items: [] },
				context: { locale: "en" },
			},
			[cancelReset] as unknown as readonly AnyFormMiddleware[],
		)
		const validation = form.validate()

		form.reset(form.getValues())

		expect(signal?.aborted).toBe(false)
		expect(form.getSnapshot().isValidating).toBe(true)
		attempt.resolve({ value: form.getValues() })
		await expect(validation).resolves.toMatchObject({ success: true })
		expect(form.getSnapshot().validationStatus).toBe("valid")
	})

	it("finishes a submission that committed before middleware threw", () => {
		const failure = new Error("submission start failed")
		const throwingStart: FormMiddleware<Values, Context> =
			() => (next) => (transaction) => {
				const result = next(transaction)
				if (transaction.type === "submission/started") throw failure
				return result
			}
		const form = createStore([throwingStart])

		expect(() => startFormSubmission(form)).toThrow(failure)
		expect(form.getSnapshot().isSubmitting).toBe(false)
		expect(form.getSnapshot().submitCount).toBe(1)
	})

	it("does not change or publish state after a pre-commit error", () => {
		const middleware: FormMiddleware<Values, Context> = () => () => () => {
			throw new Error("pre-commit")
		}
		const form = createStore([middleware])
		const snapshot = form.getSnapshot()
		const listener = vi.fn()
		form.subscribe((state) => state, listener)

		expect(() => form.setValue("name", "Grace")).toThrow("pre-commit")
		expect(form.getSnapshot()).toBe(snapshot)
		expect(listener).not.toHaveBeenCalled()
	})

	it("discards nested commands after a pre-commit error", () => {
		const middleware: FormMiddleware<Values, Context> =
			(api) => () => (transaction) => {
				if (transaction.type === "document/committed") {
					api.dispatch({ type: "value/set", path: "note", value: "queued" })
				}
				throw new Error("pre-commit")
			}
		const form = createStore([middleware])

		expect(() => form.setValue("name", "Grace")).toThrow("pre-commit")
		expect(form.getSnapshot().values).toEqual({
			name: "Ada",
			items: [{ value: "first" }],
		})
	})

	it("publishes a commit before rejecting an invalid post-next result", () => {
		const finalized = vi.fn()
		const listener = vi.fn()
		const invalidAfterNext = (() =>
			(next: (value: unknown) => unknown) =>
			(transaction: unknown) => {
				next(transaction)
				return { status: "invalid" }
			}) as unknown as FormMiddleware<Values, Context>
		const form = createStore([invalidAfterNext], {
			onCommitFinalized: finalized,
		})
		form.subscribe((snapshot) => snapshot.values.name, listener)

		expect(() => form.setValue("name", "Grace")).toThrow(/valid.*dispatch/i)
		expect(form.getSnapshot().values.name).toBe("Grace")
		expect(finalized).toHaveBeenCalledOnce()
		expect(listener).toHaveBeenCalledOnce()
	})

	it("drains nested commands before rethrowing a post-commit error", () => {
		const middleware: FormMiddleware<Values, Context> =
			(api) => (next) => (transaction) => {
				next(transaction)
				if (transaction.type === "document/committed") {
					api.dispatch({ type: "value/set", path: "note", value: "queued" })
				}
				throw new Error("post-commit")
			}
		const form = createStore([middleware])

		expect(() => form.setValue("name", "Grace")).toThrow("post-commit")
		expect(form.getSnapshot().values).toMatchObject({
			name: "Grace",
			note: "queued",
		})
	})

	it("lets middleware cancel or forward repeated blur without unchanged blur publication", async () => {
		const validate = schema["~standard"].validate as ReturnType<typeof vi.fn>
		validate.mockClear()
		const cancelBlur: FormMiddleware<Values, Context> =
			() => (next) => (transaction) =>
				transaction.type === "field/blurred" ? cancelled : next(transaction)
		const cancelledForm = createStore([cancelBlur], {
			validation: { mode: "blur" },
		})
		cancelledForm.blur("name")
		cancelledForm.blur("name")
		expect(validate).not.toHaveBeenCalled()
		expect(cancelledForm.getSnapshot().isTouched).toBe(false)

		const forwardedForm = createStore([], {
			validation: { mode: "blur", revalidateMode: "blur" },
		})
		const listener = vi.fn()
		forwardedForm.blur("name")
		await Promise.resolve()
		forwardedForm.subscribe((state) => state, listener)
		forwardedForm.blur("name")
		await Promise.resolve()

		expect(validate).toHaveBeenCalledTimes(2)
		expect(forwardedForm.getSnapshot().isTouched).toBe(true)
		expect(listener).not.toHaveBeenCalled()
	})

	it("detaches Date and RegExp leaves in transactions, events, and snapshots", () => {
		type NativeValues = { createdAt: Date; pattern: RegExp }
		const nativeSchema = {} as StandardSchema<NativeValues>
		const nativeDefinition = normalizeDefinition({
			schema: nativeSchema,
			controls: {},
			ui: [],
		})
		const middleware: FormMiddleware<NativeValues, unknown> =
			(api) => (next) => (transaction) => {
				if (transaction.type !== "document/committed") {
					return next(transaction)
				}
				const transactionDate = transaction.changes.find(
					(change) => change.type === "set" && change.path === "createdAt",
				)
				const transactionPattern = transaction.changes.find(
					(change) => change.type === "set" && change.path === "pattern",
				)
				const result = next(transaction)
				if (transactionDate?.type === "set") {
					;(transactionDate.value as Date).setTime(1)
				}
				if (transactionPattern?.type === "set") {
					;(transactionPattern.value as RegExp).lastIndex = 1
				}
				if (
					result.status === "committed" &&
					result.event.type === "document/committed"
				) {
					const eventDate = result.event.changes.find(
						(change) => change.type === "set" && change.path === "createdAt",
					)
					const eventPattern = result.event.changes.find(
						(change) => change.type === "set" && change.path === "pattern",
					)
					if (eventDate?.type === "set") (eventDate.value as Date).setTime(2)
					if (eventPattern?.type === "set") {
						;(eventPattern.value as RegExp).lastIndex = 2
					}
				}
				api.getSnapshot().values.createdAt.setTime(3)
				api.getSnapshot().values.pattern.lastIndex = 4
				return result
			}
		const form = createFormStoreWithMiddleware(
			{
				definition: nativeDefinition,
				defaultValues: {
					createdAt: new Date(10),
					pattern: /form/g,
				},
			},
			[middleware] as unknown as readonly AnyFormMiddleware[],
		)

		const nextPattern = /next/g
		nextPattern.lastIndex = 6
		form.batch(() => {
			form.setValue("createdAt", new Date(20))
			form.setValue("pattern", nextPattern)
		})

		expect(form.getValues().createdAt.getTime()).toBe(20)
		expect(form.getValues().pattern.source).toBe("next")
		expect(form.getValues().pattern.lastIndex).toBe(6)
	})
})
