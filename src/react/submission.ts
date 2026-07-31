"use client"

import type { FormEvent } from "react"

import { startFormSubmission } from "../core/form-store.js"
import type {
	FormInput,
	FormOutput,
	FormStore,
	StandardSchema,
} from "../core/index.js"
import { isDirtyEqual } from "../core/index.js"
import type { FormInstance } from "./form-instance.js"

export type SubmitContext<Schema extends StandardSchema, Context = unknown> = {
	readonly value: FormOutput<Schema>
	readonly input: FormInput<Schema>
	readonly form: FormInstance<Schema, Context>
	readonly formData: FormData
}

export type SubmitHandler<Schema extends StandardSchema, Context = unknown> = (
	context: SubmitContext<Schema, Context>,
) => void | Promise<void>

export type ClassicFormInstance<
	Schema extends StandardSchema,
	Context = unknown,
> = FormStore<Schema, Context> & {
	submit(): Promise<void>
}

type ClassicSubmissionController = {
	register(element: HTMLFormElement | null): void
	handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void>
	rejectSubmit(error: unknown): void
	submit(): Promise<void>
}

const controllerByForm = new WeakMap<
	FormStore<StandardSchema, unknown>,
	ClassicSubmissionController
>()

export function attachClassicSubmission<
	Schema extends StandardSchema,
	Context = unknown,
>(
	form: ClassicFormInstance<Schema, Context>,
	store: FormStore<Schema, Context>,
	getOnSubmit: () => SubmitHandler<Schema, Context> | undefined,
): void {
	const existing = controllerByForm.get(
		form as FormStore<StandardSchema, unknown>,
	)
	if (existing !== undefined) {
		return
	}

	const controller = createClassicSubmissionController(form, store, getOnSubmit)
	controllerByForm.set(form as FormStore<StandardSchema, unknown>, controller)
}

export function registerClassicForm<
	Schema extends StandardSchema,
	Context = unknown,
>(
	form: ClassicFormInstance<Schema, Context>,
	element: HTMLFormElement | null,
): void {
	getController(form).register(element)
}

export function submitClassicForm<
	Schema extends StandardSchema,
	Context = unknown,
>(
	form: ClassicFormInstance<Schema, Context>,
	event: FormEvent<HTMLFormElement>,
): Promise<void> {
	return getController(form).handleSubmit(event)
}

export function rejectClassicFormSubmit<
	Schema extends StandardSchema,
	Context = unknown,
>(form: ClassicFormInstance<Schema, Context>, error: unknown): void {
	getController(form).rejectSubmit(error)
}

export function requestClassicFormSubmit<
	Schema extends StandardSchema,
	Context = unknown,
>(form: ClassicFormInstance<Schema, Context>): Promise<void> {
	return getController(form).submit()
}

function createClassicSubmissionController<
	Schema extends StandardSchema,
	Context = unknown,
>(
	form: ClassicFormInstance<Schema, Context>,
	store: FormStore<Schema, Context>,
	getOnSubmit: () => SubmitHandler<Schema, Context> | undefined,
): ClassicSubmissionController {
	let element: HTMLFormElement | undefined
	let inFlight: Promise<void> | undefined
	let lastSubmitPromise: Promise<void> | undefined
	let imperativeSubmitActive = false

	function runSubmit(
		formElement: HTMLFormElement,
		submitter: HTMLElement | null,
	): Promise<void> {
		if (inFlight !== undefined) {
			return inFlight
		}

		const snapshot = store.getSnapshot()
		if (snapshot.resolvedUi.disabled || snapshot.isSubmitting) {
			return Promise.resolve()
		}

		const input = snapshot.values
		const formData = createFormData(formElement, submitter)
		const attempt = startFormSubmission(store)
		const promise = (async () => {
			try {
				const result = await attempt.validate()
				if (!result.success) {
					focusSubmitIssues(store, formElement, input)
					return
				}

				await getOnSubmit()?.({
					value: result.value,
					input,
					form: form as FormInstance<Schema, Context>,
					formData,
				})
			} finally {
				attempt.finish()
				inFlight = undefined
			}
		})()

		inFlight = promise
		return promise
	}

	return Object.freeze({
		register(nextElement) {
			element = nextElement ?? undefined
		},
		handleSubmit(event) {
			event.preventDefault()
			const formElement = event.currentTarget
			const promise = runSubmit(formElement, getSubmitter(event.nativeEvent))
			lastSubmitPromise = promise
			if (store.getSnapshot().resolvedUi.disabled || inFlight !== promise) {
				event.stopPropagation()
			}
			return promise
		},
		rejectSubmit(error) {
			if (!imperativeSubmitActive || lastSubmitPromise !== undefined) {
				return
			}

			lastSubmitPromise = Promise.reject(error)
			lastSubmitPromise.catch(() => undefined)
		},
		submit() {
			if (inFlight !== undefined) {
				return inFlight
			}

			if (element === undefined) {
				return Promise.reject(
					new Error("Cannot submit a Fokit form before kit.Form is mounted"),
				)
			}

			lastSubmitPromise = undefined
			imperativeSubmitActive = true
			try {
				element.requestSubmit()
			} catch (error) {
				lastSubmitPromise = Promise.reject(error)
				lastSubmitPromise.catch(() => undefined)
			} finally {
				imperativeSubmitActive = false
			}
			return lastSubmitPromise ?? Promise.resolve()
		},
	})
}

function getController<Schema extends StandardSchema, Context>(
	form: ClassicFormInstance<Schema, Context>,
): ClassicSubmissionController {
	const controller = controllerByForm.get(
		form as FormStore<StandardSchema, unknown>,
	)
	if (controller === undefined) {
		throw new TypeError("Fokit form submission controller is not attached")
	}

	return controller
}

function createFormData(
	form: HTMLFormElement,
	submitter: HTMLElement | null,
): FormData {
	if (submitter === null) {
		return new FormData(form)
	}

	return new FormData(form, submitter)
}

function getSubmitter(event: Event): HTMLElement | null {
	const submitter = (event as SubmitEvent).submitter
	return submitter instanceof HTMLElement ? submitter : null
}

function focusSubmitIssues<Schema extends StandardSchema, Context>(
	form: FormStore<Schema, Context>,
	formElement: HTMLFormElement,
	input: FormInput<Schema>,
): void {
	const snapshot = form.getSnapshot()
	if (!isDirtyEqual(snapshot.values, input)) {
		return
	}

	if (form.focusFirstError()) {
		return
	}

	formElement
		.querySelector<HTMLElement>(
			'[data-fokit-node="error-message"][tabindex="-1"]',
		)
		?.focus()
}
