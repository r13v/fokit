import type { StandardSchemaV1 } from "@standard-schema/spec"
import { afterEach, describe, expect, it, vi } from "vitest"
import { getRowIdentityKeys } from "../core/array-state.js"
import { getFormFeatureCapability } from "../core/feature-protocol.js"
import { createFormDocument } from "../core/form-reducer.js"
import type { FormMiddleware } from "../core/middleware.js"
import { defineControl } from "../react/control.js"
import { createFormKit } from "../react/create-form-kit.js"
import {
	type FormInstance,
	type FormKitOwner,
	setFormControlValue,
} from "../react/form-instance.js"
import type { ReactUiPresentation } from "../react/slots.js"
import { createHistoryMiddleware, type HistoryFeature } from "./history.js"
import { replayJournal } from "./journal.js"

type Values = {
	name: string
	email: string
	when: Date
	pattern: RegExp
	items: { name: string; children: { value: string }[] }[]
}

type Context = { locale: string }
type Schema = StandardSchemaV1<Values>
type TestForm = FormInstance<
	Schema,
	Context,
	typeof kit.controls,
	ReactUiPresentation,
	FormKitOwner<typeof kit.controls, ReactUiPresentation>
>

const text = defineControl<string>({
	component: () => null,
	formData: { mode: "native" },
})
const kit = createFormKit({ controls: { text } })
const schema = createSchema()
const definition = kit.defineForm(schema).withContext<Context>({
	ui: [
		{ kind: "field", path: "name", control: "text" },
		{ kind: "field", path: "email", control: "text" },
		{
			kind: "array",
			path: "items",
			itemDefault: { name: "", children: [] },
			children: [
				{ kind: "field", path: "name", control: "text" },
				{
					kind: "array",
					path: "children",
					itemDefault: { value: "" },
					children: [{ kind: "field", path: "value", control: "text" }],
				},
			],
		},
	],
})

afterEach(() => {
	vi.useRealTimers()
})

