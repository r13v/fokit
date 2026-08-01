import {
	attachFormFeatureMetadata,
	type FormFeatureCapability,
	getFormFeatureCapability,
} from "../core/feature-protocol.js"
import type { FormDocumentEvent, FormEvent } from "../core/form-events.js"
import type { FormDocument } from "../core/form-model.js"
import {
	areFormDocumentsEqual,
	reduceFormDocument,
} from "../core/form-reducer.js"
import type { FormStore } from "../core/form-store.js"
import type { FormTransactionDispatch } from "../core/form-transactions.js"
import type {
	FormAgnosticMiddleware,
	FormMiddlewareApi,
} from "../core/middleware.js"
import type { FormInput, StandardSchema } from "../core/standard-schema.js"
import {
	assertLiveEventSequenceHeadroom,
	cloneDocument,
	cloneDocumentEvent,
	createFormJournal,
	type FormJournal,
	type JournalCursor,
	type NormalizedJournal,
	normalizeJournal,
	replayNormalizedJournal,
	validateJournalDocuments,
} from "./journal.js"

export type HistorySnapshot = Readonly<{
	canUndo: boolean
	canRedo: boolean
	index: number
	length: number
}>

export type HistoryOperationResult =
	| "applied"
	| "unavailable"
	| "cancelled"
	| "transformed"

export type HistoryHandle<Input> = Readonly<{
	getSnapshot(): HistorySnapshot
	subscribe(listener: () => void): () => void
	undo(): HistoryOperationResult
	redo(): HistoryOperationResult
	seek(index: number): HistoryOperationResult
	clear(): void
	export(): FormJournal<Input>
	import(journal: unknown): Promise<HistoryOperationResult>
}>

export type CreateHistoryOptions = Readonly<{
	limit?: number
	groupWindow?: number
}>

export type HistoryFeature = FormAgnosticMiddleware & {
	readonly handle: <Schema extends StandardSchema, Context = unknown>(
		form: FormStore<Schema, Context>,
	) => HistoryHandle<FormInput<Schema>>
}

export type HistoryPersistenceBridge<Input> = Readonly<{
	export(): FormJournal<Input>
	stageHydration(journal?: NormalizedJournal<Input>): void
	markHydrationRoot(event: FormEvent<Input, unknown>): void
	cancelHydration(): void
}>

const historyPersistenceBridgeKey = Symbol.for(
	"form-please.history-persistence-bridge",
)

type HistoryPersistenceBridgeHost = {
	readonly [historyPersistenceBridgeKey]?: (
		target: object,
	) => HistoryPersistenceBridge<unknown> | undefined
}

type HistoryGroup<Input> = {
	events: FormDocumentEvent<Input>[]
	document: FormDocument<Input>
	controlPath?: string
	lastControlTime?: number
}

type HistorySegment<Input> = {
	checkpoint: {
		sequence: number
		document: FormDocument<Input>
	}
	groups: HistoryGroup<Input>[]
}

type PendingRestore<Input> = {
	readonly target: FormDocument<Input>
	readonly onApplied: () => void
	event?: FormEvent<Input, unknown>
	outcome?: HistoryOperationResult
}

type HistoryCapability<Input, Context> = FormFeatureCapability<
	StandardSchema<Input>,
	Context
>

export function createHistoryMiddleware(
	options: CreateHistoryOptions = {},
): HistoryFeature {
	const limit = normalizeLimit(options.limit)
	const groupWindow = normalizeGroupWindow(options.groupWindow)
	const states = new WeakMap<object, HistoryState<unknown, unknown>>()

	const feature = (<Input, Context>(api: FormMiddlewareApi<Input, Context>) => {
		const capability = getFormFeatureCapability<StandardSchema<Input>, Context>(
			api,
		)
		const state = new HistoryState(capability, limit, groupWindow)
		states.set(capability, state as HistoryState<unknown, unknown>)
		return (next: FormTransactionDispatch<Input, Context>) =>
			(transaction: Parameters<typeof next>[0]) =>
				next(transaction)
	}) as unknown as HistoryFeature

	Object.defineProperty(feature, "handle", {
		enumerable: true,
		value(form: object) {
			const capability = getFormFeatureCapability(form)
			const state = states.get(capability)
			if (state === undefined) {
				throw new TypeError(
					"This history feature is not configured for the supplied form",
				)
			}
			return state.handle
		},
	})
	Object.defineProperty(feature, historyPersistenceBridgeKey, {
		value(target: object) {
			const capability = getFormFeatureCapability(target)
			return states.get(capability)?.persistenceBridge
		},
	})
	attachFormFeatureMetadata(feature, {
		kind: "history",
		feature,
	})
	return Object.freeze(feature)
}

