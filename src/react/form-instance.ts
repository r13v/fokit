"use client"

import {
	assertFirstPartyFeatureConfiguration,
	attachFormFeatureCapability,
	type FormBindingFinalizingMiddleware,
	formBindingFinalizer,
} from "../core/feature-protocol.js"
import {
	createFormStoreWithMiddleware,
	errorSummaryFocusTargetRegistration,
	getFormStoreFeatureCapability,
	registerErrorSummaryFocusTarget,
	replaceFormStoreRuntime,
	setFormStoreControlValue,
} from "../core/form-store.js"
import type {
	AnyUiPresentation,
	ArrayFieldPath,
	ArrayItemValue,
	ControlRegistry,
	FieldPath,
	FocusTarget,
	FormInput,
	FormIssue,
	FormOutput,
	FormSnapshot,
	FormStore,
	FormStoreListener,
	FormStoreOptions,
	FormStoreSelector,
	FormStoreSubscriptionOptions,
	ImperativeFormIssue,
	NormalizedFormDefinition,
	PathInput,
	PathValue,
	StandardSchema,
	UiPresentation,
	ValidationResult,
} from "../core/index.js"
import type {
	AnyFormMiddleware,
	FormAgnosticMiddleware,
	FormMiddleware,
} from "../core/middleware.js"
import type { FormDeepPartial, OptionalFieldPath } from "../core/transaction.js"
import type { RuntimeFormKitSlots } from "./create-form-kit.js"
import type { ReactUiPresentation } from "./slots.js"
import {
	attachClassicSubmission,
	requestClassicFormSubmit,
	type SubmitHandler,
} from "./submission.js"

export type CreateFormOptions<
	Schema extends StandardSchema,
	Context = unknown,
> = Omit<FormStoreOptions<Schema, Context>, "definition"> & {
	readonly middleware?: readonly (
		| FormMiddleware<FormInput<Schema>, Context>
		| FormAgnosticMiddleware
	)[]
	readonly onSubmit?: SubmitHandler<Schema, Context>
}

export type FormRuntimeOptions<
	Schema extends StandardSchema,
	Context = unknown,
> = Omit<CreateFormOptions<Schema, Context>, "defaultValues" | "middleware">

export type FormKitDescriptor = Readonly<{
	controls: ControlRegistry
	slots: RuntimeFormKitSlots
}>

declare const formKitOwnerBrand: unique symbol

export type FormKitOwner<Controls, Presentation> = {
	readonly [formKitOwnerBrand]: {
		readonly controls: (controls: Controls) => Controls
		readonly presentation: (presentation: Presentation) => Presentation
	}
}

type ReplaceFormOptions<Schema extends StandardSchema, Context> = Omit<
	FormRuntimeOptions<Schema, Context>,
	"context"
>

export type FormInstance<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlRegistry | undefined = undefined,
	Presentation extends UiPresentation = ReactUiPresentation,
	Owner = FormKitOwner<RequiredControls, Presentation>,
> = Omit<FormStore<Schema, Context>, "definition" | "replaceOptions"> & {
	readonly definition: NormalizedFormDefinition<
		Schema,
		RequiredControls,
		unknown,
		Presentation
	>
	readonly [formKitOwnerBrand]: Owner
	replaceOptions(options: ReplaceFormOptions<Schema, Context>): void
	submit(): Promise<void>
}

export type AnyFormInstance<
	Schema extends StandardSchema,
	Context = unknown,
> = FormInstance<Schema, Context, ControlRegistry, AnyUiPresentation, unknown>

type FormBinding<Schema extends StandardSchema, Context> = {
	readonly owner: object
	readonly context: Context
	readonly options: ReplaceFormOptions<Schema, Context>
}

export class FormInstanceImpl<
	Schema extends StandardSchema,
	Context,
	RequiredControls extends ControlRegistry | undefined = undefined,
	Presentation extends UiPresentation = ReactUiPresentation,
