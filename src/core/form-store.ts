import {
	type ArrayCommand,
	createArrayCommandChange,
	isKnownArrayDescendantFieldPath,
	reindexTouchedArrayPaths,
	replaceArrayRowState,
} from "./array-state.js"
import type { NormalizedFormDefinition } from "./definition.js"
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
import {
	formatPath,
	isDescendantPath,
	isSamePath,
	type PathInput,
	parsePath,
} from "./path.js"
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
import { getPathValue, isDirtyEqual } from "./value.js"

export type { ValueChange } from "./transaction.js"

export type FocusTarget = {
	focus(options?: FocusOptions): void
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
	) => false | readonly ValueChange[] | undefined
	readonly onUpdate?: (event: UpdateEvent<Input, Context>) => void
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
	batch(callback: () => void): void
	subscribe<Selected>(
		selector: FormStoreSelector<FormInput<Schema>, Context, Selected>,
		listener: FormStoreListener<Selected>,
		options?: FormStoreSubscriptionOptions<Selected>,
	): () => void
	replaceContext(context: Context): void
	touch(path: PathInput): void
	blur(path: PathInput): void
	registerFieldRef(path: PathInput, element: FocusTarget | null): void
	focus(path: PathInput): void
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

export function createFormStore<
	Schema extends StandardSchema,
	Context = unknown,
