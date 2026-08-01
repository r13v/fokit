import {
	type ArrayCommand,
	createArrayCommandChange,
	createRowIdentityChanges,
	createRowIdentityState,
	findArrayNodeForPath,
	isKnownArrayDescendantFieldPath,
	reconcileRowIdentityState,
	reindexRowIdentity,
	replaceRowIdentity,
} from "./array-state.js"
import type {
	NormalizedArrayNode,
	NormalizedFormDefinition,
} from "./definition.js"
import { type FocusTarget, FormFocus } from "./focus.js"
import type { FormCommand } from "./form-commands.js"
import type {
	FormDocumentEvent,
	FormEvent,
	FormRuntimeEvent,
	RestoreOrigin,
	UpdateSource,
} from "./form-events.js"
import type { FormDocument, FormModel } from "./form-model.js"
import {
	createDocumentCommittedEvent,
	createDocumentRestoredEvent,
	createFormDocument,
	reduceFormDocument,
} from "./form-reducer.js"
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
import type {
	FormDispatchResult,
	FormTransaction,
} from "./form-transactions.js"
import {
	deriveFormErrors,
	type FormIssue,
	type ImperativeFormIssue,
} from "./issues.js"
import { deriveFormMetadata, isFormMetadataTouched } from "./metadata.js"
import { type AnyFormMiddleware, MiddlewareCoordinator } from "./middleware.js"
import { isPlainObject } from "./object.js"
import { formatPath, type PathInput, pathsOverlap } from "./path.js"
import type { ArrayFieldPath, FieldPath, PathValue } from "./path-types.js"
import { FormPublication } from "./publication.js"
import { type ResolvedUiState, resolveUi } from "./resolve-ui.js"
import {
	createFieldBlurredEvent,
	createFieldTouchedEvent,
	createFormRuntimeState,
	createIssuesChangedEvent,
	createRuntimeReplacedEvent,
	createRuntimeResetEvent,
	createSubmissionFinishedEvent,
	createSubmissionStartedEvent,
	createValidationFailedEvent,
	createValidationResolvedEvent,
	createValidationStartedEvent,
	reduceFormRuntime,
} from "./runtime-reducer.js"
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
	normalizeValidationOptions,
	type ValidationOptions,
	type ValidationResult,
} from "./validation.js"
import { ValidationLifecycle } from "./validation-lifecycle.js"
import {
	cloneMutableValueLeaves,
	getPathValue,
	hasPathValue,
	isDirtyEqual,
} from "./value.js"

export type { FocusTarget } from "./focus.js"
export type { ValueChange } from "./transaction.js"

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

export type { UpdateSource } from "./form-events.js"

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

