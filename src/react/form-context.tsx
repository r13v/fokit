"use client"

import { createContext, type ReactNode, useContext } from "react"

import type { StandardSchema } from "../core/index.js"
import type { AnyFormInstance, FormInstance } from "./use-form.js"

type FormContextValue = {
	readonly form: AnyFormInstance<StandardSchema, unknown>
	readonly idPrefix: string
}

const FormContext = createContext<FormContextValue | null>(null)

export type FormProviderProps<
	Schema extends StandardSchema,
	Context = unknown,
> = {
	readonly form: AnyFormInstance<Schema, Context>
	readonly idPrefix?: string
	readonly children?: ReactNode
}

export function FormProvider<Schema extends StandardSchema, Context = unknown>({
	form,
	idPrefix = "form-please-form",
	children,
}: FormProviderProps<Schema, Context>) {
	return (
		<FormContext.Provider
			value={{
				form: form as AnyFormInstance<StandardSchema, unknown>,
				idPrefix,
			}}
		>
			{children}
		</FormContext.Provider>
	)
}

export function useFormContext<
	Schema extends StandardSchema,
	Context = unknown,
>(): FormInstance<Schema, Context> {
	const form = useContext(FormContext)
	if (form === null) {
		throw new Error("Form Please form context is missing")
	}

	return form.form as FormInstance<Schema, Context>
}

export function useFormIdPrefix(): string {
	const form = useContext(FormContext)
	if (form === null) {
		throw new Error("Form Please form context is missing")
	}

	return form.idPrefix
}
