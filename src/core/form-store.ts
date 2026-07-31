import {
	type ArrayCommand,
	createArrayCommandChange,
	findArrayNodeForPath,
	isKnownArrayDescendantFieldPath,
	reindexArrayRowsState,
	reindexTouchedArrayPaths,
	replaceArrayRowState,
} from "./array-state.js"
import type {
	NormalizedArrayNode,
	NormalizedFormDefinition,
} from "./definition.js"
import {
	type FormResult,
	normalizeFormResult,
	type SubmissionIssue,
} from "./form-result.js"
import {
	cloneAndFreezeValue,
	createFormSnapshot,
	type FormSnapshot,
	freezeFormValue,
} from "./form-state.js"
import {
	clearImperativeIssues,
	clearServerIssuesForChanges,
	createIssueState,
	deriveFormErrors,
	exposeIssuePaths,
	type FormIssue,
	type ImperativeFormIssue,
	type IssueState,
	isIssueStateEmpty,
	reindexIssueStateArrayPaths,
	replaceSchemaIssues,
	replaceServerIssues,
	setImperativeIssues,
} from "./issues.js"
import {
	createInitialMetadataState,
	createMetadataState,
	deriveFormMetadata,
	isFormMetadataTouched,
	type MetadataState,
	touchMetadataPath,
} from "./metadata.js"
import { isPlainObject } from "./object.js"
import { formatPath, type PathInput, pathsOverlap } from "./path.js"
import type { ArrayFieldPath, FieldPath, PathValue } from "./path-types.js"
import { type ResolvedUiState, resolveUi } from "./resolve-ui.js"
import type {
	FormInput,
	FormOutput,
	StandardSchema,
} from "./standard-schema.js"
import {
	applyValueChanges,
	createDeepPartialChanges,
	createSetChange,
	createUnsetChange,
	type FormDeepPartial,
	type NormalizedValueChange,
	type OptionalFieldPath,
	type ValueChange,
} from "./transaction.js"
import type { ArrayItemValue } from "./ui-types.js"
import {
	isPromiseLike,
	normalizeValidationOptions,
	normalizeValidationResult,
	runStandardSchemaValidation,
	type ValidationOptions,
	type ValidationResult,
} from "./validation.js"
import {
	cloneMutableValueLeaves,
	getPathValue,
	hasPathValue,
	isDirtyEqual,
} from "./value.js"

export type { ValueChange } from "./transaction.js"

type FocusTargetOptions = {
	readonly preventScroll?: boolean
}

export type FocusTarget = {
	focus(options?: FocusTargetOptions): void
}

export const errorSummaryFocusTargetRegistration = Symbol(
	"form-please.errorSummaryFocusTargetRegistration",
)

type ErrorSummaryFocusTargetRegistrable = {
	[errorSummaryFocusTargetRegistration](
		index: number,
		element: FocusTarget | null,
	): void
}

export function registerErrorSummaryFocusTarget(
	form: object,
	index: number,
	element: FocusTarget | null,
): void {
	const register = (form as Partial<ErrorSummaryFocusTargetRegistrable>)[
		errorSummaryFocusTargetRegistration
	]
	if (typeof register !== "function") {
		throw new TypeError(
			"Form Please error summaries require a Form Please form instance",
		)
	}

	register.call(form, index, element)
}

export type UpdateSource =
	| "array"
	| "control"
	| "imperative"
	| "reset"
	| "valuePolicy"

export type BeforeUpdateEvent<Input, Context> = {
	readonly currentValues: Readonly<Input>
	readonly nextValues: Readonly<Input>
	readonly changes: readonly ValueChange<Input>[]
	readonly source: UpdateSource
	readonly context: Readonly<Context>
}

export type UpdateEvent<Input, Context> = {
	readonly previousValues: Readonly<Input>
	readonly values: Readonly<Input>
	readonly changes: readonly ValueChange<Input>[]
	readonly source: UpdateSource
	readonly context: Readonly<Context>
}

export type UpdateHooks<Input, Context> = {
	readonly beforeUpdate?: (
		event: BeforeUpdateEvent<Input, Context>,
	) => false | readonly ValueChange<Input>[] | undefined
	readonly afterUpdate?: (event: UpdateEvent<Input, Context>) => void
}

export type FormStoreOptions<
	Schema extends StandardSchema,
	Context = unknown,
> = UpdateHooks<FormInput<Schema>, Context> & {
	readonly definition: NormalizedFormDefinition<Schema>
	readonly defaultValues: FormInput<Schema>
	readonly context?: Context
	readonly disabled?: boolean
	readonly readOnly?: boolean
	readonly validation?: Partial<ValidationOptions>
}

type RuntimeBeforeUpdateEvent<Input, Context> = Omit<
	BeforeUpdateEvent<Input, Context>,
	"changes"
> & {
	readonly changes: readonly ValueChange[]
}

type RuntimeUpdateEvent<Input, Context> = Omit<
	UpdateEvent<Input, Context>,
	"changes"
> & {
	readonly changes: readonly ValueChange[]
}

type RuntimeFormStoreOptions<Schema extends StandardSchema, Context> = Omit<
	FormStoreOptions<Schema, Context>,
	"beforeUpdate" | "afterUpdate"
> & {
	readonly beforeUpdate?: (
		event: RuntimeBeforeUpdateEvent<FormInput<Schema>, Context>,
	) => false | readonly ValueChange[] | undefined
	readonly afterUpdate?: (
		event: RuntimeUpdateEvent<FormInput<Schema>, Context>,
	) => void
}

export type FormStoreRuntimeOptions = Pick<
	FormStoreOptions<StandardSchema, unknown>,
	"disabled" | "readOnly" | "validation"
>

export type FormStoreSelector<Input, Context, Selected> = (
	snapshot: FormSnapshot<Input, Context>,
) => Selected

export type FormStoreListener<Selected> = (
	selected: Selected,
	previous: Selected,
) => void

export type FormStoreSubscriptionOptions<Selected> = {
	readonly equalityFn?: (previous: Selected, next: Selected) => boolean
}

