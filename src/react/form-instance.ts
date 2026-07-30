"use client"

import { replaceFormStoreRuntime } from "../core/form-store.js"
import {
	type ArrayFieldPath,
	type ArrayItemValue,
	type ControlRegistry,
	createFormStore,
	type FieldPath,
	type FocusTarget,
	type FormInput,
	type FormIssue,
	type FormOutput,
	type FormSnapshot,
	type FormStore,
	type FormStoreListener,
	type FormStoreOptions,
	type FormStoreSelector,
	type FormStoreSubscriptionOptions,
	type ImperativeFormIssue,
	type NormalizedFormDefinition,
	type PathInput,
	type PathValue,
	type StandardSchema,
	type ValidationResult,
} from "../core/index.js"
import type { FormDeepPartial, OptionalFieldPath } from "../core/transaction.js"
import {
	attachClassicSubmission,
	requestClassicFormSubmit,
	type SubmitHandler,
} from "./submission.js"

export type UseFormOptions<
	Schema extends StandardSchema,
	Context = unknown,
> = Omit<FormStoreOptions<Schema, Context>, "definition"> & {
	readonly onSubmit?: SubmitHandler<Schema, Context>
}

export type FormRuntimeOptions<
	Schema extends StandardSchema,
	Context = unknown,
> = Omit<UseFormOptions<Schema, Context>, "defaultValues">

type ReplaceFormOptions<Schema extends StandardSchema, Context> = Omit<
	FormRuntimeOptions<Schema, Context>,
	"context"
>

export type FormInstance<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlRegistry | undefined = undefined,
> = Omit<FormStore<Schema, Context>, "definition" | "replaceOptions"> & {
	readonly definition: NormalizedFormDefinition<Schema, RequiredControls>
	replaceOptions(options: ReplaceFormOptions<Schema, Context>): void
	submit(): Promise<void>
}

type FormBinding<Schema extends StandardSchema, Context> = {
	readonly owner: object
	readonly context: Context
	readonly options: ReplaceFormOptions<Schema, Context>
}

export class FormInstanceImpl<
	Schema extends StandardSchema,
	Context,
	RequiredControls extends ControlRegistry | undefined = undefined,
