import type {
	DocumentCommittedEvent,
	FieldBlurredEvent,
	FieldTouchedEvent,
	FormDocumentEvent,
	FormRuntimeEvent,
	IssuesChange,
	IssuesChangedEvent,
	RuntimeReplacedEvent,
	SubmissionFinishedEvent,
	SubmissionStartedEvent,
	ValidationFailedEvent,
	ValidationResolvedEvent,
	ValidationStartedEvent,
} from "./form-events.js"
import type {
	FormDocument,
	FormRuntimeOptionsState,
	FormRuntimeState,
	SubmissionState,
	ValidationState,
} from "./form-model.js"
import {
	clearImperativeIssues,
	clearServerIssuesForChanges,
	createIssueState,
	exposeIssuePaths,
	type FormIssue,
	type ImperativeFormIssue,
	replaceSchemaIssues,
	replaceServerIssues,
	setImperativeIssues,
} from "./issues.js"
import { addTouchedPath } from "./metadata.js"
import { formatPath } from "./path.js"
import type { ResolvedUiState } from "./resolve-ui.js"

type CreateFormRuntimeStateOptions<Input, Context> = {
	readonly baselineDocument: FormDocument<Input>
	readonly context: Context
	readonly options: FormRuntimeOptionsState
	readonly resolvedUi: ResolvedUiState<Context>
	readonly documentRevision?: number
	readonly touchedPaths?: Iterable<string>
	readonly issues?: FormRuntimeState<Context, Input>["issues"]
	readonly validation?: ValidationState
	readonly submission?: SubmissionState
}

export function createFormRuntimeState<Input, Context>(
	options: CreateFormRuntimeStateOptions<Input, Context>,
): FormRuntimeState<Context, Input> {
	const documentRevision = options.documentRevision ?? 0
	assertNonNegativeInteger(documentRevision, "Document revision")

	return Object.freeze({
		baselineDocument: options.baselineDocument,
		documentRevision,
		touchedPaths: new Set(options.touchedPaths),
		issues: options.issues ?? createIssueState(),
		validation:
			options.validation ?? createIdleValidationState(documentRevision),
		submission: options.submission ?? createIdleSubmissionState(),
		context: options.context as Readonly<Context>,
		options: freezeRuntimeOptions(options.options),
		resolvedUi: options.resolvedUi,
	})
}

export function createRuntimeReplacedEvent<Context>(options: {
	readonly sequence: number
	readonly context: Context
	readonly runtimeOptions: FormRuntimeOptionsState
	readonly resolvedUi: ResolvedUiState<Context>
}): RuntimeReplacedEvent<Context> {
	assertEventSequence(options.sequence)
	return Object.freeze({
		type: "runtime/replaced",
		sequence: options.sequence,
		context: options.context as Readonly<Context>,
		options: freezeRuntimeOptions(options.runtimeOptions),
		resolvedUi: options.resolvedUi,
	})
}

export function createValidationStartedEvent(options: {
	readonly sequence: number
	readonly attemptId: number
	readonly documentRevision: number
	readonly kind: "nonSubmit" | "submit"
	readonly exposeAll?: boolean
	readonly exposePaths?: readonly string[]
}): ValidationStartedEvent {
	assertRuntimeAttempt(options)
	return Object.freeze({
		type: "validation/started",
		sequence: options.sequence,
		attemptId: options.attemptId,
		documentRevision: options.documentRevision,
		kind: options.kind,
		exposeAll: options.exposeAll === true,
		exposePaths: freezePaths(options.exposePaths ?? []),
	})
}

export function createValidationResolvedEvent(
	options:
		| {
				readonly sequence: number
				readonly attemptId: number
				readonly documentRevision: number
				readonly status: "valid"
		  }
		| {
				readonly sequence: number
				readonly attemptId: number
				readonly documentRevision: number
				readonly status: "invalid"
				readonly issues: readonly FormIssue[]
		  },
): ValidationResolvedEvent {
	assertRuntimeAttempt(options)
	if (options.status === "valid") {
		return Object.freeze({
			type: "validation/resolved",
			sequence: options.sequence,
			attemptId: options.attemptId,
			documentRevision: options.documentRevision,
			status: "valid",
		})
	}

	return Object.freeze({
		type: "validation/resolved",
		sequence: options.sequence,
		attemptId: options.attemptId,
		documentRevision: options.documentRevision,
		status: "invalid",
		issues: freezeIssues(options.issues),
	})
}

