import {
	createRowIdentityChanges,
	createRowIdentityStateFromEntries,
} from "../core/array-state.js"
import {
	attachFormFeatureMetadata,
	type FormFeatureCapability,
	formBindingFinalizer,
	getFormFeatureCapability,
} from "../core/feature-protocol.js"
import type { FormEvent } from "../core/form-events.js"
import type { FormDocument } from "../core/form-model.js"
import { areFormDocumentsEqual } from "../core/form-reducer.js"
import type { FormStore } from "../core/form-store.js"
import type { FormTransactionDispatch } from "../core/form-transactions.js"
import type {
	FormAgnosticMiddleware,
	FormMiddlewareApi,
} from "../core/middleware.js"
import type { StandardSchema } from "../core/standard-schema.js"
import { cloneValue } from "../core/value.js"

declare const devToolsRevisionBrand: unique symbol

export type DevToolsRevisionToken = string & {
	readonly [devToolsRevisionBrand]: true
}

export type LogicalRowIdentity = Readonly<{
	version: 1
	arrays: readonly Readonly<{
		path: string
		keys: readonly string[]
	}>[]
}>

export type DevToolsFormState<Input> = Readonly<{
	values: Input
	rowIdentity: LogicalRowIdentity
	$formPlease: Readonly<{
		revision: DevToolsRevisionToken
	}>
}>

type DevToolsVisibleState<Input> = Omit<DevToolsFormState<Input>, "$formPlease">

type DevToolsSerializeOptions = boolean | Readonly<Record<string, unknown>>

export type CreateDevToolsOptions = Readonly<{
	name?: string
	latency?: number
	maxAge?: number
	trace?:
		| boolean
		| ((action: FormEvent<unknown, unknown>) => string | undefined)
	traceLimit?: number
	serialize?: DevToolsSerializeOptions
	actionSanitizer?: (action: FormEvent<unknown, unknown>, id: number) => unknown
	stateSanitizer?: (
		state: DevToolsVisibleState<unknown>,
		index: number,
	) => unknown
	actionsAllowlist?: string | readonly string[]
	actionsDenylist?: string | readonly string[]
	predicate?: (
		state: DevToolsFormState<unknown>,
		action: FormEvent<unknown, unknown>,
	) => boolean
	autoPause?: boolean
	onError?: (error: unknown) => void
}>

export type DevToolsHandle = Readonly<{
	disconnect(): void
}>

export type DevToolsFeature = FormAgnosticMiddleware & {
	readonly handle: <Schema extends StandardSchema, Context = unknown>(
		form: FormStore<Schema, Context>,
	) => DevToolsHandle
}

type DevToolsCapability<Input, Context> = FormFeatureCapability<
	StandardSchema<Input>,
	Context
>

type ExtensionOptions = Omit<
	CreateDevToolsOptions,
	"stateSanitizer" | "onError"
> & {
	readonly autoPause: boolean
	readonly features: Readonly<{
		pause: true
		lock: false
		persist: false
		export: true
		import: false
		jump: true
		skip: false
		reorder: false
		dispatch: false
		test: false
	}>
}

type DevToolsMessage = Readonly<{
	type?: unknown
	payload?: Readonly<{ type?: unknown }>
	state?: unknown
}>

type DevToolsConnection = Readonly<{
	init(state: unknown): void
	send(action: unknown, state: unknown): void
	subscribe(
		listener: (message: DevToolsMessage) => void,
	): (() => void) | undefined
	unsubscribe(): void
	error(message: string): void
}>

type DevToolsExtension = Readonly<{
	connect(options: ExtensionOptions): DevToolsConnection
}>

type DevToolsWindow = Window & {
	readonly __REDUX_DEVTOOLS_EXTENSION__?: DevToolsExtension
}

type PendingRestore<Input> = {
	readonly token: DevToolsRevisionToken
	readonly target: FormDocument<Input>
	event?: FormEvent<Input, unknown>
	outcome?: "applied" | "transformed"
}

const supportedOptions = new Set([
	"name",
	"latency",
	"maxAge",
	"trace",
	"traceLimit",
	"serialize",
	"actionSanitizer",
	"stateSanitizer",
	"actionsAllowlist",
	"actionsDenylist",
	"predicate",
	"autoPause",
	"onError",
])

