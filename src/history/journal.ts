import { MAX_EVENT_SEQUENCE_FLOOR } from "../core/feature-protocol.js"
import type {
	DocumentCommitGrouping,
	DocumentCommittedEvent,
	DocumentRestoredEvent,
	FormDocumentEvent,
	RestoreOrigin,
	RowIdentityChange,
	UpdateSource,
} from "../core/form-events.js"
import type { FormDocument } from "../core/form-model.js"
import {
	createDocumentCommittedEvent,
	createDocumentRestoredEvent,
	createFormDocument,
	reduceFormDocument,
} from "../core/form-reducer.js"
import { formatPath } from "../core/path.js"

export const FORM_JOURNAL_VERSION = 1 as const

declare const journalCursorBrand: unique symbol

export type JournalCursor = Readonly<{
	readonly [journalCursorBrand]: true
}>

/**
 * An in-memory journal. Date and RegExp leaves are cloned when retained and
 * exported. File and other opaque leaves remain application-owned immutable
 * identities; persistence codecs own their serialized representation.
 */
export type FormJournal<Input> = Readonly<{
	version: typeof FORM_JOURNAL_VERSION
	segments: readonly Readonly<{
		checkpoint: Readonly<{
			sequence: number
			document: FormDocument<Input>
			cursor: JournalCursor
		}>
		groups: readonly Readonly<{
			events: readonly FormDocumentEvent<Input>[]
			cursor: JournalCursor
		}>[]
	}>[]
	cursor: JournalCursor
}>

type RuntimeCursor = JournalCursor & {
	readonly segment: number
	readonly index: number
}

export type JournalSegmentData<Input> = {
	readonly checkpoint: {
		readonly sequence: number
		readonly document: FormDocument<Input>
	}
	readonly groups: readonly {
		readonly events: readonly FormDocumentEvent<Input>[]
	}[]
}

export type NormalizedJournal<Input> = {
	readonly journal: FormJournal<Input>
	readonly maxSequence: number
	readonly cursor: RuntimeCursor
}

export function replayJournal<Input>(
	journal: FormJournal<Input>,
	cursor: JournalCursor,
): FormDocument<Input> {
	assertCursorBelongsToJournal(journal, cursor)
	const normalized = normalizeJournal<Input>(journal)
	const target = readCursor(cursor, "Replay cursor")
	return replayNormalizedJournal(normalized.journal, target)
}

export function normalizeJournal<Input>(
	input: unknown,
): NormalizedJournal<Input> {
	const source = readRecord(input, "Form journal")
	if (source.version !== FORM_JOURNAL_VERSION) {
		throw new TypeError(
			`Unsupported form journal version ${String(source.version)}`,
		)
	}
	if (!Array.isArray(source.segments) || source.segments.length === 0) {
		throw new TypeError(
			"Form journal must contain at least one checkpoint segment",
		)
	}

	let previousSequence = -1
	const data: JournalSegmentData<Input>[] = []
	for (const [segmentIndex, segmentInput] of source.segments.entries()) {
		const segment = readRecord(segmentInput, "Form journal segment")
		const checkpoint = readRecord(segment.checkpoint, "Form journal checkpoint")
		const checkpointSequence = readSequence(
			checkpoint.sequence,
			previousSequence,
		)
		previousSequence = checkpointSequence
		assertCursor(checkpoint.cursor, segmentIndex, 0, "Checkpoint cursor")
		const checkpointDocument = readDocument<Input>(checkpoint.document)
		if (!Array.isArray(segment.groups)) {
			throw new TypeError("Form journal segment groups must be an array")
		}

		let document = checkpointDocument
		const groups: { events: readonly FormDocumentEvent<Input>[] }[] = []
		for (const [groupIndex, groupInput] of segment.groups.entries()) {
			const group = readRecord(groupInput, "Form journal group")
			if (!Array.isArray(group.events) || group.events.length === 0) {
				throw new TypeError(
					"Form journal groups must contain at least one event",
				)
			}
			assertCursor(group.cursor, segmentIndex, groupIndex + 1, "Group cursor")
			const events: FormDocumentEvent<Input>[] = []
			for (const eventInput of group.events) {
				const event = readDocumentEvent<Input>(eventInput)
				readSequence(event.sequence, previousSequence)
				previousSequence = event.sequence
				document = reduceFormDocument(document, event)
				events.push(event)
			}
			groups.push({ events: Object.freeze(events) })
		}
		data.push({
			checkpoint: {
				sequence: checkpointSequence,
				document: checkpointDocument,
			},
			groups: Object.freeze(groups),
		})
	}

	const current = readCursor(source.cursor, "Form journal cursor")
	const lastSegmentIndex = data.length - 1
	if (current.segment !== lastSegmentIndex) {
		throw new TypeError(
			"Form journal cursor must target the latest checkpoint segment",
		)
	}
	const lastSegment = data[lastSegmentIndex]
	if (
		lastSegment === undefined ||
		current.index < 0 ||
		current.index > lastSegment.groups.length
	) {
		throw new TypeError("Form journal cursor is outside its checkpoint segment")
	}

	const journal = createFormJournal(data, current.index)
	return {
		journal,
		maxSequence: previousSequence,
		cursor: journal.cursor as RuntimeCursor,
	}
}