export type FormStore<Schema extends StandardSchema, Context = unknown> = {
	readonly definition: NormalizedFormDefinition<Schema>
	readonly schema: Schema
	getSnapshot(): FormSnapshot<FormInput<Schema>, Context>
	getServerSnapshot(): FormSnapshot<FormInput<Schema>, Context>
	getValues(): FormInput<Schema>
	getValue(path: PathInput): unknown
	setValue<Path extends FieldPath<FormInput<Schema>>>(
		path: Path,
		value: PathValue<FormInput<Schema>, Path>,
	): void
	setValues(values: FormDeepPartial<FormInput<Schema>>): void
	unsetValue<Path extends OptionalFieldPath<FormInput<Schema>>>(
		path: Path,
	): void
	append<Path extends ArrayFieldPath<FormInput<Schema>>>(
		path: Path,
		...value: [] | [ArrayItemValue<FormInput<Schema>, Path>]
	): void
	insert<Path extends ArrayFieldPath<FormInput<Schema>>>(
		path: Path,
		index: number,
		...value: [] | [ArrayItemValue<FormInput<Schema>, Path>]
	): void
	remove<Path extends ArrayFieldPath<FormInput<Schema>>>(
		path: Path,
		index: number,
	): void
	move<Path extends ArrayFieldPath<FormInput<Schema>>>(
		path: Path,
		from: number,
		to: number,
	): void
	reset(values?: FormInput<Schema>): void
	setErrors(issues: readonly ImperativeFormIssue[]): void
	clearErrors(path?: PathInput): void
	validate(): Promise<ValidationResult<FormOutput<Schema>>>
	validate(path: PathInput): Promise<readonly FormIssue[]>
	validatePaths<Path extends FieldPath<FormInput<Schema>>>(
		paths: readonly Path[],
	): Promise<readonly FormIssue[]>
	batch(callback: () => void): void
	subscribe<Selected>(
		selector: FormStoreSelector<FormInput<Schema>, Context, Selected>,
		listener: FormStoreListener<Selected>,
		options?: FormStoreSubscriptionOptions<Selected>,
	): () => void
	replaceOptions(options: FormStoreRuntimeOptions): void
	replaceContext(context: Context): void
	touch(path: PathInput): void
	blur(path: PathInput): void
	registerFieldRef(path: PathInput, element: FocusTarget | null): void
	focus(path: PathInput): void
	focusFirstError<Path extends FieldPath<FormInput<Schema>>>(
		paths?: readonly Path[],
	): boolean
}

type Subscription<Input, Context, Selected = unknown> = {
	readonly selector: FormStoreSelector<Input, Context, Selected>
	readonly listener: FormStoreListener<Selected>
	readonly equalityFn: (previous: Selected, next: Selected) => boolean
	selected: Selected
}

type ActiveBatch = {
	changes: NormalizedValueChange[]
	issueState?: IssueState
	metadataState?: MetadataState
	abortedError?: unknown
}

type ValueCommitResult<Input> =
	| {
			readonly status: "cancelled" | "committed"
	  }
	| {
			readonly status: "noValueChange"
			readonly values: Input
	  }

type ValueCommitOptions<Context> = {
	readonly issueState?: IssueState
	readonly metadataState?: MetadataState
	readonly resetAfterCommit?: boolean
	readonly transitionFromUi?: ResolvedUiState<Context>
}

type ValidationRuntimeState = {
	readonly isValidating: boolean
	readonly isSubmitting: boolean
	readonly validationStatus: "invalid" | "unvalidated" | "valid"
	readonly submitCount: number
}

type ActiveValidation = {
	readonly id: number
	readonly kind: "nonSubmit" | "submit"
}

type ValueProposal<Input, Context> = {
	readonly values: Input
	readonly changes: readonly NormalizedValueChange[]
	readonly resolvedUi: ResolvedUiState<Context>
}

export type FormSubmissionAttempt<
	Schema extends StandardSchema = StandardSchema,
> = {
	validate(): Promise<ValidationResult<FormOutput<Schema>>>
	finish(): void
}

export type ActionSubmissionAttempt<
	Schema extends StandardSchema = StandardSchema,
> = {
	readonly input: FormInput<Schema>
	readonly changedPaths: ReadonlySet<string>
	recordChanges(paths: readonly PathInput[]): void
	finish(): void
}

export type ApplyActionResultOptions<Schema extends StandardSchema> = {
	readonly input?: FormInput<Schema>
	readonly changedPaths?: readonly PathInput[]
	readonly recordSubmit?: boolean
}

export type ApplyActionResultOutcome = {
	readonly scheduledCurrentValidation: boolean
}

export function createFormStore<
	Schema extends StandardSchema,
	Context = unknown,
>(options: FormStoreOptions<Schema, Context>): FormStore<Schema, Context> {
	return new CoreFormStore(
		options as RuntimeFormStoreOptions<Schema, Context>,
	) as unknown as FormStore<Schema, Context>
}

export function replaceFormStoreRuntime<
	Schema extends StandardSchema,
	Context = unknown,
>(
	store: FormStore<Schema, Context>,
	context: Context,
	options: FormStoreRuntimeOptions,
): void {
	asCoreFormStore(store).replaceRuntime(context, options)
}

export function startFormSubmission<
	Schema extends StandardSchema,
	Context = unknown,
>(store: FormStore<Schema, Context>): FormSubmissionAttempt<Schema> {
	const core = asCoreFormStore(store)
	const id = core.startSubmission()
	let finished = false

	return Object.freeze({
		validate: () => core.validateSubmission(),
		finish() {
			if (finished) {
				return
			}

			finished = true
			core.finishSubmission(id)
		},
	})
}

export function startActionSubmission<
	Schema extends StandardSchema,
	Context = unknown,
>(store: FormStore<Schema, Context>): ActionSubmissionAttempt<Schema> {
	const submission = startFormSubmission(store)
	const changedPaths = new Set<string>()
	let finished = false

	return Object.freeze({
		input: store.getSnapshot().values,
		changedPaths,
		recordChanges(paths) {
			for (const path of paths) {
				changedPaths.add(formatPath(path))
			}
		},
		finish() {
			if (finished) {
				return
			}

			finished = true
			submission.finish()
		},
	})
}

export function applyActionResult<
	Schema extends StandardSchema,
	Context = unknown,
>(
	store: FormStore<Schema, Context>,
	result: FormResult,
	options: ApplyActionResultOptions<Schema> = {},
): ApplyActionResultOutcome {
	return asCoreFormStore(store).applyActionResult(
		normalizeFormResult(result),
		options,
	)
}

class CoreFormStore<Schema extends StandardSchema, Context> {
	readonly definition: NormalizedFormDefinition<Schema>
	readonly schema: Schema

	#baselineValues: FormInput<Schema>
	#context: Context
	#issueState: IssueState
	#metadataState: MetadataState
	#snapshot: FormSnapshot<FormInput<Schema>, Context>
	#serverSnapshot: FormSnapshot<FormInput<Schema>, Context>
	#values: FormInput<Schema>

	#activeBatch: ActiveBatch | undefined
	#activeValidation: ActiveValidation | undefined
	#disabled: boolean
	#hasValidationResult = false
	#nextValidationId = 0
	#activeSubmissionId: number | undefined
	#nextSubmissionId = 0
	#nonSubmitAbortController: AbortController | undefined
	#scheduledValidation: ReturnType<typeof setTimeout> | undefined
	#validationOptions: ValidationOptions
	#validationRevision = 0
	#validationState: ValidationRuntimeState = createValidationRuntimeState()
	readonly #focusTargets = new Map<string, FocusTarget>()
	readonly #summaryFocusTargets = new Map<number, FocusTarget>()
	#isRunningBeforeUpdate = false
	#readOnly: boolean
	readonly #subscriptions = new Set<Subscription<FormInput<Schema>, Context>>()
	readonly #beforeUpdate: RuntimeFormStoreOptions<
		Schema,
		Context
	>["beforeUpdate"]
	readonly #afterUpdate: RuntimeFormStoreOptions<Schema, Context>["afterUpdate"]

