import type { NormalizedFormDefinition } from "./definition.js"
import {
	cloneAndFreezeValue,
	createFormSnapshot,
	type FormSnapshot,
	freezeFormValue,
} from "./form-state.js"
import {
	createMetadataState,
	deriveFormMetadata,
	isFormMetadataTouched,
	type MetadataState,
	touchMetadataPath,
} from "./metadata.js"
import { formatPath, type PathInput } from "./path.js"
import type { FieldPath, PathValue } from "./path-types.js"
import { type ResolvedUiState, resolveUi } from "./resolve-ui.js"
import type { FormInput, StandardSchema } from "./standard-schema.js"
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
import { getPathValue } from "./value.js"

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
	abortedError?: unknown
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
	#metadataState: MetadataState
	#snapshot: FormSnapshot<FormInput<Schema>, Context>
	#serverSnapshot: FormSnapshot<FormInput<Schema>, Context>
	#values: FormInput<Schema>

	#activeBatch: ActiveBatch | undefined
	readonly #disabled: boolean
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
		this.#metadataState = createMetadataState()
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

		this.#commitValueChanges(batch.changes, "imperative")
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
	}

	touch(path: PathInput): void {
		const canonicalPath = this.#normalizeKnownFieldPath(path)
		const nextMetadataState = touchMetadataPath(
			this.#metadataState,
			canonicalPath,
		)
		if (nextMetadataState === this.#metadataState) {
			return
		}

		const previousSnapshot = this.#snapshot
		this.#metadataState = nextMetadataState
		this.#snapshot = this.#createSnapshot({
			resolvedUi: previousSnapshot.resolvedUi,
		})
		this.#notify()
	}

	blur(path: PathInput): void {
		this.touch(path)
	}

	registerFieldRef(path: PathInput, element: FocusTarget | null): void {
		const canonicalPath = this.#normalizeKnownFieldPath(path)
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
		)

		return createFormSnapshot({
			values: this.#values,
			baselineValues: this.#baselineValues,
			context: this.#context,
			resolvedUi,
			metadata,
			isTouched: isFormMetadataTouched(metadata),
		})
	}

	#normalizeKnownFieldPath(path: PathInput): string {
		const canonicalPath = formatPath(path)
		if (this.definition.fieldsByPath[canonicalPath] === undefined) {
			throw new TypeError(`Unknown field path "${canonicalPath}"`)
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

	#commitValueChanges(
		changes: readonly NormalizedValueChange[],
		source: UpdateSource,
	): void {
		const proposal = applyValueChanges(this.#values, changes)
		if (proposal.changes.length === 0) {
			return
		}

		let nextValues = freezeFormValue(proposal.values)
		let effectiveChanges = proposal.changes

		if (this.#beforeUpdate !== undefined) {
			const replacement = this.#callBeforeUpdate(
				nextValues,
				effectiveChanges,
				source,
			)

			if (replacement === false) {
				return
			}

			if (replacement !== undefined) {
				const replacementProposal = applyValueChanges(this.#values, replacement)
				if (replacementProposal.changes.length === 0) {
					return
				}

				nextValues = freezeFormValue(replacementProposal.values)
				effectiveChanges = replacementProposal.changes
			}
		}

		const previousSnapshot = this.#snapshot
		this.#values = nextValues
		this.#snapshot = this.#createSnapshot({
			previousResolvedUi: previousSnapshot.resolvedUi,
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
