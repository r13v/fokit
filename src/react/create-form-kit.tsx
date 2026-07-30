"use client"

import type { ComponentType, ReactElement, ReactNode } from "react"

import {
	computed,
	type FormComputed,
	type FormDefinition,
	type FormInput,
	type NormalizedFormDefinition,
	normalizeDefinition,
	type StandardSchema,
} from "../core/index.js"
import { createAutoFormComponent } from "./auto-form.js"
import type { ControlDefinitionRegistry } from "./control.js"
import { createDefaultSlots } from "./default-slots.js"
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
	readonly slots?: Partial<FormKitSlots>
}

type FormDefinitionFactory<
	Schema extends StandardSchema,
	Controls extends ControlDefinitionRegistry,
	Context,
> = (
	computed: FormComputed<FormInput<Schema>, Context>,
) => FormDefinitionInput<Schema, Controls, Context>

type FormDefinitionInput<
	Schema extends StandardSchema,
	Controls extends ControlDefinitionRegistry,
	Context,
> = Omit<FormDefinition<Schema, Controls, Context>, "schema">

type DefineFormWithContext<
	Schema extends StandardSchema,
	Controls extends ControlDefinitionRegistry,
> = {
	<Context>(
		createDefinition: FormDefinitionFactory<Schema, Controls, Context>,
	): NormalizedFormDefinition<Schema>
	<Context>(
		definition: FormDefinitionInput<Schema, Controls, Context>,
	): NormalizedFormDefinition<Schema>
}

type DefineFormForSchema<
	Schema extends StandardSchema,
	Controls extends ControlDefinitionRegistry,
> = {
	(
		createDefinition: FormDefinitionFactory<Schema, Controls, unknown>,
	): NormalizedFormDefinition<Schema>
	(
		definition: FormDefinitionInput<Schema, Controls, unknown>,
	): NormalizedFormDefinition<Schema>
	readonly withContext: DefineFormWithContext<Schema, Controls>
}

export type DefineForm<Controls extends ControlDefinitionRegistry> = <
	Schema extends StandardSchema,
>(
	schema: Schema,
) => DefineFormForSchema<Schema, Controls>

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
	const slots = Object.freeze({
		...createDefaultSlots(),
		...options.slots,
	})
	assertSlots(slots)

	const defineForm = ((schema: unknown) => {
		const create = (createDefinition: unknown) =>
			normalizeKitDefinition(schema, createDefinition, options.controls)

		return Object.assign(create, {
			withContext: create,
		})
	}) as DefineForm<Controls>

	return Object.freeze({
		controls: options.controls,
		slots,
		defineForm,
		Form: createFormComponent(options.controls),
		Submit,
		Fields: createFieldsComponent(options.controls, slots),
		AutoForm: createAutoFormComponent(options.controls, slots),
	})
}

function normalizeKitDefinition(
	schema: unknown,
	definitionSource: unknown,
	controls: ControlDefinitionRegistry,
): NormalizedFormDefinition<StandardSchema> {
	const definition =
		typeof definitionSource === "function"
			? (
					definitionSource as (createComputed: typeof computed) => {
						readonly ui: readonly unknown[]
					}
				)(computed)
			: definitionSource
	const input = definition as {
		readonly ui: readonly unknown[]
	}
	const normalize = normalizeDefinition as (input: {
		readonly schema: StandardSchema
		readonly ui: readonly unknown[]
		readonly controls: ControlDefinitionRegistry
	}) => NormalizedFormDefinition<StandardSchema>

	return normalize({
		schema: schema as StandardSchema,
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