const features = Object.freeze({
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
} as const)

export function createDevToolsMiddleware(
	options: CreateDevToolsOptions = {},
): DevToolsFeature {
	const normalized = normalizeOptions(options)
	const states = new WeakMap<object, DevToolsState<unknown, unknown>>()

	const feature = (<Input, Context>(api: FormMiddlewareApi<Input, Context>) => {
		const capability = getFormFeatureCapability<StandardSchema<Input>, Context>(
			api,
		)
		const state = new DevToolsState(capability, normalized)
		states.set(capability, state as DevToolsState<unknown, unknown>)
		return (next: FormTransactionDispatch<Input, Context>) =>
			(transaction: Parameters<typeof next>[0]) =>
				next(transaction)
	}) as unknown as DevToolsFeature

	Object.defineProperty(feature, "handle", {
		enumerable: true,
		value(form: object) {
			const capability = getFormFeatureCapability(form)
			const state = states.get(capability)
			if (state === undefined) {
				throw new TypeError(
					"This DevTools feature is not configured for the supplied form",
				)
			}
			return state.handle
		},
	})
	Object.defineProperty(feature, formBindingFinalizer, {
		value(form: object) {
			const capability = getFormFeatureCapability(form)
			states.get(capability)?.activate()
		},
	})
	attachFormFeatureMetadata(feature, { kind: "devtools", feature })
	return Object.freeze(feature)
}

type NormalizedOptions = Readonly<{
	connection: ExtensionOptions
	maxAge: number
	stateSanitizer?: (
		state: DevToolsVisibleState<unknown>,
		index: number,
	) => unknown
	onError?: (error: unknown) => void
}>

class DevToolsState<Input, Context> {
	readonly handle: DevToolsHandle
	readonly #capability: DevToolsCapability<Input, Context>
	readonly #options: NormalizedOptions
	readonly #documents = new Map<DevToolsRevisionToken, FormDocument<Input>>()
	readonly #recentTokens: DevToolsRevisionToken[] = []
	#document: FormDocument<Input> | undefined
	#connection: DevToolsConnection | undefined
	#unsubscribe: (() => void) | undefined
	#unsubscribeFinalized: (() => void) | undefined
	#diagnosticState: "idle" | "active" | "disconnected" | "failed" = "idle"
	#nextRevision = 0
	#initialToken: DevToolsRevisionToken | undefined
	#baselineToken: DevToolsRevisionToken | undefined
	#currentToken: DevToolsRevisionToken | undefined
	#pendingRestore: PendingRestore<Input> | undefined