	constructor(options: RuntimeFormStoreOptions<Schema, Context>) {
		this.definition = options.definition
		this.schema = options.definition.schema
		this.#context = options.context as Context
		this.#disabled = options.disabled === true
		this.#readOnly = options.readOnly === true
		this.#validationOptions = normalizeValidationOptions(options.validation)
		const initialState = createInitialValuePolicyState(
			this.definition,
			cloneAndFreezeValue(options.defaultValues),
			this.#context,
			{
				disabled: this.#disabled,
				readOnly: this.#readOnly,
			},
		)
		this.#values = initialState.values
		this.#baselineValues = cloneAndFreezeValue(this.#values)
		this.#issueState = createIssueState()
		this.#metadataState = createInitialMetadataState(
			this.definition,
			this.#values,
		)
		this.#snapshot = this.#createSnapshot({
			resolvedUi: initialState.resolvedUi,
		})
		this.#serverSnapshot = this.#snapshot
		this.#beforeUpdate = options.beforeUpdate
		this.#afterUpdate = options.afterUpdate
	}

	getSnapshot(): FormSnapshot<FormInput<Schema>, Context> {
		return this.#snapshot
	}

	getServerSnapshot(): FormSnapshot<FormInput<Schema>, Context> {
		return this.#serverSnapshot
	}

	getValues(): FormInput<Schema> {
		return clonePublicValue(this.#values)
	}

	getValue(path: PathInput): unknown
	getValue(path: PathInput): unknown {
		return clonePublicValue(getPathValue(this.#values, path))
	}

	setValue<Path extends FieldPath<FormInput<Schema>>>(
		path: Path,
		value: PathValue<FormInput<Schema>, Path>,
	): void {
		this.#runValueCommand(() => [createSetChange(path, value)])
	}

	setValues(values: FormDeepPartial<FormInput<Schema>>): void {
		this.#runValueCommand(() => createDeepPartialChanges(values))
	}

	unsetValue<Path extends OptionalFieldPath<FormInput<Schema>>>(
		path: Path,
	): void {
		this.#runValueCommand(() => [createUnsetChange(path)])
	}

	append<Path extends ArrayFieldPath<FormInput<Schema>>>(
		path: Path,
		...value: [] | [ArrayItemValue<FormInput<Schema>, Path>]
	): void {
		this.#runArrayCommand(path, {
			type: "append",
			hasValue: value.length === 1,
			value: value[0],
		})
	}

	insert<Path extends ArrayFieldPath<FormInput<Schema>>>(
		path: Path,
		index: number,
		...value: [] | [ArrayItemValue<FormInput<Schema>, Path>]
	): void {
		this.#runArrayCommand(path, {
			type: "insert",
			index,
			hasValue: value.length === 1,
			value: value[0],
		})
	}

	remove<Path extends ArrayFieldPath<FormInput<Schema>>>(
		path: Path,
		index: number,
	): void {
		this.#runArrayCommand(path, {
			type: "remove",
			index,
		})
	}

	move<Path extends ArrayFieldPath<FormInput<Schema>>>(
		path: Path,
		from: number,
		to: number,
	): void {
		this.#runArrayCommand(path, {
			type: "move",
			from,
			to,
		})
	}

	reset(values?: FormInput<Schema>): void {
		this.#assertValueCommandAllowed()
		if (this.#activeBatch !== undefined) {
			throw new TypeError("reset cannot be called inside a batch")
		}

		const resetValues = cloneAndFreezeValue(values ?? this.#baselineValues)
		const result = this.#commitValueChanges(
			createResetChanges(this.#values, resetValues),
			"reset",
			{ resetAfterCommit: true },
		)

		if (result.status === "cancelled") {
			return
		}

		if (result.status === "noValueChange") {
			this.#applyResetMetadataOnly(result.values)
		}
	}

	setErrors(issues: readonly ImperativeFormIssue[]): void {
		this.#commitIssueState(setImperativeIssues(this.#issueState, issues))
	}

	clearErrors(path?: PathInput): void {
		this.#commitIssueState(clearImperativeIssues(this.#issueState, path))
	}

	validate(): Promise<ValidationResult<FormOutput<Schema>>>
	validate(path: PathInput): Promise<readonly FormIssue[]>
	validate(
		path?: PathInput,
	): Promise<ValidationResult<FormOutput<Schema>> | readonly FormIssue[]> {
		this.#cancelScheduledValidation()
		const canonicalPath = path === undefined ? undefined : formatPath(path)

		return this.#runValidation({
			kind: "nonSubmit",
			exposeAll: canonicalPath === undefined,
			exposePaths: canonicalPath === undefined ? [] : [canonicalPath],
		}).then((result) =>
			canonicalPath === undefined
				? result
				: result.success
					? []
					: filterPathSubsetIssues(result.issues, [canonicalPath]),
		)
	}

	validatePaths<Path extends FieldPath<FormInput<Schema>>>(
		paths: readonly Path[],
	): Promise<readonly FormIssue[]> {
		const canonicalPaths = normalizePathSubset(paths, {
			requireNonEmpty: true,
		})
		this.#cancelScheduledValidation()

		return this.#runValidation({
			kind: "nonSubmit",
			exposeAll: false,
			exposePaths: canonicalPaths,
		}).then((result) =>
			result.success
				? []
				: filterPathSubsetIssues(result.issues, canonicalPaths),
		)
	}

	startSubmission(): number {
		const id = ++this.#nextSubmissionId
		this.#activeSubmissionId = id
		this.#commitValidationRuntimeState({
			...this.#validationState,
			isSubmitting: true,
			submitCount: this.#validationState.submitCount + 1,
		})
		return id
	}

	validateSubmission(): Promise<ValidationResult<FormOutput<Schema>>> {
		this.#cancelScheduledValidation()
		return this.#runValidation({
			kind: "submit",
			exposeAll: true,
			exposePaths: [],
		})
	}

	finishSubmission(id: number): void {
		if (this.#activeSubmissionId !== id) {
			return
		}

		this.#activeSubmissionId = undefined
		this.#commitValidationRuntimeState({
			...this.#validationState,
			isSubmitting: false,
		})
	}

	applyActionResult(
		result: FormResult,
		options: ApplyActionResultOptions<Schema>,
	): ApplyActionResultOutcome {
		if (options.recordSubmit === true && result.status === "error") {
			const id = this.startSubmission()
			this.finishSubmission(id)
		}

		if (result.status === "success") {
			this.#applyActionSuccess(result, options)
			return Object.freeze({
				scheduledCurrentValidation: false,
			})
		}

		return this.#applyActionError(result.issues, options)
	}

	batch(callback: () => void): void {
		this.#assertValueCommandAllowed()

		if (this.#activeBatch !== undefined) {
			try {
				callback()
			} catch (error) {
				this.#activeBatch.abortedError ??= error
				throw error
			}
			return
		}

		const batch: ActiveBatch = {
			changes: [],
		}
		this.#activeBatch = batch

		try {
			callback()
		} catch (error) {
			batch.abortedError ??= error
		} finally {
			this.#activeBatch = undefined
		}

		if (batch.abortedError !== undefined) {
			throw batch.abortedError
		}

		this.#commitValueChanges(batch.changes, "imperative", {
			issueState: batch.issueState,
			metadataState: batch.metadataState,
		})
	}

	subscribe<Selected>(
		selector: FormStoreSelector<FormInput<Schema>, Context, Selected>,
		listener: FormStoreListener<Selected>,
		options: FormStoreSubscriptionOptions<Selected> = {},
	): () => void {
		const subscription: Subscription<FormInput<Schema>, Context, Selected> = {
			selector,
			listener,
			equalityFn: options.equalityFn ?? Object.is,
			selected: selector(this.#snapshot),
		}

		this.#subscriptions.add(
			subscription as Subscription<FormInput<Schema>, Context>,
		)

		return () => {
			this.#subscriptions.delete(
				subscription as Subscription<FormInput<Schema>, Context>,
			)
		}
	}

	replaceOptions(options: FormStoreRuntimeOptions): void {
		this.#replaceRuntime(this.#context, options)
	}

	replaceContext(context: Context): void {
		this.#replaceRuntime(context)
	}

	replaceRuntime(context: Context, options: FormStoreRuntimeOptions): void {
		this.#replaceRuntime(context, options)
	}

	#replaceRuntime(context: Context, options?: FormStoreRuntimeOptions): void {
		const contextChanged = !Object.is(context, this.#context)
		const nextDisabled =
			options === undefined ? this.#disabled : options.disabled === true
		const nextReadOnly =
			options === undefined ? this.#readOnly : options.readOnly === true
		const nextValidationOptions =
			options === undefined
				? this.#validationOptions
				: normalizeValidationOptions(options.validation)
		const validationChanged = !isSameValidationOptions(
			this.#validationOptions,
			nextValidationOptions,
		)

		if (
			!contextChanged &&
			this.#disabled === nextDisabled &&
			this.#readOnly === nextReadOnly &&
			!validationChanged
		) {
			return
		}

		const previousSnapshot = this.#snapshot
		this.#context = context
		this.#disabled = nextDisabled
		this.#readOnly = nextReadOnly
		this.#validationOptions = nextValidationOptions
		if (validationChanged) {
			this.#cancelScheduledValidation()
			this.#abortNonSubmitValidation(false)
		}
		this.#snapshot = this.#createSnapshot({
			previousResolvedUi: previousSnapshot.resolvedUi,
		})
		this.#notify()
		this.#commitValueChanges([], "valuePolicy", {
			transitionFromUi: previousSnapshot.resolvedUi,
		})
	}

	touch(path: PathInput): void {
		this.#touchPath(path, false)
	}

	blur(path: PathInput): void {
		this.#touchPath(path, true)
	}

	#touchPath(path: PathInput, exposeIssues: boolean): void {
		const canonicalPath = this.#normalizeKnownFieldPath(path)
		const nextMetadataState = touchMetadataPath(
			this.#metadataState,
			canonicalPath,
		)
		const nextIssueState = exposeIssues
			? exposeIssuePaths(this.#issueState, [canonicalPath])
			: this.#issueState

		if (
			nextMetadataState === this.#metadataState &&
			nextIssueState === this.#issueState
		) {
			this.#scheduleAutomaticValidation("blur", [canonicalPath])
			return
		}

		const previousSnapshot = this.#snapshot
		this.#metadataState = nextMetadataState
		this.#issueState = nextIssueState
		this.#snapshot = this.#createSnapshot({
			resolvedUi: previousSnapshot.resolvedUi,
		})
		this.#notify()
		this.#scheduleAutomaticValidation("blur", [canonicalPath])
	}

	registerFieldRef(path: PathInput, element: FocusTarget | null): void {
		const canonicalPath =
			element === null ? formatPath(path) : this.#normalizeKnownFieldPath(path)
		if (element === null) {
			this.#focusTargets.delete(canonicalPath)
			return
		}

		this.#focusTargets.set(canonicalPath, element)
	}

	[errorSummaryFocusTargetRegistration](
		index: number,
		element: FocusTarget | null,
	): void {
		if (element === null) {
			this.#summaryFocusTargets.delete(index)
			return
		}

		this.#summaryFocusTargets.set(index, element)
	}

	focus(path: PathInput): void {
		this.#focusFieldPath(formatPath(path))
	}

	focusFirstError<Path extends FieldPath<FormInput<Schema>>>(
		paths?: readonly Path[],
	): boolean {
		const canonicalPaths =
			paths === undefined
				? undefined
				: normalizePathSubset(paths, { requireNonEmpty: false })
		if (canonicalPaths?.length === 0) {
			return false
		}

		for (const [path, issues] of this.#snapshot.displayErrors.fields) {
			if (
				issues.length === 0 ||
				!pathMatchesSubset(path, canonicalPaths) ||
				!this.#focusFieldPath(path)
			) {
				continue
			}

			return true
		}

		for (const [
			index,
			issue,
		] of this.#snapshot.displayErrors.summary.entries()) {
			const matches =
				issue.path === undefined
					? canonicalPaths === undefined
					: pathMatchesSubset(issue.path, canonicalPaths)
			const target = this.#summaryFocusTargets.get(index)
			if (!matches || target === undefined) {
				continue
			}

			target.focus()
			return true
		}

		return false
	}

	#focusFieldPath(canonicalPath: string): boolean {
		const field = this.#snapshot.resolvedUi.fieldsByPath[canonicalPath]
		if (
			field === undefined ||
			!field.visible ||
			field.disabled ||
			field.readOnly
		) {
			return false
		}

		const target = this.#focusTargets.get(canonicalPath)
		if (target === undefined) {
			return false
		}

		target.focus()
		return true
	}

	#createSnapshot(
		options: {
			readonly previousResolvedUi?: ResolvedUiState<Context>
			readonly resolvedUi?: ResolvedUiState<Context>
		} = {},
	): FormSnapshot<FormInput<Schema>, Context> {
		const resolvedUi =
			options.resolvedUi ??
			(options.previousResolvedUi === undefined
				? resolveUi(this.definition, this.#values, this.#context, {
						disabled: this.#disabled,
						readOnly: this.#readOnly,
					})
				: resolveUi(this.definition, this.#values, this.#context, {
						disabled: this.#disabled,
						previous: options.previousResolvedUi,
						readOnly: this.#readOnly,
					}))
		const metadata = deriveFormMetadata(
			this.definition,
			this.#values,
			this.#baselineValues,
			this.#metadataState,
			this.#validationState.isValidating,
		)
		const { errors, displayErrors } = deriveFormErrors(
			this.#issueState,
			resolvedUi,
		)
		const values = clonePublicValue(this.#values)

		return createFormSnapshot({
			values,
			baselineValues: this.#baselineValues,
			context: this.#context,
			displayErrors,
			errors,
			resolvedUi,
			metadata,
			isTouched: isFormMetadataTouched(metadata),
			isValidating: this.#validationState.isValidating,
			isSubmitting: this.#validationState.isSubmitting,
			validationStatus: this.#validationState.validationStatus,
			submitCount: this.#validationState.submitCount,
		})
	}

	#normalizeKnownFieldPath(path: PathInput): string {
		const canonicalPath = formatPath(path)
		if (
			this.definition.fieldsByPath[canonicalPath] === undefined &&
			this.definition.arraysByPath[canonicalPath] === undefined &&
			this.#snapshot.resolvedUi.fieldsByPath[canonicalPath] === undefined &&
			this.#snapshot.resolvedUi.arraysByPath[canonicalPath] === undefined &&
			!isKnownArrayDescendantFieldPath(
				this.definition,
				this.#values,
				canonicalPath,
			)
		) {
			throw new TypeError(`Unknown field path "${canonicalPath}"`)
		}

		return canonicalPath
	}

	#normalizeKnownArrayPath(path: PathInput): {
		readonly path: string
		readonly node: NormalizedArrayNode
	} {
		const canonicalPath = formatPath(path)
		const arrayNode = findArrayNodeForPath(this.definition, canonicalPath)

		if (arrayNode === undefined) {
			if (this.definition.fieldsByPath[canonicalPath] !== undefined) {
				throw new TypeError(`Path "${canonicalPath}" is not an array field`)
			}

			throw new TypeError(`Unknown array path "${canonicalPath}"`)
		}

		return {
			path: canonicalPath,
			node: arrayNode,
		}
	}

	#runValueCommand(
		createChanges: () => readonly NormalizedValueChange[],
		source: UpdateSource = "imperative",
	): void {
		this.#assertValueCommandAllowed()

		try {
			const changes = createChanges()
			if (this.#activeBatch !== undefined) {
				this.#activeBatch.changes.push(...changes)
				return
			}

			this.#commitValueChanges(changes, source)
		} catch (error) {
			if (this.#activeBatch !== undefined) {
				this.#activeBatch.abortedError ??= error
			}
			throw error
		}
	}

	#runArrayCommand(path: PathInput, command: ArrayCommand): void {
		this.#assertValueCommandAllowed()

		try {
			const arrayTarget = this.#normalizeKnownArrayPath(path)
			const canonicalPath = arrayTarget.path
			const baseValues =
				this.#activeBatch === undefined
					? this.#values
					: applyValueChanges(this.#values, this.#activeBatch.changes).values
			const baseMetadataState =
				this.#activeBatch?.metadataState ?? this.#metadataState
			const baseIssueState = this.#activeBatch?.issueState ?? this.#issueState
			const update = createArrayCommandChange(
				canonicalPath,
				arrayTarget.node,
				baseValues,
				baseMetadataState.arrayRowsByPath,
				command,
			)

			if (update === undefined) {
				return
			}

			const metadataState = createMetadataState({
				touchedPaths: reindexTouchedArrayPaths(
					baseMetadataState.touchedPaths,
					canonicalPath,
					update.previousKeys,
					update.nextKeys,
				),
				arrayRowsByPath: replaceArrayRowState(
					reindexArrayRowsState(
						baseMetadataState.arrayRowsByPath,
						canonicalPath,
						update.previousKeys,
						update.nextKeys,
					),
					canonicalPath,
					update.rowState,
				),
			})
			const issueState = reindexIssueStateArrayPaths(
				baseIssueState,
				canonicalPath,
				update.previousKeys,
				update.nextKeys,
			)

			if (this.#activeBatch !== undefined) {
				this.#activeBatch.changes.push(...update.changes)
				this.#activeBatch.metadataState = metadataState
				this.#activeBatch.issueState = issueState
				return
			}

			this.#commitValueChanges(update.changes, "array", {
				issueState,
				metadataState,
			})
		} catch (error) {
			if (this.#activeBatch !== undefined) {
				this.#activeBatch.abortedError ??= error
			}
			throw error
		}
	}

	#commitValueChanges(
		changes: readonly NormalizedValueChange[],
		source: UpdateSource,
		options: ValueCommitOptions<Context> = {},
	): ValueCommitResult<FormInput<Schema>> {
		const transitionFromUi =
			options.transitionFromUi ?? this.#snapshot.resolvedUi
		const proposal = this.#createValueProposal(changes, transitionFromUi)
		if (proposal === undefined) {
			const issueState =
				options.issueState === undefined
					? undefined
					: clearServerIssuesForChanges(
							options.issueState,
							changes.map((change) => change.path),
						)
			if (options.metadataState !== undefined || issueState !== undefined) {
				this.#applyMetadataAndIssueOnly(options.metadataState, issueState)
			}
			return { status: "noValueChange", values: this.#values }
		}

		let nextValues = proposal.values
		let effectiveChanges = proposal.changes
		let resolvedUi = proposal.resolvedUi
		let metadataState = options.metadataState
		let issueState = options.issueState

		if (this.#beforeUpdate !== undefined) {
			const replacement = this.#callBeforeUpdate(
				nextValues,
				effectiveChanges,
				source,
			)

			if (replacement === false) {
				return { status: "cancelled" }
			}

			if (replacement !== undefined) {
				const replacementChanges =
					this.#normalizeReplacementChanges(replacement)
				const replacementProposal = this.#createValueProposal(
					replacementChanges,
					transitionFromUi,
				)
				if (replacementProposal === undefined) {
					return { status: "noValueChange", values: this.#values }
				}

				nextValues = replacementProposal.values
				effectiveChanges = replacementProposal.changes
				resolvedUi = replacementProposal.resolvedUi
				metadataState = undefined
				issueState = undefined
			}
		}

		const previousSnapshot = this.#snapshot
		const previousValues = clonePublicValue(this.#values)
		this.#values = nextValues
		if (options.resetAfterCommit === true) {
			this.#baselineValues = nextValues
			this.#metadataState = createInitialMetadataState(
				this.definition,
				nextValues,
			)
			this.#issueState = createIssueState()
			this.#resetValidationRuntime()
		} else if (metadataState !== undefined) {
			this.#metadataState = metadataState
		}
		if (options.resetAfterCommit !== true) {
			this.#markValuesChangedForValidation()
			this.#issueState = clearServerIssuesForChanges(
				issueState ?? this.#issueState,
				effectiveChanges.map((change) => change.path),
			)
		}
		this.#snapshot = this.#createSnapshot({
			previousResolvedUi: previousSnapshot.resolvedUi,
			resolvedUi,
		})
		this.#notify()
		this.#afterUpdate?.(
			Object.freeze({
				previousValues,
				values: this.#snapshot.values,
				changes: effectiveChanges as readonly ValueChange[],
				source,
				context: this.#context as Readonly<Context>,
			}),
		)
		if (options.resetAfterCommit !== true) {
			this.#scheduleAutomaticValidation(
				"change",
				effectiveChanges.map((change) => change.path),
			)
		}
		return { status: "committed" }
	}

	#normalizeReplacementChanges(
		changes: readonly ValueChange[],
	): readonly NormalizedValueChange[] {
		if (!Array.isArray(changes)) {
			throw new TypeError("Value changes must be an array")
		}

		return Object.freeze(
			changes.map((change) => {
				if (change.type === "set") {
					return createSetChange(change.path, change.value)
				}

				if (change.type === "unset") {
					return createUnsetChange(change.path)
				}

				const unsupported = change as { readonly type?: unknown }
				throw new TypeError(
					`Unsupported value change type "${String(unsupported.type)}"`,
				)
			}),
		)
	}

	#createValueProposal(
		changes: readonly ValueChange[] | readonly NormalizedValueChange[],
		transitionFromUi: ResolvedUiState<Context>,
	): ValueProposal<FormInput<Schema>, Context> | undefined {
		let proposal = applyValueChanges(this.#values, changes)
		let nextValues = proposal.values
		let effectiveChanges = proposal.changes
		let previousResolvedUi = this.#snapshot.resolvedUi

		for (
			let pass = 0;
			pass <= Object.keys(this.definition.fieldsByPath).length;
			pass++
		) {
			const resolvedUi = resolveUi(this.definition, nextValues, this.#context, {
				disabled: this.#disabled,
				previous: previousResolvedUi,
				readOnly: this.#readOnly,
			})
			const policyChanges = this.#createValuePolicyChanges(
				transitionFromUi,
				resolvedUi,
				nextValues,
			)

			if (policyChanges.length === 0) {
				if (effectiveChanges.length === 0) {
					return undefined
				}

				return {
					values: freezeFormValue(nextValues),
					changes: effectiveChanges,
					resolvedUi,
				}
			}

			proposal = applyValueChanges(this.#values, [
				...effectiveChanges,
				...policyChanges,
			])
			nextValues = proposal.values
			effectiveChanges = proposal.changes
			previousResolvedUi = resolvedUi
		}

		throw new TypeError("valuePolicy changes did not converge")
	}

	#createValuePolicyChanges(
		transitionFromUi: ResolvedUiState<Context>,
		resolvedUi: ResolvedUiState<Context>,
		values: FormInput<Schema>,
	): readonly NormalizedValueChange[] {
		return createHiddenValuePolicyChanges(resolvedUi, values, transitionFromUi)
	}

	#applyResetMetadataOnly(baselineValues: FormInput<Schema>): void {
		const nextBaselineValues = cloneAndFreezeValue(baselineValues)
		const nextValidationState = createValidationRuntimeState()
		if (
			isDirtyEqual(this.#baselineValues, nextBaselineValues) &&
			this.#metadataState.touchedPaths.size === 0 &&
			isIssueStateEmpty(this.#issueState) &&
			isSameValidationRuntimeState(this.#validationState, nextValidationState)
		) {
			return
		}

		const previousSnapshot = this.#snapshot
		this.#baselineValues = nextBaselineValues
		this.#metadataState = createInitialMetadataState(
			this.definition,
			nextBaselineValues,
		)
		this.#issueState = createIssueState()
		this.#resetValidationRuntime()
		this.#snapshot = this.#createSnapshot({
			resolvedUi: previousSnapshot.resolvedUi,
		})
		this.#notify()
	}

	#applyMetadataAndIssueOnly(
		metadataState?: MetadataState,
		issueState?: IssueState,
	): void {
		const nextMetadataState = metadataState ?? this.#metadataState
		const nextIssueState = issueState ?? this.#issueState
		if (
			nextMetadataState === this.#metadataState &&
			nextIssueState === this.#issueState
		) {
			return
		}

		const previousSnapshot = this.#snapshot
		this.#metadataState = nextMetadataState
		this.#issueState = nextIssueState
		this.#snapshot = this.#createSnapshot({
			resolvedUi: previousSnapshot.resolvedUi,
		})
		this.#notify()
	}

	#commitIssueState(issueState: IssueState): void {
		if (issueState === this.#issueState) {
			return
		}

		const previousSnapshot = this.#snapshot
		this.#issueState = issueState
		this.#snapshot = this.#createSnapshot({
			resolvedUi: previousSnapshot.resolvedUi,
		})
		this.#notify()
	}

	#scheduleAutomaticValidation(
		trigger: "blur" | "change",
		paths: readonly string[],
	): void {
		if (!this.#shouldRunAutomaticValidation(trigger)) {
			return
		}

		const exposePaths = paths.map((path) => formatPath(path))
		this.#cancelScheduledValidation()

		if (
			trigger === "change" &&
			(this.#validationOptions.asyncDebounceMs ?? 0) > 0
		) {
			this.#abortNonSubmitValidation()
			this.#scheduledValidation = setTimeout(() => {
				this.#scheduledValidation = undefined
				void this.#runValidation({
					kind: "nonSubmit",
					exposeAll: false,
					exposePaths,
				}).catch((error: unknown) => {
					reportValidationHostException(error)
				})
			}, this.#validationOptions.asyncDebounceMs)
			return
		}

		void this.#runValidation({
			kind: "nonSubmit",
			exposeAll: false,
			exposePaths,
		}).catch((error: unknown) => {
			reportValidationHostException(error)
		})
	}

	#shouldRunAutomaticValidation(trigger: "blur" | "change"): boolean {
		const mode = this.#hasValidationResult
			? this.#validationOptions.revalidateMode
			: this.#validationOptions.mode

		return mode === trigger
	}

	#runValidation(options: {
		readonly kind: "nonSubmit" | "submit"
		readonly exposeAll: boolean
		readonly exposePaths: readonly string[]
	}): Promise<ValidationResult<FormOutput<Schema>>> {
		const values = this.#values
		const revision = this.#validationRevision
		const id = ++this.#nextValidationId
		const abortController = new AbortController()

		if (options.kind === "nonSubmit") {
			this.#abortNonSubmitValidation()
			this.#nonSubmitAbortController = abortController
		}
		this.#activeValidation = {
			id,
			kind: options.kind,
		}

		let schemaResult:
			| Promise<unknown>
			| ReturnType<typeof runStandardSchemaValidation<Schema>>
		try {
			schemaResult = runStandardSchemaValidation(
				this.schema,
				values,
				abortController.signal,
			)
		} catch (error) {
			this.#failValidation(id)
			return Promise.reject(error)
		}

		if (isPromiseLike(schemaResult)) {
			this.#commitValidationRuntimeState({
				...this.#validationState,
				isValidating: true,
			})

			return Promise.resolve(schemaResult)
				.then((result) =>
					this.#finishValidation(
						id,
						revision,
						values,
						normalizeValidationResult(
							result as Awaited<
								ReturnType<typeof runStandardSchemaValidation<Schema>>
							>,
						),
						options,
					),
				)
				.catch((error: unknown) => {
					this.#failValidation(id)
					throw error
				})
		}

		try {
			return Promise.resolve(
				this.#finishValidation(
					id,
					revision,
					values,
					normalizeValidationResult(schemaResult),
					options,
				),
			)
		} catch (error) {
			this.#failValidation(id)
			return Promise.reject(error)
		}
	}

	#finishValidation(
		id: number,
		revision: number,
		values: FormInput<Schema>,
		result: ValidationResult<FormOutput<Schema>>,
		options: {
			readonly exposeAll: boolean
			readonly exposePaths: readonly string[]
		},
	): ValidationResult<FormOutput<Schema>> {
		const isCurrentAttempt = this.#activeValidation?.id === id
		const shouldInstall =
			isCurrentAttempt &&
			revision === this.#validationRevision &&
			isDirtyEqual(values, this.#values)

		if (isCurrentAttempt) {
			if (this.#activeValidation?.kind === "nonSubmit") {
				this.#nonSubmitAbortController = undefined
			}
			this.#activeValidation = undefined
		}

		if (!shouldInstall) {
			if (isCurrentAttempt) {
				this.#commitValidationRuntimeState({
					...this.#validationState,
					isValidating: false,
				})
			}
			return result
		}

		this.#hasValidationResult = true
		this.#commitIssueAndValidationState(
			replaceSchemaIssues(
				this.#issueState,
				result.success ? [] : result.issues,
				{
					all: options.exposeAll,
					paths: options.exposePaths,
				},
			),
			{
				...this.#validationState,
				isValidating: false,
				validationStatus: result.success ? "valid" : "invalid",
			},
		)

		return result
	}

	#failValidation(id: number): void {
		if (this.#activeValidation?.id !== id) {
			return
		}

		if (this.#activeValidation.kind === "nonSubmit") {
			this.#nonSubmitAbortController = undefined
		}
		this.#activeValidation = undefined
		this.#commitValidationRuntimeState({
			...this.#validationState,
			isValidating: false,
			validationStatus: "unvalidated",
		})
	}

	#markValuesChangedForValidation(): void {
		this.#validationRevision += 1
		this.#cancelScheduledValidation()
		this.#validationState = createValidationRuntimeState({
			...this.#validationState,
			validationStatus: "unvalidated",
		})
	}

	#resetValidationRuntime(): void {
		this.#validationRevision += 1
		this.#cancelScheduledValidation()
		this.#abortNonSubmitValidation(false)
		this.#activeSubmissionId = undefined
		this.#hasValidationResult = false
		this.#validationState = createValidationRuntimeState()
	}

	#cancelScheduledValidation(): void {
		if (this.#scheduledValidation === undefined) {
			return
		}

		clearTimeout(this.#scheduledValidation)
		this.#scheduledValidation = undefined
	}

	#abortNonSubmitValidation(notify = true): void {
		this.#nonSubmitAbortController?.abort()
		this.#nonSubmitAbortController = undefined

		if (this.#activeValidation?.kind !== "nonSubmit") {
			return
		}

		this.#activeValidation = undefined
		const nextValidationState = createValidationRuntimeState({
			...this.#validationState,
			isValidating: false,
		})
		if (notify) {
			this.#commitValidationRuntimeState(nextValidationState)
			return
		}

		this.#validationState = nextValidationState
	}

	#commitIssueAndValidationState(
		issueState: IssueState,
		validationState: ValidationRuntimeState,
	): void {
		if (
			issueState === this.#issueState &&
			isSameValidationRuntimeState(validationState, this.#validationState)
		) {
			return
		}

		const previousSnapshot = this.#snapshot
		this.#issueState = issueState
		this.#validationState = validationState
		this.#snapshot = this.#createSnapshot({
			resolvedUi: previousSnapshot.resolvedUi,
		})
		this.#notify()
	}

	#commitValidationRuntimeState(validationState: ValidationRuntimeState): void {
		if (isSameValidationRuntimeState(validationState, this.#validationState)) {
			return
		}

		const previousSnapshot = this.#snapshot
		this.#validationState = validationState
		this.#snapshot = this.#createSnapshot({
			resolvedUi: previousSnapshot.resolvedUi,
		})
		this.#notify()
	}

	#applyActionSuccess(
		result: Extract<FormResult, { readonly status: "success" }>,
		options: ApplyActionResultOptions<Schema>,
	): void {
		if (result.reset === "defaults") {
			this.reset()
			return
		}

		if (result.reset === "submitted") {
			if (options.input !== undefined) {
				this.#resetBaselineTo(options.input)
			}
			return
		}

		const changedPaths = normalizeChangedPaths(options.changedPaths)
		const nextIssueState = replaceServerIssues(
			replaceSchemaIssues(this.#issueState, []),
			[],
		)
		this.#commitIssueAndValidationState(nextIssueState, {
			...this.#validationState,
			isSubmitting: false,
			validationStatus: changedPaths.length === 0 ? "valid" : "unvalidated",
		})
	}

	#applyActionError(
		issues: readonly SubmissionIssue[],
		options: ApplyActionResultOptions<Schema>,
	): ApplyActionResultOutcome {
		const changedPaths = normalizeChangedPaths(options.changedPaths)
		const hasPendingEdits = changedPaths.length > 0
		let staleSchema = false
		const schemaIssues: FormIssue[] = []
		const serverIssues: ImperativeFormIssue[] = []

		for (const issue of issues) {
			if (issue.source === "schema") {
				if (hasPendingEdits) {
					staleSchema = true
					continue
				}

				schemaIssues.push(toFormIssue(issue))
				continue
			}

			if (isStaleServerIssue(issue, changedPaths)) {
				continue
			}

			serverIssues.push(toImperativeServerIssue(issue))
		}

		const nextIssueState = replaceServerIssues(
			replaceSchemaIssues(this.#issueState, schemaIssues, { all: true }),
			serverIssues,
			{ all: true },
		)
		this.#commitIssueAndValidationState(nextIssueState, {
			...this.#validationState,
			isSubmitting: false,
			validationStatus: "invalid",
		})

		if (staleSchema) {
			queueMicrotask(() => {
				void this.validate().catch((error: unknown) => {
					reportValidationHostException(error)
				})
			})
		}

		return Object.freeze({
			scheduledCurrentValidation: staleSchema,
		})
	}

	#resetBaselineTo(values: FormInput<Schema>): void {
		const nextBaselineValues = cloneAndFreezeValue(values)
		const previousSnapshot = this.#snapshot
		this.#baselineValues = nextBaselineValues
		this.#metadataState = createInitialMetadataState(
			this.definition,
			this.#values,
		)
		this.#issueState = createIssueState()
		this.#resetValidationRuntime()
		this.#snapshot = this.#createSnapshot({
			previousResolvedUi: previousSnapshot.resolvedUi,
		})
		this.#notify()
	}

	#callBeforeUpdate(
		nextValues: FormInput<Schema>,
		changes: readonly NormalizedValueChange[],
		source: UpdateSource,
	): false | readonly ValueChange[] | undefined {
		const beforeUpdate = this.#beforeUpdate
		if (beforeUpdate === undefined) {
			return undefined
		}

		this.#isRunningBeforeUpdate = true
		try {
			return beforeUpdate(
				Object.freeze({
					currentValues: clonePublicValue(this.#values),
					nextValues: clonePublicValue(nextValues),
					changes: changes as readonly ValueChange[],
					source,
					context: this.#context as Readonly<Context>,
				}),
			)
		} finally {
			this.#isRunningBeforeUpdate = false
		}
	}

	#assertValueCommandAllowed(): void {
		if (this.#isRunningBeforeUpdate) {
			throw new TypeError(
				"Value commands cannot be called during beforeUpdate; return replacement changes instead",
			)
		}
	}

	#notify(): void {
		for (const subscription of [...this.#subscriptions]) {
			if (!this.#subscriptions.has(subscription)) {
				continue
			}

			const nextSelected = subscription.selector(this.#snapshot)
			if (subscription.equalityFn(subscription.selected, nextSelected)) {
				continue
			}

			const previousSelected = subscription.selected
			subscription.selected = nextSelected
			subscription.listener(nextSelected, previousSelected)
		}
	}
}

