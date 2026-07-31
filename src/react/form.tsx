"use client"

import {
	type ComponentPropsWithoutRef,
	type FormEvent,
	type ReactNode,
	useCallback,
	useId,
} from "react"

import type { StandardSchema, UiPresentation } from "../core/index.js"
import type { ControlDefinitionRegistry } from "./control.js"
import { FormProvider } from "./form-context.js"
import { assertFormDataCompatible, HiddenInputs } from "./hidden-inputs.js"
import { useFormState } from "./hooks.js"
import type { FokitStyle, ReactUiPresentation } from "./slots.js"
import {
	registerClassicForm,
	rejectClassicFormSubmit,
	submitClassicForm,
} from "./submission.js"
import type { FormInstance } from "./use-form.js"

export type NativeFormProps = Omit<
	ComponentPropsWithoutRef<"form">,
	"action" | "children" | "noValidate" | "onReset" | "onSubmit" | "style"
> & {
	readonly style?: FokitStyle
}

export type KitFormProps<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlDefinitionRegistry | undefined = undefined,
	Presentation extends UiPresentation = ReactUiPresentation,
> = NativeFormProps & {
	readonly form: FormInstance<Schema, Context, RequiredControls, Presentation>
	readonly controls?: ControlDefinitionRegistry
	readonly children?: ReactNode
}

export type KitFormComponent<
	Controls extends ControlDefinitionRegistry | undefined = undefined,
	Presentation extends UiPresentation = ReactUiPresentation,
> = <Schema extends StandardSchema, Context = unknown>(
	props: Omit<
		KitFormProps<Schema, Context, Controls, Presentation>,
		"controls"
	>,
) => ReactNode

export function KitForm<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlDefinitionRegistry | undefined = undefined,
	Presentation extends UiPresentation = ReactUiPresentation,
>(props: KitFormProps<Schema, Context, RequiredControls, Presentation>) {
	rejectOwnedFormProps(props)
	const { form, controls, children, id, ...nativeProps } = props
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

	const handleFormRef = useCallback(
		(element: HTMLFormElement | null) => {
			registerClassicForm(form, element)
		},
		[form],
	)

	function handleReset(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault()
		const previousSnapshot = form.getSnapshot()
		form.reset()
		if (form.getSnapshot() !== previousSnapshot) {
			clearFileInputs(event.currentTarget)
		}
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
				ref={handleFormRef}
				onReset={handleReset}
				onSubmit={(event) => {
					const snapshot = form.getSnapshot()
					if (!snapshot.resolvedUi.disabled && controls !== undefined) {
						try {
							assertFormDataCompatible(snapshot, controls, {
								owner: "Classic form",
								rejectUnavailable: false,
							})
						} catch (error) {
							event.preventDefault()
							event.stopPropagation()
							rejectClassicFormSubmit(form, error)
							throw error
						}
					}
					void submitClassicForm(form, event)
				}}
			>
				{children}
				{controls === undefined ? null : (
					<HiddenInputs form={form} controls={controls} />
				)}
			</form>
		</FormProvider>
	)
}

export function createFormComponent<
	Controls extends ControlDefinitionRegistry,
	Presentation extends UiPresentation = ReactUiPresentation,
>(controls: Controls): KitFormComponent<Controls, Presentation> {
	function Form<Schema extends StandardSchema, Context>(
		props: Omit<
			KitFormProps<Schema, Context, Controls, Presentation>,
			"controls"
		>,
	) {
		return <KitForm {...props} controls={controls} />
	}

	return Form
}

function clearFileInputs(form: HTMLFormElement): void {
	for (const input of form.querySelectorAll<HTMLInputElement>(
		'input[type="file"]',
	)) {
		input.value = ""
	}
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
