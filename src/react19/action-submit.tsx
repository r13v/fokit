"use client"

import type { ComponentPropsWithoutRef } from "react"
import * as React from "react"
import * as ReactDom from "react-dom"

import { useFormContext } from "../react/form-context.js"
import { useFormState } from "../react/hooks.js"
import { rejectOwnedProps } from "../react/owned-props.js"

export type ActionSubmitProps = Omit<ComponentPropsWithoutRef<"button">, "type">

type FormStatus = {
	readonly pending: boolean
}

export function ActionSubmit(props: ActionSubmitProps) {
	rejectOwnedProps(props, "submit", ["type"])
	const status = useReact19FormStatus()
	const form = useFormContext()
	const state = useFormState(form, (snapshot) => ({
		disabled: snapshot.resolvedUi.disabled,
		submitting: snapshot.isSubmitting,
	}))
	const disabled =
		props.disabled === true ||
		status.pending ||
		state.disabled ||
		state.submitting

	return <button {...props} disabled={disabled} type="submit" />
}

export function useReact19FormStatus(): FormStatus {
	return getReact19ActionHooks().useFormStatus()
}

export function assertReact19ActionSupport(): void {
	getReact19ActionHooks()
}

function getReact19ActionHooks(): {
	readonly useFormStatus: () => FormStatus
} {
	const useFormStatus = (
		ReactDom as unknown as {
			readonly useFormStatus?: () => FormStatus
		}
	).useFormStatus
	const useActionState = (
		React as unknown as {
			readonly useActionState?: unknown
		}
	).useActionState

	if (
		typeof useFormStatus !== "function" ||
		typeof useActionState !== "function"
	) {
		throw new TypeError(
			"form-please/react19 requires React 19 Action support. Use the main form-please entry with kit.Form for React 18.",
		)
	}

	return {
		useFormStatus,
	}
}
