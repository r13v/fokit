"use client"

import {
	type ComponentPropsWithoutRef,
	type FormEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
} from "react"
import type { FormResult } from "../core/form-result.js"
import {
	type ActionSubmissionAttempt,
	startActionSubmission,
} from "../core/form-store.js"
import type {
	AnyUiPresentation,
	FormStore,
	StandardSchema,
} from "../core/index.js"
import type { ControlDefinitionRegistry } from "../react/control.js"
import { ErrorSummary } from "../react/error-summary.js"
import { FieldsRenderer } from "../react/fields.js"
import type { NativeFormProps } from "../react/form.js"
import { FormProvider } from "../react/form-context.js"
import { resetFormFromEvent, useGeneratedFormId } from "../react/form-dom.js"
import { hasDisplayErrors } from "../react/form-errors.js"
import {
	type FormContextProp,
	type FormContextSource,
	type FormInstance,
	getFormKitDescriptor,
	getFormStore,
} from "../react/form-instance.js"
import {
	assertFormDataCompatible,
	HiddenInputs,
} from "../react/hidden-inputs.js"
import { useFormState } from "../react/hooks.js"
import { rejectOwnedProps } from "../react/owned-props.js"
import type { FormPleaseStyle } from "../react/slots.js"
import { booleanData } from "../react/structural-props.js"
import { type FormRuntimeOptions, useFormBinding } from "../react/use-form.js"
import {
	assertReact19ActionSupport,
	useReact19FormStatus,
} from "./action-submit.js"
import { syncActionResult } from "./result-sync.js"

export type ActionFormProps<
	Schema extends StandardSchema = StandardSchema,
	Context = unknown,
	Controls extends ControlDefinitionRegistry = ControlDefinitionRegistry,
	Presentation extends AnyUiPresentation = AnyUiPresentation,
	Owner = unknown,
> = NativeFormProps &
	Omit<FormRuntimeOptions<Schema, NoInfer<Context>>, "context" | "onSubmit"> &
	FormContextProp<Context> & {
		readonly form: FormInstance<
			Schema,
			NoInfer<Context>,
			Controls,
			Presentation,
			Owner
		> &
			FormContextSource<Context>
		readonly action: NonNullable<ComponentPropsWithoutRef<"form">["action"]>
		readonly result?: FormResult | null
		readonly children?: ReactNode
		readonly style?: FormPleaseStyle
	}
export function ActionForm<
	Schema extends StandardSchema,
	Context = unknown,
	Controls extends ControlDefinitionRegistry = ControlDefinitionRegistry,
	Presentation extends AnyUiPresentation = AnyUiPresentation,
	Owner = unknown,
>({
	form: suppliedForm,
	context,
	disabled,
	readOnly,
	validation,
	beforeUpdate,
	afterUpdate,
	action,
	result,
	children,
	id,
	...nativeProps
}: ActionFormProps<Schema, Context, Controls, Presentation, Owner>) {
	rejectOwnedProps(nativeProps, "form", ["onReset", "onSubmit", "noValidate"])
	assertReact19ActionSupport()

	const attemptRef = useRef<ActionSubmissionAttempt<Schema>>(undefined)
	const attemptStoreRef = useRef<FormStore<Schema, Context>>(undefined)
	const formElementRef = useRef<HTMLFormElement | null>(null)
	const observedPendingRef = useRef(false)
	const lastResultRef = useRef<FormResult | null | undefined>(undefined)
	const generatedId = useGeneratedFormId(id)
	const descriptor = getFormKitDescriptor(suppliedForm)
	const form = useFormBinding(suppliedForm, {
		context,
		disabled,
		readOnly,
		validation,
		beforeUpdate,
		afterUpdate,
	} as FormRuntimeOptions<Schema, Context>)
	const controls = descriptor.controls as Controls
	const slots = descriptor.slots
	const store = getFormStore(form)
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

	useEffect(
		() => () => {
			if (attemptStoreRef.current !== store) return
			attemptRef.current?.finish()
			attemptRef.current = undefined
			attemptStoreRef.current = undefined
			observedPendingRef.current = false
		},
		[store],
	)

	useEffect(() => {
		if (
			result === null ||
			result === undefined ||
			Object.is(result, lastResultRef.current)
		) {
			return
		}

		lastResultRef.current = result
		const attempt = attemptRef.current
		syncActionResult(
			store,
			result,
			attempt,
			formElementRef.current ?? undefined,
		)
		if (attempt !== undefined && Object.is(attemptRef.current, attempt)) {
			attemptRef.current = undefined
			attemptStoreRef.current = undefined
		}
	}, [result, store])

	const handlePendingChange = useCallback(
		(pending: boolean) => {
			if (pending) {
				observedPendingRef.current = true
				if (attemptRef.current === undefined) {
					const snapshot = form.getSnapshot()
					if (!snapshot.resolvedUi.disabled && !snapshot.isSubmitting) {
						attemptRef.current = startActionSubmission(store)
						attemptStoreRef.current = store
					}
				}
				return
			}

			if (!observedPendingRef.current) {
				return
			}

			observedPendingRef.current = false
			attemptRef.current?.finish()
		},
		[form, store],
	)

	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		const snapshot = form.getSnapshot()
		if (snapshot.resolvedUi.disabled || snapshot.isSubmitting) {
			event.preventDefault()
			event.stopPropagation()
			return
		}

		try {
			assertActionFormCompatible(snapshot, controls)
		} catch (error) {
			event.preventDefault()
			event.stopPropagation()
			throw error
		}

		attemptRef.current = startActionSubmission(store)
		attemptStoreRef.current = store
	}

	return (
		<FormProvider form={form} idPrefix={generatedId}>
			<form
				{...nativeProps}
				action={action}
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
				ref={(element) => {
					formElementRef.current = element
				}}
				onReset={(event) => resetFormFromEvent(form, event)}
				onSubmit={handleSubmit}
			>
				<ActionPendingBridge onPendingChange={handlePendingChange} />
				<ErrorSummary form={form} slots={slots} />
				<FieldsRenderer controls={controls} form={form} slots={slots} />
				<HiddenInputs
					compatibilityOwner="ActionForm"
					controls={controls}
					form={form}
				/>
				{children}
			</form>
		</FormProvider>
	)
}

export function assertActionFormCompatible<Context>(
	snapshot: ReturnType<FormStore<StandardSchema, Context>["getSnapshot"]>,
	controls: ControlDefinitionRegistry,
): void {
	assertFormDataCompatible(snapshot, controls, {
		owner: "ActionForm",
		rejectUnavailable: true,
	})
}

function ActionPendingBridge({
	onPendingChange,
}: {
	readonly onPendingChange: (pending: boolean) => void
}) {
	const status = useReact19FormStatus()

	useEffect(() => {
		onPendingChange(status.pending)
	}, [onPendingChange, status.pending])

	return null
}
