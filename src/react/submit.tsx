"use client"

import type { ComponentPropsWithoutRef } from "react"

import { useFormContext } from "./form-context.js"
import { useFormState } from "./hooks.js"
import { rejectOwnedProps } from "./owned-props.js"

export type SubmitProps = Omit<ComponentPropsWithoutRef<"button">, "type">

export function Submit(props: SubmitProps) {
	rejectOwnedProps(props, "submit", ["type"])
	const form = useFormContext()
	const state = useFormState(form, (snapshot) => ({
		disabled: snapshot.resolvedUi.disabled,
		submitting: snapshot.isSubmitting,
	}))
	const disabled = props.disabled === true || state.disabled || state.submitting

	return <button {...props} disabled={disabled} type="submit" />
}
