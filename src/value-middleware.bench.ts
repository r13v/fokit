import { bench, describe } from "vitest"

import {
	createValueCoordinator,
	type FormMiddleware,
	type ValueTransaction,
} from "./value-middleware.js"

type BenchmarkValues = {
	fields: Record<string, string>
	mirror: string
}

const fieldCount = 40

const passThrough: FormMiddleware<BenchmarkValues> =
	() => (next) => (transaction) =>
		next(transaction.patches)

const deriveMirror: FormMiddleware<BenchmarkValues> =
	() => (next) => (transaction) =>
		next([
			...transaction.patches,
			{
				op: "replace",
				path: ["mirror"],
				value: transaction.nextValues.fields.field20,
			},
		])

function createEdit(
	middleware: readonly FormMiddleware<BenchmarkValues>[],
): () => void {
	let values: BenchmarkValues = {
		fields: Object.fromEntries(
			Array.from({ length: fieldCount }, (_, index) => [
				`field${index}`,
				index === 20 ? "A" : `Value ${index + 1}`,
			]),
		),
		mirror: "A",
	}
	const coordinator = createValueCoordinator({
		commit: (transaction: ValueTransaction<BenchmarkValues>) => {
			values = transaction.nextValues as BenchmarkValues
		},
		getContext: () => undefined,
		getValues: () => values,
		middleware,
	})

	return () => {
		coordinator.update((draft) => {
			draft.fields.field20 = values.fields.field20 === "A" ? "B" : "A"
		})
	}
}

describe("40-field managed text edit", () => {
	const editWithoutMiddleware = createEdit([])
	const editWithPassThrough = createEdit([passThrough])
	const editWithDerivedValue = createEdit([deriveMirror])

	bench("without configured middleware", editWithoutMiddleware)
	bench("with pass-through middleware", editWithPassThrough)
	bench("with one derived value", editWithDerivedValue)
})