export function assertLiveEventSequenceHeadroom(maxSequence: number): void {
	if (maxSequence >= MAX_EVENT_SEQUENCE_FLOOR) {
		throw new TypeError(
			"Form journal sequences must reserve safe-integer headroom for live events",
		)
	}
}

export function validateJournalDocuments<Input>(
	journal: FormJournal<Input>,
	validateDocument: (document: FormDocument<Input>) => void,
): void {
	for (const segment of journal.segments) {
		let document = segment.checkpoint.document
		validateDocument(document)
		for (const group of segment.groups) {
			for (const event of group.events) {
				document = reduceFormDocument(document, event)
				validateDocument(document)
			}
		}
	}
}

export function createFormJournal<Input>(
	segments: readonly JournalSegmentData<Input>[],
	index: number,
): FormJournal<Input> {
	if (segments.length === 0) {
		throw new TypeError("Form journal requires a checkpoint")
	}
	const lastSegmentIndex = segments.length - 1
	const lastSegment = segments[lastSegmentIndex]
	if (
		lastSegment === undefined ||
		!Number.isSafeInteger(index) ||
		index < 0 ||
		index > lastSegment.groups.length
	) {
		throw new TypeError("Form journal index is outside the latest segment")
	}

	const clonedSegments = segments.map((segment, segmentIndex) =>
		Object.freeze({
			checkpoint: Object.freeze({
				sequence: segment.checkpoint.sequence,
				document: cloneDocument(segment.checkpoint.document),
				cursor: createCursor(segmentIndex, 0),
			}),
			groups: Object.freeze(
				segment.groups.map((group, groupIndex) =>
					Object.freeze({
						events: Object.freeze(group.events.map(cloneDocumentEvent)),
						cursor: createCursor(segmentIndex, groupIndex + 1),
					}),
				),
			),
		}),
	)
	const cursor =
		index === 0
			? clonedSegments[lastSegmentIndex]?.checkpoint.cursor
			: clonedSegments[lastSegmentIndex]?.groups[index - 1]?.cursor
	if (cursor === undefined) {
		throw new TypeError("Form journal cursor could not be created")
	}
	return Object.freeze({
		version: FORM_JOURNAL_VERSION,
		segments: Object.freeze(clonedSegments),
		cursor,
	})
}

export function cloneDocument<Input>(
	document: FormDocument<Input>,
): FormDocument<Input> {
	return createFormDocument(document.values, document.rowIdentity)
}

export function cloneDocumentEvent<Input>(
	event: FormDocumentEvent<Input>,
): FormDocumentEvent<Input> {
	return event.type === "document/committed"
		? createDocumentCommittedEvent({
				sequence: event.sequence,
				source: event.source,
				grouping: event.grouping,
				changes: event.changes,
				rowIdentityChanges: event.rowIdentityChanges,
				baseline: event.baseline,
			})
		: createDocumentRestoredEvent({
				sequence: event.sequence,
				document: event.document,
				origin: event.origin,
				history: event.history,
			})
}

export function replayNormalizedJournal<Input>(
	journal: FormJournal<Input>,
	cursor: JournalCursor,
): FormDocument<Input> {
	const target = readCursor(cursor, "Replay cursor")
	const segment = journal.segments[target.segment]
	if (segment === undefined || target.index > segment.groups.length) {
		throw new TypeError("Replay cursor does not belong to this form journal")
	}
	let document = cloneDocument(segment.checkpoint.document)
	for (const group of segment.groups.slice(0, target.index)) {
		for (const event of group.events) {
			document = reduceFormDocument(document, event)
		}
	}
	return document
}

