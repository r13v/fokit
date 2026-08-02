import { createRowIdentityStateFromEntries } from "../core/array-state.js"
import {
	attachFormFeatureMetadata,
	type FormFeatureCapability,
	getFormFeatureCapability,
} from "../core/feature-protocol.js"
import type { FormEvent } from "../core/form-events.js"
import type { FormDocument } from "../core/form-model.js"
import {
	areFormDocumentsEqual,
	createFormDocument,
} from "../core/form-reducer.js"
import type { FormStore } from "../core/form-store.js"
import type {
	FormDispatchResult,
	FormTransactionDispatch,
} from "../core/form-transactions.js"
import type {
	FormAgnosticMiddleware,
	FormMiddlewareApi,
} from "../core/middleware.js"
import { formatPath } from "../core/path.js"
import type { StandardSchema } from "../core/standard-schema.js"
import type { ValidationResult } from "../core/validation.js"
import {
	getHistoryPersistenceBridge,
	type HistoryFeature,
	type HistoryPersistenceBridge,
} from "../history/history.js"
import {
	assertLiveEventSequenceHeadroom,
	type NormalizedJournal,
	normalizeJournal,
	replayNormalizedJournal,
	validateJournalDocuments,
} from "../history/journal.js"
import {
	decodePersistenceEnvelope,
	encodePersistenceEnvelope,
	type JsonValue,
	normalizePersistenceCodecs,
	type PersistenceCodec,
	type PersistenceMigration,
} from "./encoding.js"

export type FormPersistenceAdapter = Readonly<{
	load(key: string): Promise<JsonValue | undefined>
	save(key: string, value: JsonValue): Promise<void>
	remove(key: string): Promise<void>
}>

export type PersistenceSnapshot = Readonly<{
	phase: "idle" | "restoring" | "active" | "conflict"
	save:
		| Readonly<{ status: "idle" }>
		| Readonly<{ status: "scheduled" }>
		| Readonly<{ status: "saving" }>
		| Readonly<{ status: "failed"; error: unknown }>
}>

export type PersistenceRestoreResult =
	| "applied"
	| "empty"
	| "cancelled"
	| "transformed"
	| "unavailable"
	| "conflict"

export type PersistenceHandle = Readonly<{
	restore(): Promise<PersistenceRestoreResult>
	start(): void
	flush(): Promise<void>
	clear(): Promise<void>
	getSnapshot(): PersistenceSnapshot
	subscribe(listener: () => void): () => void
}>

export type CreatePersistenceOptions = Readonly<{
	adapter: FormPersistenceAdapter
	key: string
	version: number
	codecs?: readonly PersistenceCodec[]
	migrate?: PersistenceMigration
	saveDelay?: number
	onError?: (error: unknown) => void
	history?: HistoryFeature
}>

export type PersistenceFeature = FormAgnosticMiddleware & {
	readonly handle: <Schema extends StandardSchema, Context = unknown>(
		form: FormStore<Schema, Context>,
	) => PersistenceHandle
}

type PersistenceCapability<Input, Context> = FormFeatureCapability<
	StandardSchema<Input>,
	Context
>

type PendingHydration<Input> = {
	target: FormDocument<Input>
	document?: FormDocument<Input>
	event?: FormEvent<Input, unknown>
	rootEvent?: FormEvent<Input, unknown>
	conflict?: boolean
}

const idleSave = Object.freeze({ status: "idle" as const })

export function createPersistenceMiddleware(
	options: CreatePersistenceOptions,
): PersistenceFeature {
	const normalized = normalizeOptions(options)
	const states = new WeakMap<object, PersistenceState<unknown, unknown>>()

	const feature = (<Input, Context>(api: FormMiddlewareApi<Input, Context>) => {
		const capability = getFormFeatureCapability<StandardSchema<Input>, Context>(
			api,
		)
		const state = new PersistenceState(capability, api, normalized)
		states.set(capability, state as PersistenceState<unknown, unknown>)
		return (next: FormTransactionDispatch<Input, Context>) =>
			(transaction: Parameters<typeof next>[0]) =>
				next(transaction)
	}) as unknown as PersistenceFeature

	Object.defineProperty(feature, "handle", {
		enumerable: true,
		value(form: object) {
			const capability = getFormFeatureCapability(form)
			const state = states.get(capability)
			if (state === undefined) {
				throw new TypeError(
					"This persistence feature is not configured for the supplied form",
				)
			}
			return state.handle
		},
	})
	attachFormFeatureMetadata(feature, {
		kind: "persistence",
		feature,
		dependencies: normalized.history
			? [{ kind: "history", feature: normalized.history }]
			: [],
	})
	return Object.freeze(feature)
}

