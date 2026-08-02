"use client"

import type {
	ComponentPropsWithoutRef,
	ComponentType,
	ReactElement,
} from "react"

import { useFormContext } from "./form-context.js"
import { useFormState } from "./hooks.js"
import { rejectOwnedProps } from "./owned-props.js"
import type { SubmitSlotProps } from "./slots.js"

export type SubmitProps = Omit<ComponentPropsWithoutRef<"button">, "type">
export type SubmitComponent = (props: SubmitProps) => ReactElement

export function createSubmitComponent(
	Slot: ComponentType<SubmitSlotProps>,
): SubmitComponent {
	function Submit(props: SubmitProps) {
		rejectOwnedProps(props, "submit", ["type"])
		const form = useFormContext()
		const state = useFormState(form, (snapshot) => ({
			disabled: snapshot.resolvedUi.disabled,
			isSubmitting: snapshot.isSubmitting,
			values: snapshot.values,
		}))
		const disabled =
			props.disabled === true || state.disabled || state.isSubmitting

		return (
			<Slot
				buttonProps={{ ...props, disabled, type: "submit" }}
				isSubmitting={state.isSubmitting}
				values={state.values as Readonly<Record<string, unknown>>}
			/>
		)
	}

	return Submit
}
