import type { StandardSchemaV1 } from "@standard-schema/spec"
import { afterEach, describe, expect, it, vi } from "vitest"
import { formBindingFinalizer } from "../core/feature-protocol.js"
import { createFormDocument } from "../core/form-reducer.js"
import type { FormMiddleware } from "../core/middleware.js"
import { createHistoryMiddleware } from "../history/history.js"
import { defineControl } from "../react/control.js"
import { createFormKit } from "../react/create-form-kit.js"
import {
	type FormInstance,
	type FormKitOwner,
	getFormStore,
} from "../react/form-instance.js"
import type { ReactUiPresentation } from "../react/slots.js"
import {
	createDevToolsMiddleware,
	type DevToolsFeature,
	type DevToolsFormState,
} from "./devtools.js"

type Values = {
	name: string
	items: { value: string }[]
}
type Context = { locale: string }
type Schema = StandardSchemaV1<Values>

const text = defineControl<string>({
	component: () => null,
	formData: { mode: "native" },
})
const kit = createFormKit({ controls: { text } })
const schema: Schema = {
	"~standard": {
		version: 1,
		vendor: "devtools-test",
		validate: (value) => ({ value: value as Values }),
	},
}
const definition = kit.defineForm(schema).withContext<Context>({
	ui: [
		{ kind: "field", path: "name", control: "text" },
		{
			kind: "array",
			path: "items",
			itemDefault: { value: "" },
			children: [{ kind: "field", path: "value", control: "text" }],
		},
	],
})

type TestForm = FormInstance<
	Schema,
	Context,
	typeof kit.controls,
	ReactUiPresentation,
	FormKitOwner<typeof kit.controls, ReactUiPresentation>
