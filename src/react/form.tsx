"use client"

import {
	type ComponentPropsWithoutRef,
	type FormEvent,
	type ReactNode,
	useId,
} from "react"

import { FormProvider } from "./form-context.js"
import { useFormState } from "./hooks.js"
import type { FokitStyle } from "./slots.js"
import type { FormInstance } from "./use-form.js"

export type NativeFormProps = Omit<
	ComponentPropsWithoutRef<"form">,
	"action" | "children" | "noValidate" | "onReset" | "onSubmit" | "style"
> & {
	readonly style?: FokitStyle
}

export type KitFormProps<
	Schema extends import("../core/index.js").StandardSchema,
	Context = unknown,
> = NativeFormProps & {
	readonly form: FormInstance<Schema, Context>
	readonly children?: ReactNode
}

export function KitForm<
	Schema extends import("../core/index.js").StandardSchema,
	Context = unknown,
>(props: KitFormProps<Schema, Context>) {
	rejectOwnedFormProps(props)
	const { form, children, id, ...nativeProps } = props
	const generatedId = useGeneratedFormId(id)
	const state = useFormState(form, (snapshot) => ({
		dirty: snapshot.isDirty,
		disabled: snapshot.resolvedUi.disabled,
		invalid: hasDisplayErrors(snapshot.displayErrors),
		readOnly: snapshot.resolvedUi.readOnly,
		touched: snapshot.isTouched,
		validating: snapshot.isValidating,
		validationStatus: snapshot.validationStatus,
		submitting: snapshot.isSubmitting,
	}))

	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault()
		if (state.disabled || state.submitting) {
			event.stopPropagation()
		}
	}

	function handleReset(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault()
		form.reset()
	}

	return (
		<FormProvider form={form} idPrefix={generatedId}>
			<form
				{...nativeProps}
				data-dirty={booleanData(state.dirty)}
				data-disabled={booleanData(state.disabled)}
				data-fokit-node="form"
				data-invalid={booleanData(state.invalid)}
				data-readonly={booleanData(state.readOnly)}
				data-touched={booleanData(state.touched)}
				data-validating={booleanData(state.validating)}
				data-validation-status={state.validationStatus}
				id={generatedId}
				noValidate
				onReset={handleReset}
				onSubmit={handleSubmit}
			>
				{children}
			</form>
		</FormProvider>
	)
}

function rejectOwnedFormProps(props: object): void {
	for (const prop of ["action", "onReset", "onSubmit", "noValidate"] as const) {
		if (Object.hasOwn(props, prop)) {
			throw new TypeError(`Fokit owns the ${prop} form prop`)
		}
	}
}

function useGeneratedFormId(explicitId: string | undefined): string {
	const reactId = useId()
	return explicitId ?? `fokit-${sanitizeDomId(reactId)}`
}

function sanitizeDomId(value: string): string {
	return value.replaceAll(/[^A-Za-z0-9_-]/g, "")
}

function booleanData(value: boolean): "" | undefined {
	return value ? "" : undefined
}

function hasDisplayErrors(
	errors: import("../core/index.js").DisplayFormErrors,
): boolean {
	if (errors.form.length > 0) {
		return true
	}

	for (const fieldErrors of errors.fields.values()) {
		if (fieldErrors.length > 0) {
			return true
		}
	}

	return false
}