function readDocument<Input>(input: unknown): FormDocument<Input> {
	const document = readRecord(input, "Form journal document")
	if (!("values" in document) || !("rowIdentity" in document)) {
		throw new TypeError(
			"Form journal document is missing values or row identity",
		)
	}
	const rowIdentity = readRecord(
		document.rowIdentity,
		"Form journal row identity",
	)
	for (const [path, entryInput] of Object.entries(rowIdentity)) {
		assertCanonicalPath(path, "Row identity path")
		const entry = readRecord(entryInput, "Row identity entry")
		if (
			!Array.isArray(entry.keys) ||
			!entry.keys.every((key) => typeof key === "string") ||
			!Number.isSafeInteger(entry.nextKeyIndex) ||
			(entry.nextKeyIndex as number) < entry.keys.length
		) {
			throw new TypeError("Form journal row identity entry is invalid")
		}
	}
	return createFormDocument(
		document.values as Input,
		rowIdentity as FormDocument<Input>["rowIdentity"],
	)
}

function readDocumentEvent<Input>(input: unknown): FormDocumentEvent<Input> {
	const event = readRecord(input, "Form journal event")
	if (event.type === "document/committed") {
		const source = readEnum<UpdateSource>(
			event.source,
			["array", "control", "imperative", "reset", "valuePolicy"],
			"document event source",
		)
		const baseline = readEnum<DocumentCommittedEvent<Input>["baseline"]>(
			event.baseline,
			["preserved", "replaced"],
			"document event baseline",
		)
		if (
			!Array.isArray(event.changes) ||
			!Array.isArray(event.rowIdentityChanges)
		) {
			throw new TypeError("Committed document event changes must be arrays")
		}
		for (const change of event.changes) {
			const candidate = readRecord(change, "Document value change")
			assertCanonicalPath(candidate.path, "Document value change path")
			if (candidate.type !== "set" && candidate.type !== "unset") {
				throw new TypeError("Unsupported document value change")
			}
			if (candidate.type === "set" && !("value" in candidate)) {
				throw new TypeError("Set document value change is missing its value")
			}
		}
		for (const change of event.rowIdentityChanges) {
			assertCanonicalRowIdentityChange(change)
		}
		return createDocumentCommittedEvent({
			sequence: readSequence(event.sequence),
			source,
			grouping: readGrouping(event.grouping),
			changes: event.changes as DocumentCommittedEvent<Input>["changes"],
			rowIdentityChanges:
				event.rowIdentityChanges as readonly RowIdentityChange[],
			baseline,
		})
	}
	if (event.type === "document/restored") {
		return createDocumentRestoredEvent({
			sequence: readSequence(event.sequence),
			document: readDocument<Input>(event.document),
			origin: readEnum<RestoreOrigin>(
				event.origin,
				["undo", "redo", "replay", "hydrate", "devtools"],
				"restore origin",
			),
			history: readEnum<DocumentRestoredEvent<Input>["history"]>(
				event.history,
				["skip", "record"],
				"restore history mode",
			),
		})
	}
	throw new TypeError("Form journal may contain only document events")
}

function readGrouping(input: unknown): DocumentCommitGrouping {
	const grouping = readRecord(input, "Document event grouping")
	if (grouping.type === "single" || grouping.type === "batch") {
		return { type: grouping.type }
	}
	if (grouping.type === "control") {
		return {
			type: "control",
			path: assertCanonicalPath(grouping.path, "Control grouping path"),
		}
	}
	throw new TypeError("Unsupported document event grouping")
}

