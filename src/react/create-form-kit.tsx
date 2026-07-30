"use client"

import type { ComponentType, ReactElement, ReactNode } from "react"

import {
	type FormInput,
	type NormalizedFormDefinition,
	normalizeDefinition,
	type StandardSchema,
	type UiNode,
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

type FormDefinitionInput<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context,
> = {
	readonly ui: readonly UiNode<Input, Controls, Context, ComponentType>[]
}

type DefineFormWithContext<
	Schema extends StandardSchema,
	Input,
	Controls extends ControlDefinitionRegistry,
> = <Context>(
	definition: FormDefinitionInput<Input, Controls, Context>,
) => NormalizedFormDefinition<Schema, Controls, ComponentType>

type DefineFormForSchema<
	Schema extends StandardSchema,
	Input,
	Controls extends ControlDefinitionRegistry,
> = {
	(
		definition: FormDefinitionInput<Input, Controls, unknown>,
	): NormalizedFormDefinition<Schema, Controls, ComponentType>
	readonly withContext: DefineFormWithContext<Schema, Input, Controls>
}

export type DefineForm<Controls extends ControlDefinitionRegistry> = <
	Input,
	Output,
	Schema extends StandardSchema<Input, Output>,
>(
	schema: Schema & StandardSchema<Input, Output>,
) => DefineFormForSchema<Schema, Input, Controls>

export type FieldsProps = {
	readonly children?: ReactNode
}

export type AutoFormProps<
	Schema extends StandardSchema = StandardSchema,
	Context = unknown,
	Controls extends ControlDefinitionRegistry | undefined = undefined,
> = NativeFormProps &
	Omit<UseFormOptions<Schema, Context>, "defaultValues"> & {
		readonly definition: NormalizedFormDefinition<
			Schema,
			Controls,
			ComponentType
		>
		readonly defaultValues: FormInput<Schema>
		readonly children?: ReactNode
	}

export type FieldsComponent = (props: FieldsProps) => ReactElement

export type AutoFormComponent<
	Controls extends ControlDefinitionRegistry | undefined = undefined,
> = <Schema extends StandardSchema, Context = unknown>(
	props: AutoFormProps<Schema, Context, Controls>,
) => ReactElement

type WithoutControlCollisions<
	Base extends ControlDefinitionRegistry,
	Additions extends ControlDefinitionRegistry,
> = string extends keyof Base
	? Additions
	: Additions & {
			readonly [Name in Extract<keyof Additions, keyof Base>]: never
		}

type ExtendWithControlsOptions<
	Base extends ControlDefinitionRegistry,
	Additions extends ControlDefinitionRegistry,
> = {
	readonly controls: WithoutControlCollisions<Base, Additions>
	readonly slots?: Partial<FormKitSlots>
}

type ExtendWithSlotsOptions = {
	readonly controls?: never
	readonly slots: Partial<FormKitSlots>
}

export type ExtendFormKit<Controls extends ControlDefinitionRegistry> = {
	<const Additions extends ControlDefinitionRegistry>(
		options: ExtendWithControlsOptions<Controls, Additions>,
	): FormKit<Controls & Additions>
	(options: ExtendWithSlotsOptions): FormKit<Controls>
}

export interface FormKit<Controls extends ControlDefinitionRegistry> {
	readonly controls: Controls
	readonly slots: FormKitSlots
	readonly extend: ExtendFormKit<Controls>
	readonly defineForm: DefineForm<Controls>
	readonly Form: KitFormComponent<Controls>
	readonly Submit: typeof Submit
	readonly Fields: FieldsComponent
	readonly AutoForm: AutoFormComponent<Controls>
}

type RuntimeExtendOptions = {
	readonly controls?: ControlDefinitionRegistry
	readonly slots?: Partial<FormKitSlots>
}

type RuntimeFormKit = {
	readonly controls: ControlDefinitionRegistry
	readonly slots: FormKitSlots
	readonly extend: (options: RuntimeExtendOptions) => RuntimeFormKit
	readonly defineForm: DefineForm<ControlDefinitionRegistry>
	readonly Form: KitFormComponent<ControlDefinitionRegistry>
	readonly Submit: typeof Submit
	readonly Fields: FieldsComponent
	readonly AutoForm: AutoFormComponent<ControlDefinitionRegistry>
}

export function createFormKit<Controls extends ControlDefinitionRegistry>(
	options: CreateFormKitOptions<Controls>,
): FormKit<Controls> {
	const slots = Object.freeze({
		...createDefaultSlots(),
		...options.slots,
	})
	assertSlots(slots, "createFormKit")

	return assembleFormKit(
		options.controls,
		slots,
	) as unknown as FormKit<Controls>
}

function assembleFormKit(
	controls: ControlDefinitionRegistry,
	slots: FormKitSlots,
): RuntimeFormKit {
	const extend = (options: RuntimeExtendOptions) => {
		if (options.controls === undefined && options.slots === undefined) {
			throw new TypeError("kit.extend requires controls or slots")
		}

		for (const name of Object.keys(options.controls ?? {})) {
			if (Object.hasOwn(controls, name)) {
				throw new TypeError(`kit.extend cannot replace control "${name}"`)
			}
		}

		const extendedControls = Object.freeze({
			...controls,
			...options.controls,
		})
		const extendedSlots = Object.freeze({
			...slots,
			...options.slots,
		})
		assertSlots(extendedSlots, "kit.extend")

		return assembleFormKit(extendedControls, extendedSlots)
	}

	const defineForm = ((schema: unknown) => {
		const create = (createDefinition: unknown) =>
			normalizeKitDefinition(schema, createDefinition, controls)

		return Object.assign(create, {
			withContext: create,
		})
	}) as DefineForm<ControlDefinitionRegistry>

	return Object.freeze({
		controls,
		slots,
		extend,
		defineForm,
		Form: createFormComponent(controls),
		Submit,
		Fields: createFieldsComponent(controls, slots),
		AutoForm: createAutoFormComponent(controls, slots),
	})
}

function normalizeKitDefinition(
	schema: unknown,
	definitionSource: unknown,
	controls: ControlDefinitionRegistry,
): NormalizedFormDefinition<
	StandardSchema,
	ControlDefinitionRegistry,
	ComponentType
> {
	const input = definitionSource as {
		readonly ui: readonly unknown[]
	}
	const normalize = normalizeDefinition as (input: {
		readonly schema: StandardSchema
		readonly ui: readonly unknown[]
		readonly controls: ControlDefinitionRegistry
	}) => NormalizedFormDefinition<
		StandardSchema,
		ControlDefinitionRegistry,
		ComponentType
	>

	return normalize({
		schema: schema as StandardSchema,
		ui: input.ui,
		controls,
	})
}

function assertSlots(
	slots: Partial<FormKitSlots>,
	owner: "createFormKit" | "kit.extend",
): asserts slots is FormKitSlots {
	for (const key of [
		"Field",
		"Section",
		"Array",
		"ArrayItem",
		"ErrorMessage",
	] as const) {
		if (slots[key] === undefined) {
			throw new TypeError(`${owner} requires a ${key} slot`)
		}
	}
}

export type { KitFormProps, SubmitProps }
