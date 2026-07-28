"use client"

import { useEffect, useRef } from "react"

import {
	createFormStore,
	type FormInput,
	type FormStore,
	type FormStoreOptions,
	type NormalizedFormDefinition,
	type StandardSchema,
} from "../core/index.js"

export type FormInstance<
	Schema extends StandardSchema,
	Context = unknown,
> = FormStore<Schema, Context>

export type UseFormOptions<
	Schema extends StandardSchema,
	Context = unknown,
> = Omit<FormStoreOptions<Schema, Context>, "definition">

export function useForm<Schema extends StandardSchema, Context = unknown>(
	definition: NormalizedFormDefinition<Schema>,
	options: UseFormOptions<Schema, Context> & {
		readonly defaultValues: FormInput<Schema>
	},
): FormInstance<Schema, Context> {
	const optionsRef = useRef(options)
	const contextRef = useRef(options.context as Context)
	const formRef = useRef<FormInstance<Schema, Context>>(undefined)

	if (formRef.current === undefined) {
		formRef.current = createFormStore({
			definition,
			defaultValues: options.defaultValues,
			context: options.context,
			disabled: options.disabled,
			readOnly: options.readOnly,
			validation: options.validation,
			beforeUpdate: (event) => optionsRef.current.beforeUpdate?.(event),
			onUpdate: (event) => {
				optionsRef.current.onUpdate?.(event)
			},
		})
	}

	useEffect(() => {
		optionsRef.current = options
	})

	useEffect(() => {
		if (Object.is(contextRef.current, options.context)) {
			return
		}

		contextRef.current = options.context as Context
		formRef.current?.replaceContext(options.context as Context)
	}, [options.context])

	return formRef.current
}
