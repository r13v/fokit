"use client"

import { useEffect, useRef } from "react"

import type {
	ControlRegistry,
	NormalizedFormDefinition,
	StandardSchema,
	UiPresentation,
} from "../core/index.js"
import {
	createForm,
	type FormInstance,
	FormInstanceImpl,
	type FormRuntimeOptions,
	getFormInstanceImpl,
	type UseFormOptions,
} from "./form-instance.js"
import type { ReactUiPresentation } from "./slots.js"

export type {
	AnyFormInstance,
	FormInstance,
	FormRuntimeOptions,
	UseFormOptions,
} from "./form-instance.js"
export { createForm } from "./form-instance.js"

export function useForm<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlRegistry | undefined = undefined,
	Presentation extends UiPresentation = ReactUiPresentation,
>(
	form: FormInstance<Schema, Context, RequiredControls, Presentation>,
	options: FormRuntimeOptions<Schema, Context>,
): FormInstance<Schema, Context, RequiredControls, Presentation>
export function useForm<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlRegistry | undefined = undefined,
	Presentation extends UiPresentation = ReactUiPresentation,
>(
	definition: NormalizedFormDefinition<
		Schema,
		RequiredControls,
		unknown,
		Presentation
	>,
	options: UseFormOptions<Schema, Context>,
): FormInstance<Schema, Context, RequiredControls, Presentation>
export function useForm<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlRegistry | undefined = undefined,
	Presentation extends UiPresentation = ReactUiPresentation,
>(
	formOrDefinition:
		| FormInstance<Schema, Context, RequiredControls, Presentation>
		| NormalizedFormDefinition<Schema, RequiredControls, unknown, Presentation>,
	options:
		| FormRuntimeOptions<Schema, Context>
		| UseFormOptions<Schema, Context>,
): FormInstance<Schema, Context, RequiredControls, Presentation> {
	const createdFormRef =
		useRef<FormInstance<Schema, Context, RequiredControls, Presentation>>(
			undefined,
		)
	const ownerRef = useRef<object>({})
	const runtimeOptionsRef = useRef(
		options as FormRuntimeOptions<Schema, Context>,
	)
	let form: FormInstance<Schema, Context, RequiredControls, Presentation>

	if (formOrDefinition instanceof FormInstanceImpl) {
		form = formOrDefinition
	} else {
		if (createdFormRef.current === undefined) {
			createdFormRef.current = createForm(
				formOrDefinition as NormalizedFormDefinition<
					Schema,
					RequiredControls,
					unknown,
					Presentation
				>,
				options as UseFormOptions<Schema, Context>,
			)
		}
		form = createdFormRef.current
	}

	useEffect(() => {
		runtimeOptionsRef.current = options as FormRuntimeOptions<Schema, Context>
	})

	useEffect(() => {
		const instance = getFormInstanceImpl(form)
		instance.bind(ownerRef.current, runtimeOptionsRef.current)
		return () => {
			instance.unbind(ownerRef.current)
		}
	}, [form])

	useEffect(() => {
		getFormInstanceImpl(form).updateBinding(
			ownerRef.current,
			runtimeOptionsRef.current,
		)
	})

	return form
}