describe("history middleware", () => {
	it("owns a stable per-form handle and rejects absent or duplicate history", () => {
		const first = createHistoryMiddleware()
		const second = createHistoryMiddleware()
		const form = createForm(first)

		expect(first.handle(form)).toBe(first.handle(form))
		expect(() => second.handle(form)).toThrow(/not configured/i)
		expect(() =>
			createForm(first, [first as unknown, second as unknown]),
		).toThrow(/at most one.*history/i)
	})

	it("navigates groups, truncates redo, preserves context, and clears without changing the dirty baseline", () => {
		const feature = createHistoryMiddleware()
		const form = createForm(feature)
		const history = feature.handle(form)
		form.setValue("name", "Grace")
		form.setValue("email", "grace@example.test")
		expect(history.getSnapshot()).toEqual({
			canUndo: true,
			canRedo: false,
			index: 2,
			length: 2,
		})

		form.replaceContext({ locale: "fr" })
		expect(history.undo()).toBe("applied")
		expect(form.getSnapshot().values.email).toBe("ada@example.test")
		expect(form.getSnapshot().context.locale).toBe("fr")
		expect(history.seek(0)).toBe("applied")
		expect(form.getSnapshot().values.name).toBe("Ada")
		expect(history.redo()).toBe("applied")
		form.setValue("name", "Lin")
		expect(history.getSnapshot().canRedo).toBe(false)

		expect(form.getSnapshot().isDirty).toBe(true)
		history.clear()
		expect(history.getSnapshot()).toEqual({
			canUndo: false,
			canRedo: false,
			index: 0,
			length: 0,
		})
		expect(form.getSnapshot().isDirty).toBe(true)
	})

	it("groups control edits until blur or timeout and keeps batches and structural actions atomic", () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-08-01T00:00:00Z"))
		const feature = createHistoryMiddleware({ groupWindow: 100 })
		const form = createForm(feature)
		const history = feature.handle(form)

		setFormControlValue(form, "name", "G")
		vi.advanceTimersByTime(50)
		setFormControlValue(form, "name", "Grace")
		expect(history.getSnapshot().length).toBe(1)
		form.blur("name")
		setFormControlValue(form, "name", "Gracie")
		expect(history.getSnapshot().length).toBe(2)
		vi.advanceTimersByTime(101)
		setFormControlValue(form, "name", "Ada")
		expect(history.getSnapshot().length).toBe(3)

		form.batch(() => {
			form.setValue("name", "Katherine")
			form.setValue("email", "katherine@example.test")
		})
		expect(history.getSnapshot().length).toBe(4)
		form.append("items", { name: "row", children: [] })
		expect(history.getSnapshot().length).toBe(5)
	})

	it("does not close a control group for a cancelled blur", () => {
		const cancelled = Object.freeze({ status: "cancelled" as const })
		const cancelBlur: FormMiddleware<Values, Context> =
			() => (next) => (transaction) =>
				transaction.type === "field/blurred" ? cancelled : next(transaction)
		const feature = createHistoryMiddleware()
		const form = createForm(feature, [cancelBlur, feature as unknown])
		const history = feature.handle(form)

		setFormControlValue(form, "name", "G")
		form.blur("name")
		setFormControlValue(form, "name", "Grace")
		expect(history.getSnapshot().length).toBe(1)
	})

	it("compacts only closed groups and keeps deterministic multi-checkpoint exports", () => {
		const feature = createHistoryMiddleware({ limit: 1 })
		const form = createForm(feature)
		const history = feature.handle(form)

		form.setValue("email", "grace@example.test")
		setFormControlValue(form, "name", "Grace")
		expect(history.getSnapshot().length).toBe(2)
		form.blur("name")
		expect(history.getSnapshot().length).toBe(1)

		const unlimitedFeature = createHistoryMiddleware()
		const unlimitedForm = createForm(unlimitedFeature)
		const unlimitedHistory = unlimitedFeature.handle(unlimitedForm)
		unlimitedForm.setValue("name", "Before reset")
		unlimitedForm.reset(defaults({ name: "Reset", items: [] }))
		unlimitedForm.setValue("name", "After reset")
		const journal = unlimitedHistory.export()
		expect(journal.segments.length).toBeGreaterThan(1)
		const replayed = replayJournal(journal, journal.cursor)
		expect(replayed.values.name).toBe("After reset")

		vi.useFakeTimers()
		const expiringFeature = createHistoryMiddleware({
			limit: 0,
			groupWindow: 100,
		})
		const expiringForm = createForm(expiringFeature)
		const expiringHistory = expiringFeature.handle(expiringForm)
		setFormControlValue(expiringForm, "name", "Active")
		expect(expiringHistory.getSnapshot().length).toBe(1)
		vi.advanceTimersByTime(100)
		expect(expiringHistory.getSnapshot().length).toBe(0)
	})

	it("checkpoints hydration, records DevTools restores, and keeps reset to the baseline undoable", () => {
		const feature = createHistoryMiddleware()
		const form = createForm(feature)
		const history = feature.handle(form)
		const capability = getFormFeatureCapability<Schema, Context>(form)

		form.setValue("name", "Grace")
		form.reset()
		expect(form.getSnapshot().values.name).toBe("Ada")
		expect(history.getSnapshot().length).toBe(2)
		expect(history.undo()).toBe("applied")
		expect(form.getSnapshot().values.name).toBe("Grace")

		const hydrated = createFormDocument(
			{ ...capability.getDocument().values, name: "Hydrated" },
			capability.getDocument().rowIdentity,
		)
		capability.restoreDocument(hydrated, "hydrate")
		expect(history.export().segments.length).toBe(2)
		expect(history.getSnapshot().length).toBe(0)

		const jumped = createFormDocument(
			{ ...hydrated.values, name: "DevTools" },
			hydrated.rowIdentity,
		)
		capability.restoreDocument(jumped, "devtools", "record")
		expect(history.getSnapshot()).toMatchObject({ index: 1, length: 1 })
		expect(history.undo()).toBe("applied")
		expect(form.getSnapshot().values.name).toBe("Hydrated")
	})

	it("replays nested arrays without defaults and isolates mutable native values on export", () => {
		const feature = createHistoryMiddleware()
		const form = createForm(feature)
		const history = feature.handle(form)

		form.append("items", { name: "parent", children: [{ value: "child" }] })
		form.append("items.0.children", { value: "second" })
		const firstExport = history.export()
		const replayed = replayJournal(firstExport, firstExport.cursor)
		expect(getRowIdentityKeys(replayed.rowIdentity, "items")).toEqual([
			"items:0",
		])
		expect(
			getRowIdentityKeys(replayed.rowIdentity, "items.0.children"),
		).toHaveLength(2)

		const exportedWhen =
			firstExport.segments[0]?.checkpoint.document.values.when
		const exportedPattern =
			firstExport.segments[0]?.checkpoint.document.values.pattern
		exportedWhen?.setUTCFullYear(1999)
		if (exportedPattern) exportedPattern.lastIndex = 20
		const secondExport = history.export()
		expect(
			secondExport.segments[0]?.checkpoint.document.values.when.getUTCFullYear(),
		).toBe(2026)
		expect(
			secondExport.segments[0]?.checkpoint.document.values.pattern.lastIndex,
		).toBe(2)
	})

	it("reconciles cancelled, runtime-only, and transformed restores without moving an incorrect cursor", () => {
		const cancelled = Object.freeze({ status: "cancelled" as const })
		let mode: "pass" | "cancel" | "runtime" | "transform" = "pass"
		const restorePolicy: FormMiddleware<Values, Context> =
			(api) => (next) => (transaction) => {
				if (transaction.type !== "document/restored" || mode === "pass") {
					return next(transaction)
				}
				if (mode === "cancel") return cancelled
				if (mode === "runtime") {
					return next({
						type: "runtime/replaced",
						context: api.getSnapshot().context,
						options: {
							disabled: false,
							readOnly: false,
							validation: {
								mode: "submit",
								revalidateMode: "change",
								asyncDebounceMs: 0,
							},
						},
						resolvedUi: api.getSnapshot().resolvedUi,
					})
				}
				return next({
					...transaction,
					document: createFormDocument(
						{ ...transaction.document.values, name: "Transformed" },
						transaction.document.rowIdentity,
					),
				})
			}
		const feature = createHistoryMiddleware()
		const form = createForm(feature, [restorePolicy, feature as unknown])
		const history = feature.handle(form)
		form.setValue("name", "Grace")

		mode = "cancel"
		expect(history.undo()).toBe("cancelled")
		expect(history.getSnapshot().index).toBe(1)
		mode = "runtime"
		expect(history.undo()).toBe("unavailable")
		expect(history.getSnapshot().index).toBe(1)
		mode = "transform"
		expect(history.undo()).toBe("transformed")
		expect(form.getSnapshot().values.name).toBe("Transformed")
		expect(history.getSnapshot()).toMatchObject({ index: 2, length: 2 })
	})

	it("imports only validated replayable journals and advances the event sequence floor", async () => {
		const sourceFeature = createHistoryMiddleware()
		const source = createForm(sourceFeature)
		source.setValue("name", "Imported")
		const exported = sourceFeature.handle(source).export()
		const highSequence = structuredClone(exported) as unknown as MutableJournal
		highSequence.segments[0].groups[0].events[0].sequence = 500

		const feature = createHistoryMiddleware()
		const form = createForm(feature)
		const history = feature.handle(form)
		expect(await history.import(highSequence)).toBe("applied")
		expect(form.getSnapshot().values.name).toBe("Imported")
		form.setValue("email", "next@example.test")
		const nextSequence = history
			.export()
			.segments.at(-1)
			?.groups.at(-1)
			?.events.at(-1)?.sequence
		expect(nextSequence).toBe(501)

		await expect(history.import({ ...exported, version: 99 })).rejects.toThrow(
			/version/i,
		)
		await expect(
			history.import({
				...exported,
				segments: [],
			}),
		).rejects.toThrow(/checkpoint/i)

		const invalidFeature = createHistoryMiddleware()
		const invalidSource = createForm(invalidFeature)
		invalidSource.setValue("name", "")
		await expect(
			history.import(invalidFeature.handle(invalidSource).export()),
		).rejects.toThrow(/valid schema input/i)
	})

	it("updates history before form publication and records commits despite post-commit errors in either middleware order", () => {
		for (const position of ["before", "after"] as const) {
			const feature = createHistoryMiddleware()
			const throwing: FormMiddleware<Values, Context> =
				() => (next) => (transaction) => {
					const result = next(transaction)
					if (transaction.type === "document/committed") {
						throw new Error(`post-commit-${position}`)
					}
					return result
				}
			const middleware =
				position === "before"
					? [feature as unknown, throwing]
					: [throwing, feature as unknown]
			const form = createForm(feature, middleware)
			const history = feature.handle(form)
			let observedLength = -1
			form.subscribe(
				(snapshot) => snapshot.values.name,
				() => {
					observedLength = history.getSnapshot().length
				},
			)

			expect(() => form.setValue("name", "Grace")).toThrow(
				`post-commit-${position}`,
			)
			expect(observedLength).toBe(1)
			expect(history.undo()).toBe("applied")
			expect(form.getSnapshot().values.name).toBe("Ada")
		}
	})
})

function createForm(
	feature: HistoryFeature,
	middleware: readonly unknown[] = [feature],
): TestForm {
	const create = kit.createForm as unknown as (
		definition: unknown,
		options: {
			defaultValues: Values
			context: Context
			middleware: readonly unknown[]
		},
	) => TestForm
	return create(definition, {
		defaultValues: defaults(),
		context: { locale: "en" },
		middleware,
	})
}

function defaults(overrides: Partial<Values> = {}): Values {
	return {
		name: "Ada",
		email: "ada@example.test",
		when: new Date("2026-08-01T00:00:00Z"),
		pattern: Object.assign(/ada/gi, { lastIndex: 2 }),
		items: [],
		...overrides,
	}
}

function createSchema(): Schema {
	return {
		"~standard": {
			version: 1,
			vendor: "history-test",
			validate(value) {
				const input = value as Values
				return input.name.length === 0
					? { issues: [{ message: "Name is required", path: ["name"] }] }
					: { value: input }
			},
		},
	}
}

type MutableJournal = {
	segments: {
		groups: { events: { sequence: number }[] }[]
	}[]
}