export function createValidationFailedEvent(options: {
	readonly sequence: number
	readonly attemptId: number
	readonly documentRevision: number
}): ValidationFailedEvent {
	assertRuntimeAttempt(options)
	return Object.freeze({
		type: "validation/failed",
		...options,
	})
}

export function createSubmissionStartedEvent(options: {
	readonly sequence: number
	readonly attemptId: number
	readonly documentRevision: number
}): SubmissionStartedEvent {
	assertRuntimeAttempt(options)
	return Object.freeze({
		type: "submission/started",
		...options,
	})
}

export function createSubmissionFinishedEvent(options: {
	readonly sequence: number
	readonly attemptId: number
	readonly documentRevision: number
}): SubmissionFinishedEvent {
	assertRuntimeAttempt(options)
	return Object.freeze({
		type: "submission/finished",
		...options,
	})
}

export function createFieldTouchedEvent(options: {
	readonly sequence: number
	readonly path: string
}): FieldTouchedEvent {
	assertEventSequence(options.sequence)
	return Object.freeze({
		type: "field/touched",
		sequence: options.sequence,
		path: formatPath(options.path),
	})
}

export function createFieldBlurredEvent(options: {
	readonly sequence: number
	readonly path: string
}): FieldBlurredEvent {
	assertEventSequence(options.sequence)
	return Object.freeze({
		type: "field/blurred",
		sequence: options.sequence,
		path: formatPath(options.path),
	})
}

export function createIssuesChangedEvent(options: {
	readonly sequence: number
	readonly change: IssuesChange
}): IssuesChangedEvent {
	assertEventSequence(options.sequence)
	return Object.freeze({
		type: "issues/changed",
		sequence: options.sequence,
		change: freezeIssuesChange(options.change),
	})
}

export function reduceFormRuntime<Input, Context>(
	state: FormRuntimeState<Context, Input>,
	event: FormRuntimeEvent<Context> | FormDocumentEvent<Input>,
	document: FormDocument<Input>,
): FormRuntimeState<Context, Input> {
	switch (event.type) {
		case "document/committed":
			return reduceDocumentCommit(state, event, document)
		case "document/restored":
			return reduceDocumentRestore(state)
		case "runtime/replaced":
			return reduceRuntimeReplacement(state, event)
		case "field/touched":
			return reduceTouched(state, event.path, false)
		case "field/blurred":
			return reduceTouched(state, event.path, true)
		case "issues/changed":
			return reduceIssuesChanged(state, event.change)
		case "validation/started":
			if (event.documentRevision !== state.documentRevision) return state
			return replaceRuntimeState(state, {
				validation: Object.freeze({
					status: "validating",
					attemptId: event.attemptId,
					documentRevision: event.documentRevision,
					kind: event.kind,
					exposeAll: event.exposeAll,
					exposePaths: event.exposePaths,
					validationStatus: state.validation.validationStatus,
				}),
			})
		case "validation/resolved":
			return reduceValidationResolved(state, event)
		case "validation/failed":
			return reduceValidationFailed(state, event)
		case "submission/started":
			if (event.documentRevision !== state.documentRevision) return state
			return replaceRuntimeState(state, {
				submission: Object.freeze({
					status: "submitting",
					attemptId: event.attemptId,
					documentRevision: event.documentRevision,
					submitCount: state.submission.submitCount + 1,
				}),
			})
		case "submission/finished":
			if (
				state.submission.status !== "submitting" ||
				state.submission.attemptId !== event.attemptId ||
				state.submission.documentRevision !== event.documentRevision
			) {
				return state
			}
			return replaceRuntimeState(state, {
				submission: createIdleSubmissionState(state.submission.submitCount),
			})
	}
}

