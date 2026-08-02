"use client"

import { type RefCallback, useCallback, useMemo } from "react"

import {
	type ArrayFieldPath,
	type ArrayItemMetadata,
	type FieldMetadata,
	type FieldPath,
	type FocusTarget,
	type FormInput,
	type FormIssue,
	type FormSnapshot,
	formatPath,
	getPathValue,
	type PathValue,
	type StandardSchema,
} from "../core/index.js"
import type { ArrayItemValueAtPath } from "../core/ui-types.js"
import { getFormArrayActions, setFormControlValue } from "./form-instance.js"
import {
	type ExternalSelectorOptions,
	useExternalSelector,
} from "./use-external-selector.js"
import type { AnyFormInstance } from "./use-form.js"

const emptyIssues = Object.freeze([]) as readonly FormIssue[]

export type FormStateSelectorOptions<Selected> =
	ExternalSelectorOptions<Selected>

export type FieldBindingMeta = {
	readonly dirty: boolean
	readonly touched: boolean
	readonly validating: boolean
	readonly errors: readonly FormIssue[]
	readonly displayErrors: readonly FormIssue[]
	readonly invalid: boolean
}

export type FieldBinding<Value> = {
	readonly value: Value
	setValue(value: Value): void
	blur(): void
	focus(): void
	readonly ref: RefCallback<FocusTarget>
	readonly meta: FieldBindingMeta
}

export type ArrayBinding<Item> = {
	readonly items: readonly {
		readonly key: string
		readonly index: number
	}[]
	readonly meta: FieldBindingMeta
	append(value: Item): void
	insert(index: number, value: Item): void
	remove(index: number): void
	move(from: number, to: number): void
}

type FieldSelection<Value> = {
	readonly value: Value
	readonly metadata: FieldMetadata | undefined
	readonly errors: readonly FormIssue[]
	readonly displayErrors: readonly FormIssue[]
}

type ArraySelection = {
	readonly metadata:
		| (FieldMetadata & {
				readonly items: readonly ArrayItemMetadata[]
		  })
		| undefined
	readonly errors: readonly FormIssue[]
	readonly displayErrors: readonly FormIssue[]
}

export function useFormState<Schema extends StandardSchema, Context, Selected>(
	form: AnyFormInstance<Schema, Context>,
	selector: (state: FormSnapshot<FormInput<Schema>, Context>) => Selected,
	options?: FormStateSelectorOptions<Selected>,
): Selected {
	return useExternalSelector(form, (snapshot) => selector(snapshot), options)
}

export function useValue<
	Schema extends StandardSchema,
	Context,
	const Path extends FieldPath<FormInput<Schema>>,
>(
	form: AnyFormInstance<Schema, Context>,
	path: Path,
	options?: ExternalSelectorOptions<PathValue<FormInput<Schema>, Path>>,
): PathValue<FormInput<Schema>, Path> {
	const canonicalPath = formatPath(path)
	return useExternalSelector(
		form,
		(snapshot) =>
			getPathValue(snapshot.values, canonicalPath) as PathValue<
				FormInput<Schema>,
				Path
			>,
		options,
	)
}

export function useField<
	Schema extends StandardSchema,
	Context,
	const Path extends FieldPath<FormInput<Schema>>,
>(
	form: AnyFormInstance<Schema, Context>,
	path: Path,
): FieldBinding<PathValue<FormInput<Schema>, Path>> {
	const canonicalPath = formatPath(path)
	const selection = useExternalSelector(
		form,
		(snapshot): FieldSelection<PathValue<FormInput<Schema>, Path>> => ({
			value: getPathValue(snapshot.values, canonicalPath) as PathValue<
				FormInput<Schema>,
				Path
			>,
			metadata: snapshot.metadata.fieldsByPath[canonicalPath],
			errors: snapshot.errors.fields.get(canonicalPath) ?? emptyIssues,
			displayErrors:
				snapshot.displayErrors.fields.get(canonicalPath) ?? emptyIssues,
		}),
		{
			equalityFn: fieldSelectionEqual,
		},
	)
	const setValue = useCallback(
		(value: PathValue<FormInput<Schema>, Path>) => {
			setFormControlValue(form, path, value)
		},
		[form, path],
	)
	const blur = useCallback(() => {
		form.blur(canonicalPath)
	}, [form, canonicalPath])
	const focus = useCallback(() => {
		form.focus(canonicalPath)
	}, [form, canonicalPath])
	const ref = useCallback<RefCallback<FocusTarget>>(
		(element) => {
			form.registerFieldRef(canonicalPath, element)
		},
		[form, canonicalPath],
	)
	const meta = useMemo(
		() =>
			createBindingMeta(
				selection.metadata,
				selection.errors,
				selection.displayErrors,
			),
		[selection],
	)

	return useMemo(
		() => ({
			value: selection.value,
			setValue,
			blur,
			focus,
			ref,
			meta,
		}),
		[selection.value, setValue, blur, focus, ref, meta],
	)
}

