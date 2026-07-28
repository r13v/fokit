"use client"

import type { ComponentType, ReactElement, ReactNode } from "react"

import {
	type FormDefinition,
	type FormInput,
	type NormalizedFormDefinition,
	normalizeDefinition,
	type StandardSchema,
} from "../core/index.js"
import { createAutoFormComponent } from "./auto-form.js"
import type { ControlDefinitionRegistry } from "./control.js"
import { createFieldsComponent } from "./fields.js"
import type { NativeFormProps } from "./form.js"
import {
	createFormComponent,
	type KitFormComponent,
	type KitFormProps,
} from "./form.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	SectionSlotProps,
} from "./slots.js"
import { Submit, type SubmitProps } from "./submit.js"
import type { UseFormOptions } from "./use-form.js"

export type FormKitSlots = {
	readonly Field: ComponentType<FieldSlotProps>
	readonly Section: ComponentType<SectionSlotProps>
	readonly Array: ComponentType<ArraySlotProps>
	readonly ArrayItem: ComponentType<ArrayItemSlotProps>
	readonly ErrorMessage: ComponentType<ErrorMessageSlotProps>
}

export type CreateFormKitOptions<Controls extends ControlDefinitionRegistry> = {
	readonly controls: Controls
	readonly slots: FormKitSlots
}

export type DefineForm<Controls extends ControlDefinitionRegistry> = {
	<Schema extends StandardSchema>(
		definition: FormDefinition<Schema, Controls, unknown>,
	): NormalizedFormDefinition<Schema>
	<Context>(): <Schema extends StandardSchema>(
		definition: FormDefinition<Schema, Controls, Context>,
	) => NormalizedFormDefinition<Schema>
}

export type FieldsProps = {
	readonly children?: ReactNode
}

export type AutoFormProps<
	Schema extends StandardSchema = StandardSchema,
	Context = unknown,
> = NativeFormProps &
	Omit<UseFormOptions<Schema, Context>, "defaultValues"> & {
		readonly definition: NormalizedFormDefinition<Schema>
		readonly defaultValues: FormInput<Schema>
		readonly children?: ReactNode
	}

export type FieldsComponent = (props: FieldsProps) => ReactElement

export type AutoFormComponent = <
	Schema extends StandardSchema,
	Context = unknown,
>(
	props: AutoFormProps<Schema, Context>,
) => ReactElement

export type FormKit<Controls extends ControlDefinitionRegistry> = {
	readonly controls: Controls
	readonly slots: FormKitSlots
	readonly defineForm: DefineForm<Controls>
	readonly Form: KitFormComponent
	readonly Submit: typeof Submit
	readonly Fields: FieldsComponent
	readonly AutoForm: AutoFormComponent
}

export function createFormKit<Controls extends ControlDefinitionRegistry>(
	options: CreateFormKitOptions<Controls>,
): FormKit<Controls> {
	assertSlots(options.slots)

	const defineForm = ((definition?: unknown) => {
		if (definition === undefined) {
			return (curriedDefinition: unknown) =>
				normalizeKitDefinition(curriedDefinition, options.controls)
		}

		return normalizeKitDefinition(definition, options.controls)
	}) as DefineForm<Controls>

	return Object.freeze({
		controls: options.controls,
		slots: options.slots,
		defineForm,
		Form: createFormComponent(options.controls),
		Submit,
		Fields: createFieldsComponent(options.controls, options.slots),
		AutoForm: createAutoFormComponent(options.controls, options.slots),
	})
}

function normalizeKitDefinition(
	definition: unknown,
	controls: ControlDefinitionRegistry,
): NormalizedFormDefinition<StandardSchema> {
	const input = definition as {
		readonly schema: StandardSchema
		readonly ui: readonly unknown[]
	}
	const normalize = normalizeDefinition as (input: {
		readonly schema: StandardSchema
		readonly ui: readonly unknown[]
		readonly controls: ControlDefinitionRegistry
	}) => NormalizedFormDefinition<StandardSchema>

	return normalize({
		schema: input.schema,
		ui: input.ui,
		controls,
	})
}

function assertSlots(
	slots: Partial<FormKitSlots>,
): asserts slots is FormKitSlots {
	for (const key of [
		"Field",
		"Section",
		"Array",
		"ArrayItem",
		"ErrorMessage",
	] as const) {
		if (slots[key] === undefined) {
			throw new TypeError(`createFormKit requires a ${key} slot`)
		}
	}
}

export type { KitFormProps, SubmitProps }
