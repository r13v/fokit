import {
	cloneRowIdentityState,
	reduceRowIdentity,
	validateRowIdentity,
} from "./array-state.js"
import type {
	DocumentCommittedEvent,
	DocumentRestoredEvent,
	FormDocumentEvent,
	RowIdentityChange,
} from "./form-events.js"
import type { FormDocument } from "./form-model.js"
import { cloneAndFreezeValue, freezeFormValue } from "./form-state.js"
import {
	applyValueChanges,
	createSetChange,
	createUnsetChange,
	type NormalizedValueChange,
	type ValueChange,
} from "./transaction.js"
import { cloneValue } from "./value.js"

export function createFormDocument<Input>(
	values: Input,
	rowIdentity: FormDocument<Input>["rowIdentity"],
): FormDocument<Input> {
	const document = Object.freeze({
		values: cloneAndFreezeValue(values),
		rowIdentity: cloneRowIdentityState(rowIdentity),
	})
	validateRowIdentity(document.rowIdentity, document.values)
	return document
}

export function createDocumentCommittedEvent<Input>(options: {
	readonly sequence: number
	readonly source: DocumentCommittedEvent<Input>["source"]
	readonly changes: readonly ValueChange<Input>[]
	readonly rowIdentityChanges?: readonly RowIdentityChange[]
	readonly baseline?: DocumentCommittedEvent<Input>["baseline"]
}): DocumentCommittedEvent<Input> {
	assertSequence(options.sequence)
	return Object.freeze({
		type: "document/committed",
		sequence: options.sequence,
		source: options.source,
		changes: freezeValueChanges(options.changes),
		rowIdentityChanges: freezeRowIdentityChanges(
			options.rowIdentityChanges ?? [],
		),
		baseline: options.baseline ?? "preserved",
	})
}

export function createDocumentRestoredEvent<Input>(options: {
	readonly sequence: number
	readonly document: FormDocument<Input>
	readonly origin: DocumentRestoredEvent<Input>["origin"]
	readonly history: DocumentRestoredEvent<Input>["history"]
}): DocumentRestoredEvent<Input> {
	assertSequence(options.sequence)
	return Object.freeze({
		type: "document/restored",
		sequence: options.sequence,
		document: createFormDocument(
			options.document.values,
			options.document.rowIdentity,
		),
		origin: options.origin,
		history: options.history,
	})
}

export function reduceFormDocument<Input>(
	document: FormDocument<Input>,
	event: FormDocumentEvent<Input>,
): FormDocument<Input> {
	if (event.type === "document/restored") {
		return createFormDocument(event.document.values, event.document.rowIdentity)
	}

	const result = applyValueChanges(document.values, event.changes)
	const rowIdentity = reduceRowIdentity(
		document.rowIdentity,
		event.rowIdentityChanges,
	)
	const nextDocument = Object.freeze({
		values: freezeFormValue(result.values),
		rowIdentity,
	})
	validateRowIdentity(nextDocument.rowIdentity, nextDocument.values)
	return nextDocument
}

function freezeValueChanges<Input>(
	changes: readonly ValueChange<Input>[],
): readonly ValueChange<Input>[] {
	if (!Array.isArray(changes)) {
		throw new TypeError("Document changes must be an array")
	}

	return Object.freeze(
		changes.map((change) => {
			const normalized: NormalizedValueChange =
				change.type === "set"
					? createSetChange(change.path, cloneValue(change.value))
					: createUnsetChange(change.path)
			return freezeFormValue(normalized) as ValueChange<Input>
		}),
	)
}

function freezeRowIdentityChanges(
	changes: readonly RowIdentityChange[],
): readonly RowIdentityChange[] {
	if (!Array.isArray(changes)) {
		throw new TypeError("Row identity changes must be an array")
	}

	return Object.freeze(
		changes.map((change) => {
			if ("keys" in change) {
				return Object.freeze({
					...change,
					keys: Object.freeze([...change.keys]),
				})
			}
			if (change.type === "array/paths-reindexed") {
				return Object.freeze({
					...change,
					paths: Object.freeze(
						change.paths.map((pathChange: (typeof change.paths)[number]) =>
							Object.freeze({ ...pathChange }),
						),
					),
				})
			}
			return Object.freeze({ ...change })
		}),
	)
}

function assertSequence(sequence: number): void {
	if (!Number.isSafeInteger(sequence) || sequence < 0) {
		throw new TypeError(
			"Document event sequence must be a non-negative integer",
		)
	}
}