export function getHistoryPersistenceBridge<Input>(
	feature: HistoryFeature,
	target: object,
): HistoryPersistenceBridge<Input> {
	const bridge = (feature as HistoryPersistenceBridgeHost)[
		historyPersistenceBridgeKey
	]?.(target)
	if (bridge === undefined) {
		throw new TypeError(
			"The configured history dependency is not initialized for this form",
		)
	}
	return bridge as HistoryPersistenceBridge<Input>
}

class HistoryState<Input, Context> {
	readonly handle: HistoryHandle<Input>
	readonly persistenceBridge: HistoryPersistenceBridge<Input>
	readonly #capability: HistoryCapability<Input, Context>
	readonly #limit: number
	readonly #groupWindow: number
	readonly #listeners = new Set<() => void>()
	#segments: HistorySegment<Input>[]
	#activeGroup: HistoryGroup<Input> | undefined
	#groupTimer: ReturnType<typeof setTimeout> | undefined
	#cursor = 0
	#lastSequence = 0
	#snapshot: HistorySnapshot = createHistorySnapshot(0, 0)
	#journalRevision = 0
	#pendingRestore: PendingRestore<Input> | undefined
	#pendingHydration:
		| {
				normalized: NormalizedJournal<Input> | undefined
				event?: FormEvent<Input, unknown>
		  }
		| undefined

