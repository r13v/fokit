import type { DisplayFormErrors, FormIssue } from "../core/index.js"

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