function reduceDocumentCommit<Input, Context>(
	state: FormRuntimeState<Context, Input>,
	event: DocumentCommittedEvent<Input>,
	document: FormDocument<Input>,
): FormRuntimeState<Context, Input> {
	const documentRevision = state.documentRevision + 1
	if (event.baseline === "replaced") {
		return replaceRuntimeState(state, {
			baselineDocument: document,
			documentRevision,
			touchedPaths: new Set(),
			issues: createIssueState(),
			validation: createIdleValidationState(documentRevision),
			submission: createIdleSubmissionState(),
		})
	}

	return replaceRuntimeState(state, {
		documentRevision,
		issues: clearServerIssuesForChanges(
			state.issues,
			event.changes.map((change) => change.path),
		),
		validation: markValidationUnvalidated(state.validation, documentRevision),
	})
}

function reduceDocumentRestore<Input, Context>(
	state: FormRuntimeState<Context, Input>,
): FormRuntimeState<Context, Input> {
	const documentRevision = state.documentRevision + 1
	return replaceRuntimeState(state, {
		documentRevision,
		issues: replaceServerIssues(state.issues, []),
		validation: markValidationUnvalidated(state.validation, documentRevision),
	})
}

function reduceRuntimeReplacement<Input, Context>(
	state: FormRuntimeState<Context, Input>,
	event: RuntimeReplacedEvent<Context>,
): FormRuntimeState<Context, Input> {
	const validationChanged = !isSameValidationOptions(
		state.options,
		event.options,
	)
	const validation =
		validationChanged &&
		state.validation.status === "validating" &&
		state.validation.kind === "nonSubmit"
			? createIdleValidationState(
					state.documentRevision,
					state.validation.validationStatus,
				)
			: state.validation

	if (
		Object.is(state.context, event.context) &&
		isSameRuntimeOptions(state.options, event.options) &&
		Object.is(state.resolvedUi, event.resolvedUi) &&
		validation === state.validation
	) {
		return state
	}

	return replaceRuntimeState(state, {
		context: event.context,
		options: event.options,
		resolvedUi: event.resolvedUi,
		validation,
	})
}

function reduceTouched<Input, Context>(
	state: FormRuntimeState<Context, Input>,
	path: string,
	exposeIssues: boolean,
): FormRuntimeState<Context, Input> {
	const touchedPaths = addTouchedPath(state.touchedPaths, path)
	const issues = exposeIssues
		? exposeIssuePaths(state.issues, [path])
		: state.issues
	if (touchedPaths === state.touchedPaths && issues === state.issues) {
		return state
	}

	return replaceRuntimeState(state, { touchedPaths, issues })
}

function reduceIssuesChanged<Input, Context>(
	state: FormRuntimeState<Context, Input>,
	change: IssuesChange,
): FormRuntimeState<Context, Input> {
	let issues = state.issues
	switch (change.type) {
		case "imperative/set":
			issues = setImperativeIssues(issues, change.issues)
			break
		case "imperative/clear":
			issues = clearImperativeIssues(issues, change.path)
			break
		case "schema/replace":
			issues = replaceSchemaIssues(issues, change.issues, {
				all: change.exposeAll,
				paths: change.exposePaths,
			})
			break
		case "server/replace":
			issues = replaceServerIssues(issues, change.issues, {
				all: change.exposeAll,
			})
			break
		case "server/clearChanged":
			issues = clearServerIssuesForChanges(issues, change.paths)
			break
	}

	return issues === state.issues
		? state
		: replaceRuntimeState(state, { issues })
}

function reduceValidationResolved<Input, Context>(
	state: FormRuntimeState<Context, Input>,
	event: ValidationResolvedEvent,
): FormRuntimeState<Context, Input> {
	const validation = state.validation
	if (
		validation.status !== "validating" ||
		validation.attemptId !== event.attemptId ||
		validation.documentRevision !== event.documentRevision
	) {
		return state
	}

	if (event.documentRevision !== state.documentRevision) {
		return replaceRuntimeState(state, {
			validation: createIdleValidationState(state.documentRevision),
		})
	}

	const issues = replaceSchemaIssues(
		state.issues,
		event.status === "valid" ? [] : event.issues,
		{
			all: validation.exposeAll,
			paths: validation.exposePaths,
		},
	)
	return replaceRuntimeState(state, {
		issues,
		validation: createIdleValidationState(state.documentRevision, event.status),
	})
}

