"use client"

import {
	type ComponentPropsWithoutRef,
	type FormEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
} from "react"
import type { FormResult } from "../core/form-result.js"
import type {
	FormInput,
	FormStore,
	NormalizedFormDefinition,
	StandardSchema,
} from "../core/index.js"
import { parsePath } from "../core/index.js"
import type { ControlDefinitionRegistry } from "../react/control.js"
import type { FormKit } from "../react/create-form-kit.js"
import { ErrorSummary } from "../react/error-summary.js"
import { FieldsRenderer } from "../react/fields.js"
import type { NativeFormProps } from "../react/form.js"
import { FormProvider } from "../react/form-context.js"
import { HiddenInputs } from "../react/hidden-inputs.js"
import { useFormState } from "../react/hooks.js"
import type { FokitStyle } from "../react/slots.js"
import { type UseFormOptions, useForm } from "../react/use-form.js"
import {
	assertReact19ActionSupport,
	useReact19FormStatus,
} from "./action-submit.js"
import {
	type HydratedActionAttempt,
	recordActionAttemptChanges,
	startHydratedActionAttempt,
	syncActionResult,
} from "./result-sync.js"

export type ActionFormProps<
	Controls extends ControlDefinitionRegistry = ControlDefinitionRegistry,
	Schema extends StandardSchema = StandardSchema,
	Context = unknown,
> = NativeFormProps &
	Omit<UseFormOptions<Schema, Context>, "defaultValues" | "onSubmit"> & {
		readonly kit: Pick<FormKit<Controls>, "controls" | "slots">
		readonly definition: NormalizedFormDefinition<Schema>
		readonly defaultValues: FormInput<Schema>
		readonly action: NonNullable<ComponentPropsWithoutRef<"form">["action"]>
		readonly result?: FormResult | null
		readonly children?: ReactNode
		readonly style?: FokitStyle
	}

export function ActionForm<
	Controls extends ControlDefinitionRegistry,
	Schema extends StandardSchema,
	Context = unknown,
>({
	kit,
	definition,
	defaultValues,
	context,
	disabled,
	readOnly,
	validation,
	beforeUpdate,
	onUpdate,
	action,
	result,
	children,
	id,
	...nativeProps
}: ActionFormProps<Controls, Schema, Context>) {
	rejectOwnedActionFormProps(nativeProps)
	assertReact19ActionSupport()

	const attemptRef = useRef<HydratedActionAttempt<Schema>>(undefined)
	const formElementRef = useRef<HTMLFormElement | null>(null)
	const observedPendingRef = useRef(false)
	const lastResultRef = useRef<FormResult | null | undefined>(undefined)
	const generatedId = useGeneratedFormId(id)
	const form = useForm(definition, {
		defaultValues,
		context,
		disabled,
		readOnly,
		validation,
		beforeUpdate,
		onUpdate: (event) => {
			recordActionAttemptChanges(
				attemptRef.current,
				event.changes.map((change) => change.path),
			)
			onUpdate?.(event)
		},
	})
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
		syncActionResult(form, result, attempt, formElementRef.current ?? undefined)
		if (attempt !== undefined && Object.is(attemptRef.current, attempt)) {
			attemptRef.current = undefined
		}
	}, [form, result])

	const handlePendingChange = useCallback(
		(pending: boolean) => {
			if (pending) {
				observedPendingRef.current = true
				if (attemptRef.current === undefined) {
					const snapshot = form.getSnapshot()
					if (!snapshot.resolvedUi.disabled && !snapshot.isSubmitting) {
						attemptRef.current = startHydratedActionAttempt(form)
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
		[form],
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

		attemptRef.current = startHydratedActionAttempt(form)
	}

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
				action={action}
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
				ref={(element) => {
					formElementRef.current = element
				}}
				onReset={handleReset}
				onSubmit={handleSubmit}
			>
				<ActionPendingBridge onPendingChange={handlePendingChange} />
				<ErrorSummary form={form} slots={kit.slots} />
				<FieldsRenderer controls={kit.controls} form={form} slots={kit.slots} />
				<HiddenInputs controls={kit.controls} form={form} />
				{children}
			</form>
		</FormProvider>
	)
}

export function assertActionFormCompatible<Context>(
	snapshot: ReturnType<FormStore<StandardSchema, Context>["getSnapshot"]>,
	controls: ControlDefinitionRegistry,
): void {
	for (const field of Object.values(snapshot.resolvedUi.fieldsByPath)) {
		if (!hasPathValue(snapshot.values, field.path)) {
			continue
		}

		const control = controls[field.control]
		if (control === undefined) {
			throw new TypeError(`Unknown control "${field.control}"`)
		}

		if (control.formData.mode === "none") {
			throw new TypeError(
				`ActionForm cannot submit field "${field.path}" because control "${field.control}" uses FormData mode "none"`,
			)
		}

		if (
			control.formData.mode === "native" &&
			(!field.visible || field.disabled) &&
			control.formData.serialize === undefined
		) {
			throw new TypeError(
				`ActionForm cannot preserve field "${field.path}" while it is invisible or disabled without a serializer`,
			)
		}
	}
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

function clearFileInputs(form: HTMLFormElement): void {
	for (const input of form.querySelectorAll<HTMLInputElement>(
		'input[type="file"]',
	)) {
		input.value = ""
	}
}

function rejectOwnedActionFormProps(props: object): void {
	for (const prop of ["onReset", "onSubmit", "noValidate"] as const) {
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

function hasPathValue(value: unknown, path: string): boolean {
	let current = value

	for (const segment of parsePath(path)) {
		if (Array.isArray(current)) {
			if (
				typeof segment !== "number" ||
				segment >= current.length ||
				!Object.hasOwn(current, segment)
			) {
				return false
			}
			current = current[segment]
			continue
		}

		if (isPlainObject(current)) {
			if (typeof segment !== "string" || !Object.hasOwn(current, segment)) {
				return false
			}
			current = current[segment]
			continue
		}

		return false
	}

	return true
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object") {
		return false
	}

	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}