type NormalizedOptions = Readonly<{
	adapter: FormPersistenceAdapter
	key: string
	version: number
	codecs: readonly PersistenceCodec[]
	migrate?: PersistenceMigration
	saveDelay: number
	onError?: (error: unknown) => void
	history?: HistoryFeature
}>

class PersistenceState<Input, Context> {
	readonly handle: PersistenceHandle
	readonly #capability: PersistenceCapability<Input, Context>
	readonly #host: object
	readonly #options: NormalizedOptions
	readonly #listeners = new Set<() => void>()
	#snapshot: PersistenceSnapshot = Object.freeze({
		phase: "idle",
		save: idleSave,
	})
	#revision = 0
	#savedRevision = -1
	#suppressedRevision = -1
	#timer: ReturnType<typeof setTimeout> | undefined
	#tail: Promise<void> = Promise.resolve()
	#highestQueuedRevision = -1
	#statusOperation = 0
	#pendingHydration: PendingHydration<Input> | undefined

	constructor(
		capability: PersistenceCapability<Input, Context>,
		host: object,
		options: NormalizedOptions,
	) {
		this.#capability = capability
		this.#host = host
		this.#options = options
		capability.subscribeFinalized(({ event, document }) => {
			this.#finalize(event, document)
		})
		this.handle = Object.freeze({
			restore: () => this.#restore(),
			start: () => this.#start(),
			flush: () => this.#flush(),
			clear: () => this.#clear(),
			getSnapshot: () => this.#snapshot,
			subscribe: (listener) => this.#subscribe(listener),
		})
	}

	#subscribe(listener: () => void): () => void {
		if (typeof listener !== "function") {
			throw new TypeError("Persistence listener must be a function")
		}
		this.#listeners.add(listener)
		let active = true
		return () => {
			if (!active) return
			active = false
			this.#listeners.delete(listener)
		}
	}

	#finalize(
		event: FormEvent<Input, Context>,
		document: FormDocument<Input>,
	): void {
		if (
			event.type !== "document/committed" &&
			event.type !== "document/restored"
		) {
			if (this.#pendingHydration?.rootEvent === event) {
				this.#pendingHydration.event = event as FormEvent<Input, unknown>
			}
			return
		}

		this.#revision++
		const pending = this.#pendingHydration
		if (pending !== undefined) {
			if (pending.rootEvent !== event || pending.event !== undefined) {
				pending.conflict = true
				return
			}
			pending.document = document
			pending.event = event as FormEvent<Input, unknown>
			this.#capability.installCleanBaseline(document)
			return
		}
		if (this.#snapshot.phase === "active") this.#schedule()
	}

	async #restore(): Promise<PersistenceRestoreResult> {
		if (this.#snapshot.phase === "active") {
			throw new TypeError("Persistence restore cannot run after start")
		}
		if (this.#snapshot.phase === "restoring") {
			throw new TypeError("Persistence restore is already running")
		}
		this.#cancelTimer()
		this.#setSnapshot("restoring", idleSave)
		const startingRevision = this.#revision

		let stored: JsonValue | undefined
		try {
			stored = await this.#options.adapter.load(this.#options.key)
		} catch (error) {
			this.#fail(error, "idle")
			throw error
		}
		if (this.#revision !== startingRevision) return this.#conflict()

		if (stored === undefined) {
			this.#setSnapshot("active", idleSave)
			this.#suppressedRevision = -1
			this.#schedule()
			return "empty"
		}

		let decoded: Awaited<ReturnType<typeof decodePersistenceEnvelope>>
		let target: FormDocument<Input>
		let normalizedJournal: NormalizedJournal<Input> | undefined
		try {
			decoded = await decodePersistenceEnvelope(stored, {
				version: this.#options.version,
				mode: this.#options.history ? "history" : "document",
				codecs: this.#options.codecs,
				migrate: this.#options.migrate,
			})
			if (this.#options.history) {
				normalizedJournal = normalizeJournal<Input>(decoded.value)
				assertLiveEventSequenceHeadroom(normalizedJournal.maxSequence)
				validateJournalDocuments(
					normalizedJournal.journal,
					this.#capability.validateDocument,
				)
				target = replayNormalizedJournal(
					normalizedJournal.journal,
					normalizedJournal.cursor,
				)
			} else {
				target = normalizeDocument<Input>(decoded.value)
			}
			const validation = await this.#capability.validateRestoredInput(
				target.values,
			)
			assertValidInput(validation)
		} catch (error) {
			this.#fail(error, "idle")
			throw error
		}
		if (this.#revision !== startingRevision) return this.#conflict()

		let history: HistoryPersistenceBridge<Input> | undefined
		try {
			history = this.#historyBridge()
			history?.stageHydration(normalizedJournal)
		} catch (error) {
			this.#fail(error, "idle")
			throw error
		}
		const pending: PendingHydration<Input> = { target }
		this.#pendingHydration = pending
		let result: FormDispatchResult<Input, Context>
		try {
			result = this.#capability.restoreDocument(
				target,
				"hydrate",
				undefined,
				({ event }) => {
					pending.rootEvent = event as FormEvent<Input, unknown>
					history?.markHydrationRoot(event as FormEvent<Input, unknown>)
				},
			)
		} catch (error) {
			if (pending.conflict) this.#setSnapshot("conflict", idleSave)
			else if (pending.document !== undefined) {
				this.#savedRevision = this.#revision
				this.#suppressedRevision = -1
				this.#setSnapshot("active", idleSave)
				if (decoded.migrated) this.#schedule(0, true)
			} else this.#setSnapshot("idle", idleSave)
			throw error
		} finally {
			this.#pendingHydration = undefined
			if (pending.document === undefined) history?.cancelHydration()
		}

		if (pending.conflict) return this.#conflict()
		if (result.status === "cancelled") {
			this.#setSnapshot("idle", idleSave)
			return "cancelled"
		}
		if (pending.document === undefined) {
			this.#setSnapshot("idle", idleSave)
			return "unavailable"
		}

		this.#savedRevision = this.#revision
		this.#suppressedRevision = -1
		this.#setSnapshot("active", idleSave)
		if (decoded.migrated) this.#schedule(0, true)
		return areFormDocumentsEqual(pending.document, target)
			? "applied"
			: "transformed"
	}

	#conflict(): PersistenceRestoreResult {
		this.#setSnapshot("conflict", idleSave)
		return "conflict"
	}

	#start(): void {
		if (this.#snapshot.phase === "active") return
		if (this.#snapshot.phase === "restoring") {
			throw new TypeError("Persistence cannot start while restore is running")
		}
		this.#suppressedRevision = -1
		this.#setSnapshot("active", idleSave)
		this.#schedule()
	}

	async #flush(): Promise<void> {
		if (this.#snapshot.phase !== "active") {
			throw new TypeError("Persistence flush requires active persistence")
		}
		this.#cancelTimer()
		if (this.#revision <= this.#suppressedRevision) {
			await this.#tail.catch(() => undefined)
			return
		}
		await this.#queueSave(true)
	}

	async #clear(): Promise<void> {
		if (this.#snapshot.phase === "restoring") {
			throw new TypeError(
				"Persistence clear cannot run while restore is running",
			)
		}
		this.#cancelTimer()
		const clearedRevision = this.#revision
		this.#suppressedRevision = clearedRevision
		const operation = ++this.#statusOperation
		this.#setSave(Object.freeze({ status: "saving" }))
		await this.#enqueue(async () => {
			try {
				await this.#options.adapter.remove(this.#options.key)
				this.#savedRevision = Math.max(this.#savedRevision, clearedRevision)
				if (operation === this.#statusOperation) {
					if (
						this.#snapshot.phase === "active" &&
						this.#revision > clearedRevision
					) {
						this.#schedule()
					} else this.#setSave(idleSave)
				}
			} catch (error) {
				if (operation === this.#statusOperation) this.#fail(error)
				else this.#reportError(error)
				throw error
			}
		})
	}

	#schedule(delay = this.#options.saveDelay, force = false): void {
		this.#cancelTimer()
		this.#setSave(Object.freeze({ status: "scheduled" }))
		this.#timer = setTimeout(() => {
			this.#timer = undefined
			void this.#queueSave(force).catch(() => undefined)
		}, delay)
	}

	#queueSave(force = false): Promise<void> {
		const requestedRevision = this.#revision
		if (
			!force &&
			(requestedRevision <= this.#savedRevision ||
				requestedRevision <= this.#highestQueuedRevision)
		) {
			return this.#tail
		}
		this.#highestQueuedRevision = Math.max(
			this.#highestQueuedRevision,
			requestedRevision,
		)
		const operation = ++this.#statusOperation
		return this.#enqueue(async () => {
			if (!force && requestedRevision <= this.#savedRevision) return
			const revision = this.#revision
			this.#setSave(Object.freeze({ status: "saving" }))
			try {
				const payload = this.#options.history
					? this.#historyBridge()?.export()
					: this.#capability.getDocument()
				const envelope = await encodePersistenceEnvelope(payload, {
					version: this.#options.version,
					mode: this.#options.history ? "history" : "document",
					codecs: this.#options.codecs,
				})
				await this.#options.adapter.save(this.#options.key, envelope)
				this.#savedRevision = Math.max(this.#savedRevision, revision)
				if (operation === this.#statusOperation) this.#setSave(idleSave)
			} catch (error) {
				if (operation === this.#statusOperation) this.#fail(error)
				else this.#reportError(error)
				throw error
			}
		})
	}

	#enqueue(operation: () => Promise<void>): Promise<void> {
		const result = this.#tail.catch(() => undefined).then(operation)
		this.#tail = result
		return result
	}

	#historyBridge(): HistoryPersistenceBridge<Input> | undefined {
		return this.#options.history
			? getHistoryPersistenceBridge<Input>(this.#options.history, this.#host)
			: undefined
	}

	#cancelTimer(): void {
		if (this.#timer !== undefined) clearTimeout(this.#timer)
		this.#timer = undefined
	}

	#fail(error: unknown, phase = this.#snapshot.phase): void {
		this.#setSnapshot(phase, Object.freeze({ status: "failed", error }))
		this.#reportError(error)
	}

	#reportError(error: unknown): void {
		try {
			this.#options.onError?.(error)
		} catch {
			// Storage errors remain the operation's authoritative failure.
		}
	}

	#setSave(save: PersistenceSnapshot["save"]): void {
		this.#setSnapshot(this.#snapshot.phase, save)
	}

	#setSnapshot(
		phase: PersistenceSnapshot["phase"],
		save: PersistenceSnapshot["save"],
	): void {
		if (this.#snapshot.phase === phase && this.#snapshot.save === save) return
		this.#snapshot = Object.freeze({ phase, save })
		for (const listener of [...this.#listeners]) listener()
	}
}

function normalizeOptions(
	options: CreatePersistenceOptions,
): NormalizedOptions {
	if (typeof options !== "object" || options === null) {
		throw new TypeError("Persistence options must be an object")
	}
	if (
		typeof options.adapter !== "object" ||
		options.adapter === null ||
		typeof options.adapter.load !== "function" ||
		typeof options.adapter.save !== "function" ||
		typeof options.adapter.remove !== "function"
	) {
		throw new TypeError(
			"Persistence adapter must define load, save, and remove",
		)
	}
	if (typeof options.key !== "string" || options.key.length === 0) {
		throw new TypeError("Persistence key must be a non-empty string")
	}
	if (!Number.isSafeInteger(options.version) || options.version < 0) {
		throw new TypeError("Persistence version must be a non-negative integer")
	}
	const saveDelay = options.saveDelay ?? 500
	if (!Number.isFinite(saveDelay) || saveDelay < 0) {
		throw new TypeError(
			"Persistence saveDelay must be a finite non-negative number",
		)
	}
	if (options.migrate !== undefined && typeof options.migrate !== "function") {
		throw new TypeError("Persistence migrate must be a function")
	}
	if (options.onError !== undefined && typeof options.onError !== "function") {
		throw new TypeError("Persistence onError must be a function")
	}
	return Object.freeze({
		adapter: options.adapter,
		key: options.key,
		version: options.version,
		codecs: normalizePersistenceCodecs(options.codecs),
		migrate: options.migrate,
		saveDelay,
		onError: options.onError,
		history: options.history,
	})
}

function normalizeDocument<Input>(input: unknown): FormDocument<Input> {
	const document = readRecord(input, "Persisted form document")
	if (!("values" in document) || !("rowIdentity" in document)) {
		throw new TypeError(
			"Persisted form document is missing values or row identity",
		)
	}
	const rowIdentity = readRecord(
		document.rowIdentity,
		"Persisted form row identity",
	)
	const entries = Object.entries(rowIdentity).map(([path, entryInput]) => {
		if (formatPath(path) !== path) {
			throw new TypeError(
				`Persisted row identity path "${path}" must be canonical`,
			)
		}
		const entry = readRecord(entryInput, "Persisted row identity entry")
		if (
			!Array.isArray(entry.keys) ||
			!entry.keys.every((key) => typeof key === "string") ||
			!Number.isSafeInteger(entry.nextKeyIndex) ||
			(entry.nextKeyIndex as number) < entry.keys.length
		) {
			throw new TypeError(`Persisted row identity at "${path}" is invalid`)
		}
		return {
			path,
			keys: entry.keys as string[],
			nextKeyIndex: entry.nextKeyIndex as number,
		}
	})
	return createFormDocument(
		document.values as Input,
		createRowIdentityStateFromEntries(entries),
	)
}

function assertValidInput(
	result: ValidationResult<unknown>,
): asserts result is Extract<ValidationResult<unknown>, { success: true }> {
	if (!result.success) {
		throw new TypeError("Persisted form does not contain valid schema input")
	}
}

function readRecord(input: unknown, label: string): Record<string, unknown> {
	if (typeof input !== "object" || input === null || Array.isArray(input)) {
		throw new TypeError(`${label} must be an object`)
	}
	return input as Record<string, unknown>
}
