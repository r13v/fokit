"use client"

import { useEffect, useRef } from "react"

import type {
	ControlRegistry,
	StandardSchema,
	UiPresentation,
} from "../core/index.js"
import {
	type FormInstance,
	type FormRuntimeOptions,
	getFormInstanceImpl,
} from "./form-instance.js"

export type {
	AnyFormInstance,
	CreateFormOptions,
	FormInstance,
	FormRuntimeOptions,
} from "./form-instance.js"

export function useFormBinding<
	Schema extends StandardSchema,
	Context,
	Controls extends ControlRegistry,
	Presentation extends UiPresentation,
	Owner,
>(
	form: FormInstance<Schema, Context, Controls, Presentation, Owner>,
	options: FormRuntimeOptions<Schema, Context>,
): typeof form {
	const ownerRef = useRef<object>({})
	const runtimeOptionsRef = useRef(options)
	runtimeOptionsRef.current = options

	useEffect(() => {
		const instance = getFormInstanceImpl(form)
		instance.bind(ownerRef.current, runtimeOptionsRef.current)
		instance.finalizeBinding()
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
