import type {
	DisplayFormErrors,
	FormIssue,
	FormStore,
	StandardSchema,
} from "../core/index.js"

export function hasDisplayErrors(errors: DisplayFormErrors): boolean {
	if (errors.form.length > 0) {
		return true
	}

	for (const fieldErrors of errors.fields.values()) {
		if (fieldErrors.length > 0) {
			return true
		}
	}

	return false
}

export function createIssueKey(issue: FormIssue, index: number): string {
	return `${issue.source}:${issue.path ?? "form"}:${issue.message}:${index}`
}

export function isFocusableIssuePath<Context>(
	snapshot: ReturnType<FormStore<StandardSchema, Context>["getSnapshot"]>,
	path: string,
): boolean {
	const field = snapshot.resolvedUi.fieldsByPath[path]
	return field?.visible === true && !field.disabled && !field.readOnly
}
