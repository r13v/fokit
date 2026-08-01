"use client"

import {
	type ComponentPropsWithoutRef,
	type FormEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react"
import type { FormResult } from "../core/form-result.js"
import {
	type ActionSubmissionAttempt,
	startActionSubmission,
} from "../core/form-store.js"
import type {
	FormInput,
	FormStore,
	NormalizedFormDefinition,
	StandardSchema,
} from "../core/index.js"
import type { ControlDefinitionRegistry } from "../react/control.js"
import type { FormKit } from "../react/create-form-kit.js"
import { ErrorSummary } from "../react/error-summary.js"
import { FieldsRenderer } from "../react/fields.js"
import type { NativeFormProps } from "../react/form.js"
import { FormProvider } from "../react/form-context.js"
import { resetFormFromEvent, useGeneratedFormId } from "../react/form-dom.js"
import { hasDisplayErrors } from "../react/form-errors.js"
import { getFormStore } from "../react/form-instance.js"
import {
	assertFormDataCompatible,
	HiddenInputs,
} from "../react/hidden-inputs.js"
import { useFormState } from "../react/hooks.js"
import { rejectOwnedProps } from "../react/owned-props.js"
import type { RenderNodeComponent } from "../react/render-node.js"
import type { FormPleaseStyle, ReactUiPresentation } from "../react/slots.js"
import { booleanData } from "../react/structural-props.js"
import type { FormRuntimeOptions } from "../react/use-form.js"
import {
	assertReact19ActionSupport,
	useReact19FormStatus,
} from "./action-submit.js"
import { syncActionResult } from "./result-sync.js"

export type ActionFormProps<
	Controls extends ControlDefinitionRegistry = ControlDefinitionRegistry,
	Schema extends StandardSchema = StandardSchema,
	Context = unknown,
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
> = NativeFormProps &
	Omit<FormRuntimeOptions<Schema, Context>, "onSubmit"> & {
		readonly kit: Pick<
			FormKit<Controls, FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>,
			"controls" | "slots" | "createForm" | "useForm"
		>
		readonly definition: NormalizedFormDefinition<
			Schema,
			Controls,
			RenderNodeComponent,
			ReactUiPresentation<
				NoInfer<FieldSlotOptions>,
				NoInfer<SectionSlotOptions>,
				NoInfer<ArraySlotOptions>
			>
		>
		readonly defaultValues: FormInput<Schema>
		readonly action: NonNullable<ComponentPropsWithoutRef<"form">["action"]>
		readonly result?: FormResult | null
		readonly children?: ReactNode
		readonly style?: FormPleaseStyle
	}

export function ActionForm<
	Controls extends ControlDefinitionRegistry,
	Schema extends StandardSchema,
	Context = unknown,
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
>({
	kit,
	definition,
	defaultValues,
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
}: ActionFormProps<
	Controls,
	Schema,
	Context,
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions
>) {
	rejectOwnedProps(nativeProps, "form", ["onReset", "onSubmit", "noValidate"])
	assertReact19ActionSupport()

	const attemptRef = useRef<ActionSubmissionAttempt<Schema>>(undefined)
	const formElementRef = useRef<HTMLFormElement | null>(null)
	const observedPendingRef = useRef(false)
	const lastResultRef = useRef<FormResult | null | undefined>(undefined)
	const generatedId = useGeneratedFormId(id)
	const [createdForm] = useState(() =>
		kit.createForm(definition, {
			defaultValues,
			context,
			disabled,
			readOnly,
			validation,
			beforeUpdate,
			afterUpdate,
		}),
	)
	const form = kit.useForm(createdForm, {
		context,
		disabled,
		readOnly,
		validation,
		beforeUpdate,
		afterUpdate: (event) => {
			attemptRef.current?.recordChanges(
				event.changes.map((change) => change.path),
			)
			afterUpdate?.(event)
		},
	})
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
			assertActionFormCompatible(snapshot, kit.controls)
		} catch (error) {
			event.preventDefault()
			event.stopPropagation()
			throw error
		}

		attemptRef.current = startActionSubmission(store)
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
				<ErrorSummary form={form} slots={kit.slots} />
				<FieldsRenderer controls={kit.controls} form={form} slots={kit.slots} />
				<HiddenInputs
					compatibilityOwner="ActionForm"
					controls={kit.controls}
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
