"use client"

import type { ComponentType, ElementType, ReactElement, ReactNode } from "react"
import { scopeDefinitionFragment } from "../core/definition-fragment.js"
import {
	type FieldPath,
	type FormInput,
	type NormalizedFormDefinition,
	normalizeDefinition,
	type PathValue,
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
import type { RenderNodeComponent } from "./render-node.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	ReactUiPresentation,
	SectionSlotProps,
} from "./slots.js"
import { Submit, type SubmitProps } from "./submit.js"
import type { UseFormOptions } from "./use-form.js"

export type FormKitSlots<
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
> = {
	readonly Field: ComponentType<FieldSlotProps<FieldSlotOptions>>
	readonly Section: ComponentType<SectionSlotProps<SectionSlotOptions>>
	readonly Array: ComponentType<ArraySlotProps<ArraySlotOptions>>
	readonly ArrayItem: ComponentType<ArrayItemSlotProps>
	readonly ErrorMessage: ComponentType<ErrorMessageSlotProps>
}

export type RuntimeFormKitSlots = {
	readonly Field: ElementType
	readonly Section: ElementType
	readonly Array: ElementType
	readonly ArrayItem: ComponentType<ArrayItemSlotProps>
	readonly ErrorMessage: ComponentType<ErrorMessageSlotProps>
}

export type CreateFormKitOptions<
	Controls extends ControlDefinitionRegistry,
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
> = {
	readonly controls: Controls
	readonly slots?: Partial<
		FormKitSlots<FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>
	>
}

type FormDefinitionInput<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context,
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions,
> = {
	readonly ui: readonly (
		| UiNode<
				Input,
				Controls,
				Context,
				RenderNodeComponent,
				ReactUiPresentation<
					FieldSlotOptions,
					SectionSlotOptions,
					ArraySlotOptions
				>
		  >
		| DefinitionFragmentNode<
				Input,
				Controls,
				Context,
				FieldSlotOptions,
				SectionSlotOptions,
				ArraySlotOptions
		  >
	)[]
}

declare const definitionFragmentNodeBrand: unique symbol

export type DefinitionFragmentNode<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context,
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions,
> = {
	readonly kind?: never
	readonly [definitionFragmentNodeBrand]: {
		readonly input: (input: Input) => void
		readonly controls: (controls: Controls) => void
		readonly context: (context: Context) => void
		readonly fieldSlotOptions: () => FieldSlotOptions
		readonly sectionSlotOptions: () => SectionSlotOptions
		readonly arraySlotOptions: () => ArraySlotOptions
	}
}

type DefinitionFragmentPathFor<Input, Path> =
	Path extends FieldPath<Input>
		? PathValue<Input, Path> extends readonly unknown[]
			? never
			: PathValue<Input, Path> extends object
				? Path
				: never
		: never

export type DefinitionFragmentPath<Input> = DefinitionFragmentPathFor<
	Input,
	FieldPath<Input>
>

export type DefineFormFragment<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context,
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions,
> = <const Scope extends DefinitionFragmentPath<Input>>(
	scope: Scope,
	nodes: readonly UiNode<
		NonNullable<PathValue<Input, Scope>>,
		Controls,
		Context,
		RenderNodeComponent,
		ReactUiPresentation<FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>
	>[],
) => readonly DefinitionFragmentNode<
	Input,
	Controls,
	Context,
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions
>[]

type DefineFormFragmentForSchema<
	Input,
	Controls extends ControlDefinitionRegistry,
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions,
> = DefineFormFragment<
	Input,
	Controls,
	unknown,
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions
> & {
	readonly withContext: <Context>() => DefineFormFragment<
		Input,
		Controls,
		Context,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions
	>
}

type DefineFormWithContext<
	Schema extends StandardSchema,
	Input,
	Controls extends ControlDefinitionRegistry,
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions,
> = <Context>(
	definition: FormDefinitionInput<
		Input,
		Controls,
		Context,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions
	>,
) => NormalizedFormDefinition<
	Schema,
	Controls,
	RenderNodeComponent,
	ReactUiPresentation<FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>
>

type DefineFormForSchema<
	Schema extends StandardSchema,
	Input,
	Controls extends ControlDefinitionRegistry,
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions,
> = {
	(
		definition: FormDefinitionInput<
			Input,
			Controls,
			unknown,
			FieldSlotOptions,
			SectionSlotOptions,
			ArraySlotOptions
		>,
	): NormalizedFormDefinition<
		Schema,
		Controls,
		RenderNodeComponent,
		ReactUiPresentation<FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>
	>
	readonly withContext: DefineFormWithContext<
		Schema,
		Input,
		Controls,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions
	>
	readonly fragment: DefineFormFragmentForSchema<
		Input,
		Controls,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions
	>
}

