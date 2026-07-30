"use client"

export type {
	ArrayCommand,
	ArrayCommandChange,
	ArrayFieldPath,
	ArrayItemMetadata,
	ArrayMetadata,
	ArrayNode,
	ArrayRowState,
	ArrayRowsState,
	BeforeUpdateEvent,
	ControlContextOf,
	ControlFormData,
	ControlFormDataDetails,
	ControlMetadata,
	ControlName,
	ControlOptionsOf,
	ControlRegistry,
	ControlValueOf,
	DisplayFormErrors,
	FieldMetadata,
	FieldNode,
	FieldPath,
	FocusTarget,
	FormDefinition,
	FormErrors,
	FormInput,
	FormIssue,
	FormMetadata,
	FormOutput,
	FormSnapshot,
	FormState,
	FormStoreListener,
	FormStoreOptions,
	FormStoreSelector,
	FormStoreSubscriptionOptions,
	GridColumns,
	GridSpan,
	ImperativeFormIssue,
	IsValidControlValue,
	NormalizeDefinitionInput,
	NormalizedArrayNode,
	NormalizedFieldNode,
	NormalizedFormDefinition,
	NormalizedSectionNode,
	NormalizedUiNode,
	PathInput,
	PathSegment,
	PathSegments,
	PathValue,
	RelativeUiNode,
	Resolvable,
	ResolvedArrayNode,
	ResolvedComputedCache,
	ResolvedComputedEntry,
	ResolvedFieldNode,
	ResolvedSectionNode,
	ResolvedUiNode,
	ResolvedUiState,
	ResolveUiOptions,
	SectionNode,
	StandardSchema,
	UiNode,
	UiResolver,
	UiResolverDetails,
	UiResolverValues,
	UpdateEvent,
	UpdateHooks,
	UpdateSource,
	ValidationMode,
	ValidationOptions,
	ValidationResult,
	ValidationStatus,
	ValueChange,
	ValuePolicy,
} from "./core/index.js"
export {
	cloneValue,
	createFormStore,
	formatPath,
	getPathValue,
	isAncestorPath,
	isDescendantPath,
	isDirtyEqual,
	isSamePath,
	mergePathValue,
	normalizeDefinition,
	parseArrayIndex,
	parsePath,
	pathsOverlap,
	resolveUi,
	setPathValue,
	unsetPathValue,
} from "./core/index.js"
export type {
	AnyControlDefinition,
	ControlDefinition,
	ControlDefinitionRegistry,
	ControlProps,
	DefineControlInput,
	FieldControlProps,
} from "./react/control.js"
export { defineControl } from "./react/control.js"
export type {
	AutoFormProps,
	CreateFormKitOptions,
	DefineForm,
	FieldsProps,
	FormKit,
	FormKitSlots,
	KitFormProps,
	SubmitProps,
} from "./react/create-form-kit.js"
export { createFormKit } from "./react/create-form-kit.js"
export type {
	DefaultArrayAddI18nData,
	DefaultArrayItemI18nData,
	DefaultSlotI18nValue,
	DefaultSlotsI18n,
} from "./react/default-slots.js"
export { createDefaultSlots } from "./react/default-slots.js"
export type { NativeFormProps } from "./react/form.js"
export { KitForm } from "./react/form.js"
export type { FormProviderProps } from "./react/form-context.js"
export { FormProvider, useFormContext } from "./react/form-context.js"
export type {
	ArrayBinding,
	FieldBinding,
	FieldBindingMeta,
	FormStateSelectorOptions,
} from "./react/hooks.js"
export {
	useArrayField,
	useField,
	useFormState,
	useValue,
} from "./react/hooks.js"
export type {
	NativeDateOptions,
	NativeFileOptions,
	NativeNumberOptions,
	NativeSelectOption,
	NativeSelectOptions,
	NativeTextareaOptions,
	NativeTextOptions,
	NativeTextType,
} from "./react/native-controls.js"
export { nativeControls } from "./react/native-controls.js"
export type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	FokitCssVariable,
	FokitNodeName,
	FokitStyle,
	SectionSlotProps,
	StructuralNodeName,
	StructuralRootProps,
} from "./react/slots.js"
export type {
	SubmitContext,
	SubmitHandler,
} from "./react/submission.js"
export { Submit } from "./react/submit.js"
export type {
	FormInstance,
	UseFormOptions,
} from "./react/use-form.js"
export { useForm } from "./react/use-form.js"
