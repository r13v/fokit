"use client"

import { useEffect, useRef } from "react"

import type {
	ControlRegistry,
	NormalizedFormDefinition,
	StandardSchema,
} from "../core/index.js"
import {
	createForm,
	type FormInstance,
	FormInstanceImpl,
	type FormRuntimeOptions,
	getFormInstanceImpl,
	type UseFormOptions,
} from "./form-instance.js"

export type {
	FormInstance,
	FormRuntimeOptions,
	UseFormOptions,
} from "./form-instance.js"
export { createForm } from "./form-instance.js"

export function useForm<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlRegistry | undefined = undefined,
>(
	form: FormInstance<Schema, Context, RequiredControls>,
	options: FormRuntimeOptions<Schema, Context>,
): FormInstance<Schema, Context, RequiredControls>
export function useForm<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlRegistry | undefined = undefined,
>(
	definition: NormalizedFormDefinition<Schema, RequiredControls>,
	options: UseFormOptions<Schema, Context>,
): FormInstance<Schema, Context, RequiredControls>
export function useForm<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlRegistry | undefined = undefined,
>(
	formOrDefinition:
		| FormInstance<Schema, Context, RequiredControls>
		| NormalizedFormDefinition<Schema, RequiredControls>,
	options:
		| FormRuntimeOptions<Schema, Context>
		| UseFormOptions<Schema, Context>,
): FormInstance<Schema, Context, RequiredControls> {
	const createdFormRef =
		useRef<FormInstance<Schema, Context, RequiredControls>>(undefined)
	const ownerRef = useRef<object>({})
	const runtimeOptionsRef = useRef(
		options as FormRuntimeOptions<Schema, Context>,
	)
	let form: FormInstance<Schema, Context, RequiredControls>

	if (formOrDefinition instanceof FormInstanceImpl) {
		form = formOrDefinition
	} else {
		if (createdFormRef.current === undefined) {
			createdFormRef.current = createForm(
				formOrDefinition as NormalizedFormDefinition<Schema, RequiredControls>,
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