function reduceValidationFailed<Input, Context>(
	state: FormRuntimeState<Context, Input>,
	event: ValidationFailedEvent,
): FormRuntimeState<Context, Input> {
	if (
		state.validation.status !== "validating" ||
		state.validation.attemptId !== event.attemptId ||
		state.validation.documentRevision !== event.documentRevision
	) {
		return state
	}

	return replaceRuntimeState(state, {
		validation: createIdleValidationState(state.documentRevision),
	})
}

function markValidationUnvalidated(
	validation: ValidationState,
	documentRevision: number,
): ValidationState {
	if (validation.status === "idle") {
		return createIdleValidationState(documentRevision)
	}

	return Object.freeze({
		...validation,
		validationStatus: "unvalidated",
	})
}

function createIdleValidationState(
	documentRevision: number,
	validationStatus: ValidationState["validationStatus"] = "unvalidated",
): ValidationState {
	return Object.freeze({
		status: "idle",
		documentRevision,
		validationStatus,
	})
}

function createIdleSubmissionState(submitCount = 0): SubmissionState {
	return Object.freeze({
		status: "idle",
		submitCount,
	})
}

function replaceRuntimeState<Input, Context>(
	state: FormRuntimeState<Context, Input>,
	patch: Partial<FormRuntimeState<Context, Input>>,
): FormRuntimeState<Context, Input> {
	return Object.freeze({ ...state, ...patch })
}

function freezeRuntimeOptions(
	options: FormRuntimeOptionsState,
): FormRuntimeOptionsState {
	return Object.freeze({
		disabled: options.disabled,
		readOnly: options.readOnly,
		validation: Object.freeze({ ...options.validation }),
	})
}

function freezeIssuesChange(change: IssuesChange): IssuesChange {
	switch (change.type) {
		case "imperative/set":
		case "server/replace":
			return Object.freeze({
				...change,
				issues: freezeIssues(change.issues) as readonly ImperativeFormIssue[],
			})
		case "schema/replace":
			return Object.freeze({
				...change,
				issues: freezeIssues(change.issues),
				exposePaths:
					change.exposePaths === undefined
						? undefined
						: freezePaths(change.exposePaths),
			})
		case "imperative/clear":
			return Object.freeze({
				...change,
				...(change.path === undefined ? {} : { path: formatPath(change.path) }),
			})
		case "server/clearChanged":
			return Object.freeze({
				...change,
				paths: freezePaths(change.paths),
			})
	}
}

function freezeIssues(
	issues: readonly FormIssue[] | readonly ImperativeFormIssue[],
): readonly FormIssue[] {
	if (!Array.isArray(issues)) {
		throw new TypeError("Runtime event issues must be an array")
	}

	return Object.freeze(
		issues.map((issue) =>
			Object.freeze({
				...issue,
				...(issue.path === undefined ? {} : { path: formatPath(issue.path) }),
			}),
		),
	) as readonly FormIssue[]
}

function freezePaths(paths: readonly string[]): readonly string[] {
	if (!Array.isArray(paths)) {
		throw new TypeError("Runtime event paths must be an array")
	}
	return Object.freeze(paths.map((path) => formatPath(path)))
}

function assertRuntimeAttempt(options: {
	readonly sequence: number
	readonly attemptId: number
	readonly documentRevision: number
}): void {
	assertEventSequence(options.sequence)
	assertNonNegativeInteger(options.attemptId, "Runtime attempt ID")
	assertNonNegativeInteger(options.documentRevision, "Document revision")
}

function assertEventSequence(sequence: number): void {
	assertNonNegativeInteger(sequence, "Runtime event sequence")
}

function assertNonNegativeInteger(value: number, label: string): void {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new TypeError(`${label} must be a non-negative integer`)
	}
}

function isSameRuntimeOptions(
	left: FormRuntimeOptionsState,
	right: FormRuntimeOptionsState,
): boolean {
	return (
		left.disabled === right.disabled &&
		left.readOnly === right.readOnly &&
		isSameValidationOptions(left, right)
	)
}

function isSameValidationOptions(
	left: FormRuntimeOptionsState,
	right: FormRuntimeOptionsState,
): boolean {
	return (
		left.validation.mode === right.validation.mode &&
		left.validation.revalidateMode === right.validation.revalidateMode &&
		left.validation.asyncDebounceMs === right.validation.asyncDebounceMs
	)
}