	constructor(
		capability: HistoryCapability<Input, Context>,
		limit: number,
		groupWindow: number,
	) {
		this.#capability = capability
		this.#limit = limit
		this.#groupWindow = groupWindow
		this.#segments = [
			{
				checkpoint: {
					sequence: 0,
					document: cloneDocument(capability.getDocument()),
				},
				groups: [],
			},
		]
		capability.subscribeFinalized((notification) => {
			this.#finalize(notification.event, notification.document)
		})
		this.handle = Object.freeze({
			getSnapshot: () => this.#snapshot,
			subscribe: (listener) => this.#subscribe(listener),
			undo: () => this.#navigate(-1, "undo"),
			redo: () => this.#navigate(1, "redo"),
			seek: (index) => this.#seek(index),
			clear: () => this.#clear(),
			export: () => this.#export(),
			import: (journal) => this.#import(journal),
		})
		this.persistenceBridge = Object.freeze({
			export: () => this.#export(),
			stageHydration: (journal) => this.#stageHydration(journal),
			markHydrationRoot: (event) => {
				if (this.#pendingHydration !== undefined) {
					this.#pendingHydration.event = event
				}
			},
			cancelHydration: () => {
				this.#pendingHydration = undefined
			},
		})
	}

	#subscribe(listener: () => void): () => void {
		if (typeof listener !== "function") {
			throw new TypeError("History listener must be a function")
		}
		this.#listeners.add(listener)
		let subscribed = true
		return () => {
			if (!subscribed) return
			subscribed = false
			this.#listeners.delete(listener)
		}
	}

	#finalize(
		event: FormEvent<Input, Context>,
		document: FormDocument<Input>,
	): void {
		this.#lastSequence = Math.max(this.#lastSequence, event.sequence)
		const hydration = this.#pendingHydration
		if (hydration?.event === event) {
			this.#pendingHydration = undefined
			if (
				event.type === "document/committed" ||
				event.type === "document/restored"
			) {
				let checkpointSequence = event.sequence
				if (hydration.normalized !== undefined) {
					this.#installJournal(hydration.normalized.journal)
					checkpointSequence = Math.max(
						event.sequence,
						hydration.normalized.maxSequence + 1,
					)
					this.#capability.advanceEventSequenceFloor(checkpointSequence)
				}
				this.#appendCheckpoint(checkpointSequence, document)
			}
			return
		}
		const pending = this.#pendingRestore
		if (pending?.event === event) {
			this.#pendingRestore = undefined
			if (
				(event.type === "document/committed" ||
					event.type === "document/restored") &&
				areFormDocumentsEqual(document, pending.target)
			) {
				pending.outcome = "applied"
				pending.onApplied()
				return
			}
			if (
				event.type === "document/committed" ||
				event.type === "document/restored"
			) {
				pending.outcome = "transformed"
				this.#recordSingleEvent(event, document)
				return
			}
			pending.outcome = "unavailable"
			return
		}

		if (event.type === "field/blurred") {
			if (this.#activeGroup?.controlPath === event.path) {
				this.#closeActiveGroup()
			}
			return
		}
		if (event.type === "runtime/reset" && event.baseline === "replaced") {
			this.#appendCheckpoint(event.sequence, document)
			return
		}
		if (event.type === "document/committed") {
			if (event.baseline === "replaced") {
				this.#appendCheckpoint(event.sequence, document)
				return
			}
			this.#recordCommittedEvent(event, document)
			return
		}
		if (event.type !== "document/restored") return
		if (event.origin === "hydrate") {
			this.#appendCheckpoint(event.sequence, document)
			return
		}
		if (event.history === "record") {
			this.#recordSingleEvent(event, document)
		}
	}

	#stageHydration(normalized?: NormalizedJournal<Input>): void {
		if (this.#pendingHydration !== undefined) {
			throw new TypeError("History hydration is already pending")
		}
		this.#pendingHydration = {
			normalized,
		}
	}

	#recordCommittedEvent(
		event: Extract<FormDocumentEvent<Input>, { type: "document/committed" }>,
		document: FormDocument<Input>,
	): void {
		if (event.grouping.type !== "control") {
			this.#recordSingleEvent(event, document)
			return
		}

		const now = Date.now()
		const active = this.#activeGroup
		if (
			active !== undefined &&
			active.controlPath === event.grouping.path &&
			(this.#groupWindow === 0 ||
				now - (active.lastControlTime ?? now) <= this.#groupWindow)
		) {
			active.events.push(cloneDocumentEvent(event))
			active.document = cloneDocument(document)
			active.lastControlTime = now
			this.#scheduleGroupExpiration()
			return
		}

		this.#closeActiveGroup(false)
		this.#truncateRedo()
		const group: HistoryGroup<Input> = {
			events: [cloneDocumentEvent(event)],
			document: cloneDocument(document),
			controlPath: event.grouping.path,
			lastControlTime: now,
		}
		this.#latestSegment().groups.push(group)
		this.#activeGroup = group
		this.#cursor = this.#latestSegment().groups.length
		this.#scheduleGroupExpiration()
		this.#updateSnapshot()
	}

	#recordSingleEvent(
		event: FormDocumentEvent<Input>,
		document: FormDocument<Input>,
	): void {
		this.#closeActiveGroup(false)
		this.#truncateRedo()
		this.#latestSegment().groups.push({
			events: [cloneDocumentEvent(event)],
			document: cloneDocument(document),
		})
		this.#cursor = this.#latestSegment().groups.length
		this.#compact()
		this.#updateSnapshot()
	}

	#appendCheckpoint(sequence: number, document: FormDocument<Input>): void {
		this.#closeActiveGroup(false)
		this.#segments.push({
			checkpoint: { sequence, document: cloneDocument(document) },
			groups: [],
		})
		this.#cursor = 0
		this.#activeGroup = undefined
		this.#journalRevision++
		this.#compact()
		this.#updateSnapshot()
	}

	#closeActiveGroup(update = true): void {
		if (this.#activeGroup === undefined) return
		if (this.#groupTimer !== undefined) clearTimeout(this.#groupTimer)
		this.#groupTimer = undefined
		this.#activeGroup = undefined
		this.#journalRevision++
		this.#compact()
		if (update) this.#updateSnapshot()
	}

	#scheduleGroupExpiration(): void {
		if (this.#groupWindow === 0) return
		if (this.#groupTimer !== undefined) clearTimeout(this.#groupTimer)
		this.#groupTimer = setTimeout(() => {
			this.#groupTimer = undefined
			this.#closeActiveGroup()
		}, this.#groupWindow)
	}

	#truncateRedo(): void {
		const segment = this.#latestSegment()
		if (this.#cursor < segment.groups.length) {
			segment.groups.splice(this.#cursor)
		}
	}

	#compact(): void {
		if (this.#limit === Number.POSITIVE_INFINITY) return
		while (this.#closedGroupCount() > this.#limit) {
			const segmentIndex = this.#segments.findIndex((segment) =>
				segment.groups.some((group) => group !== this.#activeGroup),
			)
			if (segmentIndex === -1) return
			const segment = this.#segments[segmentIndex]
			if (segment === undefined) return
			const groupIndex = segment.groups.findIndex(
				(group) => group !== this.#activeGroup,
			)
			const group = segment.groups[groupIndex]
			if (group === undefined) return
			const compactingLatestSegment = segmentIndex === this.#segments.length - 1
			const remaining = segment.groups.slice(groupIndex + 1)
			if (remaining.length === 0 && this.#segments[segmentIndex + 1]) {
				this.#segments.splice(0, segmentIndex + 1)
				continue
			}
			this.#segments.splice(0, segmentIndex + 1, {
				checkpoint: {
					sequence:
						group.events.at(-1)?.sequence ?? segment.checkpoint.sequence,
					document: cloneDocument(group.document),
				},
				groups: remaining,
			})
			if (compactingLatestSegment) {
				this.#cursor = Math.max(0, this.#cursor - (groupIndex + 1))
			}
		}
	}

	#closedGroupCount(): number {
		let count = 0
		for (const segment of this.#segments) {
			for (const group of segment.groups) {
				if (group !== this.#activeGroup) count++
			}
		}
		return count
	}

	#navigate(offset: -1 | 1, origin: "undo" | "redo"): HistoryOperationResult {
		this.#closeActiveGroup()
		const index = this.#cursor + offset
		if (index < 0 || index > this.#latestSegment().groups.length) {
			return "unavailable"
		}
		return this.#restore(this.#documentAt(index), origin, () => {
			this.#cursor = index
			this.#updateSnapshot()
		})
	}

	#seek(index: number): HistoryOperationResult {
		if (!Number.isSafeInteger(index)) {
			throw new TypeError("History seek index must be an integer")
		}
		const cursorBeforeClose = this.#cursor
		this.#closeActiveGroup()
		const translatedIndex = index - (cursorBeforeClose - this.#cursor)
		if (
			translatedIndex < 0 ||
			translatedIndex > this.#latestSegment().groups.length
		) {
			return "unavailable"
		}
		const origin = translatedIndex < this.#cursor ? "undo" : "redo"
		return this.#restore(this.#documentAt(translatedIndex), origin, () => {
			this.#cursor = translatedIndex
			this.#updateSnapshot()
		})
	}

	#restore(
		target: FormDocument<Input>,
		origin: "undo" | "redo" | "replay",
		onApplied: () => void,
	): HistoryOperationResult {
		if (this.#pendingRestore !== undefined) return "unavailable"
		const pending: PendingRestore<Input> = {
			target,
			onApplied,
		}
		this.#pendingRestore = pending
		try {
			const result = this.#capability.restoreDocument(
				target,
				origin,
				undefined,
				({ event }) => {
					if (this.#pendingRestore === pending) {
						pending.event = event as FormEvent<Input, unknown>
					}
				},
			)
			if (result.status === "cancelled") return "cancelled"
			return pending.outcome ?? "unavailable"
		} finally {
			if (this.#pendingRestore === pending) this.#pendingRestore = undefined
		}
	}

	#documentAt(index: number): FormDocument<Input> {
		const segment = this.#latestSegment()
		return index === 0
			? cloneDocument(segment.checkpoint.document)
			: cloneDocument(
					segment.groups[index - 1]?.document ?? segment.checkpoint.document,
				)
	}

	#clear(): void {
		if (this.#groupTimer !== undefined) clearTimeout(this.#groupTimer)
		this.#groupTimer = undefined
		this.#segments = [
			{
				checkpoint: {
					sequence: this.#lastSequence,
					document: cloneDocument(this.#capability.getDocument()),
				},
				groups: [],
			},
		]
		this.#activeGroup = undefined
		this.#cursor = 0
		this.#journalRevision++
		this.#updateSnapshot()
	}

	#export(): FormJournal<Input> {
		return createFormJournal(this.#segments, this.#cursor)
	}

	async #import(input: unknown): Promise<HistoryOperationResult> {
		const normalized = normalizeJournal<Input>(input)
		assertLiveEventSequenceHeadroom(normalized.maxSequence)
		validateJournalDocuments(
			normalized.journal,
			this.#capability.validateDocument,
		)
		const target = replayNormalizedJournal(
			normalized.journal,
			normalized.cursor,
		)
		const documentBeforeValidation = this.#capability.getDocument()
		const journalRevisionBeforeValidation = this.#journalRevision
		const validation = await this.#capability.validateRestoredInput(
			target.values,
		)
		if (!validation.success) {
			throw new TypeError(
				"Imported form journal does not contain valid schema input",
			)
		}
		if (
			this.#capability.getDocument() !== documentBeforeValidation ||
			this.#journalRevision !== journalRevisionBeforeValidation
		) {
			return "unavailable"
		}
		return this.#restore(target, "replay", () => {
			this.#capability.advanceEventSequenceFloor(normalized.maxSequence)
			this.#installJournal(normalized.journal)
		})
	}

	#installJournal(journal: FormJournal<Input>): void {
		if (this.#groupTimer !== undefined) clearTimeout(this.#groupTimer)
		this.#groupTimer = undefined
		const runtimeCursor = journal.cursor as JournalCursor & {
			readonly index: number
		}
		this.#segments = journal.segments.map((segment) => {
			let document = cloneDocument(segment.checkpoint.document)
			return {
				checkpoint: {
					sequence: segment.checkpoint.sequence,
					document,
				},
				groups: segment.groups.map((group) => {
					for (const event of group.events) {
						document = reduceFormDocument(document, event)
					}
					return {
						events: group.events.map(cloneDocumentEvent),
						document: cloneDocument(document),
					}
				}),
			}
		})
		this.#cursor = runtimeCursor.index
		this.#lastSequence = Math.max(
			this.#lastSequence,
			lastJournalSequence(journal),
		)
		this.#activeGroup = undefined
		this.#journalRevision++
		this.#updateSnapshot()
	}

	#latestSegment(): HistorySegment<Input> {
		const segment = this.#segments.at(-1)
		if (segment === undefined)
			throw new TypeError("History checkpoint is missing")
		return segment
	}

	#updateSnapshot(): void {
		const length = this.#latestSegment().groups.length
		const next = createHistorySnapshot(this.#cursor, length)
		if (
			this.#snapshot.index === next.index &&
			this.#snapshot.length === next.length &&
			this.#snapshot.canUndo === next.canUndo &&
			this.#snapshot.canRedo === next.canRedo
		) {
			return
		}
		this.#snapshot = next
		for (const listener of [...this.#listeners]) listener()
	}
}

function lastJournalSequence<Input>(journal: FormJournal<Input>): number {
	const segment = journal.segments.at(-1)
	return (
		segment?.groups.at(-1)?.events.at(-1)?.sequence ??
		segment?.checkpoint.sequence ??
		0
	)
}

function createHistorySnapshot(index: number, length: number): HistorySnapshot {
	return Object.freeze({
		canUndo: index > 0,
		canRedo: index < length,
		index,
		length,
	})
}

function normalizeLimit(limit = Number.POSITIVE_INFINITY): number {
	if (
		limit !== Number.POSITIVE_INFINITY &&
		(!Number.isSafeInteger(limit) || limit < 0)
	) {
		throw new TypeError(
			"History limit must be a non-negative integer or Infinity",
		)
	}
	return limit
}

function normalizeGroupWindow(groupWindow = 750): number {
	if (!Number.isFinite(groupWindow) || groupWindow < 0) {
		throw new TypeError(
			"History groupWindow must be a finite non-negative number",
		)
	}
	return groupWindow
}
