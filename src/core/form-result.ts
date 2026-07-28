import type { FormIssue } from "./issues.js"
import { formatPath } from "./path.js"

export type SubmissionIssue = Omit<FormIssue, "source"> & {
	readonly source: "schema" | "server"
}

export type FormResult =
	| {
			readonly status: "success"
			readonly reset?: "defaults" | "submitted"
	  }
	| {
			readonly status: "error"
			readonly issues: readonly SubmissionIssue[]
	  }

function normalizeSubmissionIssue(issue: SubmissionIssue): SubmissionIssue {
	if (!isObjectRecord(issue)) {
		throw new TypeError("Submission issue must be an object")
	}

	const source = normalizeSubmissionIssueSource(issue.source)
	const message = normalizeSubmissionIssueMessage(issue.message)
	const code = normalizeSubmissionIssueCode(issue.code)
	const path = issue.path === undefined ? undefined : formatPath(issue.path)

	return Object.freeze({
		source,
		message,
		...(code === undefined ? {} : { code }),
		...(path === undefined ? {} : { path }),
	})
}

export function normalizeSubmissionIssues(
	issues: readonly SubmissionIssue[],
): readonly SubmissionIssue[] {
	return Object.freeze(issues.map((issue) => normalizeSubmissionIssue(issue)))
}

function normalizeSubmissionIssueSource(
	source: unknown,
): SubmissionIssue["source"] {
	if (source === "schema" || source === "server") {
		return source
	}

	throw new TypeError(`Unsupported submission issue source "${String(source)}"`)
}

function normalizeSubmissionIssueMessage(message: unknown): string {
	if (typeof message !== "string") {
		throw new TypeError("Submission issue message must be a string")
	}

	return message
}

function normalizeSubmissionIssueCode(code: unknown): string | undefined {
	if (code === undefined) {
		return undefined
	}

	if (typeof code !== "string") {
		throw new TypeError("Submission issue code must be a string")
	}

	return code
}

function isObjectRecord(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === "object" && value !== null
}