type ActiveBatch = {
	changes: NormalizedValueChange[]
	rowIdentity: FormDocument<unknown>["rowIdentity"]
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
	readonly rowIdentity?: FormDocument<unknown>["rowIdentity"]
	readonly resetAfterCommit?: boolean
	readonly transitionFromUi?: ResolvedUiState<Context>
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

export function createFormStoreWithMiddleware<
	Schema extends StandardSchema,
	Context = unknown,
>(
	options: FormStoreOptions<Schema, Context>,
	middleware: readonly AnyFormMiddleware[],
	onCommitFinalized: (
		event: FormEvent<FormInput<Schema>, Context>,
	) => void = () => {},
): FormStore<Schema, Context> {
	return new CoreFormStore(
		options as RuntimeFormStoreOptions<Schema, Context>,
		middleware,
		onCommitFinalized,
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

export function getFormStoreDocument<
	Schema extends StandardSchema,
	Context = unknown,
>(store: FormStore<Schema, Context>): FormDocument<FormInput<Schema>> {
	return asCoreFormStore(store).getDocument()
}

export function restoreFormStoreDocument<
	Schema extends StandardSchema,
	Context = unknown,
>(
	store: FormStore<Schema, Context>,
	document: FormDocument<FormInput<Schema>>,
	origin: RestoreOrigin,
): void {
	asCoreFormStore(store).restoreDocument(document, origin)
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

	#model: FormModel<FormInput<Schema>, Context>
	readonly #publication: FormPublication<
		FormSnapshot<FormInput<Schema>, Context>
	>
	readonly #middleware: MiddlewareCoordinator
	readonly #preparedTransactions = new WeakSet<object>()
	readonly #preparedResolvedUi = new WeakMap<object, ResolvedUiState<Context>>()
	#pendingSnapshot: FormSnapshot<FormInput<Schema>, Context> | undefined
	#pendingPreviousValues: FormInput<Schema> | undefined
	#suppressNextPublication = false
	#suppressedPublicationModel: FormModel<FormInput<Schema>, Context> | undefined
	readonly #onCommitFinalized: (
		event: FormEvent<FormInput<Schema>, Context>,
	) => void

	#activeBatch: ActiveBatch | undefined
	readonly #focus = new FormFocus<FormInput<Schema>, Context>()
	#nextEventSequence = 0
	#nextSubmissionId = 0
	#nextValidationId = 0
	readonly #validationLifecycle: ValidationLifecycle<Schema>
	#isRunningBeforeUpdate = false
	readonly #beforeUpdate: RuntimeFormStoreOptions<
		Schema,
		Context
	>["beforeUpdate"]
	readonly #afterUpdate: RuntimeFormStoreOptions<Schema, Context>["afterUpdate"]

	constructor(
		options: RuntimeFormStoreOptions<Schema, Context>,
		middleware: readonly AnyFormMiddleware[] = [],
		onCommitFinalized: (
			event: FormEvent<FormInput<Schema>, Context>,
		) => void = () => {},
	) {
		this.definition = options.definition
		this.schema = options.definition.schema
		const context = options.context as Context
		const runtimeOptions = Object.freeze({
			disabled: options.disabled === true,
			readOnly: options.readOnly === true,
			validation: normalizeValidationOptions(options.validation),
		})
		const initialState = createInitialValuePolicyState(
			this.definition,
			cloneAndFreezeValue(options.defaultValues),
			context,
			{
				disabled: runtimeOptions.disabled,
				readOnly: runtimeOptions.readOnly,
			},
		)
		const document = createFormDocument(
			initialState.values,
			createRowIdentityState(this.definition, initialState.values),
		)
		this.#model = Object.freeze({
			document,
			runtime: createFormRuntimeState({
				baselineDocument: document,
				context,
				options: runtimeOptions,
				resolvedUi: initialState.resolvedUi,
			}),
		})
		this.#publication = new FormPublication(this.#createSnapshot())
		this.#validationLifecycle = new ValidationLifecycle(this.schema)
		this.#beforeUpdate = options.beforeUpdate
		this.#afterUpdate = options.afterUpdate
		this.#onCommitFinalized = onCommitFinalized
		this.#middleware = new MiddlewareCoordinator({
			middleware,
			getSnapshot: () => this.#pendingSnapshot ?? this.getSnapshot(),
			dispatchCommand: (command) =>
				this.#executeMiddlewareCommand(
					command as FormCommand<FormInput<Schema>, Context>,
				),
			prepareTransaction: (transaction) =>
				this.#freezeTransactionCandidate(
					transaction as FormTransaction<FormInput<Schema>, Context>,
				),
			terminal: (transaction: unknown) =>
				this.#commitTransaction(
					transaction as FormTransaction<FormInput<Schema>, Context>,
				) as FormDispatchResult<unknown, unknown>,
			finalize: (event) =>
				this.#onCommitFinalized(event as FormEvent<FormInput<Schema>, Context>),
			publish: () => this.#publishPendingSnapshot(),
			afterPublication: (event, transaction) =>
				this.#runPostPublicationEffects(
					event as FormEvent<FormInput<Schema>, Context>,
					transaction as FormTransaction<FormInput<Schema>, Context>,
				),
		})
	}

	getSnapshot(): FormSnapshot<FormInput<Schema>, Context> {
		return this.#publication.getSnapshot()
	}

	getServerSnapshot(): FormSnapshot<FormInput<Schema>, Context> {
		return this.#publication.getServerSnapshot()
	}

	getValues(): FormInput<Schema> {
		return clonePublicValue(this.#model.document.values)
	}

	getValue(path: PathInput): unknown
	getValue(path: PathInput): unknown {
		return clonePublicValue(getPathValue(this.#model.document.values, path))
	}

	getDocument(): FormDocument<FormInput<Schema>> {
		return this.#model.document
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

		const resetValues = cloneAndFreezeValue(
			values ?? this.#model.runtime.baselineDocument.values,
		)
		const result = this.#commitValueChanges(
			createResetChanges(this.#model.document.values, resetValues),
			"reset",
			{
				resetAfterCommit: values !== undefined,
				rowIdentity:
					values === undefined
						? this.#model.runtime.baselineDocument.rowIdentity
						: undefined,
			},
		)

		if (result.status === "cancelled") {
			return
		}

		if (result.status === "noValueChange") {
			this.#validationLifecycle.invalidate(true)
			this.#commitRuntimeEvents([
				createRuntimeResetEvent({
					sequence: 0,
					baseline: values === undefined ? "preserved" : "replaced",
					baselineDocument:
						values === undefined ? undefined : this.#model.document,
				}),
			])
		}
	}

	setErrors(issues: readonly ImperativeFormIssue[]): void {
		this.#commitRuntimeEvents([
			createIssuesChangedEvent({
				sequence: 0,
				change: { type: "imperative/set", issues },
			}),
		])
	}

	clearErrors(path?: PathInput): void {
		this.#commitRuntimeEvents([
			createIssuesChangedEvent({
				sequence: 0,
				change: {
					type: "imperative/clear",
					...(path === undefined ? {} : { path: formatPath(path) }),
				},
			}),
		])
	}

	validate(): Promise<ValidationResult<FormOutput<Schema>>>
	validate(path: PathInput): Promise<readonly FormIssue[]>
	validate(
		path?: PathInput,
	): Promise<ValidationResult<FormOutput<Schema>> | readonly FormIssue[]> {
		this.#validationLifecycle.cancelScheduled()
		const canonicalPath = path === undefined ? undefined : formatPath(path)

		return this.#runValidation({
			kind: "nonSubmit",
			exposeAll: canonicalPath === undefined,
			exposePaths: canonicalPath === undefined ? [] : [canonicalPath],
		}).then((result) => {
			if (canonicalPath === undefined) return result
			if (result.success) return []
			return filterPathSubsetIssues(result.issues, [canonicalPath])
		})
	}

	validatePaths<Path extends FieldPath<FormInput<Schema>>>(
		paths: readonly Path[],
	): Promise<readonly FormIssue[]> {
		const canonicalPaths = normalizePathSubset(paths, {
			requireNonEmpty: true,
		})
		this.#validationLifecycle.cancelScheduled()

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
		this.#commitRuntimeEvents([
			createSubmissionStartedEvent({
				sequence: 0,
				attemptId: id,
				documentRevision: this.#model.runtime.documentRevision,
			}),
		])
		return id
	}

	validateSubmission(): Promise<ValidationResult<FormOutput<Schema>>> {
		this.#validationLifecycle.cancelScheduled()
		return this.#runValidation({
			kind: "submit",
			exposeAll: true,
			exposePaths: [],
		})
	}

	finishSubmission(id: number): void {
		const submission = this.#model.runtime.submission
		const revision =
			submission.status === "submitting"
				? submission.documentRevision
				: this.#model.runtime.documentRevision
		this.#commitRuntimeEvents([
			createSubmissionFinishedEvent({
				sequence: 0,
				attemptId: id,
				documentRevision: revision,
			}),
		])
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
			rowIdentity: this.#model.document.rowIdentity,
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
			rowIdentity: batch.rowIdentity,
		})
	}

	subscribe<Selected>(
		selector: FormStoreSelector<FormInput<Schema>, Context, Selected>,
		listener: FormStoreListener<Selected>,
		options: FormStoreSubscriptionOptions<Selected> = {},
	): () => void {
		return this.#publication.subscribe(
			selector,
			listener,
			options.equalityFn ?? Object.is,
		)
	}

	replaceOptions(options: FormStoreRuntimeOptions): void {
		this.#replaceRuntime(this.#model.runtime.context as Context, options)
	}

	replaceContext(context: Context): void {
		this.#replaceRuntime(context)
	}

	replaceRuntime(context: Context, options: FormStoreRuntimeOptions): void {
		this.#replaceRuntime(context, options)
	}

	#replaceRuntime(context: Context, options?: FormStoreRuntimeOptions): void {
		const current = this.#model.runtime
		const contextChanged = !Object.is(context, current.context)
		const nextDisabled =
			options === undefined
				? current.options.disabled
				: options.disabled === true
		const nextReadOnly =
			options === undefined
				? current.options.readOnly
				: options.readOnly === true
		const nextValidationOptions =
			options === undefined
				? current.options.validation
				: normalizeValidationOptions(options.validation)
		const validationChanged = !isSameValidationOptions(
			current.options.validation,
			nextValidationOptions,
		)

		if (
			!contextChanged &&
			current.options.disabled === nextDisabled &&
			current.options.readOnly === nextReadOnly &&
			!validationChanged
		) {
			return
		}

		const previousSnapshot = this.getSnapshot()
		if (validationChanged) {
			this.#validationLifecycle.cancelScheduled()
			this.#validationLifecycle.abortNonSubmit()
		}
		const resolvedUi = resolveUi(
			this.definition,
			this.#model.document.values,
			context,
			{
				disabled: nextDisabled,
				readOnly: nextReadOnly,
				previous: previousSnapshot.resolvedUi,
			},
		)
		this.#commitRuntimeEvents([
			createRuntimeReplacedEvent({
				sequence: 0,
				context,
				runtimeOptions: {
					disabled: nextDisabled,
					readOnly: nextReadOnly,
					validation: nextValidationOptions,
				},
				resolvedUi,
			}),
		])
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
		this.#commitRuntimeEvents([
			exposeIssues
				? createFieldBlurredEvent({
						sequence: 0,
						path: canonicalPath,
					})
				: createFieldTouchedEvent({
						sequence: 0,
						path: canonicalPath,
					}),
		])
	}

	registerFieldRef(path: PathInput, element: FocusTarget | null): void {
		const canonicalPath =
			element === null ? formatPath(path) : this.#normalizeKnownFieldPath(path)
		if (element === null) {
			this.#focus.registerField(canonicalPath, null)
			return
		}
		this.#focus.registerField(canonicalPath, element)
	}

	[errorSummaryFocusTargetRegistration](
		index: number,
		element: FocusTarget | null,
	): void {
		this.#focus.registerSummary(index, element)
	}

	focus(path: PathInput): void {
		this.#focus.focusField(formatPath(path), this.getSnapshot())
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

		return this.#focus.focusFirstError(
			this.getSnapshot(),
			canonicalPaths,
			pathMatchesSubset,
		)
	}

	#createSnapshot(
		options: { readonly resolvedUi?: ResolvedUiState<Context> } = {},
	): FormSnapshot<FormInput<Schema>, Context> {
		const { document, runtime } = this.#model
		const resolvedUi = options.resolvedUi ?? runtime.resolvedUi
		const isValidating = runtime.validation.status === "validating"
		const metadata = deriveFormMetadata(
			this.definition,
			document,
			runtime.baselineDocument,
			runtime.touchedPaths,
			isValidating,
		)
		const { errors, displayErrors } = deriveFormErrors(
			runtime.issues,
			resolvedUi,
		)
		const values = clonePublicValue(document.values)

		return createFormSnapshot({
			values,
			baselineValues: runtime.baselineDocument.values,
			context: runtime.context as Context,
			displayErrors,
			errors,
			resolvedUi,
			metadata,
			isTouched: isFormMetadataTouched(metadata),
			isValidating,
			isSubmitting: runtime.submission.status === "submitting",
			validationStatus: runtime.validation.validationStatus,
			submitCount: runtime.submission.submitCount,
		})
	}

	#normalizeKnownFieldPath(path: PathInput): string {
		const canonicalPath = formatPath(path)
		if (
			this.definition.fieldsByPath[canonicalPath] === undefined &&
			this.definition.arraysByPath[canonicalPath] === undefined &&
			this.getSnapshot().resolvedUi.fieldsByPath[canonicalPath] === undefined &&
			this.getSnapshot().resolvedUi.arraysByPath[canonicalPath] === undefined &&
			!isKnownArrayDescendantFieldPath(
				this.definition,
				this.#model.document.values,
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
					? this.#model.document.values
					: applyValueChanges(
							this.#model.document.values,
							this.#activeBatch.changes,
						).values
			const baseRowIdentity =
				this.#activeBatch?.rowIdentity ?? this.#model.document.rowIdentity
			const update = createArrayCommandChange(
				canonicalPath,
				arrayTarget.node,
				baseValues,
				baseRowIdentity,
				command,
			)

			if (update === undefined) {
				return
			}

			const rowIdentity = replaceRowIdentity(
				reindexRowIdentity(
					baseRowIdentity,
					canonicalPath,
					update.previousKeys,
					update.nextKeys,
				),
				canonicalPath,
				update.rowIdentity,
			)

			if (this.#activeBatch !== undefined) {
				this.#activeBatch.changes.push(...update.changes)
				this.#activeBatch.rowIdentity = rowIdentity
				return
			}

			this.#commitValueChanges(update.changes, "array", {
				rowIdentity,
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
			options.transitionFromUi ?? this.getSnapshot().resolvedUi
		const proposal = this.#createValueProposal(changes, transitionFromUi)
		if (proposal === undefined) {
			const rowIdentity = reconcileRowIdentityState(
				this.definition,
				this.#model.document.values,
				(options.rowIdentity as
					| FormDocument<FormInput<Schema>>["rowIdentity"]
					| undefined) ?? this.#model.document.rowIdentity,
			)
			const rowIdentityChanges = createRowIdentityChanges(
				this.#model.document.rowIdentity,
				rowIdentity,
			)
			if (rowIdentityChanges.length > 0) {
				const result = this.#dispatchEventCandidate(
					createDocumentCommittedEvent({
						sequence: 0,
						source,
						changes: [],
						rowIdentityChanges,
					}),
					this.#model.runtime.resolvedUi,
				)
				return { status: result.status }
			}
			return {
				status: "noValueChange",
				values: this.#model.document.values,
			}
		}

		let nextValues = proposal.values
		let effectiveChanges = proposal.changes
		let resolvedUi = proposal.resolvedUi
		let rowIdentity =
			(options.rowIdentity as
				| FormDocument<FormInput<Schema>>["rowIdentity"]
				| undefined) ?? this.#model.document.rowIdentity

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
					return {
						status: "noValueChange",
						values: this.#model.document.values,
					}
				}

				nextValues = replacementProposal.values
				effectiveChanges = replacementProposal.changes
				resolvedUi = replacementProposal.resolvedUi
				rowIdentity = this.#model.document.rowIdentity
			}
		}

		const previousDocument = this.#model.document
		rowIdentity = reconcileRowIdentityState(
			this.definition,
			nextValues,
			rowIdentity,
		)
		const result = this.#dispatchEventCandidate(
			createDocumentCommittedEvent({
				sequence: 0,
				source,
				changes: effectiveChanges,
				rowIdentityChanges: createRowIdentityChanges(
					previousDocument.rowIdentity,
					rowIdentity,
				),
				baseline: options.resetAfterCommit === true ? "replaced" : "preserved",
			}),
			resolvedUi,
		)
		return { status: result.status }
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
		let proposal = applyValueChanges(this.#model.document.values, changes)
		let nextValues = proposal.values
		let effectiveChanges = proposal.changes
		let previousResolvedUi = this.getSnapshot().resolvedUi

		for (
			let pass = 0;
			pass <= Object.keys(this.definition.fieldsByPath).length;
			pass++
		) {
			const resolvedUi = resolveUi(
				this.definition,
				nextValues,
				this.#model.runtime.context as Context,
				{
					disabled: this.#model.runtime.options.disabled,
					previous: previousResolvedUi,
					readOnly: this.#model.runtime.options.readOnly,
				},
			)
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

			proposal = applyValueChanges(this.#model.document.values, [
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

	#scheduleAutomaticValidation(
		trigger: "blur" | "change",
		paths: readonly string[],
	): void {
		if (!this.#shouldRunAutomaticValidation(trigger)) {
			return
		}

		const exposePaths = paths.map((path) => formatPath(path))
		this.#validationLifecycle.cancelScheduled()
		const validationOptions = this.#model.runtime.options.validation

		if (trigger === "change" && (validationOptions.asyncDebounceMs ?? 0) > 0) {
			this.#abortNonSubmitValidation()
			this.#validationLifecycle.schedule(
				validationOptions.asyncDebounceMs ?? 0,
				() => {
					void this.#runValidation({
						kind: "nonSubmit",
						exposeAll: false,
						exposePaths,
					}).catch((error: unknown) => {
						reportValidationHostException(error)
					})
				},
			)
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
		const validationOptions = this.#model.runtime.options.validation
		const mode = this.#validationLifecycle.hasResult
			? validationOptions.revalidateMode
			: validationOptions.mode

		return mode === trigger
	}

	#runValidation(options: {
		readonly kind: "nonSubmit" | "submit"
		readonly exposeAll: boolean
		readonly exposePaths: readonly string[]
	}): Promise<ValidationResult<FormOutput<Schema>>> {
		const id = ++this.#nextValidationId
		const values = this.#model.document.values
		const revision = this.#model.runtime.documentRevision
		const startedEvent = createValidationStartedEvent({
			sequence: 0,
			attemptId: id,
			documentRevision: revision,
			kind: options.kind,
			exposeAll: options.exposeAll,
			exposePaths: options.exposePaths,
		})
		this.#suppressNextPublication = true
		this.#suppressedPublicationModel = this.#model
		const queued = this.#middleware.isRunning
		const started = this.#dispatchEventCandidate(startedEvent)
		if (started.status === "cancelled" && !queued) {
			this.#suppressNextPublication = false
			this.#suppressedPublicationModel = undefined
		}
		let attempt: ReturnType<ValidationLifecycle<Schema>["start"]>
		try {
			attempt = this.#validationLifecycle.start(
				id,
				values,
				revision,
				options.kind,
			)
		} catch (error) {
			this.#commitRuntimeEvents([
				createValidationFailedEvent({
					sequence: 0,
					attemptId: id,
					documentRevision: revision,
				}),
			])
			return Promise.reject(error)
		}
		if (attempt.asynchronous) {
			this.#suppressNextPublication = false
			this.#suppressedPublicationModel = undefined
			if (started.status === "committed") this.#publishPendingSnapshot()
		}

		return Promise.resolve(attempt.result)
			.then((result) => this.#finishValidation(attempt, result))
			.catch((error: unknown) => {
				this.#failValidation(id, revision)
				throw error
			})
	}

	#finishValidation(
		attempt: ReturnType<ValidationLifecycle<Schema>["start"]>,
		result: ValidationResult<FormOutput<Schema>>,
	): ValidationResult<FormOutput<Schema>> {
		if (!this.#validationLifecycle.finish(attempt.id, true)) return result
		this.#commitRuntimeEvents([
			createValidationResolvedEvent(
				result.success
					? {
							sequence: 0,
							attemptId: attempt.id,
							documentRevision: attempt.documentRevision,
							status: "valid",
						}
					: {
							sequence: 0,
							attemptId: attempt.id,
							documentRevision: attempt.documentRevision,
							status: "invalid",
							issues: result.issues,
						},
			),
		])

		return result
	}

	#failValidation(id: number, documentRevision: number): void {
		if (!this.#validationLifecycle.finish(id, false)) return
		this.#commitRuntimeEvents([
			createValidationFailedEvent({
				sequence: 0,
				attemptId: id,
				documentRevision,
			}),
		])
	}

	#abortNonSubmitValidation(): void {
		const validation = this.#model.runtime.validation
		if (!this.#validationLifecycle.abortNonSubmit()) return
		if (validation.status !== "validating") return
		this.#commitRuntimeEvents([
			createValidationFailedEvent({
				sequence: 0,
				attemptId: validation.attemptId,
				documentRevision: validation.documentRevision,
			}),
		])
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
		const events: FormRuntimeEvent<Context, FormInput<Schema>>[] = []
		if (changedPaths.length === 0) {
			events.push(...this.#createValidationResultEvents("valid", []))
		} else {
			events.push(
				createIssuesChangedEvent({
					sequence: 0,
					change: { type: "schema/replace", issues: [] },
				}),
			)
		}
		events.push(
			createIssuesChangedEvent({
				sequence: 0,
				change: { type: "server/replace", issues: [] },
			}),
			...this.#createSubmissionFinishedEvents(),
		)
		this.#commitRuntimeEvents(events)
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

		this.#commitRuntimeEvents([
			...this.#createValidationResultEvents("invalid", schemaIssues),
			createIssuesChangedEvent({
				sequence: 0,
				change: {
					type: "server/replace",
					issues: serverIssues,
					exposeAll: true,
				},
			}),
			...this.#createSubmissionFinishedEvents(),
		])

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
		const rowIdentity = reconcileRowIdentityState(
			this.definition,
			nextBaselineValues,
			this.#model.document.rowIdentity,
		)
		const baselineDocument = createFormDocument(nextBaselineValues, rowIdentity)
		this.#validationLifecycle.invalidate(true)
		this.#commitRuntimeEvents([
			createRuntimeResetEvent({
				sequence: 0,
				baseline: "replaced",
				baselineDocument,
			}),
		])
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
					currentValues: clonePublicValue(this.#model.document.values),
					nextValues: clonePublicValue(nextValues),
					changes: changes as readonly ValueChange[],
					source,
					context: this.#model.runtime.context,
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

	#createValidationResultEvents(
		status: "valid" | "invalid",
		issues: readonly FormIssue[],
	): readonly FormRuntimeEvent<Context, FormInput<Schema>>[] {
		const id = ++this.#nextValidationId
		const revision = this.#model.runtime.documentRevision
		return [
			createValidationStartedEvent({
				sequence: 0,
				attemptId: id,
				documentRevision: revision,
				kind: "submit",
				exposeAll: true,
			}),
			createValidationResolvedEvent(
				status === "valid"
					? {
							sequence: 0,
							attemptId: id,
							documentRevision: revision,
							status,
						}
					: {
							sequence: 0,
							attemptId: id,
							documentRevision: revision,
							status,
							issues,
						},
			),
		]
	}

	#createSubmissionFinishedEvents(): readonly FormRuntimeEvent<
		Context,
		FormInput<Schema>
	>[] {
		const submission = this.#model.runtime.submission
		if (submission.status !== "submitting") return []
		return [
			createSubmissionFinishedEvent({
				sequence: 0,
				attemptId: submission.attemptId,
				documentRevision: submission.documentRevision,
			}),
		]
	}

	#nextSequence(): number {
		return ++this.#nextEventSequence
	}

	#reduceRuntimeEvent(
		event: FormRuntimeEvent<Context, FormInput<Schema>>,
	): void {
		const runtime = reduceFormRuntime(
			this.#model.runtime,
			event,
			this.#model.document,
		)
		if (runtime === this.#model.runtime) return
		this.#model = Object.freeze({ ...this.#model, runtime })
	}

	#reduceDocumentEvent(event: FormDocumentEvent<FormInput<Schema>>): void {
		const previousDocument = this.#model.document
		const document = reduceFormDocument(previousDocument, event)
		const runtime = reduceFormRuntime(
			this.#model.runtime,
			event,
			document,
			previousDocument,
		)
		this.#model = Object.freeze({ document, runtime })
	}

	#commitRuntimeEvents(
		events: readonly FormRuntimeEvent<Context, FormInput<Schema>>[],
	): void {
		for (const event of events) this.#dispatchEventCandidate(event)
	}

	restoreDocument(
		document: FormDocument<FormInput<Schema>>,
		origin: RestoreOrigin,
	): void {
		this.#assertValueCommandAllowed()
		if (this.#activeBatch !== undefined) {
			throw new TypeError("restoreDocument cannot be called inside a batch")
		}
		this.#dispatchEventCandidate(
			createDocumentRestoredEvent({
				sequence: 0,
				document,
				origin,
				history: "skip",
			}),
		)
	}

	#dispatchEventCandidate(
		event: FormEvent<FormInput<Schema>, Context>,
		resolvedUi?: ResolvedUiState<Context>,
	): FormDispatchResult<FormInput<Schema>, Context> {
		const transaction = eventToTransaction(event)
		this.#preparedTransactions.add(transaction)
		if (resolvedUi !== undefined) {
			this.#preparedResolvedUi.set(transaction, resolvedUi)
		}
		return this.#middleware.run(
			transaction as FormTransaction<unknown, unknown>,
		) as FormDispatchResult<FormInput<Schema>, Context>
	}

	#commitTransaction(
		transaction: FormTransaction<FormInput<Schema>, Context>,
	): FormDispatchResult<FormInput<Schema>, Context> {
		const preparedResolvedUi = this.#preparedResolvedUi.get(transaction)
		const event = this.#createCommittedEvent(transaction)
		const previousModel = this.#model
		if (event.type === "document/committed") {
			this.#pendingPreviousValues = clonePublicValue(
				this.#model.document.values,
			)
			this.#validationLifecycle.invalidate(
				event.baseline === "replaced" || event.source === "reset",
			)
			this.#reduceDocumentEvent(event)
			if (event.source === "reset" && event.baseline !== "replaced") {
				this.#reduceRuntimeEvent(
					createRuntimeResetEvent({
						sequence: event.sequence,
						baseline: "preserved",
					}),
				)
			}
			this.#refreshResolvedUi(event.sequence, preparedResolvedUi)
		} else if (event.type === "document/restored") {
			this.#validationLifecycle.invalidate()
			this.#reduceDocumentEvent(event)
			this.#refreshResolvedUi(event.sequence)
		} else {
			this.#reduceRuntimeEvent(event)
		}

		if (this.#model !== previousModel) {
			this.#pendingSnapshot = this.#createSnapshot()
		}
		return Object.freeze({ status: "committed", event })
	}

	#createCommittedEvent(
		transaction: FormTransaction<FormInput<Schema>, Context>,
	): FormEvent<FormInput<Schema>, Context> {
		return this.#createEvent(transaction, this.#nextSequence())
	}

	#freezeTransactionCandidate(
		transaction: FormTransaction<FormInput<Schema>, Context>,
	): FormTransaction<FormInput<Schema>, Context> {
		if (this.#preparedTransactions.has(transaction)) return transaction
		const prepared = eventToTransaction(this.#createEvent(transaction, 0))
		this.#preparedTransactions.add(prepared)
		return prepared
	}

	#createEvent(
		transaction: FormTransaction<FormInput<Schema>, Context>,
		sequence: number,
	): FormEvent<FormInput<Schema>, Context> {
		switch (transaction.type) {
			case "document/committed":
				return createDocumentCommittedEvent({ sequence, ...transaction })
			case "document/restored":
				return createDocumentRestoredEvent({ sequence, ...transaction })
			case "runtime/replaced":
				return createRuntimeReplacedEvent({
					sequence,
					context: transaction.context as Context,
					runtimeOptions: transaction.options,
					resolvedUi: transaction.resolvedUi,
				})
			case "runtime/reset":
				return createRuntimeResetEvent({ sequence, ...transaction })
			case "validation/started":
				return createValidationStartedEvent({ sequence, ...transaction })
			case "validation/resolved":
				return createValidationResolvedEvent({ sequence, ...transaction })
			case "validation/failed":
				return createValidationFailedEvent({ sequence, ...transaction })
			case "submission/started":
				return createSubmissionStartedEvent({ sequence, ...transaction })
			case "submission/finished":
				return createSubmissionFinishedEvent({ sequence, ...transaction })
			case "field/touched":
				return createFieldTouchedEvent({ sequence, ...transaction })
			case "field/blurred":
				return createFieldBlurredEvent({ sequence, ...transaction })
			case "issues/changed":
				return createIssuesChangedEvent({ sequence, ...transaction })
			default:
				throw new TypeError(
					`Unsupported form transaction type "${String((transaction as { readonly type?: unknown }).type)}"`,
				)
		}
	}

	#refreshResolvedUi(
		sequence: number,
		prepared?: ResolvedUiState<Context>,
	): void {
		const runtime = this.#model.runtime
		const resolvedUi =
			prepared ??
			resolveUi(
				this.definition,
				this.#model.document.values,
				runtime.context as Context,
				{
					disabled: runtime.options.disabled,
					readOnly: runtime.options.readOnly,
					previous: runtime.resolvedUi,
				},
			)
		this.#reduceRuntimeEvent(
			createRuntimeReplacedEvent({
				sequence,
				context: runtime.context as Context,
				runtimeOptions: runtime.options,
				resolvedUi,
			}),
		)
	}

	#publishPendingSnapshot(): void {
		if (this.#suppressNextPublication) {
			this.#suppressNextPublication = false
			return
		}
		const snapshot = this.#pendingSnapshot
		this.#pendingSnapshot = undefined
		const hadSuppressedPublication =
			this.#suppressedPublicationModel !== undefined
		this.#suppressedPublicationModel = undefined
		if (
			hadSuppressedPublication &&
			snapshot !== undefined &&
			hasSamePublishedSnapshot(snapshot, this.getSnapshot())
		) {
			return
		}
		if (snapshot !== undefined) this.#publication.publish(snapshot)
	}

	#runPostPublicationEffects(
		event: FormEvent<FormInput<Schema>, Context>,
		_transaction: FormTransaction<FormInput<Schema>, Context>,
	): void {
		if (event.type === "field/blurred") {
			this.#scheduleAutomaticValidation("blur", [event.path])
			return
		}
		if (event.type !== "document/committed") return

		const previousValues = this.#pendingPreviousValues
		this.#pendingPreviousValues = undefined
		if (previousValues === undefined) return
		this.#afterUpdate?.(
			Object.freeze({
				previousValues,
				values: this.getSnapshot().values,
				changes: event.changes as readonly ValueChange[],
				source: event.source,
				context: this.#model.runtime.context,
			}),
		)
		if (event.source !== "reset") {
			this.#scheduleAutomaticValidation(
				"change",
				event.changes.map((change) => change.path),
			)
		}
	}

	#executeMiddlewareCommand(
		command: FormCommand<FormInput<Schema>, Context>,
	): void {
		switch (command.type) {
			case "value/set":
				this.setValue(command.path, command.value)
				return
			case "values/set":
				this.setValues(command.values)
				return
			case "value/unset":
				this.unsetValue(command.path)
				return
			case "array/append":
				command.value === undefined
					? this.append(command.path)
					: this.append(command.path, command.value)
				return
			case "array/insert":
				command.value === undefined
					? this.insert(command.path, command.index)
					: this.insert(command.path, command.index, command.value)
				return
			case "array/remove":
				this.remove(command.path, command.index)
				return
			case "array/move":
				this.move(command.path, command.from, command.to)
				return
			case "form/reset":
				this.reset(command.values)
				return
			case "field/touch":
				this.touch(command.path)
				return
			case "field/blur":
				this.blur(command.path)
				return
			case "validation/run":
				void this.validate(command.path as PathInput)
				return
			case "validation/runPaths":
				void this.validatePaths(command.paths)
				return
			case "issues/set":
				this.setErrors(command.issues)
				return
			case "issues/clear":
				this.clearErrors(command.path)
				return
			case "runtime/replaceContext":
				this.replaceContext(command.context)
				return
			case "runtime/replaceOptions":
				this.replaceOptions(command.options)
		}
	}
}