function clonePublicValue<Value>(value: Value): Value {
	return freezeFormValue(cloneMutableValueLeaves(value))
}

function createInitialValuePolicyState<Schema extends StandardSchema, Context>(
	definition: NormalizedFormDefinition<Schema>,
	values: FormInput<Schema>,
	context: Context,
	options: {
		readonly disabled: boolean
		readonly readOnly: boolean
	},
): {
	readonly values: FormInput<Schema>
	readonly resolvedUi: ResolvedUiState<Context>
} {
	let nextValues = values
	let previousResolvedUi: ResolvedUiState<Context> | undefined

	for (
		let pass = 0;
		pass <= Object.keys(definition.fieldsByPath).length;
		pass++
	) {
		const resolvedUi =
			previousResolvedUi === undefined
				? resolveUi(definition, nextValues, context, options)
				: resolveUi(definition, nextValues, context, {
						...options,
						previous: previousResolvedUi,
					})
		const policyChanges = createHiddenValuePolicyChanges(resolvedUi, nextValues)

		if (policyChanges.length === 0) {
			return {
				values: nextValues,
				resolvedUi,
			}
		}

		nextValues = freezeFormValue(
			applyValueChanges(nextValues, policyChanges).values,
		)
		previousResolvedUi = resolvedUi
	}

	throw new TypeError("initial valuePolicy changes did not converge")
}

