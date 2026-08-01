import type { StandardSchemaV1 } from "@standard-schema/spec"
import { afterEach, describe, expect, it, vi } from "vitest"
import { getFormFeatureCapability } from "../core/feature-protocol.js"
import { createFormDocument } from "../core/form-reducer.js"
import type { FormMiddleware } from "../core/middleware.js"
import { createHistoryMiddleware } from "../history/history.js"
import { normalizeJournal } from "../history/journal.js"
import { defineControl } from "../react/control.js"
import { createFormKit } from "../react/create-form-kit.js"
import type { FormInstance, FormKitOwner } from "../react/form-instance.js"
import type { ReactUiPresentation } from "../react/slots.js"
import { createDateCodec } from "./codecs.js"
import {
	decodePersistenceEnvelope,
	encodePersistenceEnvelope,
	type JsonValue,
} from "./encoding.js"
import {
	createPersistenceMiddleware,
	type FormPersistenceAdapter,
} from "./persistence.js"

type Values = {
	name: string
	when?: Date
	items: { value: string }[]
}
type Context = { locale: string }
type Schema = StandardSchemaV1<Values, Values & { normalized: true }>

const text = defineControl<string>({
	component: () => null,
	formData: { mode: "native" },
})
const kit = createFormKit({ controls: { text } })
const schema: Schema = {
	"~standard": {
		version: 1,
		vendor: "persistence-test",
		validate(value) {
			const input = value as Values
			return input.name.length === 0
				? { issues: [{ message: "Name is required", path: ["name"] }] }
				: {
						value: {
							...input,
							name: input.name.toUpperCase(),
							normalized: true,
						},
					}
		},
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
	vi.useRealTimers()
})

