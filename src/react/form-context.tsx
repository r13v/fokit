"use client"

import { createContext, type ReactNode, useContext } from "react"

import type { StandardSchema } from "../core/index.js"
import type { FormInstance } from "./use-form.js"

const FormContext = createContext<FormInstance<StandardSchema, unknown> | null>(
	null,
)

export type FormProviderProps<
	Schema extends StandardSchema,
	Context = unknown,
> = {
	readonly form: FormInstance<Schema, Context>
	readonly children?: ReactNode
}

export function FormProvider<Schema extends StandardSchema, Context = unknown>({
	form,
	children,
}: FormProviderProps<Schema, Context>) {
	return (
		<FormContext.Provider value={form as FormInstance<StandardSchema, unknown>}>
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
		throw new Error("Fokit form context is missing")
	}

	return form as FormInstance<Schema, Context>
}