>

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe("Redux DevTools middleware", () => {
	it("is inert during SSR and without the extension, owns a stable handle, and rejects duplicates", () => {
		const feature = createDevToolsMiddleware()
		const form = createForm([feature])
		expect(feature.handle(form)).toBe(feature.handle(form))
		activate(feature, form)

		vi.stubGlobal("window", {})
		const absentFeature = createDevToolsMiddleware()
		const absentForm = createForm([absentFeature])
		activate(absentFeature, absentForm)

		const second = createDevToolsMiddleware()
		expect(() => second.handle(form)).toThrow(/not configured/i)
		expect(() => createForm([feature, second])).toThrow(
			/at most one.*devtools/i,
		)
	})

	it("owns connection features and projects only values, logical rows, and a protected revision", () => {
		const transport = createTransport()
		install(transport)
		const sanitizer = vi.fn(
			(
				_state: Omit<DevToolsFormState<unknown>, "$formPlease">,
				_index: number,
			) => ({
				values: "redacted",
				$formPlease: { revision: "forged" },
			}),
		)
		const feature = createDevToolsMiddleware({
			name: "Checkout",
			latency: 0,
			maxAge: 3,
			stateSanitizer: sanitizer,
		})
		const form = createForm([feature])
		activate(feature, form)

		expect(transport.connect).toHaveBeenCalledWith({
			name: "Checkout",
			latency: 0,
			maxAge: 3,
			autoPause: true,
			features: {
				pause: true,
				lock: false,
				persist: false,
				export: true,
				import: false,
				jump: true,
				skip: false,
				reorder: false,
				dispatch: false,
				test: false,
			},
		})
		const state = transport.init.mock.calls[0]?.[0] as DevToolsFormState<Values>
		expect(state.values).toBe("redacted")
		expect(state.$formPlease.revision).toMatch(/^form-please:/)
		expect(state.$formPlease.revision).not.toBe("forged")
		expect(sanitizer.mock.calls[0]?.[0]).toEqual({
			values: { name: "Ada", items: [] },
			rowIdentity: {
				version: 1,
				arrays: [{ path: "items", keys: [] }],
			},
		})

		expect(() => createDevToolsMiddleware({ features: {} } as never)).toThrow(
			/unsupported.*features/i,
		)
		expect(() =>
			createDevToolsMiddleware({ actionCreators: {} } as never),
		).toThrow(/unsupported.*actionCreators/i)
		expect(() =>
			createDevToolsMiddleware({ shouldStartLocked: true } as never),
		).toThrow(/unsupported.*shouldStartLocked/i)
	})

	it("sends every finalized document and runtime event, but no cancelled transaction", () => {
		const transport = createTransport()
		install(transport)
		const cancelName: FormMiddleware<Values, Context> =
			() => (next) => (transaction) =>
				transaction.type === "document/committed" &&
				transaction.changes.some(
					(change) => change.type === "set" && change.value === "Cancelled",
				)
					? { status: "cancelled" }
					: next(transaction)
		const feature = createDevToolsMiddleware()
		const form = createForm([feature, cancelName])
		activate(feature, form)

		form.setValue("name", "Grace")
		form.touch("name")
		form.append("items", { value: "one" })
		form.setValue("name", "Cancelled")

		expect(transport.send.mock.calls.map(([event]) => event.type)).toEqual([
			"document/committed",
			"field/touched",
			"document/committed",
		])
		const state = transport.send.mock.calls[2]?.[1] as DevToolsFormState<Values>
		expect(state.values).toEqual({
			name: "Grace",
			items: [{ value: "one" }],
		})
		expect(state.rowIdentity.arrays[0]?.keys).toHaveLength(1)
	})

	it("navigates through exact retained tokens, records history, and suppresses the restore echo", () => {
		const transport = createTransport()
		install(transport)
		const historyFeature = createHistoryMiddleware()
		const feature = createDevToolsMiddleware()
		const form = createForm([historyFeature, feature])
		const history = historyFeature.handle(form)
		activate(feature, form)
		const initial = transport.init.mock.calls[0]?.[0]

		form.setValue("name", "Grace")
		const grace = transport.send.mock.calls.at(-1)?.[1]
		form.setValue("name", "Lin")
		const sentBeforeJump = transport.send.mock.calls.length
		transport.emit(dispatch("JUMP_TO_STATE", grace))

		expect(form.getValues().name).toBe("Grace")
		expect(transport.send).toHaveBeenCalledTimes(sentBeforeJump)
		expect(history.getSnapshot().length).toBe(3)
		expect(history.undo()).toBe("applied")
		expect(form.getValues().name).toBe("Lin")

		transport.emit(dispatch("JUMP_TO_ACTION", initial))
		expect(form.getValues().name).toBe("Ada")
	})

	it("accepts serialized monitor state and resynchronizes malformed JSON", () => {
		const transport = createTransport()
		install(transport)
		const feature = createDevToolsMiddleware()
		const form = createForm([feature])
		activate(feature, form)

		form.setValue("name", "Grace")
		const grace = transport.send.mock.calls.at(-1)?.[1]
		form.setValue("name", "Lin")
		transport.emit(dispatch("JUMP_TO_STATE", JSON.stringify(grace)))
		expect(form.getValues().name).toBe("Grace")

		form.setValue("name", "Katherine")
		transport.emit(dispatch("JUMP_TO_STATE", "{malformed"))
		expect(form.getValues().name).toBe("Katherine")
		expect(transport.error).toHaveBeenLastCalledWith(
			"Redux DevTools revision is unknown or expired",
		)
		expect(transport.init.mock.calls.at(-1)?.[0]).toMatchObject({
			values: { name: "Katherine" },
		})
	})

	it("keeps an applied restore applied while queued runtime events drain", () => {
		const transport = createTransport()
		install(transport)
		const queueTouch: FormMiddleware<Values, Context> =
			(api) => (next) => (transaction) => {
				const result = next(transaction)
				if (
					transaction.type === "document/restored" &&
					transaction.origin === "devtools"
				) {
					api.dispatch({ type: "field/touch", path: "name" })
				}
				return result
			}
		const feature = createDevToolsMiddleware()
		const form = createForm([queueTouch, feature])
		activate(feature, form)
		const initial = transport.init.mock.calls[0]?.[0]
		form.setValue("name", "Grace")
		transport.emit(dispatch("JUMP_TO_STATE", initial))

		expect(form.getValues().name).toBe("Ada")
		expect(form.getSnapshot().isTouched).toBe(true)
		expect(transport.error).not.toHaveBeenCalledWith(
			"Redux DevTools restore was transformed",
		)
		expect(transport.send.mock.calls.at(-1)?.[0]).toMatchObject({
			type: "field/touched",
		})
	})

	it("uses COMMIT only as a monitor baseline and supports RESET and ROLLBACK restores", () => {
		const transport = createTransport()
		install(transport)
		const feature = createDevToolsMiddleware()
		const form = createForm([feature])
		activate(feature, form)
		const initial = transport.init.mock.calls[0]?.[0]

		form.setValue("name", "Grace")
		const grace = transport.send.mock.calls.at(-1)?.[1]
		transport.emit(dispatch("COMMIT"))
		expect(form.getValues().name).toBe("Grace")
		expect(transport.init.mock.calls.at(-1)?.[0]).toEqual(grace)

		form.setValue("name", "Lin")
		transport.emit(dispatch("ROLLBACK", grace))
		expect(form.getValues().name).toBe("Grace")
		transport.emit(dispatch("RESET", initial))
		expect(form.getValues().name).toBe("Ada")
	})

	it("expires old non-baseline tokens at maxAge and rejects unsupported monitor commands", () => {
		const transport = createTransport()
		install(transport)
		const feature = createDevToolsMiddleware({ maxAge: 2 })
		const form = createForm([feature])
		activate(feature, form)
		form.setValue("name", "one")
		const expired = transport.send.mock.calls.at(-1)?.[1]
		form.setValue("name", "two")
		form.setValue("name", "three")

		transport.emit(dispatch("JUMP_TO_STATE", expired))
		expect(form.getValues().name).toBe("three")
		expect(transport.error).toHaveBeenCalledWith(
			"Redux DevTools revision is unknown or expired",
		)
		expect(transport.init.mock.calls.at(-1)?.[0]).toMatchObject({
			values: { name: "three" },
		})

		transport.emit(dispatch("IMPORT_STATE", {}))
		expect(transport.error).toHaveBeenCalledWith(
			"Unsupported Redux DevTools command: IMPORT_STATE",
		)
	})

	it("resynchronizes actual state when application middleware cancels or transforms a restore", () => {
		const cancelRestore: FormMiddleware<Values, Context> =
			() => (next) => (transaction) =>
				transaction.type === "document/restored" &&
				transaction.origin === "devtools"
					? { status: "cancelled" }
					: next(transaction)
		const cancelledTransport = createTransport()
		install(cancelledTransport)
		const cancelledFeature = createDevToolsMiddleware()
		const cancelledForm = createForm([cancelRestore, cancelledFeature])
		activate(cancelledFeature, cancelledForm)
		const cancelledInitial = cancelledTransport.init.mock.calls[0]?.[0]
		cancelledForm.setValue("name", "Grace")
		cancelledTransport.emit(dispatch("JUMP_TO_STATE", cancelledInitial))
		expect(cancelledForm.getValues().name).toBe("Grace")
		expect(cancelledTransport.error).toHaveBeenCalledWith(
			"Redux DevTools restore was cancelled",
		)

		const transformedTransport = createTransport()
		install(transformedTransport)
		const transformRestore: FormMiddleware<Values, Context> =
			() => (next) => (transaction) => {
				if (
					transaction.type !== "document/restored" ||
					transaction.origin !== "devtools"
				) {
					return next(transaction)
				}
				return next({
					...transaction,
					document: createFormDocument(
						{ ...transaction.document.values, name: "Transformed" },
						transaction.document.rowIdentity,
					),
				})
			}
		const transformedFeature = createDevToolsMiddleware()
		const transformedForm = createForm([transformedFeature, transformRestore])
		activate(transformedFeature, transformedForm)
		const transformedInitial = transformedTransport.init.mock.calls[0]?.[0]
		transformedForm.setValue("name", "Grace")
		transformedTransport.emit(dispatch("JUMP_TO_STATE", transformedInitial))
		expect(transformedForm.getValues().name).toBe("Transformed")
		expect(transformedTransport.send.mock.calls.at(-1)?.[0]).toMatchObject({
			type: "document/restored",
			origin: "devtools",
		})
		expect(transformedTransport.error).toHaveBeenCalledWith(
			"Redux DevTools restore was transformed",
		)
		expect(transformedTransport.init.mock.calls.at(-1)?.[0]).toMatchObject({
			values: { name: "Transformed" },
		})
	})

	it("does not mistake a queued command for a cancelled restore", () => {
		const cancelWithTargetEdit: FormMiddleware<Values, Context> =
			(api) => (next) => (transaction) => {
				if (
					transaction.type !== "document/restored" ||
					transaction.origin !== "devtools"
				) {
					return next(transaction)
				}
				api.dispatch({
					type: "value/set",
					path: "name",
					value: transaction.document.values.name,
				})
				return { status: "cancelled" }
			}
		const transport = createTransport()
		install(transport)
		const feature = createDevToolsMiddleware()
		const form = createForm([cancelWithTargetEdit, feature])
		activate(feature, form)
		const initial = transport.init.mock.calls[0]?.[0]
		form.setValue("name", "Grace")

		transport.emit(dispatch("JUMP_TO_STATE", initial))

		expect(form.getValues().name).toBe("Ada")
		expect(transport.error).toHaveBeenCalledWith(
			"Redux DevTools restore was cancelled",
		)
		expect(transport.init).toHaveBeenCalledTimes(2)
	})

	it("turns connection, sanitizer, send, subscribe, and unsubscribe failures into isolated diagnostics", () => {
		const connectError = new Error("connect failed")
		const connectOnError = vi.fn()
		vi.stubGlobal("window", {
			__REDUX_DEVTOOLS_EXTENSION__: {
				connect: vi.fn(() => {
					throw connectError
				}),
			},
		})
		const connectFeature = createDevToolsMiddleware({
			onError: connectOnError,
		})
		const connectForm = createForm([connectFeature])
		expect(() => activate(connectFeature, connectForm)).not.toThrow()
		expect(connectOnError).toHaveBeenCalledWith(connectError)

		const subscribeTransport = createTransport()
		subscribeTransport.subscribe.mockImplementation(() => {
			throw new Error("subscribe failed")
		})
		install(subscribeTransport)
		const subscribeFeature = createDevToolsMiddleware()
		const subscribeForm = createForm([subscribeFeature])
		expect(() => activate(subscribeFeature, subscribeForm)).not.toThrow()
		expect(subscribeTransport.unsubscribe).toHaveBeenCalledOnce()

		const sanitizerTransport = createTransport()
		install(sanitizerTransport)
		const sanitizerError = new Error("sanitizer failed")
		const sanitizerOnError = vi.fn()
		const sanitizerFeature = createDevToolsMiddleware({
			stateSanitizer: () => {
				throw sanitizerError
			},
			onError: sanitizerOnError,
		})
		const sanitizerForm = createForm([sanitizerFeature])
		expect(() => activate(sanitizerFeature, sanitizerForm)).not.toThrow()
		expect(sanitizerOnError).toHaveBeenCalledWith(sanitizerError)
		expect(sanitizerTransport.listenerCount()).toBe(0)

		const serializationTransport = createTransport()
		install(serializationTransport)
		const serializationError = new Error("serialization failed")
		const serializationOnError = vi.fn()
		serializationTransport.init.mockImplementation(() => {
			throw serializationError
		})
		const serializationFeature = createDevToolsMiddleware({
			onError: serializationOnError,
		})
		const serializationForm = createForm([serializationFeature])
		expect(() =>
			activate(serializationFeature, serializationForm),
		).not.toThrow()
		expect(serializationOnError).toHaveBeenCalledWith(serializationError)
		expect(serializationTransport.listenerCount()).toBe(0)

		const sendTransport = createTransport()
		install(sendTransport)
		const sendError = new Error("send failed")
		const sendOnError = vi.fn()
		const sendFeature = createDevToolsMiddleware({ onError: sendOnError })
		const sendForm = createForm([sendFeature])
		activate(sendFeature, sendForm)
		sendTransport.send.mockImplementation(() => {
			throw sendError
		})
		expect(() => sendForm.setValue("name", "Grace")).not.toThrow()
		expect(sendOnError).toHaveBeenCalledWith(sendError)
		expect(sendTransport.listenerCount()).toBe(0)

		const unsubscribeTransport = createTransport()
		install(unsubscribeTransport)
		const unsubscribeError = new Error("unsubscribe failed")
		const unsubscribeOnError = vi.fn()
		const unsubscribeFeature = createDevToolsMiddleware({
			onError: unsubscribeOnError,
		})
		const unsubscribeForm = createForm([unsubscribeFeature])
		activate(unsubscribeFeature, unsubscribeForm)
		unsubscribeTransport.returnedUnsubscribe.mockImplementation(() => {
			throw unsubscribeError
		})
		expect(() =>
			unsubscribeFeature.handle(unsubscribeForm).disconnect(),
		).not.toThrow()
		expect(unsubscribeOnError).toHaveBeenCalledWith(unsubscribeError)
	})

	it("disconnects one form idempotently without affecting another form", () => {
		const firstTransport = createTransport()
		const secondTransport = createTransport()
		const connect = vi
			.fn()
			.mockReturnValueOnce(firstTransport.connection)
			.mockReturnValueOnce(secondTransport.connection)
		vi.stubGlobal("window", {
			__REDUX_DEVTOOLS_EXTENSION__: { connect },
		})
		const feature = createDevToolsMiddleware()
		const first = createForm([feature])
		const second = createForm([feature])
		activate(feature, first)
		activate(feature, second)

		feature.handle(first).disconnect()
		feature.handle(first).disconnect()
		first.setValue("name", "First")
		second.setValue("name", "Second")
		expect(firstTransport.send).not.toHaveBeenCalled()
		expect(secondTransport.send).toHaveBeenCalledOnce()
		expect(firstTransport.returnedUnsubscribe).toHaveBeenCalledOnce()
		expect(secondTransport.returnedUnsubscribe).not.toHaveBeenCalled()
	})

	it("unsubscribes from finalized core events on disconnect", () => {
		const prototype = Object.getPrototypeOf(getFormStore(createForm([]))) as {
			subscribeFinalized: (...args: unknown[]) => () => void
		}
		const unsubscribeFinalized = vi.fn()
		vi.spyOn(prototype, "subscribeFinalized").mockReturnValueOnce(
			unsubscribeFinalized,
		)
		const feature = createDevToolsMiddleware()
		const form = createForm([feature])

		feature.handle(form).disconnect()
		feature.handle(form).disconnect()

		expect(unsubscribeFinalized).toHaveBeenCalledOnce()
	})

	it("does not connect when later middleware initialization fails", () => {
		const transport = createTransport()
		install(transport)
		const feature = createDevToolsMiddleware()
		const throwingInitializer: FormMiddleware<Values, Context> = () => {
			throw new Error("initializer failed")
		}
		expect(() => createForm([feature, throwingInitializer])).toThrow(
			"initializer failed",
		)
		expect(transport.connect).not.toHaveBeenCalled()
		expect(transport.listenerCount()).toBe(0)
	})

	it.each(["before", "after"] as const)(
		"observes one finalized event when a %s DevTools neighbor commits and throws",
		(order) => {
			const transport = createTransport()
			install(transport)
			const feature = createDevToolsMiddleware()
			const commitsThenThrows: FormMiddleware<Values, Context> =
				() => (next) => (transaction) => {
					const result = next(transaction)
					throw new Error(`post-commit failure: ${result.status}`)
				}
			const middleware =
				order === "before"
					? [feature, commitsThenThrows]
					: [commitsThenThrows, feature]
			const form = createForm(middleware)
			activate(feature, form)

			expect(() => form.setValue("name", "Grace")).toThrow(
				"post-commit failure",
			)
			expect(form.getValues().name).toBe("Grace")
			expect(transport.send).toHaveBeenCalledOnce()
		},
	)
})