describe("persistence middleware", () => {
	it("owns a stable per-form handle and rejects absent or duplicate persistence", () => {
		const first = createPersistenceMiddleware({
			adapter: createMemoryAdapter().adapter,
			key: "first",
			version: 1,
		})
		const second = createPersistenceMiddleware({
			adapter: createMemoryAdapter().adapter,
			key: "second",
			version: 1,
		})
		const form = createForm([first])
		expect(first.handle(form)).toBe(first.handle(form))
		expect(() => second.handle(form)).toThrow(/not configured/i)
		expect(() => createForm([first, second])).toThrow(
			/at most one.*persistence/i,
		)
	})

	it("stays idle until restore or start, debounces revisions, and coalesces the latest document", async () => {
		vi.useFakeTimers()
		const storage = createMemoryAdapter()
		const feature = createPersistenceMiddleware({
			adapter: storage.adapter,
			key: "draft",
			version: 1,
		})
		const form = createForm([feature])
		const persistence = feature.handle(form)
		expect(persistence.getSnapshot()).toEqual({
			phase: "idle",
			save: { status: "idle" },
		})
		expect(storage.adapter.load).not.toHaveBeenCalled()

		persistence.start()
		expect(persistence.getSnapshot().save.status).toBe("scheduled")
		vi.advanceTimersByTime(400)
		form.setValue("name", "Grace")
		vi.advanceTimersByTime(499)
		expect(storage.adapter.save).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(1)
		expect(storage.adapter.save).toHaveBeenCalledOnce()
		const saved = await decodePersistenceEnvelope(storage.value as JsonValue, {
			version: 1,
			mode: "document",
			codecs: [],
		})
		expect((saved.value as { values: Values }).values.name).toBe("Grace")

		const emptyStorage = createMemoryAdapter()
		const emptyFeature = createPersistenceMiddleware({
			adapter: emptyStorage.adapter,
			key: "empty",
			version: 1,
		})
		const empty = emptyFeature.handle(createForm([emptyFeature]))
		await expect(empty.restore()).resolves.toBe("empty")
		expect(empty.getSnapshot()).toMatchObject({
			phase: "active",
			save: { status: "scheduled" },
		})
	})

	it("suppresses the cleared revision and serializes remove after an in-flight save", async () => {
		const firstSave = deferred<void>()
		const order: string[] = []
		const adapter: FormPersistenceAdapter = {
			load: vi.fn(async () => undefined),
			save: vi.fn(async () => {
				order.push("save:start")
				await firstSave.promise
				order.push("save:end")
			}),
			remove: vi.fn(async () => {
				order.push("remove")
			}),
		}
		const feature = createPersistenceMiddleware({
			adapter,
			key: "draft",
			version: 1,
		})
		const form = createForm([feature])
		const persistence = feature.handle(form)
		persistence.start()
		const flushing = persistence.flush()
		await vi.waitFor(() => expect(adapter.save).toHaveBeenCalledOnce())
		const clearing = persistence.clear()
		firstSave.resolve()
		await flushing
		await clearing
		expect(order).toEqual(["save:start", "save:end", "remove"])
		await persistence.flush()
		expect(adapter.save).toHaveBeenCalledOnce()

		form.setValue("name", "After clear")
		await persistence.flush()
		expect(adapter.save).toHaveBeenCalledTimes(2)
	})

	it("does not overwrite a local edit made while restore is loading", async () => {
		const source = createForm([])
		const stored = await encodePersistenceEnvelope(
			getFormFeatureCapability(source).getDocument(),
			{ version: 1, mode: "document", codecs: [] },
		)
		const loading = deferred<JsonValue | undefined>()
		const adapter: FormPersistenceAdapter = {
			load: vi.fn(() => loading.promise),
			save: vi.fn(async () => undefined),
			remove: vi.fn(async () => undefined),
		}
		const feature = createPersistenceMiddleware({
			adapter,
			key: "draft",
			version: 1,
		})
		const form = createForm([feature])
		const persistence = feature.handle(form)
		const restoring = persistence.restore()
		form.setValue("name", "Local edit")
		loading.resolve(stored)
		await expect(restoring).resolves.toBe("conflict")
		expect(form.getSnapshot().values.name).toBe("Local edit")
		expect(persistence.getSnapshot().phase).toBe("conflict")
		expect(adapter.save).not.toHaveBeenCalled()

		persistence.start()
		await persistence.flush()
		expect(adapter.save).toHaveBeenCalledOnce()
	})

	it("retries failed saves without rolling back form state and reports each failed attempt once", async () => {
		const error = new Error("storage unavailable")
		const onError = vi.fn()
		const adapter = createMemoryAdapter()
		vi.mocked(adapter.adapter.save)
			.mockRejectedValueOnce(error)
			.mockImplementation(async (_key, value) => {
				adapter.value = value
			})
		const feature = createPersistenceMiddleware({
			adapter: adapter.adapter,
			key: "draft",
			version: 1,
			onError,
		})
		const form = createForm([feature])
		const persistence = feature.handle(form)
		persistence.start()
		form.setValue("name", "Committed")
		await expect(persistence.flush()).rejects.toBe(error)
		expect(form.getSnapshot().values.name).toBe("Committed")
		expect(persistence.getSnapshot().save).toEqual({ status: "failed", error })
		expect(onError).toHaveBeenCalledOnce()

		await persistence.flush()
		expect(adapter.adapter.save).toHaveBeenCalledTimes(2)
		expect(persistence.getSnapshot().save.status).toBe("idle")
	})

	it("does not let an older save completion hide or overwrite a newer revision", async () => {
		const saves = [deferred<void>(), deferred<void>()]
		const stored: JsonValue[] = []
		const adapter: FormPersistenceAdapter = {
			load: vi.fn(async () => undefined),
			save: vi.fn(async (_key, value) => {
				const index = stored.push(value) - 1
				await saves[index]?.promise
			}),
			remove: vi.fn(async () => undefined),
		}
		const feature = createPersistenceMiddleware({
			adapter,
			key: "draft",
			version: 1,
		})
		const form = createForm([feature])
		const persistence = feature.handle(form)
		persistence.start()
		const first = persistence.flush()
		await vi.waitFor(() => expect(adapter.save).toHaveBeenCalledOnce())

		form.setValue("name", "newer")
		const second = persistence.flush()
		saves[0]?.resolve()
		await first
		await vi.waitFor(() => expect(adapter.save).toHaveBeenCalledTimes(2))
		expect(persistence.getSnapshot().save.status).toBe("saving")
		saves[1]?.resolve()
		await second

		const latest = await decodePersistenceEnvelope(stored[1] as JsonValue, {
			version: 1,
			mode: "document",
			codecs: [],
		})
		expect((latest.value as { values: Values }).values.name).toBe("newer")
		expect(persistence.getSnapshot().save.status).toBe("idle")
	})

	it("migrates, hydrates the actual input as one clean baseline, and rewrites immediately", async () => {
		const source = createForm([])
		source.setValue("name", "stored input")
		const oldEnvelope = await encodePersistenceEnvelope(
			getFormFeatureCapability(source).getDocument(),
			{ version: 1, mode: "document", codecs: [] },
		)
		const currentEnvelope = await encodePersistenceEnvelope(
			getFormFeatureCapability(source).getDocument(),
			{ version: 2, mode: "document", codecs: [] },
		)
		const currentPayload = (currentEnvelope as { payload: JsonValue }).payload
		const storage = createMemoryAdapter(oldEnvelope)
		const feature = createPersistenceMiddleware({
			adapter: storage.adapter,
			key: "draft",
			version: 2,
			migrate: async () => currentPayload,
		})
		const form = createForm([feature])
		const persistence = feature.handle(form)
		await expect(persistence.restore()).resolves.toBe("applied")
		expect(form.getSnapshot().values.name).toBe("stored input")
		expect(form.getSnapshot().values).not.toHaveProperty("normalized")
		expect(form.getSnapshot().isDirty).toBe(false)
		await persistence.flush()
		expect(storage.adapter.save).toHaveBeenCalledOnce()
	})

	it.each(["cancelled", "transformed", "runtime"] as const)(
		"reports %s hydration middleware outcomes without a second runtime transaction",
		async (outcome) => {
			const source = createForm([])
			source.setValue("name", "Stored")
			const stored = await encodePersistenceEnvelope(
				getFormFeatureCapability(source).getDocument(),
				{ version: 1, mode: "document", codecs: [] },
			)
			const adapter = createMemoryAdapter(stored)
			const middleware: FormMiddleware<Values, Context> =
				() => (next) => (transaction) => {
					if (transaction.type !== "document/restored") return next(transaction)
					if (outcome === "cancelled")
						return Object.freeze({ status: "cancelled" })
					if (outcome === "runtime") {
						return next({ type: "field/blurred", path: "name" })
					}
					return next({
						...transaction,
						document: createFormDocument(
							{ ...transaction.document.values, name: "Transformed" },
							transaction.document.rowIdentity,
						),
					})
				}
			const feature = createPersistenceMiddleware({
				adapter: adapter.adapter,
				key: outcome,
				version: 1,
			})
			const form = createForm([middleware, feature])
			const result = await feature.handle(form).restore()

			if (outcome === "transformed") {
				expect(result).toBe("transformed")
				expect(form.getSnapshot().values.name).toBe("Transformed")
				expect(form.getSnapshot().isDirty).toBe(false)
				expect(feature.handle(form).getSnapshot().phase).toBe("active")
			} else {
				expect(result).toBe(
					outcome === "cancelled" ? "cancelled" : "unavailable",
				)
				expect(form.getSnapshot().values.name).toBe("Ada")
				expect(feature.handle(form).getSnapshot().phase).toBe("idle")
			}
		},
	)

	it("persists and hydrates history with a safe sequence floor and exact dependency validation", async () => {
		const storage = createMemoryAdapter()
		const history = createHistoryMiddleware()
		const persistenceFeature = createPersistenceMiddleware({
			adapter: storage.adapter,
			key: "history",
			version: 1,
			history,
		})
		expect(() => createForm([persistenceFeature])).toThrow(
			/requires.*dependency/i,
		)
		const wrongHistory = createHistoryMiddleware()
		expect(() => createForm([wrongHistory, persistenceFeature])).toThrow(
			/requires.*dependency/i,
		)

		const source = createForm([persistenceFeature, history])
		const persistence = persistenceFeature.handle(source)
		persistence.start()
		for (let index = 0; index < 12; index++)
			source.setValue("name", `name-${index}`)
		await persistence.flush()
		const stored = storage.value

		const targetHistory = createHistoryMiddleware()
		const targetPersistence = createPersistenceMiddleware({
			adapter: createMemoryAdapter(stored).adapter,
			key: "history",
			version: 1,
			history: targetHistory,
		})
		const target = createForm([targetHistory, targetPersistence])
		await expect(targetPersistence.handle(target).restore()).resolves.toBe(
			"applied",
		)
		expect(target.getSnapshot().values.name).toBe("name-11")
		expect(targetHistory.handle(target).getSnapshot().length).toBe(0)
		target.setValue("name", "after hydration")
		const normalized = normalizeJournal(targetHistory.handle(target).export())
		expect(normalized.maxSequence).toBeGreaterThan(12)
	})

	it.each(["before", "after"] as const)(
		"observes one committed revision when placed %s middleware that throws after commit",
		async (position) => {
			const storage = createMemoryAdapter()
			const persistenceFeature = createPersistenceMiddleware({
				adapter: storage.adapter,
				key: position,
				version: 1,
			})
			const throwing: FormMiddleware<Values, Context> =
				() => (next) => (transaction) => {
					next(transaction)
					throw new Error(`post-commit-${position}`)
				}
			const middleware =
				position === "before"
					? [persistenceFeature, throwing]
					: [throwing, persistenceFeature]
			const form = createForm(middleware)
			const persistence = persistenceFeature.handle(form)
			persistence.start()
			expect(() => form.setValue("name", "Grace")).toThrow(
				`post-commit-${position}`,
			)
			expect(form.getSnapshot().values.name).toBe("Grace")
			expect(persistence.getSnapshot().save.status).toBe("scheduled")
			await persistence.flush()
			expect(storage.adapter.save).toHaveBeenCalledOnce()
		},
	)

	it("uses registered codecs and rejects malformed documents before live restore", async () => {
		const source = createForm([], {
			name: "Ada",
			when: new Date("2026-08-01T00:00:00Z"),
			items: [],
		})
		const envelope = await encodePersistenceEnvelope(
			getFormFeatureCapability(source).getDocument(),
			{ version: 1, mode: "document", codecs: [createDateCodec()] },
		)
		const storage = createMemoryAdapter(envelope)
		const feature = createPersistenceMiddleware({
			adapter: storage.adapter,
			key: "date",
			version: 1,
			codecs: [createDateCodec()],
		})
		const form = createForm([feature])
		await expect(feature.handle(form).restore()).resolves.toBe("applied")
		expect(form.getSnapshot().values.when).toEqual(
			new Date("2026-08-01T00:00:00Z"),
		)

		const decoded = await decodePersistenceEnvelope(envelope, {
			version: 1,
			mode: "document",
			codecs: [createDateCodec()],
		})
		;(decoded.value as { rowIdentity: Record<string, unknown> }).rowIdentity[
			"not..canonical"
		] = {
			keys: [],
			nextKeyIndex: 0,
		}
		const malformed = await encodePersistenceEnvelope(decoded.value, {
			version: 1,
			mode: "document",
			codecs: [createDateCodec()],
		})
		const malformedStorage = createMemoryAdapter(malformed)
		const malformedFeature = createPersistenceMiddleware({
			adapter: malformedStorage.adapter,
			key: "bad",
			version: 1,
			codecs: [createDateCodec()],
		})
		await expect(
			malformedFeature.handle(createForm([malformedFeature])).restore(),
		).rejects.toThrow(/canonical/i)
	})
})

function createForm(
	middleware: readonly unknown[],
	defaultValues: Values = { name: "Ada", items: [] },
) {
	const create = kit.createForm as unknown as (
		definition: unknown,
		options: {
			defaultValues: Values
			context: Context
			middleware: readonly unknown[]
		},
	) => TestForm
	return create(definition, {
		defaultValues,
		context: { locale: "en" },
		middleware,
	})
}

function createMemoryAdapter(initial?: JsonValue) {
	const storage: {
		value: JsonValue | undefined
		adapter: FormPersistenceAdapter
	} = {
		value: initial,
		adapter: undefined as unknown as FormPersistenceAdapter,
	}
	storage.adapter = {
		load: vi.fn(async () => storage.value),
		save: vi.fn(async (_key, value) => {
			storage.value = value
		}),
		remove: vi.fn(async () => {
			storage.value = undefined
		}),
	}
	return storage
}

function deferred<Value>() {
	let resolve!: (value: Value | PromiseLike<Value>) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<Value>((onResolve, onReject) => {
		resolve = onResolve
		reject = onReject
	})
	return { promise, resolve, reject }
}
