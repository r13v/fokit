import type {
	FormInput,
	FormOutput,
	StandardSchema,
} from "./standard-schema.js"
import {
	isPromiseLike,
	normalizeValidationResult,
	runStandardSchemaValidation,
	type ValidationResult,
} from "./validation.js"

export type ValidationAttempt<Schema extends StandardSchema> = {
	readonly id: number
	readonly kind: "nonSubmit" | "submit"
	readonly documentRevision: number
	readonly values: FormInput<Schema>
	readonly asynchronous: boolean
	readonly result:
		| ValidationResult<FormOutput<Schema>>
		| Promise<ValidationResult<FormOutput<Schema>>>
}

export class ValidationLifecycle<Schema extends StandardSchema> {
	readonly #schema: Schema
	#active:
		| { readonly id: number; readonly kind: "nonSubmit" | "submit" }
		| undefined
	#hasResult = false
	#nonSubmitAbortController: AbortController | undefined
	#scheduled: ReturnType<typeof setTimeout> | undefined

	constructor(schema: Schema) {
		this.#schema = schema
	}

	get hasResult(): boolean {
		return this.#hasResult
	}

	start(
		id: number,
		values: FormInput<Schema>,
		documentRevision: number,
		kind: "nonSubmit" | "submit",
	): ValidationAttempt<Schema> {
		const abortController = new AbortController()
		if (kind === "nonSubmit") {
			this.abortNonSubmit()
			this.#nonSubmitAbortController = abortController
		}
		this.#active = { id, kind }

		let schemaResult: ReturnType<typeof runStandardSchemaValidation<Schema>>
		try {
			schemaResult = runStandardSchemaValidation(
				this.#schema,
				values,
				abortController.signal,
			)
		} catch (error) {
			if (this.#active?.id === id) this.#active = undefined
			if (kind === "nonSubmit") this.#nonSubmitAbortController = undefined
			throw error
		}
		const asynchronous = isPromiseLike(schemaResult)
		const result = asynchronous
			? Promise.resolve(schemaResult).then((value) =>
					normalizeValidationResult(value),
				)
			: normalizeValidationResult(
					schemaResult as Awaited<
						ReturnType<typeof runStandardSchemaValidation<Schema>>
					>,
				)

		return Object.freeze({
			id,
			kind,
			documentRevision,
			values,
			asynchronous,
			result,
		})
	}

	isCurrent(id: number): boolean {
		return this.#active?.id === id
	}

	finish(id: number, succeeded: boolean): boolean {
		if (!this.isCurrent(id)) return false
		if (this.#active?.kind === "nonSubmit") {
			this.#nonSubmitAbortController = undefined
		}
		this.#active = undefined
		if (succeeded) this.#hasResult = true
		return true
	}

	invalidate(resetResult = false): void {
		this.cancelScheduled()
		this.abortNonSubmit()
		if (resetResult) this.#hasResult = false
	}

	abortNonSubmit(): boolean {
		this.#nonSubmitAbortController?.abort()
		this.#nonSubmitAbortController = undefined
		if (this.#active?.kind !== "nonSubmit") return false
		this.#active = undefined
		return true
	}

	schedule(delay: number, callback: () => void): void {
		this.cancelScheduled()
		this.#scheduled = setTimeout(() => {
			this.#scheduled = undefined
			callback()
		}, delay)
	}

	cancelScheduled(): void {
		if (this.#scheduled === undefined) return
		clearTimeout(this.#scheduled)
		this.#scheduled = undefined
	}
}