function createHiddenValuePolicyChanges<Context>(
	resolvedUi: ResolvedUiState<Context>,
	values: unknown,
	transitionFromUi?: ResolvedUiState<Context>,
): readonly NormalizedValueChange[] {
	const changes: NormalizedValueChange[] = []

	for (const field of Object.values(resolvedUi.fieldsByPath)) {
		const previouslyVisible =
			transitionFromUi === undefined ||
			transitionFromUi.fieldsByPath[field.path]?.visible === true
		if (
			field.valuePolicy !== "unset" ||
			field.visible ||
			!previouslyVisible ||
			!hasPathValue(values, field.path)
		) {
			continue
		}

		changes.push(createUnsetChange(field.path))
	}

	return Object.freeze(changes)
}

function createResetChanges(
	currentValues: unknown,
	resetValues: unknown,
): readonly NormalizedValueChange[] {
	if (!isPlainObject(resetValues) || !isPlainObject(currentValues)) {
		throw new TypeError("reset values must be plain object form values")
	}

	const changes: NormalizedValueChange[] = []
	for (const key of Object.keys(resetValues)) {
		changes.push(createSetChange(key, resetValues[key]))
	}

	for (const key of Object.keys(currentValues)) {
		if (!Object.hasOwn(resetValues, key)) {
			changes.push(createUnsetChange(key))
		}
	}

	return Object.freeze(changes)
}

