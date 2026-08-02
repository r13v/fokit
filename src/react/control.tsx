"use client"

import { type ComponentType, createElement } from "react"

import {
	type AnyUiPresentation,
	type FieldPath,
	type FormInput,
	formatPath,
	type PathValue,
	type ResolvedFieldNode,
	type StandardSchema,
} from "../core/index.js"
import type {
	ControlDefinitionRegistry,
	ControlProps,
} from "./control-definition.js"
import { createDomId } from "./dom-id.js"
import { useFormIdPrefix } from "./form-context.js"
import { type FieldBinding, useField, useFormState } from "./hooks.js"
import { joinIds } from "./structural-props.js"
import type { AnyFormInstance } from "./use-form.js"

export type {
	ControlDefinitionRegistry,
	ControlProps,
} from "./control-definition.js"
export { defineControl } from "./control-definition.js"

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