	constructor(
		capability: DevToolsCapability<Input, Context>,
		options: NormalizedOptions,
	) {
		this.#capability = capability
		this.#options = options
		this.#document = capability.getDocument()
		this.#unsubscribeFinalized = capability.subscribeFinalized(
			({ event, document }) => {
				try {
					this.#finalize(event, document)
				} catch (error) {
					this.#fail(error)
				}
			},
		)
		this.handle = Object.freeze({
			disconnect: () => this.#disconnect("disconnected"),
		})
	}

	activate(): void {
		if (this.#diagnosticState !== "idle") return
		if (typeof window === "undefined") return
		const extension = (window as DevToolsWindow).__REDUX_DEVTOOLS_EXTENSION__
		if (extension === undefined) return

		let connection: DevToolsConnection | undefined
		try {
			connection = extension.connect(this.#options.connection)
			this.#connection = connection
			const unsubscribe = connection.subscribe((message) => {
				try {
					this.#receive(message)
				} catch (error) {
					this.#fail(error)
				}
			})
			this.#unsubscribe =
				typeof unsubscribe === "function"
					? unsubscribe
					: () => connection?.unsubscribe()
			const document = this.#document
			if (document === undefined) {
				throw new TypeError("Redux DevTools form document is unavailable")
			}
			const token = this.#remember(document)
			this.#initialToken = token
			this.#baselineToken = token
			this.#currentToken = token
			connection.init(this.#project(document, token))
			this.#diagnosticState = "active"
		} catch (error) {
			this.#report(error)
			this.#disconnect("failed", connection)
		}
	}

	#finalize(
		event: FormEvent<Input, Context>,
		document: FormDocument<Input>,
	): void {
		if (
			this.#diagnosticState === "disconnected" ||
			this.#diagnosticState === "failed"
		) {
			return
		}
		this.#document = document
		if (this.#diagnosticState !== "active") return

		const pending = this.#pendingRestore
		if (
			pending?.event === event &&
			(event.type === "document/committed" ||
				event.type === "document/restored") &&
			areFormDocumentsEqual(document, pending.target)
		) {
			pending.outcome = "applied"
			this.#documents.set(pending.token, document)
			this.#currentToken = pending.token
			this.#prune()
			return
		}

		if (
			pending?.event === event &&
			pending.outcome === undefined &&
			(event.type === "document/committed" ||
				event.type === "document/restored")
		) {
			pending.outcome = "transformed"
		}
		const token =
			event.type === "document/committed" || event.type === "document/restored"
				? this.#remember(document)
				: (this.#currentToken ?? this.#remember(document))
		this.#connection?.send(event, this.#project(document, token))
	}

	#receive(message: DevToolsMessage): void {
		if (this.#diagnosticState !== "active" || message.type !== "DISPATCH") {
			return
		}
		const type = message.payload?.type
		if (type === "COMMIT") {
			const document = this.#document
			if (document === undefined) {
				throw new TypeError("Redux DevTools form document is unavailable")
			}
			const token = this.#currentToken ?? this.#remember(document)
			this.#baselineToken = token
			this.#connection?.init(this.#project(document, token))
			this.#prune()
			return
		}
		if (
			type !== "JUMP_TO_STATE" &&
			type !== "JUMP_TO_ACTION" &&
			type !== "RESET" &&
			type !== "ROLLBACK"
		) {
			this.#connection?.error(
				`Unsupported Redux DevTools command: ${String(type)}`,
			)
			return
		}

		const token = readRevisionToken(message.state)
		if (token === undefined || !this.#documents.has(token)) {
			this.#resync("Redux DevTools revision is unknown or expired")
			return
		}
		this.#restore(token)
	}

	#restore(token: DevToolsRevisionToken): void {
		const target = this.#documents.get(token)
		if (target === undefined) {
			this.#resync("Redux DevTools revision is unknown or expired")
			return
		}

		const pending: PendingRestore<Input> = { token, target }
		this.#pendingRestore = pending
		try {
			const result = this.#capability.restoreDocument(
				target,
				"devtools",
				"record",
				({ event }) => {
					if (this.#pendingRestore === pending) {
						pending.event = event as FormEvent<Input, unknown>
					}
				},
			)
			if (pending.outcome === "applied") return
			if (result.status === "cancelled") {
				this.#resync("Redux DevTools restore was cancelled")
				return
			}
			this.#resync("Redux DevTools restore was transformed")
		} catch (error) {
			if (pending.outcome !== "applied") {
				this.#report(error)
				this.#resync("Redux DevTools restore failed")
			}
		} finally {
			this.#pendingRestore = undefined
		}
	}

	#resync(message: string): void {
		const connection = this.#connection
		const document = this.#document
		if (connection === undefined || document === undefined) return
		connection.error(message)
		const token = this.#remember(document)
		connection.init(this.#project(document, token))
	}

	#remember(document: FormDocument<Input>): DevToolsRevisionToken {
		const token = `form-please:${++this.#nextRevision}` as DevToolsRevisionToken
		this.#documents.set(token, document)
		this.#recentTokens.push(token)
		this.#currentToken = token
		this.#prune()
		return token
	}

	#prune(): void {
		while (this.#recentTokens.length > this.#options.maxAge) {
			this.#recentTokens.shift()
		}
		const retained = new Set<DevToolsRevisionToken | undefined>([
			...this.#recentTokens,
			this.#initialToken,
			this.#baselineToken,
			this.#currentToken,
		])
		for (const token of this.#documents.keys()) {
			if (!retained.has(token)) this.#documents.delete(token)
		}
	}

	#project(
		document: FormDocument<Input>,
		token: DevToolsRevisionToken,
	): DevToolsFormState<Input> {
		const visible = Object.freeze({
			values: cloneValue(document.values),
			rowIdentity: projectRowIdentity(document),
		})
		const sanitized = this.#options.stateSanitizer?.(visible, 0) ?? visible
		if (typeof sanitized !== "object" || sanitized === null) {
			throw new TypeError("Redux DevTools stateSanitizer must return an object")
		}
		return Object.freeze({
			...sanitized,
			$formPlease: Object.freeze({ revision: token }),
		}) as DevToolsFormState<Input>
	}

	#fail(error: unknown): void {
		this.#report(error)
		this.#disconnect("failed")
	}

	#report(error: unknown): void {
		try {
			this.#options.onError?.(error)
		} catch {
			// Diagnostic callbacks cannot affect form commits or cleanup.
		}
	}

	#disconnect(
		state: "disconnected" | "failed",
		partialConnection = this.#connection,
	): void {
		if (
			this.#diagnosticState === "disconnected" ||
			this.#diagnosticState === "failed"
		) {
			return
		}
		this.#diagnosticState = state
		const unsubscribe = this.#unsubscribe
		const unsubscribeFinalized = this.#unsubscribeFinalized
		this.#unsubscribe = undefined
		this.#unsubscribeFinalized = undefined
		this.#connection = undefined
		this.#document = undefined
		this.#documents.clear()
		this.#recentTokens.length = 0
		this.#nextRevision = 0
		this.#initialToken = undefined
		this.#baselineToken = undefined
		this.#currentToken = undefined
		this.#pendingRestore = undefined
		try {
			if (unsubscribe !== undefined) unsubscribe()
			else partialConnection?.unsubscribe()
		} catch (error) {
			this.#report(error)
		}
		try {
			unsubscribeFinalized?.()
		} catch (error) {
			this.#report(error)
		}
	}
}

