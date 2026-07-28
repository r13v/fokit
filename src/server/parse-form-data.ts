import type { StandardSchemaV1 } from "@standard-schema/spec"

import {
	type FormResult,
	normalizeSubmissionIssues,
	type SubmissionIssue,
} from "../core/form-result.js"
import type { FormOutput, StandardSchema } from "../core/standard-schema.js"
import {
	isPromiseLike,
	normalizeValidationResult,
	runStandardSchemaValidation,
} from "../core/validation.js"
import { normalizeFormData } from "./normalize-form-data.js"
import type { ParseFormDataOptions } from "./protocol.js"

export type ParseResult<Output> =
	| {
			readonly success: true
			readonly value: Output
	  }
	| {
			readonly success: false
			readonly issues: readonly SubmissionIssue[]
			reply(additionalIssues?: readonly SubmissionIssue[]): FormResult
	  }

export async function parseFormData<Schema extends StandardSchema>(
	formData: FormData,
	schema: Schema,
	options?: ParseFormDataOptions,
): Promise<ParseResult<FormOutput<Schema>>> {
	const normalized = normalizeFormData(formData, options)
	if (!normalized.success) {
		return createErrorResult(normalized.issues)
	}

	const controller = new AbortController()
	const validation = runStandardSchemaValidation(
		schema,
		normalized.value,
		controller.signal,
	)
	const validationResult = normalizeValidationResult(
		isPromiseLike<StandardSchemaV1.Result<FormOutput<Schema>>>(validation)
			? await validation
			: validation,
	)

	if (validationResult.success) {
		return Object.freeze({
			success: true as const,
			value: validationResult.value,
		})
	}

	return createErrorResult(
		validationResult.issues.map((issue) => ({
			source: "schema",
			message: issue.message,
			...(issue.code === undefined ? {} : { code: issue.code }),
			...(issue.path === undefined ? {} : { path: issue.path }),
		})),
	)
}

function createErrorResult(
	issues: readonly SubmissionIssue[],
): ParseResult<never> {
	const normalizedIssues = normalizeSubmissionIssues(issues)

	return Object.freeze({
		success: false,
		issues: normalizedIssues,
		reply(additionalIssues: readonly SubmissionIssue[] = []): FormResult {
			return Object.freeze({
				status: "error",
				issues: normalizeSubmissionIssues([
					...normalizedIssues,
					...additionalIssues,
				]),
			})
		},
	})
}
