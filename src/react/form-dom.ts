"use client"

import { type FormEvent, useId } from "react"

type ResettableForm = {
	getSnapshot(): unknown
	reset(): void
}

export function useGeneratedFormId(explicitId: string | undefined): string {
	const reactId = useId()
	return explicitId ?? `fokit-${sanitizeDomId(reactId)}`
}

export function resetFormFromEvent(
	form: ResettableForm,
	event: FormEvent<HTMLFormElement>,
): void {
	event.preventDefault()
	const previousSnapshot = form.getSnapshot()
	form.reset()
	if (form.getSnapshot() !== previousSnapshot) {
		clearFileInputs(event.currentTarget)
	}
}

function sanitizeDomId(value: string): string {
	return value.replaceAll(/[^A-Za-z0-9_-]/g, "")
}

function clearFileInputs(form: HTMLFormElement): void {
	for (const input of form.querySelectorAll<HTMLInputElement>(
		'input[type="file"]',
	)) {
		input.value = ""
	}
}