function normalizeChangedPaths(
	paths: readonly PathInput[] = [],
): readonly string[] {
	return Object.freeze(paths.map((path) => formatPath(path)))
}

function toFormIssue(issue: SubmissionIssue): FormIssue {
	return Object.freeze({
		source: issue.source,
		message: issue.message,
		...(issue.code === undefined ? {} : { code: issue.code }),
		...(issue.path === undefined ? {} : { path: issue.path }),
	})
}

function toImperativeServerIssue(issue: SubmissionIssue): ImperativeFormIssue {
	return Object.freeze({
		source: "server" as const,
		message: issue.message,
		...(issue.code === undefined ? {} : { code: issue.code }),
		...(issue.path === undefined ? {} : { path: issue.path }),
	})
}

function isStaleServerIssue(
	issue: SubmissionIssue,
	changedPaths: readonly string[],
): boolean {
	if (changedPaths.length === 0) {
		return false
	}

	return (
		issue.path === undefined ||
		changedPaths.some((path) => pathsOverlap(issue.path as string, path))
	)
}

function createValidationRuntimeState(
	state: Partial<ValidationRuntimeState> = {},
): ValidationRuntimeState {
	return Object.freeze({
		isValidating: state.isValidating === true,
		isSubmitting: state.isSubmitting === true,
		validationStatus: state.validationStatus ?? "unvalidated",
		submitCount: state.submitCount ?? 0,
	})
}

