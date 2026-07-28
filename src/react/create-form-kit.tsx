"use client"

import type { ComponentType, ReactNode } from "react"

import {
	type FormDefinition,
	type NormalizedFormDefinition,
	normalizeDefinition,
	type StandardSchema,
} from "../core/index.js"
import type { ControlDefinitionRegistry } from "./control.js"
import { KitForm, type KitFormProps } from "./form.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	SectionSlotProps,
} from "./slots.js"
import { Submit, type SubmitProps } from "./submit.js"

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

export type AutoFormProps = {
	readonly children?: ReactNode
}

export type FormKit<Controls extends ControlDefinitionRegistry> = {
	readonly controls: Controls
	readonly slots: FormKitSlots
	readonly defineForm: DefineForm<Controls>
	readonly Form: typeof KitForm
	readonly Submit: typeof Submit
	readonly Fields: (props: FieldsProps) => never
	readonly AutoForm: (props: AutoFormProps) => never
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
		Form: KitForm,
		Submit,
		Fields,
		AutoForm,
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

function Fields(_props: FieldsProps): never {
	throw new Error("kit.Fields is implemented by Fokit's generated renderer")
}

function AutoForm(_props: AutoFormProps): never {
	throw new Error("kit.AutoForm is implemented by Fokit's generated renderer")
}

export type { KitFormProps, SubmitProps }