> {
	readonly definition: NormalizedFormDefinition<Schema, RequiredControls>
	readonly schema: Schema

	readonly #store: FormStore<Schema, Context>
	#baseContext: Context
	#baseOptions: ReplaceFormOptions<Schema, Context>
	#activeContext: Context
	#activeOptions: ReplaceFormOptions<Schema, Context>
	#binding: FormBinding<Schema, Context> | undefined

	constructor(
		definition: NormalizedFormDefinition<Schema, RequiredControls>,
		options: UseFormOptions<Schema, Context>,
	) {
		this.#baseContext = options.context as Context
		this.#baseOptions = copyReplaceOptions(options)
		this.#activeContext = this.#baseContext
		this.#activeOptions = this.#baseOptions
		this.#store = createFormStore({
			definition,
			defaultValues: options.defaultValues,
			context: this.#activeContext,
			disabled: this.#activeOptions.disabled,
			readOnly: this.#activeOptions.readOnly,
			validation: this.#activeOptions.validation,
			beforeUpdate: (event) => this.#activeOptions.beforeUpdate?.(event),
			onUpdate: (event) => {
				this.#activeOptions.onUpdate?.(event)
			},
		})
		this.definition = definition
		this.schema = this.#store.schema
		attachClassicSubmission(
			this as FormInstance<Schema, Context, RequiredControls>,
			this.#store,
			() => this.#activeOptions.onSubmit,
		)
	}

	bind(owner: object, options: FormRuntimeOptions<Schema, Context>): void {
		if (this.#binding !== undefined && this.#binding.owner !== owner) {
			throw new Error(
				"A Fokit form instance cannot be bound by multiple useForm hooks at the same time",
			)
		}

		const binding = createBinding(owner, options)
		this.#binding = binding
		this.#applyRuntime(binding.context, binding.options)
	}

	updateBinding(
		owner: object,
		options: FormRuntimeOptions<Schema, Context>,
	): void {
		if (this.#binding?.owner !== owner) {
			return
		}

		const binding = createBinding(owner, options)
		this.#binding = binding
		this.#applyRuntime(binding.context, binding.options)
	}

	unbind(owner: object): void {
		if (this.#binding?.owner !== owner) {
			return
		}

		this.#binding = undefined
		this.#applyRuntime(this.#baseContext, this.#baseOptions)
	}

	getStore(): FormStore<Schema, Context> {
		return this.#store
	}

	getSnapshot(): FormSnapshot<FormInput<Schema>, Context> {
		return this.#store.getSnapshot()
	}

	getServerSnapshot(): FormSnapshot<FormInput<Schema>, Context> {
		return this.#store.getServerSnapshot()
	}

	getValues(): FormInput<Schema> {
		return this.#store.getValues()
	}

	getValue(path: PathInput): unknown {
		return this.#store.getValue(path)
	}

	setValue<Path extends FieldPath<FormInput<Schema>>>(
		path: Path,
		value: PathValue<FormInput<Schema>, Path>,
	): void {
		this.#store.setValue(path, value)
	}

	setValues(values: FormDeepPartial<FormInput<Schema>>): void {
		this.#store.setValues(values)
	}

	unsetValue<Path extends OptionalFieldPath<FormInput<Schema>>>(
		path: Path,
	): void {
		const unsetValue = this.#store.unsetValue as (path: PathInput) => void
		unsetValue(path)
	}

	append<Path extends ArrayFieldPath<FormInput<Schema>>>(
		path: Path,
		...value: [] | [ArrayItemValue<FormInput<Schema>, Path>]
	): void {
		this.#store.append(path, ...value)
	}

	insert<Path extends ArrayFieldPath<FormInput<Schema>>>(
		path: Path,
		index: number,
		...value: [] | [ArrayItemValue<FormInput<Schema>, Path>]
	): void {
		this.#store.insert(path, index, ...value)
	}

	remove<Path extends ArrayFieldPath<FormInput<Schema>>>(
		path: Path,
		index: number,
	): void {
		this.#store.remove(path, index)
	}

	move<Path extends ArrayFieldPath<FormInput<Schema>>>(
		path: Path,
		from: number,
		to: number,
	): void {
		this.#store.move(path, from, to)
	}

	reset(values?: FormInput<Schema>): void {
		this.#store.reset(values)
	}

	setErrors(issues: readonly ImperativeFormIssue[]): void {
		this.#store.setErrors(issues)
	}

	clearErrors(path?: PathInput): void {
		this.#store.clearErrors(path)
	}

	validate(): Promise<ValidationResult<FormOutput<Schema>>>
	validate(path: PathInput): Promise<readonly FormIssue[]>
	validate(
		path?: PathInput,
	): Promise<ValidationResult<FormOutput<Schema>> | readonly FormIssue[]> {
		return path === undefined
			? this.#store.validate()
			: this.#store.validate(path)
	}

	batch(callback: () => void): void {
		this.#store.batch(callback)
	}

	subscribe<Selected>(
		selector: FormStoreSelector<FormInput<Schema>, Context, Selected>,
		listener: FormStoreListener<Selected>,
		options?: FormStoreSubscriptionOptions<Selected>,
	): () => void {
		return this.#store.subscribe(selector, listener, options)
	}

	replaceOptions(options: ReplaceFormOptions<Schema, Context>): void {
		this.#baseOptions = copyReplaceOptions(options)
		this.#applyRuntime(this.#activeContext, this.#baseOptions)
	}

	replaceContext(context: Context): void {
		this.#baseContext = context
		this.#applyRuntime(context, this.#activeOptions)
	}

	touch(path: PathInput): void {
		this.#store.touch(path)
	}

	blur(path: PathInput): void {
		this.#store.blur(path)
	}

	registerFieldRef(path: PathInput, element: FocusTarget | null): void {
		this.#store.registerFieldRef(path, element)
	}

	focus(path: PathInput): void {
		this.#store.focus(path)
	}

	submit(): Promise<void> {
		return requestClassicFormSubmit(
			this as FormInstance<Schema, Context, RequiredControls>,
		)
	}

	#applyRuntime(
		context: Context,
		options: ReplaceFormOptions<Schema, Context>,
	): void {
		this.#activeContext = context
		this.#activeOptions = options
		replaceFormStoreRuntime(this.#store, context, {
			disabled: options.disabled,
			readOnly: options.readOnly,
			validation: options.validation,
		})
	}
}

export function createForm<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlRegistry | undefined = undefined,
>(
	definition: NormalizedFormDefinition<Schema, RequiredControls>,
	options: UseFormOptions<Schema, Context>,
): FormInstance<Schema, Context, RequiredControls> {
	return new FormInstanceImpl(definition, options)
}

export function getFormStore<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlRegistry | undefined = undefined,
>(
	form: FormInstance<Schema, Context, RequiredControls>,
): FormStore<Schema, Context> {
	return getFormInstanceImpl(form).getStore()
}

export function getFormInstanceImpl<
	Schema extends StandardSchema,
	Context,
	RequiredControls extends ControlRegistry | undefined,
>(
	form: FormInstance<Schema, Context, RequiredControls>,
): FormInstanceImpl<Schema, Context, RequiredControls> {
	if (form instanceof FormInstanceImpl) {
		return form
	}

	throw new TypeError("useForm requires a form created by Fokit")
}

function createBinding<Schema extends StandardSchema, Context>(
	owner: object,
	options: FormRuntimeOptions<Schema, Context>,
): FormBinding<Schema, Context> {
	return {
		owner,
		context: options.context as Context,
		options: copyReplaceOptions(options),
	}
}

function copyReplaceOptions<Schema extends StandardSchema, Context>(
	options: ReplaceFormOptions<Schema, Context>,
): ReplaceFormOptions<Schema, Context> {
	return {
		disabled: options.disabled,
		readOnly: options.readOnly,
		validation:
			options.validation === undefined ? undefined : { ...options.validation },
		beforeUpdate: options.beforeUpdate,
		onUpdate: options.onUpdate,
		onSubmit: options.onSubmit,
	}
}