function createForm(middleware: readonly unknown[]): TestForm {
	const create = kit.createForm as unknown as (
		definition: unknown,
		options: {
			defaultValues: Values
			context: Context
			middleware: readonly unknown[]
		},
	) => TestForm
	return create(definition, {
		defaultValues: { name: "Ada", items: [] },
		context: { locale: "en" },
		middleware,
	})
}

function activate(feature: DevToolsFeature, form: TestForm): void {
	const finalize = (
		feature as unknown as {
			[formBindingFinalizer](form: object): void
		}
	)[formBindingFinalizer]
	finalize(form)
}

function dispatch(type: string, state?: unknown) {
	return { type: "DISPATCH", payload: { type }, state }
}

function install(transport: ReturnType<typeof createTransport>): void {
	vi.stubGlobal("window", {
		__REDUX_DEVTOOLS_EXTENSION__: { connect: transport.connect },
	})
}

function createTransport() {
	const listeners = new Set<(message: unknown) => void>()
	const init = vi.fn()
	const send = vi.fn()
	const error = vi.fn()
	const unsubscribe = vi.fn(() => listeners.clear())
	const returnedUnsubscribe = vi.fn(() => listeners.clear())
	const subscribe = vi.fn((listener: (message: unknown) => void) => {
		listeners.add(listener)
		return returnedUnsubscribe
	})
	const connection = { init, send, error, subscribe, unsubscribe }
	const connect = vi.fn(() => connection)
	return {
		connection,
		connect,
		init,
		send,
		error,
		subscribe,
		unsubscribe,
		returnedUnsubscribe,
		emit(message: unknown) {
			for (const listener of [...listeners]) listener(message)
		},
		listenerCount: () => listeners.size,
	}
}