function eventToTransaction<Input, Context>(
	event: FormEvent<Input, Context>,
): FormTransaction<Input, Context> {
	const { sequence: _sequence, ...transaction } = event
	return Object.freeze(transaction) as FormTransaction<Input, Context>
}

function hasSamePublishedSnapshot<Input, Context>(
	left: FormSnapshot<Input, Context>,
	right: FormSnapshot<Input, Context>,
): boolean {
	return (
		isDirtyEqual(left.values, right.values) &&
		isDirtyEqual(left.metadata, right.metadata) &&
		hasSameFormErrors(left.errors, right.errors) &&
		hasSameFormErrors(left.displayErrors, right.displayErrors) &&
		isDirtyEqual(left.displayErrors.summary, right.displayErrors.summary) &&
		left.isDirty === right.isDirty &&
		left.isTouched === right.isTouched &&
		left.isValidating === right.isValidating &&
		left.isSubmitting === right.isSubmitting &&
		left.validationStatus === right.validationStatus &&
		left.submitCount === right.submitCount &&
		Object.is(left.context, right.context) &&
		left.resolvedUi === right.resolvedUi
	)
}

function hasSameFormErrors(
	left: FormSnapshot<unknown>["errors"],
	right: FormSnapshot<unknown>["errors"],
): boolean {
	if (!isDirtyEqual(left.form, right.form)) return false
	if (left.fields.size !== right.fields.size) return false
	for (const [path, issues] of left.fields) {
		if (!isDirtyEqual(issues, right.fields.get(path))) return false
	}
	return true
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
