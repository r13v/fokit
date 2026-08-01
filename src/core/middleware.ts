import type { FormCommand } from "./form-commands.js"
import type { FormSnapshot } from "./form-state.js"
import type { FormTransactionDispatch } from "./form-transactions.js"

export type FormMiddlewareApi<Input, Context> = {
	readonly getSnapshot: () => FormSnapshot<Input, Context>
	readonly dispatch: (command: FormCommand<Input, Context>) => void
}

export type FormMiddleware<Input, Context> = (
	api: FormMiddlewareApi<Input, Context>,
) => (
	next: FormTransactionDispatch<Input, Context>,
) => FormTransactionDispatch<Input, Context>

type ErasedCommittedDispatch = {
	readonly result: { readonly status: "committed"; readonly event: unknown }
	readonly transaction: unknown
}

type ErasedCoordinatorOptions = {
	readonly middleware: readonly AnyFormMiddleware[]
	readonly getSnapshot: () => unknown
	readonly dispatchCommand: (command: unknown) => void
	readonly prepareTransaction: (transaction: unknown) => unknown
	readonly terminal: ErasedDispatch
	readonly finalize: (event: unknown, transaction: unknown) => void
	readonly publish: () => void
	readonly afterPublication: (event: unknown, transaction: unknown) => void
}

const cancelledResult = Object.freeze({ status: "cancelled" as const })

type ErasedDispatch = (transaction: unknown) => unknown
export type AnyFormMiddleware = (api: {
	readonly getSnapshot: () => unknown
	readonly dispatch: (command: unknown) => void
}) => (next: ErasedDispatch) => ErasedDispatch

export class MiddlewareCoordinator {
	readonly #options: ErasedCoordinatorOptions
	readonly #dispatch: ErasedDispatch
	readonly #queue: (() => void)[] = []
	#running = false
	#captured: ErasedCommittedDispatch | undefined

	constructor(options: ErasedCoordinatorOptions) {
		this.#options = options
		const middleware = freezeMiddleware(options.middleware)
		const api = Object.freeze({
			getSnapshot: options.getSnapshot,
			dispatch: (command: unknown) => {
				const dispatch = () => options.dispatchCommand(command)
				if (this.#running) {
					this.#queue.push(dispatch)
					return
				}
				dispatch()
			},
		})

		let dispatch: ErasedDispatch = (transaction) => {
			const result = options.terminal(transaction)
			assertDispatchResult(result)
			if (result.status === "committed") {
				this.#captured = Object.freeze({
					result,
					transaction,
				})
			}
			return result
		}

		for (let index = middleware.length - 1; index >= 0; index--) {
			const middlewareEntry = middleware[index]
			if (middlewareEntry === undefined) continue
			const createHandler = middlewareEntry(api)
			if (typeof createHandler !== "function") {
				throw new TypeError(
					`Form middleware at index ${index} must return a next handler`,
				)
			}
			dispatch = initializeHandler(
				createHandler,
				dispatch,
				options.prepareTransaction,
				index,
			)
		}
		this.#dispatch = dispatch
	}

	get isRunning(): boolean {
		return this.#running
	}

	run(transaction: unknown): unknown {
		if (this.#running) {
			this.#queue.push(() => {
				this.run(transaction)
			})
			return cancelledResult
		}

		this.#running = true
		this.#captured = undefined
		let result: unknown
		let error: unknown
		try {
			result = this.#dispatch(this.#options.prepareTransaction(transaction))
			assertDispatchResult(result)
		} catch (caught) {
			error = caught
		}

		const committed = this.#readCaptured()
		if (committed !== undefined) {
			try {
				this.#options.finalize(committed.result.event, committed.transaction)
				this.#options.publish()
				this.#options.afterPublication(
					committed.result.event,
					committed.transaction,
				)
			} catch (caught) {
				error ??= caught
			}
		}

		this.#running = false
		while (this.#queue.length > 0) {
			const queued = this.#queue.shift()
			try {
				queued?.()
			} catch (caught) {
				error ??= caught
			}
		}

		if (error !== undefined) throw error
		return result ?? cancelledResult
	}

	#readCaptured(): ErasedCommittedDispatch | undefined {
		return this.#captured
	}
}

function freezeMiddleware(
	middleware: readonly AnyFormMiddleware[],
): readonly AnyFormMiddleware[] {
	if (!Array.isArray(middleware)) {
		throw new TypeError("Form middleware must be an array")
	}
	const seen = new Set<AnyFormMiddleware>()
	for (const [index, entry] of middleware.entries()) {
		if (typeof entry !== "function") {
			throw new TypeError(
				`Form middleware at index ${index} must be a function`,
			)
		}
		if (seen.has(entry)) {
			throw new TypeError(
				`Form middleware at index ${index} duplicates an earlier middleware reference`,
			)
		}
		seen.add(entry)
	}
	return Object.freeze([...middleware])
}

function initializeHandler(
	createHandler: (next: ErasedDispatch) => ErasedDispatch,
	next: ErasedDispatch,
	prepareTransaction: (transaction: unknown) => unknown,
	index: number,
): ErasedDispatch {
	type Frame = {
		acceptingNext: boolean
		calledNext: boolean
		nextResult?: unknown
	}
	let frame: Frame | undefined
	const guardedNext: ErasedDispatch = (nextTransaction) => {
		if (frame === undefined || !frame.acceptingNext) {
			throw new TypeError(
				`Form middleware at index ${index} called next asynchronously`,
			)
		}
		if (frame.calledNext) {
			throw new TypeError(
				`Form middleware at index ${index} called next more than once`,
			)
		}
		frame.calledNext = true
		frame.nextResult = next(prepareTransaction(nextTransaction))
		return frame.nextResult
	}
	const handler = createHandler(guardedNext)
	if (typeof handler !== "function") {
		throw new TypeError(
			`Form middleware at index ${index} must return a transaction handler`,
		)
	}

	return (transaction) => {
		const currentFrame: Frame = {
			acceptingNext: true,
			calledNext: false,
		}
		frame = currentFrame

		let result: unknown
		try {
			result = handler(transaction)
		} finally {
			currentFrame.acceptingNext = false
			frame = undefined
		}
		assertNotPromise(result, `Form middleware at index ${index}`)
		assertDispatchResult(result)
		if (!currentFrame.calledNext && result.status === "committed") {
			throw new TypeError(
				`Form middleware at index ${index} cannot return a committed result without calling next`,
			)
		}
		if (currentFrame.calledNext && result !== currentFrame.nextResult) {
			throw new TypeError(
				`Form middleware at index ${index} must return the result from next unchanged`,
			)
		}
		return result
	}
}

function assertNotPromise(value: unknown, label: string): void {
	if (
		typeof value === "object" &&
		value !== null &&
		"then" in value &&
		typeof (value as { readonly then?: unknown }).then === "function"
	) {
		throw new TypeError(
			`${label} must run synchronously and cannot return a Promise`,
		)
	}
}

function assertDispatchResult(
	result: unknown,
): asserts result is
	| { readonly status: "cancelled" }
	| { readonly status: "committed"; readonly event: unknown } {
	assertNotPromise(result, "Form middleware dispatch")
	if (typeof result !== "object" || result === null || !("status" in result)) {
		throw new TypeError(
			'Form middleware must return a dispatch result with status "committed" or "cancelled"',
		)
	}
	const candidate = result as {
		readonly status?: unknown
		readonly event?: unknown
	}
	if (candidate.status === "cancelled") return
	if (candidate.status === "committed" && candidate.event !== undefined) return
	throw new TypeError(
		'Form middleware must return a valid "committed" or "cancelled" dispatch result',
	)
}