> {
	readonly definition: NormalizedFormDefinition<
		Schema,
		RequiredControls,
		unknown,
		Presentation
	>
	readonly schema: Schema

	readonly #store: FormStore<Schema, Context>
	readonly #kitDescriptor: FormKitDescriptor
	#baseContext: Context
	#baseOptions: ReplaceFormOptions<Schema, Context>
	#activeContext: Context
	#activeOptions: ReplaceFormOptions<Schema, Context>
	#binding: FormBinding<Schema, Context> | undefined
	#bindingFinalized = false
	#bindingFinalizers: readonly (() => void)[] = []

	constructor(
		definition: NormalizedFormDefinition<
			Schema,
			RequiredControls,
			unknown,
			Presentation
		>,
		options: CreateFormOptions<Schema, Context>,
		kitDescriptor: FormKitDescriptor,
	) {
		this.#kitDescriptor = kitDescriptor
		this.#baseContext = options.context as Context
		this.#baseOptions = copyReplaceOptions(options)
		this.#activeContext = this.#baseContext
		this.#activeOptions = this.#baseOptions
		this.#store = createFormStoreWithMiddleware(
			{
				definition,
				defaultValues: options.defaultValues,
				context: this.#activeContext,
				disabled: this.#activeOptions.disabled,
				readOnly: this.#activeOptions.readOnly,
				validation: this.#activeOptions.validation,
				beforeUpdate: (event) => this.#activeOptions.beforeUpdate?.(event),
				afterUpdate: (event) => {
					this.#activeOptions.afterUpdate?.(event)
				},
			},
			(options.middleware as readonly AnyFormMiddleware[] | undefined) ?? [],
		)
		attachFormFeatureCapability(
			this,
			getFormStoreFeatureCapability(this.#store),
		)
		this.definition = definition
		this.schema = this.#store.schema
		attachClassicSubmission(
			this as FormInstance<Schema, Context, RequiredControls, Presentation>,
			this.#store,
			() => this.#activeOptions.onSubmit,
		)
	}

	stageBindingFinalizers(finalizers: readonly (() => void)[]): void {
		this.#bindingFinalizers = Object.freeze([...finalizers])
	}

	getKitDescriptor(): FormKitDescriptor {
		return this.#kitDescriptor
	}

	finalizeBinding(): void {
		if (this.#bindingFinalized) return
		this.#bindingFinalized = true
		for (const finalize of this.#bindingFinalizers) finalize()
	}

	bind(owner: object, options: FormRuntimeOptions<Schema, Context>): void {
		if (this.#binding !== undefined && this.#binding.owner !== owner) {
			throw new Error(
				"A Form Please form instance cannot have multiple active React bindings",
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

	validatePaths<Path extends FieldPath<FormInput<Schema>>>(
		paths: readonly Path[],
	): Promise<readonly FormIssue[]> {
		return this.#store.validatePaths(paths)
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
		if (this.#binding === undefined) {
			this.#applyRuntime(this.#baseContext, this.#baseOptions)
		}
	}

	replaceContext(context: Context): void {
		this.#baseContext = context
		if (this.#binding === undefined) {
			this.#applyRuntime(this.#baseContext, this.#baseOptions)
		}
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

	[errorSummaryFocusTargetRegistration](
		index: number,
		element: FocusTarget | null,
	): void {
		registerErrorSummaryFocusTarget(this.#store, index, element)
	}

	focus(path: PathInput): void {
		this.#store.focus(path)
	}

	focusFirstError<Path extends FieldPath<FormInput<Schema>>>(
		paths?: readonly Path[],
	): boolean {
		return this.#store.focusFirstError(paths)
	}

	submit(): Promise<void> {
		return requestClassicFormSubmit(
			this as FormInstance<Schema, Context, RequiredControls, Presentation>,
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

export function createFormInstance<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlRegistry | undefined = undefined,
	Presentation extends UiPresentation = ReactUiPresentation,
	Owner = FormKitOwner<RequiredControls, Presentation>,
>(
	definition: NormalizedFormDefinition<
		Schema,
		RequiredControls,
		unknown,
		Presentation
	>,
	options: CreateFormOptions<Schema, Context>,
	kitDescriptor: FormKitDescriptor,
): FormInstance<Schema, Context, RequiredControls, Presentation, Owner> {
	const middleware: readonly AnyFormMiddleware[] = Object.freeze([
		...((options.middleware ?? []) as readonly AnyFormMiddleware[]),
	])
	assertFirstPartyFeatureConfiguration(middleware)
	const instance = new FormInstanceImpl<
		Schema,
		Context,
		RequiredControls,
		Presentation
	>(
		definition,
		{
			...options,
			middleware: middleware as unknown as CreateFormOptions<
				Schema,
				Context
			>["middleware"],
		},
		kitDescriptor,
	)
	const finalizers = middleware.flatMap((entry: AnyFormMiddleware) => {
		const finalize = (entry as FormBindingFinalizingMiddleware)[
			formBindingFinalizer
		]
		return finalize === undefined ? [] : [() => finalize(instance as object)]
	})
	instance.stageBindingFinalizers(finalizers)
	return instance as unknown as FormInstance<
		Schema,
		Context,
		RequiredControls,
		Presentation,
		Owner
	>
}

export function setFormControlValue<
	Schema extends StandardSchema,
	Context,
	RequiredControls extends ControlRegistry | undefined,
	Presentation extends UiPresentation,
	Owner,
	Path extends FieldPath<FormInput<Schema>>,
>(
	form: FormInstance<Schema, Context, RequiredControls, Presentation, Owner>,
	path: Path,
	value: PathValue<FormInput<Schema>, Path>,
): void {
	setFormStoreControlValue(getFormStore(form), path, value)
}

export function getFormStore<
	Schema extends StandardSchema,
	Context = unknown,
	RequiredControls extends ControlRegistry | undefined = undefined,
	Presentation extends UiPresentation = ReactUiPresentation,
	Owner = FormKitOwner<RequiredControls, Presentation>,
>(
	form: FormInstance<Schema, Context, RequiredControls, Presentation, Owner>,
): FormStore<Schema, Context> {
	return getFormInstanceImpl(form).getStore()
}

export function getFormKitDescriptor(form: object): FormKitDescriptor {
	return getFormInstanceImpl(form as never).getKitDescriptor()
}

export function getFormInstanceImpl<
	Schema extends StandardSchema,
	Context,
	RequiredControls extends ControlRegistry | undefined,
	Presentation extends UiPresentation,
	Owner,
>(
	form: FormInstance<Schema, Context, RequiredControls, Presentation, Owner>,
): FormInstanceImpl<Schema, Context, RequiredControls, Presentation> {
	if (form instanceof FormInstanceImpl) {
		return form
	}

	throw new TypeError("Expected a form created by Form Please")
}

export function assertFormKitOwnership(
	form: object,
	descriptor: FormKitDescriptor,
	owner: "kit.useBindForm" | "kit.Form" | "kit.AutoForm",
): void {
	if (getFormInstanceImpl(form as never).getKitDescriptor() !== descriptor) {
		throw new TypeError(
			`${owner} requires a form created by this exact form kit`,
		)
	}
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
		afterUpdate: options.afterUpdate,
		onSubmit: options.onSubmit,
	}
}