export function useArrayField<
	Schema extends StandardSchema,
	Context,
	const Path extends ArrayFieldPath<FormInput<Schema>>,
>(
	form: AnyFormInstance<Schema, Context>,
	path: Path,
): ArrayBinding<ArrayItemValueAtPath<FormInput<Schema>, Path>> {
	const canonicalPath = formatPath(path)
	const selection = useExternalSelector(
		form,
		(snapshot): ArraySelection => ({
			metadata: snapshot.metadata.arraysByPath[canonicalPath],
			errors: snapshot.errors.fields.get(canonicalPath) ?? emptyIssues,
			displayErrors:
				snapshot.displayErrors.fields.get(canonicalPath) ?? emptyIssues,
		}),
		{
			equalityFn: arraySelectionEqual,
		},
	)
	const actions = getFormArrayActions(form)
	const append = useCallback(
		(value: unknown) => {
			actions.append(canonicalPath, value)
		},
		[actions, canonicalPath],
	)
	const insert = useCallback(
		(index: number, value: unknown) => {
			actions.insert(canonicalPath, index, value)
		},
		[actions, canonicalPath],
	)
	const remove = useCallback(
		(index: number) => {
			actions.remove(canonicalPath, index)
		},
		[actions, canonicalPath],
	)
	const move = useCallback(
		(from: number, to: number) => {
			actions.move(canonicalPath, from, to)
		},
		[actions, canonicalPath],
	)
	const meta = useMemo(
		() =>
			createBindingMeta(
				selection.metadata,
				selection.errors,
				selection.displayErrors,
			),
		[selection],
	)
	const items = useMemo(
		() =>
			Object.freeze(
				(selection.metadata?.items ?? []).map((item) =>
					Object.freeze({
						key: item.key,
						index: item.index,
					}),
				),
			),
		[selection],
	)

	return useMemo(
		() => ({
			items,
			meta,
			append,
			insert,
			remove,
			move,
		}),
		[items, meta, append, insert, remove, move],
	) as ArrayBinding<ArrayItemValueAtPath<FormInput<Schema>, Path>>
}

function createBindingMeta(
	metadata: FieldMetadata | undefined,
	errors: readonly FormIssue[],
	displayErrors: readonly FormIssue[],
): FieldBindingMeta {
	return Object.freeze({
		dirty: metadata?.dirty ?? false,
		touched: metadata?.touched ?? false,
		validating: metadata?.validating ?? false,
		errors,
		displayErrors,
		invalid: displayErrors.length > 0,
	})
}

function fieldSelectionEqual<Value>(
	previous: FieldSelection<Value>,
	next: FieldSelection<Value>,
): boolean {
	return (
		Object.is(previous.value, next.value) &&
		metadataEqual(previous.metadata, next.metadata) &&
		issuesEqual(previous.errors, next.errors) &&
		issuesEqual(previous.displayErrors, next.displayErrors)
	)
}

function arraySelectionEqual(
	previous: ArraySelection,
	next: ArraySelection,
): boolean {
	return (
		metadataEqual(previous.metadata, next.metadata) &&
		arrayItemsEqual(previous.metadata?.items, next.metadata?.items) &&
		issuesEqual(previous.errors, next.errors) &&
		issuesEqual(previous.displayErrors, next.displayErrors)
	)
}

function metadataEqual(
	previous: FieldMetadata | undefined,
	next: FieldMetadata | undefined,
): boolean {
	return (
		(previous?.dirty ?? false) === (next?.dirty ?? false) &&
		(previous?.touched ?? false) === (next?.touched ?? false) &&
		(previous?.validating ?? false) === (next?.validating ?? false)
	)
}

function arrayItemsEqual(
	previous: readonly ArrayItemMetadata[] | undefined,
	next: readonly ArrayItemMetadata[] | undefined,
): boolean {
	const previousItems = previous ?? []
	const nextItems = next ?? []
	if (previousItems.length !== nextItems.length) {
		return false
	}

	return previousItems.every((item, index) => {
		const nextItem = nextItems[index]
		return nextItem?.key === item.key && nextItem.index === item.index
	})
}

function issuesEqual(
	previous: readonly FormIssue[],
	next: readonly FormIssue[],
): boolean {
	return (
		previous.length === next.length &&
		previous.every((issue, index) => Object.is(issue, next[index]))
	)
}