export type DefineForm<
	Controls extends ControlDefinitionRegistry,
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
> = <Input, Output, Schema extends StandardSchema<Input, Output>>(
	schema: Schema & StandardSchema<Input, Output>,
) => DefineFormForSchema<
	Schema,
	Input,
	Controls,
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions
>

export type FieldsProps = {
	readonly children?: ReactNode
}

export type AutoFormProps<
	Schema extends StandardSchema = StandardSchema,
	Context = unknown,
	Controls extends ControlDefinitionRegistry | undefined = undefined,
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
> = NativeFormProps &
	Omit<UseFormOptions<Schema, Context>, "defaultValues"> & {
		readonly definition: NormalizedFormDefinition<
			Schema,
			Controls,
			RenderNodeComponent,
			ReactUiPresentation<
				FieldSlotOptions,
				SectionSlotOptions,
				ArraySlotOptions
			>
		>
		readonly defaultValues: FormInput<Schema>
		readonly children?: ReactNode
	}

export type FieldsComponent = (props: FieldsProps) => ReactElement

export type AutoFormComponent<
	Controls extends ControlDefinitionRegistry | undefined = undefined,
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
> = <Schema extends StandardSchema, Context = unknown>(
	props: AutoFormProps<
		Schema,
		Context,
		Controls,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions
	>,
) => ReactElement

type WithoutControlCollisions<
	Base extends ControlDefinitionRegistry,
	Additions extends ControlDefinitionRegistry,
> = string extends keyof Base
	? Additions
	: Additions & {
			readonly [Name in Extract<keyof Additions, keyof Base>]: never
		}

type FormKitSlotOverrides = {
	readonly Field?: ComponentType<never>
	readonly Section?: ComponentType<never>
	readonly Array?: ComponentType<never>
	readonly ArrayItem?: ComponentType<ArrayItemSlotProps>
	readonly ErrorMessage?: ComponentType<ErrorMessageSlotProps>
}

type FieldSlotOptionsOf<Slot> =
	Slot extends ComponentType<infer Props>
		? Props extends FieldSlotProps<infer Options>
			? Options
			: never
		: never

type SectionSlotOptionsOf<Slot> =
	Slot extends ComponentType<infer Props>
		? Props extends SectionSlotProps<infer Options>
			? Options
			: never
		: never

type ArraySlotOptionsOf<Slot> =
	Slot extends ComponentType<infer Props>
		? Props extends ArraySlotProps<infer Options>
			? Options
			: never
		: never

type NextFieldSlotOptions<Base, Overrides> = Overrides extends {
	readonly Field: infer Slot
}
	? FieldSlotOptionsOf<Slot>
	: Base

type NextSectionSlotOptions<Base, Overrides> = Overrides extends {
	readonly Section: infer Slot
}
	? SectionSlotOptionsOf<Slot>
	: Base

type NextArraySlotOptions<Base, Overrides> = Overrides extends {
	readonly Array: infer Slot
}
	? ArraySlotOptionsOf<Slot>
	: Base

type SlotOptionsCompatible<Base, Next> = [Base] extends [never]
	? true
	: [Base] extends [Next]
		? true
		: false

type CompatibleSlotOverrides<
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions,
	Overrides extends FormKitSlotOverrides,
> = Overrides &
	(SlotOptionsCompatible<
		FieldSlotOptions,
		NextFieldSlotOptions<FieldSlotOptions, Overrides>
	> extends true
		? object
		: { readonly Field: never }) &
	(SlotOptionsCompatible<
		SectionSlotOptions,
		NextSectionSlotOptions<SectionSlotOptions, Overrides>
	> extends true
		? object
		: { readonly Section: never }) &
	(SlotOptionsCompatible<
		ArraySlotOptions,
		NextArraySlotOptions<ArraySlotOptions, Overrides>
	> extends true
		? object
		: { readonly Array: never })

type ExtendWithControlsOptions<
	Base extends ControlDefinitionRegistry,
	Additions extends ControlDefinitionRegistry,
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions,
	Overrides extends FormKitSlotOverrides,
