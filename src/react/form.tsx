"use client"

import {
	type ComponentPropsWithoutRef,
	type ReactNode,
	useCallback,
} from "react"

import type { StandardSchema, UiPresentation } from "../core/index.js"
import type { ControlDefinitionRegistry } from "./control.js"
import { FormProvider } from "./form-context.js"
import { resetFormFromEvent, useGeneratedFormId } from "./form-dom.js"
import { hasDisplayErrors } from "./form-errors.js"
import {
	assertFormKitOwnership,
	type FormInstance,
	type FormKitDescriptor,
	type FormKitOwner,
} from "./form-instance.js"
import { assertFormDataCompatible, HiddenInputs } from "./hidden-inputs.js"
import { useFormState } from "./hooks.js"
import { rejectOwnedProps } from "./owned-props.js"
import type { FormPleaseStyle, ReactUiPresentation } from "./slots.js"
import { booleanData } from "./structural-props.js"
import {
	registerClassicForm,
	rejectClassicFormSubmit,
	submitClassicForm,
} from "./submission.js"

export type NativeFormProps = Omit<
	ComponentPropsWithoutRef<"form">,
	"action" | "children" | "noValidate" | "onReset" | "onSubmit" | "style"
> & {
	readonly style?: FormPleaseStyle
}

export type KitFormProps<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlDefinitionRegistry | undefined = undefined,
	Presentation extends UiPresentation = ReactUiPresentation,
	Owner = FormKitOwner<RequiredControls, Presentation>,
> = NativeFormProps & {
	readonly form: FormInstance<
		Schema,
		Context,
		RequiredControls,
		Presentation,
		Owner
	>
	readonly controls?: ControlDefinitionRegistry
	readonly children?: ReactNode
}

export type KitFormComponent<
	Controls extends ControlDefinitionRegistry | undefined = undefined,
	Presentation extends UiPresentation = ReactUiPresentation,
	Owner = FormKitOwner<Controls, Presentation>,
> = <Schema extends StandardSchema, Context = unknown>(
	props: Omit<
		KitFormProps<Schema, Context, Controls, Presentation, Owner>,
		"controls"
	>,
) => ReactNode

export function KitForm<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlDefinitionRegistry | undefined = undefined,
	Presentation extends UiPresentation = ReactUiPresentation,
	Owner = FormKitOwner<RequiredControls, Presentation>,
>(props: KitFormProps<Schema, Context, RequiredControls, Presentation, Owner>) {
	rejectOwnedProps(props, "form", [
		"action",
		"onReset",
		"onSubmit",
		"noValidate",
	])
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

	return (
		<FormProvider form={form} idPrefix={generatedId}>
			<form
				{...nativeProps}
				data-dirty={booleanData(state.dirty)}
				data-disabled={booleanData(state.disabled)}
				data-fp-node="form"
				data-invalid={booleanData(state.invalid)}
				data-readonly={booleanData(state.readOnly)}
				data-touched={booleanData(state.touched)}
				data-validating={booleanData(state.validating)}
				data-validation-status={state.validationStatus}
				id={generatedId}
				noValidate
				ref={handleFormRef}
				onReset={(event) => resetFormFromEvent(form, event)}
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
	Owner = FormKitOwner<Controls, Presentation>,
>(
	controls: Controls,
	descriptor: FormKitDescriptor,
): KitFormComponent<Controls, Presentation, Owner> {
	function Form<Schema extends StandardSchema, Context>(
		props: Omit<
			KitFormProps<Schema, Context, Controls, Presentation, Owner>,
			"controls"
		>,
	) {
		assertFormKitOwnership(props.form as never, descriptor, "kit.Form")
		return <KitForm {...props} controls={controls} />
	}

	return Form
}
