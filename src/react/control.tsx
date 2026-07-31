"use client"

import { type ComponentType, createElement } from "react"

import {
	type AnyUiPresentation,
	type ControlFormData,
	type ControlMetadata,
	type FieldPath,
	type FormInput,
	type FormIssue,
	formatPath,
	type IsValidControlValue,
	type PathValue,
	type ResolvedFieldNode,
	type StandardSchema,
} from "../core/index.js"
import { createDomId } from "./dom-id.js"
import { useFormIdPrefix } from "./form-context.js"
import { type FieldBinding, useField, useFormState } from "./hooks.js"
import type { AnyFormInstance } from "./use-form.js"

export type ControlProps<
	Value,
	Options = Record<string, never>,
	Context = unknown,
> = {
	readonly path: string
	readonly value: Value
	setValue(value: Value): void
	blur(): void
	readonly input: {
		readonly id: string
		readonly name: string
		ref(element: HTMLElement | null): void
		readonly "aria-describedby"?: string
	}
	readonly meta: {
		readonly dirty: boolean
		readonly touched: boolean
		readonly validating: boolean
		readonly errors: readonly FormIssue[]
		readonly displayErrors: readonly FormIssue[]
		readonly invalid: boolean
	}
	readonly options: Options
	readonly context: Readonly<Context>
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly required: boolean
}

export type ControlDefinition<
	Value,
	Options = Record<string, never>,
	Context = unknown,
> = ControlMetadata<Value, Options, Context> & {
	readonly component: ComponentType<ControlProps<Value, Options, Context>>
}

export type AnyControlDefinition = ControlMetadata<never, never, never> & {
	readonly component: unknown
}

export type ControlDefinitionRegistry = Readonly<
	Record<string, AnyControlDefinition>
>

export type DefineControlInput<Value, Options, Context> =
	IsValidControlValue<Value> extends true
		? {
				readonly component: ComponentType<ControlProps<Value, Options, Context>>
				readonly formData: ControlFormData<Value, Options, Context>
			}
		: never

export function defineControl<
	Value,
	Options = Record<string, never>,
	Context = unknown,
>(
	input: DefineControlInput<Value, Options, Context>,
): ControlDefinition<Value, Options, Context> {
	return Object.freeze({
		component: input.component,
		formData: input.formData,
	}) as ControlDefinition<Value, Options, Context>
}

export type FieldControlProps<
	Schema extends StandardSchema,
	Context = unknown,
	Path extends FieldPath<FormInput<Schema>> = FieldPath<FormInput<Schema>>,
> = {
	readonly form: AnyFormInstance<Schema, Context>
	readonly controls: ControlDefinitionRegistry
	readonly path: Path
	readonly id?: string
	readonly descriptionId?: string
	readonly describedBy?: readonly string[]
	readonly resolved?: ResolvedFieldNode<Context, AnyUiPresentation>
}

export function FieldControl<
	Schema extends StandardSchema,
	Context,
	const Path extends FieldPath<FormInput<Schema>>,
>({
	form,
	controls,
	path,
	id,
	descriptionId,
	describedBy = [],
	resolved: providedResolved,
}: FieldControlProps<Schema, Context, Path>) {
	const idPrefix = useFormIdPrefix()
	const canonicalPath = formatPath(path)
	const field = useField(form, path)
	const storeResolved = useFormState(
		form,
		(snapshot) => snapshot.resolvedUi.fieldsByPath[canonicalPath],
	)
	const resolved = providedResolved ?? storeResolved

	if (resolved === undefined) {
		throw new TypeError(`Unknown field path "${canonicalPath}"`)
	}

	const control = controls[resolved.control]
	if (control === undefined) {
		throw new TypeError(`Unknown control "${resolved.control}"`)
	}

	return createElement(
		control.component as ComponentType<ControlProps<unknown, unknown, Context>>,
		createControlProps({
			field,
			resolved,
			id: id ?? createDomId(idPrefix, canonicalPath),
			ariaDescribedBy: joinIds([descriptionId, ...describedBy]),
			path: canonicalPath,
		}),
	)
}

function createControlProps<
	Schema extends StandardSchema,
	Context,
	const Path extends FieldPath<FormInput<Schema>>,
>({
	field,
	resolved,
	id,
	ariaDescribedBy,
	path,
}: {
	readonly field: FieldBinding<PathValue<FormInput<Schema>, Path>>
	readonly resolved: ResolvedFieldNode<Context, AnyUiPresentation>
	readonly id: string
	readonly ariaDescribedBy?: string
	readonly path: string
}): ControlProps<PathValue<FormInput<Schema>, Path>, unknown, Context> {
	return {
		path,
		value: field.value,
		setValue: field.setValue,
		blur: field.blur,
		input: {
			id,
			name: path,
			ref(element) {
				field.ref(element)
			},
			...(ariaDescribedBy === undefined
				? {}
				: { "aria-describedby": ariaDescribedBy }),
		},
		meta: field.meta,
		options: (resolved.options ?? {}) as unknown,
		context: resolved.context,
		disabled: resolved.disabled,
		readOnly: resolved.readOnly,
		required: resolved.required,
	}
}

function joinIds(ids: readonly (string | undefined)[]): string | undefined {
	const joined = ids.filter((id) => id !== undefined && id.length > 0).join(" ")
	return joined.length === 0 ? undefined : joined
}