function assertCanonicalRowIdentityChange(input: unknown): void {
	const change = readRecord(input, "Row identity change")
	switch (change.type) {
		case "array/initialized":
		case "array/replaced":
			assertCanonicalPath(change.path, "Row identity path")
			assertKeys(change.keys)
			assertCounter(change.nextKeyIndex)
			return
		case "array/inserted":
			assertCanonicalPath(change.path, "Row identity path")
			assertIndex(change.index)
			assertString(change.key, "Row identity key")
			assertCounter(change.nextKeyIndex)
			return
		case "array/removed":
			assertCanonicalPath(change.path, "Row identity path")
			assertIndex(change.index)
			assertString(change.key, "Row identity key")
			return
		case "array/moved":
			assertCanonicalPath(change.path, "Row identity path")
			assertIndex(change.from)
			assertIndex(change.to)
			assertString(change.key, "Row identity key")
			return
		case "array/path-reindexed":
			assertCanonicalPath(change.previousPath, "Previous row identity path")
			assertCanonicalPath(change.path, "Row identity path")
			return
		case "array/paths-reindexed":
			if (!Array.isArray(change.paths) || change.paths.length === 0) {
				throw new TypeError(
					"Reindexed row identity paths must be a non-empty array",
				)
			}
			for (const item of change.paths) {
				const pathChange = readRecord(item, "Reindexed row identity path")
				assertCanonicalPath(pathChange.path, "Row identity path")
				assertCanonicalPath(
					pathChange.previousPath,
					"Previous row identity path",
				)
			}
			return
		case "array/deleted":
			assertCanonicalPath(change.path, "Row identity path")
			return
		default:
			throw new TypeError(
				`Unsupported row identity change ${String(change.type)}`,
			)
	}
}

function assertKeys(input: unknown): void {
	if (!Array.isArray(input) || !input.every((key) => typeof key === "string")) {
		throw new TypeError("Row identity keys must be an array of strings")
	}
}

function assertCounter(input: unknown): void {
	if (!Number.isSafeInteger(input) || (input as number) < 0) {
		throw new TypeError("Row identity counter must be a non-negative integer")
	}
}

function assertIndex(input: unknown): void {
	if (!Number.isSafeInteger(input) || (input as number) < 0) {
		throw new TypeError("Row identity index must be a non-negative integer")
	}
}

function assertString(input: unknown, label: string): string {
	if (typeof input !== "string")
		throw new TypeError(`${label} must be a string`)
	return input
}

function assertCanonicalPath(input: unknown, label: string): string {
	if (typeof input !== "string" || formatPath(input) !== input) {
		throw new TypeError(`${label} must be canonical`)
	}
	return input
}

function readCursor(input: unknown, label: string): RuntimeCursor {
	const cursor = readRecord(input, label)
	if (
		!Number.isSafeInteger(cursor.segment) ||
		(cursor.segment as number) < 0 ||
		!Number.isSafeInteger(cursor.index) ||
		(cursor.index as number) < 0
	) {
		throw new TypeError(`${label} is invalid`)
	}
	return cursor as RuntimeCursor
}

function assertCursor(
	input: unknown,
	segment: number,
	index: number,
	label: string,
): void {
	const cursor = readCursor(input, label)
	if (cursor.segment !== segment || cursor.index !== index) {
		throw new TypeError(`${label} does not match its journal position`)
	}
}

function createCursor(segment: number, index: number): RuntimeCursor {
	return Object.freeze({ segment, index }) as RuntimeCursor
}

function assertCursorBelongsToJournal<Input>(
	journal: FormJournal<Input>,
	cursor: JournalCursor,
): void {
	for (const segment of journal.segments) {
		if (segment.checkpoint.cursor === cursor) return
		if (segment.groups.some((group) => group.cursor === cursor)) return
	}
	throw new TypeError("Replay cursor does not belong to this form journal")
}

function readSequence(input: unknown, previous?: number): number {
	if (!Number.isSafeInteger(input) || (input as number) < 0) {
		throw new TypeError(
			"Form journal sequences must be safe non-negative integers",
		)
	}
	const sequence = input as number
	if (previous !== undefined && sequence <= previous) {
		throw new TypeError(
			"Form journal sequences must be strictly increasing and unique",
		)
	}
	return sequence
}

function readEnum<Value extends string>(
	input: unknown,
	values: readonly Value[],
	label: string,
): Value {
	if (!values.includes(input as Value)) {
		throw new TypeError(`Unsupported ${label} ${String(input)}`)
	}
	return input as Value
}

function readRecord(input: unknown, label: string): Record<string, unknown> {
	if (typeof input !== "object" || input === null || Array.isArray(input)) {
		throw new TypeError(`${label} must be an object`)
	}
	return input as Record<string, unknown>
}