> = {
	readonly controls: WithoutControlCollisions<Base, Additions>
	readonly slots?: CompatibleSlotOverrides<
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions,
		Overrides
	>
}

type ExtendWithSlotsOptions<
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions,
	Overrides extends FormKitSlotOverrides,
> = {
	readonly controls?: never
	readonly slots: CompatibleSlotOverrides<
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions,
		Overrides
	>
}

export type ExtendFormKit<
	Controls extends ControlDefinitionRegistry,
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
> = {
	<
		const Additions extends ControlDefinitionRegistry,
		const Overrides extends FormKitSlotOverrides = Record<never, never>,
	>(
		options: ExtendWithControlsOptions<
			Controls,
			Additions,
			FieldSlotOptions,
			SectionSlotOptions,
			ArraySlotOptions,
			Overrides
		>,
	): FormKit<
		Controls & Additions,
		NextFieldSlotOptions<FieldSlotOptions, Overrides>,
		NextSectionSlotOptions<SectionSlotOptions, Overrides>,
		NextArraySlotOptions<ArraySlotOptions, Overrides>
	>
	<const Overrides extends FormKitSlotOverrides>(
		options: ExtendWithSlotsOptions<
			FieldSlotOptions,
			SectionSlotOptions,
			ArraySlotOptions,
			Overrides
		>,
	): FormKit<
		Controls,
		NextFieldSlotOptions<FieldSlotOptions, Overrides>,
		NextSectionSlotOptions<SectionSlotOptions, Overrides>,
		NextArraySlotOptions<ArraySlotOptions, Overrides>
	>
}

export interface FormKit<
	Controls extends ControlDefinitionRegistry,
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
> {
	readonly controls: Controls
	readonly slots: FormKitSlots<
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions
	>
	readonly extend: ExtendFormKit<
		Controls,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions
	>
	readonly defineForm: DefineForm<
		Controls,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions
	>
	readonly Form: KitFormComponent<
		Controls,
		ReactUiPresentation<FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>
	>
	readonly Submit: typeof Submit
	readonly Fields: FieldsComponent
	readonly AutoForm: AutoFormComponent<
		Controls,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions
	>
}

type RuntimeExtendOptions = {
	readonly controls?: ControlDefinitionRegistry
	readonly slots?: Partial<RuntimeFormKitSlots>
}

type RuntimeFormKit = {
	readonly controls: ControlDefinitionRegistry
	readonly slots: RuntimeFormKitSlots
	readonly extend: (options: RuntimeExtendOptions) => RuntimeFormKit
	readonly defineForm: DefineForm<
		ControlDefinitionRegistry,
		unknown,
		unknown,
		unknown
	>
	readonly Form: KitFormComponent<ControlDefinitionRegistry>
	readonly Submit: typeof Submit
	readonly Fields: FieldsComponent
	readonly AutoForm: AutoFormComponent<
		ControlDefinitionRegistry,
		unknown,
		unknown,
		unknown
	>
}

export function createFormKit<
	Controls extends ControlDefinitionRegistry,
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
>(
	options: CreateFormKitOptions<
		Controls,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions
	>,
): FormKit<Controls, FieldSlotOptions, SectionSlotOptions, ArraySlotOptions> {
	const slots = Object.freeze({
		...createDefaultSlots(),
		...options.slots,
	}) as unknown as Partial<RuntimeFormKitSlots>
	assertSlots(slots, "createFormKit")

	return assembleFormKit(options.controls, slots) as unknown as FormKit<
		Controls,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions
	>
}

function assembleFormKit(
	controls: ControlDefinitionRegistry,
	slots: RuntimeFormKitSlots,
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
		const fragment = Object.assign(
			(scope: string, nodes: readonly unknown[]) =>
				scopeDefinitionFragment(scope, nodes),
			{
				withContext: () => fragment,
			},
		)

		return Object.assign(create, {
			withContext: create,
			fragment,
		})
	}) as DefineForm<ControlDefinitionRegistry, unknown, unknown, unknown>

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
	RenderNodeComponent,
	ReactUiPresentation<unknown, unknown, unknown>
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
		RenderNodeComponent,
		ReactUiPresentation<unknown, unknown, unknown>
	>

	return normalize({
		schema: schema as StandardSchema,
		ui: input.ui,
		controls,
	})
}

function assertSlots(
	slots: Partial<RuntimeFormKitSlots>,
	owner: "createFormKit" | "kit.extend",
): asserts slots is RuntimeFormKitSlots {
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
