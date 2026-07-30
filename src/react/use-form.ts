"use client"

import { useEffect, useRef } from "react"

import type { NormalizedFormDefinition, StandardSchema } from "../core/index.js"
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

export function useForm<Schema extends StandardSchema, Context = unknown>(
	form: FormInstance<Schema, Context>,
	options: FormRuntimeOptions<Schema, Context>,
): FormInstance<Schema, Context>
export function useForm<Schema extends StandardSchema, Context = unknown>(
	definition: NormalizedFormDefinition<Schema>,
	options: UseFormOptions<Schema, Context>,
): FormInstance<Schema, Context>
export function useForm<Schema extends StandardSchema, Context = unknown>(
	formOrDefinition:
		| FormInstance<Schema, Context>
		| NormalizedFormDefinition<Schema>,
	options:
		| FormRuntimeOptions<Schema, Context>
		| UseFormOptions<Schema, Context>,
): FormInstance<Schema, Context> {
	const createdFormRef = useRef<FormInstance<Schema, Context>>(undefined)
	const ownerRef = useRef<object>({})
	const runtimeOptionsRef = useRef(
		options as FormRuntimeOptions<Schema, Context>,
	)
	let form: FormInstance<Schema, Context>

	if (formOrDefinition instanceof FormInstanceImpl) {
		form = formOrDefinition
	} else {
		if (createdFormRef.current === undefined) {
			createdFormRef.current = createForm(
				formOrDefinition as NormalizedFormDefinition<Schema>,
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
