import type { NormalizedFormDefinition } from "./definition.js"
import {
	cloneAndFreezeValue,
	createFormSnapshot,
	type FormSnapshot,
} from "./form-state.js"
import {
	createMetadataState,
	deriveFormMetadata,
	isFormMetadataTouched,
	type MetadataState,
	touchMetadataPath,
} from "./metadata.js"
import { formatPath, type PathInput } from "./path.js"
import { type ResolvedUiState, resolveUi } from "./resolve-ui.js"
import type { FormInput, StandardSchema } from "./standard-schema.js"
import { getPathValue } from "./value.js"

export type FocusTarget = {
	focus(options?: FocusOptions): void
}

export type ValueChange = {
	readonly path: string
	readonly type: "set" | "unset"
	readonly value?: unknown
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
	readonly changes: readonly ValueChange[]
	readonly source: UpdateSource
	readonly context: Readonly<Context>
}

export type UpdateEvent<Input, Context> = {
	readonly previousValues: Readonly<Input>
	readonly values: Readonly<Input>
	readonly changes: readonly ValueChange[]
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

	readonly #disabled: boolean
	readonly #focusTargets = new Map<string, FocusTarget>()
	readonly #readOnly: boolean
	readonly #subscriptions = new Set<Subscription<FormInput<Schema>, Context>>()

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