function isSameValidationRuntimeState(
	left: ValidationRuntimeState,
	right: ValidationRuntimeState,
): boolean {
	return (
		left.isValidating === right.isValidating &&
		left.isSubmitting === right.isSubmitting &&
		left.validationStatus === right.validationStatus &&
		left.submitCount === right.submitCount
	)
}

function isSameValidationOptions(
	left: ValidationOptions,
	right: ValidationOptions,
): boolean {
	return (
		left.mode === right.mode &&
		left.revalidateMode === right.revalidateMode &&
		left.asyncDebounceMs === right.asyncDebounceMs
	)
}

function asCoreFormStore<Schema extends StandardSchema, Context>(
	store: FormStore<Schema, Context>,
): CoreFormStore<Schema, Context> {
	if (store instanceof CoreFormStore) {
		return store
	}

	throw new TypeError("Submission requires a Form Please form store")
}

function filterPathSubsetIssues(
	issues: readonly FormIssue[],
	paths: readonly string[],
): readonly FormIssue[] {
	return Object.freeze(
		issues.filter(
			(issue) =>
				issue.path !== undefined &&
				paths.some((path) => pathsOverlap(issue.path as string, path)),
		),
	)
}

function normalizePathSubset(
	paths: readonly PathInput[],
	options: { readonly requireNonEmpty: boolean },
): readonly string[] {
	if (!Array.isArray(paths)) {
		throw new TypeError("Path subsets must be an array of field paths")
	}
	if (options.requireNonEmpty && paths.length === 0) {
		throw new TypeError("validatePaths requires at least one field path")
	}

	return Object.freeze([...new Set(paths.map((path) => formatPath(path)))])
}

function pathMatchesSubset(
	path: string,
	paths: readonly string[] | undefined,
): boolean {
	return (
		paths === undefined ||
		paths.some((candidate) => pathsOverlap(path, candidate))
	)
}

function reportValidationHostException(error: unknown): void {
	if (isAbortError(error)) {
		return
	}

	reportHostException(error)
}

function isAbortError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"name" in error &&
		(error as { readonly name?: unknown }).name === "AbortError"
	)
}

function reportHostException(error: unknown): void {
	if (typeof globalThis.reportError === "function") {
		globalThis.reportError(error)
		return
	}

	setTimeout(() => {
		throw error
	}, 0)
}