function normalizeOptions(options: CreateDevToolsOptions): NormalizedOptions {
	if (typeof options !== "object" || options === null) {
		throw new TypeError("Redux DevTools options must be an object")
	}
	for (const key of Object.keys(options)) {
		if (!supportedOptions.has(key)) {
			throw new TypeError(`Unsupported Redux DevTools option "${key}"`)
		}
	}
	const maxAge = options.maxAge ?? 50
	if (!Number.isInteger(maxAge) || maxAge <= 1) {
		throw new TypeError(
			"Redux DevTools maxAge must be an integer greater than 1",
		)
	}
	if (
		options.stateSanitizer !== undefined &&
		typeof options.stateSanitizer !== "function"
	) {
		throw new TypeError("Redux DevTools stateSanitizer must be a function")
	}
	if (options.onError !== undefined && typeof options.onError !== "function") {
		throw new TypeError("Redux DevTools onError must be a function")
	}

	const {
		stateSanitizer,
		onError,
		maxAge: _maxAge,
		...connectionOptions
	} = options
	return Object.freeze({
		maxAge,
		stateSanitizer,
		onError,
		connection: Object.freeze({
			...connectionOptions,
			maxAge,
			autoPause: options.autoPause ?? true,
			features,
		}),
	})
}

function projectRowIdentity<Input>(
	document: FormDocument<Input>,
): LogicalRowIdentity {
	const empty = createRowIdentityStateFromEntries([])
	const arrays = createRowIdentityChanges(empty, document.rowIdentity)
		.filter(
			(change): change is Extract<typeof change, { type: "array/replaced" }> =>
				change.type === "array/replaced",
		)
		.map((change) =>
			Object.freeze({
				path: change.path,
				keys: Object.freeze([...change.keys]),
			}),
		)
		.sort((left, right) => left.path.localeCompare(right.path))
	return Object.freeze({ version: 1, arrays: Object.freeze(arrays) })
}

function readRevisionToken(input: unknown): DevToolsRevisionToken | undefined {
	let state = input
	if (typeof state === "string") {
		try {
			state = JSON.parse(state)
		} catch {
			return undefined
		}
	}
	if (typeof state !== "object" || state === null) return undefined
	const metadata = (state as { $formPlease?: unknown }).$formPlease
	if (typeof metadata !== "object" || metadata === null) return undefined
	const revision = (metadata as { revision?: unknown }).revision
	return typeof revision === "string"
		? (revision as DevToolsRevisionToken)
		: undefined
}