>(options: FormStoreOptions<Schema, Context>): FormStore<Schema, Context> {
	return new CoreFormStore(options) as unknown as FormStore<Schema, Context>
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
	readonly #disabled: boolean
	#hasValidationResult = false
	#nextValidationId = 0
	#nonSubmitAbortController: AbortController | undefined
	#scheduledValidation: ReturnType<typeof setTimeout> | undefined
	readonly #validationOptions: ValidationOptions
	#validationRevision = 0
	#validationState: ValidationRuntimeState = createValidationRuntimeState()
	readonly #focusTargets = new Map<string, FocusTarget>()
	#isRunningBeforeUpdate = false
	readonly #readOnly: boolean
	readonly #subscriptions = new Set<Subscription<FormInput<Schema>, Context>>()
	readonly #beforeUpdate: UpdateHooks<
		FormInput<Schema>,
		Context
	>["beforeUpdate"]
	readonly #onUpdate: UpdateHooks<FormInput<Schema>, Context>["onUpdate"]

	constructor(options: FormStoreOptions<Schema, Context>) {
		this.definition = options.definition
		this.schema = options.definition.schema
		this.#values = cloneAndFreezeValue(options.defaultValues)
		this.#baselineValues = cloneAndFreezeValue(options.defaultValues)
		this.#context = options.context as Context
		this.#disabled = options.disabled === true
		this.#readOnly = options.readOnly === true
		this.#validationOptions = normalizeValidationOptions(options.validation)
		this.#issueState = createIssueState()
		this.#metadataState = createInitialMetadataState(
			this.definition,
			this.#values,
		)
		this.#snapshot = this.#createSnapshot()
		this.#serverSnapshot = this.#snapshot
		this.#beforeUpdate = options.beforeUpdate
		this.#onUpdate = options.onUpdate
	}

	getSnapshot(): FormSnapshot<FormInput<Schema>, Context> {
		return this.#snapshot
	}

	getServerSnapshot(): FormSnapshot<FormInput<Schema>, Context> {
		return this.#serverSnapshot
	}

	getValues(): FormInput<Schema> {
		return this.#snapshot.values
	}

	getValue(path: PathInput): unknown
	getValue(path: PathInput): unknown {
		return getPathValue(this.#snapshot.values, path)
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
		const canonicalPath =
			path === undefined ? undefined : this.#normalizeKnownFieldPath(path)

		return this.#runValidation({
			kind: "nonSubmit",
			exposeAll: canonicalPath === undefined,
			exposePaths: canonicalPath === undefined ? [] : [canonicalPath],
		}).then((result) =>
			canonicalPath === undefined
				? result
				: result.success
					? []
					: filterPathSubtreeIssues(result.issues, canonicalPath),
		)
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

	replaceContext(context: Context): void {
		if (Object.is(context, this.#context)) {
			return
		}

		const previousSnapshot = this.#snapshot
		this.#context = context
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

	focus(path: PathInput): void {
		const canonicalPath = formatPath(path)
		const field = this.#snapshot.resolvedUi.fieldsByPath[canonicalPath]
		if (
			field === undefined ||
			!field.visible ||
			field.disabled ||
			field.readOnly
		) {
			return
		}

		this.#focusTargets.get(canonicalPath)?.focus()
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
				? resolveUi(
						this.definition,
						this.#values,
						this.#context,
						this.#resolveUiOptions(),
					)
				: resolveUi(this.definition, this.#values, this.#context, {
						...this.#resolveUiOptions(),
						previous: options.previousResolvedUi,
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

		return createFormSnapshot({
			values: this.#values,
			baselineValues: this.#baselineValues,
			context: this.#context,
			displayErrors,
			errors,
			resolvedUi,
			metadata,
			isTouched: isFormMetadataTouched(metadata),
			isValidating: this.#validationState.isValidating,
			validationStatus: this.#validationState.validationStatus,
			submitCount: this.#validationState.submitCount,
		})
	}

	#normalizeKnownFieldPath(path: PathInput): string {
		const canonicalPath = formatPath(path)
		if (
			this.definition.fieldsByPath[canonicalPath] === undefined &&
			this.definition.arraysByPath[canonicalPath] === undefined &&
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

	#normalizeKnownArrayPath(path: PathInput): string {
		const canonicalPath = formatPath(path)

		if (this.definition.arraysByPath[canonicalPath] === undefined) {
			if (this.definition.fieldsByPath[canonicalPath] !== undefined) {
				throw new TypeError(`Path "${canonicalPath}" is not an array field`)
			}

			throw new TypeError(`Unknown array path "${canonicalPath}"`)
		}

		return canonicalPath
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
			const canonicalPath = this.#normalizeKnownArrayPath(path)
			const baseValues =
				this.#activeBatch === undefined
					? this.#values
					: applyValueChanges(this.#values, this.#activeBatch.changes).values
			const baseMetadataState =
				this.#activeBatch?.metadataState ?? this.#metadataState
			const baseIssueState = this.#activeBatch?.issueState ?? this.#issueState
			const update = createArrayCommandChange(
				canonicalPath,
				this.definition.arraysByPath[canonicalPath],
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
					baseMetadataState.arrayRowsByPath,
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
			if (options.metadataState !== undefined) {
				this.#applyMetadataOnly(options.metadataState)
			}
			return { status: "noValueChange", values: this.#values }
		}

		let nextValues = proposal.values
		let effectiveChanges = proposal.changes
		let resolvedUi = proposal.resolvedUi

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
				const replacementProposal = this.#createValueProposal(
					replacement,
					transitionFromUi,
				)
				if (replacementProposal === undefined) {
					return { status: "noValueChange", values: this.#values }
				}

				nextValues = replacementProposal.values
				effectiveChanges = replacementProposal.changes
				resolvedUi = replacementProposal.resolvedUi
			}
		}

		const previousSnapshot = this.#snapshot
		this.#values = nextValues
		if (options.resetAfterCommit === true) {
			this.#baselineValues = nextValues
			this.#metadataState = createInitialMetadataState(
				this.definition,
				nextValues,
			)
			this.#issueState = createIssueState()
			this.#resetValidationRuntime()
		} else if (options.metadataState !== undefined) {
			this.#metadataState = options.metadataState
		}
		if (options.resetAfterCommit !== true) {
			this.#markValuesChangedForValidation()
			this.#issueState = clearServerIssuesForChanges(
				options.issueState ?? this.#issueState,
				effectiveChanges.map((change) => change.path),
			)
		}
		this.#snapshot = this.#createSnapshot({
			previousResolvedUi: previousSnapshot.resolvedUi,
			resolvedUi,
		})
		this.#notify()
		this.#onUpdate?.(
			Object.freeze({
				previousValues: previousSnapshot.values,
				values: this.#snapshot.values,
				changes: effectiveChanges as readonly ValueChange<FormInput<Schema>>[],
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
				...this.#resolveUiOptions(),
				previous: previousResolvedUi,
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
		const changes: NormalizedValueChange[] = []

		for (const field of Object.values(resolvedUi.fieldsByPath)) {
			if (
				field.valuePolicy !== "unset" ||
				field.visible ||
				transitionFromUi.fieldsByPath[field.path]?.visible !== true ||
				!hasPathValue(values, field.path)
			) {
				continue
			}

			changes.push(createUnsetChange(field.path))
		}

		return Object.freeze(changes)
	}

	#applyResetMetadataOnly(baselineValues: FormInput<Schema>): void {
		const nextBaselineValues = cloneAndFreezeValue(baselineValues)
		if (
			isDirtyEqual(this.#baselineValues, nextBaselineValues) &&
			this.#metadataState.touchedPaths.size === 0 &&
			isIssueStateEmpty(this.#issueState)
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

	#applyMetadataOnly(metadataState: MetadataState): void {
		if (metadataState === this.#metadataState) {
			return
		}

		const previousSnapshot = this.#snapshot
		this.#metadataState = metadataState
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
					reportHostException(error)
				})
			}, this.#validationOptions.asyncDebounceMs)
			return
		}

		void this.#runValidation({
			kind: "nonSubmit",
			exposeAll: false,
			exposePaths,
		}).catch((error: unknown) => {
			reportHostException(error)
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

	#callBeforeUpdate(
		nextValues: FormInput<Schema>,
		changes: readonly NormalizedValueChange[],
		source: UpdateSource,
	): false | readonly ValueChange<FormInput<Schema>>[] | undefined {
		const beforeUpdate = this.#beforeUpdate
		if (beforeUpdate === undefined) {
			return undefined
		}

		this.#isRunningBeforeUpdate = true
		try {
			return beforeUpdate(
				Object.freeze({
					currentValues: this.#snapshot.values,
					nextValues,
					changes: changes as readonly ValueChange<FormInput<Schema>>[],
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

	#resolveUiOptions(): {
		readonly disabled?: boolean
		readonly readOnly?: boolean
	} {
		return {
			disabled: this.#disabled,
			readOnly: this.#readOnly,
		}
	}
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

function hasPathValue(value: unknown, path: PathInput): boolean {
	let current = value

	for (const segment of parsePath(path)) {
		if (Array.isArray(current)) {
			if (
				typeof segment !== "number" ||
				segment >= current.length ||
				!Object.hasOwn(current, segment)
			) {
				return false
			}
			current = current[segment]
			continue
		}

		if (isPlainObject(current)) {
			if (typeof segment !== "string" || !Object.hasOwn(current, segment)) {
				return false
			}
			current = current[segment]
			continue
		}

		return false
	}

	return true
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object") {
		return false
	}

	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

function createValidationRuntimeState(
	state: Partial<ValidationRuntimeState> = {},
): ValidationRuntimeState {
	return Object.freeze({
		isValidating: state.isValidating === true,
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
		left.validationStatus === right.validationStatus &&
		left.submitCount === right.submitCount
	)
}

function filterPathSubtreeIssues(
	issues: readonly FormIssue[],
	path: string,
): readonly FormIssue[] {
	return Object.freeze(
		issues.filter(
			(issue) =>
				issue.path !== undefined &&
				(isSamePath(issue.path, path) || isDescendantPath(issue.path, path)),
		),
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
