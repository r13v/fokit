"use client"

import {
	type ComponentType,
	type ElementType,
	type ReactElement,
	type ReactNode,
	useState,
} from "react"
import {
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
import {
	assertFormKitOwnership,
	type CreateFormOptions,
	createFormInstance,
	type FormContextProp,
	type FormInstance,
	type FormKitDescriptor,
	type FormKitOwner,
	type FormRuntimeOptions,
} from "./form-instance.js"
import type { RenderNodeComponent } from "./render-node.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	ReactUiPresentation,
	SectionSlotProps,
	SubmitSlotProps,
} from "./slots.js"
import {
	createSubmitComponent,
	type SubmitComponent,
	type SubmitProps,
} from "./submit.js"
import { useFormBinding } from "./use-form.js"

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
	readonly Submit: ComponentType<SubmitSlotProps>
}

export type RuntimeFormKitSlots = {
	readonly Field: ElementType
	readonly Section: ElementType
	readonly Array: ElementType
	readonly ArrayItem: ComponentType<ArrayItemSlotProps>
	readonly ErrorMessage: ComponentType<ErrorMessageSlotProps>
	readonly Submit: ComponentType<SubmitSlotProps>
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
	readonly ui: readonly UiNode<
		Input,
		Controls,
		Context,
		RenderNodeComponent,
		ReactUiPresentation<FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>
	>[]
}

export type DefineForm<
	Controls extends ControlDefinitionRegistry,
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
	Context = unknown,
> = <Input, Output, Schema extends StandardSchema<Input, Output>>(
	schema: Schema & StandardSchema<Input, Output>,
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
	ReactUiPresentation<FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>,
	Context
>

export type FieldsProps = {
	readonly children?: ReactNode
}

type CreateFormContextProp<Context, RequiredContext> =
	unknown extends RequiredContext
		? { readonly context?: Context }
		: { readonly context: Context }

export type AutoFormProps<
	Schema extends StandardSchema = StandardSchema,
	Context = unknown,
	Controls extends ControlDefinitionRegistry | undefined = undefined,
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
> = NativeFormProps &
	Omit<FormRuntimeOptions<Schema, NoInfer<Context>>, "context"> &
	FormContextProp<Context> & {
		readonly form: FormInstance<
			Schema,
			Context,
			Controls,
			ReactUiPresentation<
				FieldSlotOptions,
				SectionSlotOptions,
				ArraySlotOptions
			>,
			FormKitOwner<
				Controls,
				ReactUiPresentation<
					FieldSlotOptions,
					SectionSlotOptions,
					ArraySlotOptions
				>
			>
		>
		readonly children?: ReactNode
	}

type KitPresentation<FieldSlotOptions, SectionSlotOptions, ArraySlotOptions> =
	ReactUiPresentation<FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>

type KitOwner<
	Controls,
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions,
> = FormKitOwner<
	Controls,
	KitPresentation<FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>
>

type CreateKitForm<
	Controls extends ControlDefinitionRegistry,
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
	KitContext = unknown,
> = <
	Schema extends StandardSchema,
	RequiredContext = unknown,
	Context extends KitContext & RequiredContext = KitContext & RequiredContext,
>(
	definition: NormalizedFormDefinition<
		Schema,
		Controls,
		RenderNodeComponent,
		KitPresentation<FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>,
		RequiredContext
	>,
	options: Omit<CreateFormOptions<Schema, Context>, "context"> &
		CreateFormContextProp<Context, KitContext & RequiredContext>,
) => FormInstance<
	Schema,
	Context,
	Controls,
	KitPresentation<FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>,
	KitOwner<Controls, FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>
>

type UseBindKitForm<
	Controls extends ControlDefinitionRegistry,
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
	KitContext = unknown,
> = <Schema extends StandardSchema, Context extends KitContext = KitContext>(
	form: FormInstance<
		Schema,
		Context,
		Controls,
		KitPresentation<FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>,
		KitOwner<Controls, FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>
	>,
	options: FormRuntimeOptions<Schema, NoInfer<Context>>,
) => typeof form

export type FieldsComponent = (props: FieldsProps) => ReactElement

export type AutoFormComponent<
	Controls extends ControlDefinitionRegistry | undefined = undefined,
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
	KitContext = unknown,
> = <Schema extends StandardSchema, Context extends KitContext = KitContext>(
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
	readonly Submit?: ComponentType<SubmitSlotProps>
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
	Context = unknown,
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
		NextArraySlotOptions<ArraySlotOptions, Overrides>,
		Context
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
		NextArraySlotOptions<ArraySlotOptions, Overrides>,
		Context
	>
}

export interface FormKit<
	Controls extends ControlDefinitionRegistry,
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
	Context = unknown,
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
		ArraySlotOptions,
		Context
	>
	readonly forContext: <NextContext extends Context>() => FormKit<
		Controls,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions,
		NextContext
	>
	readonly defineForm: DefineForm<
		Controls,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions,
		Context
	>
	readonly createForm: CreateKitForm<
		Controls,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions,
		Context
	>
	readonly useCreateForm: CreateKitForm<
		Controls,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions,
		Context
	>
	readonly useBindForm: UseBindKitForm<
		Controls,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions,
		Context
	>
	readonly Form: KitFormComponent<
		Controls,
		KitPresentation<FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>,
		KitOwner<Controls, FieldSlotOptions, SectionSlotOptions, ArraySlotOptions>,
		Context
	>
	readonly Submit: SubmitComponent
	readonly Fields: FieldsComponent
	readonly AutoForm: AutoFormComponent<
		Controls,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions,
		Context
	>
}

type RuntimeExtendOptions = {
	readonly controls?: ControlDefinitionRegistry
	readonly slots?: Partial<RuntimeFormKitSlots>
}

type RuntimeKitDefinition<RequiredContext = never> = NormalizedFormDefinition<
	StandardSchema,
	ControlDefinitionRegistry,
	RenderNodeComponent,
	KitPresentation<unknown, unknown, unknown>,
	RequiredContext
>

type RuntimeFormKit = {
	readonly controls: ControlDefinitionRegistry
	readonly slots: RuntimeFormKitSlots
	readonly extend: (options: RuntimeExtendOptions) => RuntimeFormKit
	readonly forContext: <_Context>() => RuntimeFormKit
	readonly defineForm: DefineForm<
		ControlDefinitionRegistry,
		unknown,
		unknown,
		unknown
	>
	readonly createForm: CreateKitForm<
		ControlDefinitionRegistry,
		unknown,
		unknown,
		unknown
	>
	readonly useCreateForm: CreateKitForm<
		ControlDefinitionRegistry,
		unknown,
		unknown,
		unknown
	>
	readonly useBindForm: UseBindKitForm<
		ControlDefinitionRegistry,
		unknown,
		unknown,
		unknown
	>
	readonly Form: KitFormComponent<ControlDefinitionRegistry>
	readonly Submit: SubmitComponent
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
	const controls = Object.freeze({ ...options.controls }) as Controls

	return assembleFormKit(controls, slots) as unknown as FormKit<
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
	const descriptor = Object.freeze({
		controls,
		slots,
	}) satisfies FormKitDescriptor
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

	const defineForm = ((schema: unknown, definition: unknown) =>
		normalizeKitDefinition(schema, definition, controls)) as DefineForm<
		ControlDefinitionRegistry,
		unknown,
		unknown,
		unknown
	>
	const createRuntimeForm = <RequiredContext, Context extends RequiredContext>(
		definition: RuntimeKitDefinition<RequiredContext>,
		options: CreateFormOptions<StandardSchema, Context>,
	) => {
		assertDefinitionControls(definition, controls)
		return createFormInstance<
			StandardSchema,
			RequiredContext,
			Context,
			ControlDefinitionRegistry,
			KitPresentation<unknown, unknown, unknown>,
			KitOwner<ControlDefinitionRegistry, unknown, unknown, unknown>
		>(definition, options, descriptor)
	}
	const createForm = createRuntimeForm as RuntimeFormKit["createForm"]
	const useCreateForm = ((
		definition: RuntimeKitDefinition<unknown>,
		options: CreateFormOptions<StandardSchema, unknown>,
	) => {
		const [form] = useState(() => createRuntimeForm(definition, options))
		return form
	}) as RuntimeFormKit["useCreateForm"]
	const useBindForm = ((
		form: FormInstance<StandardSchema>,
		options: FormRuntimeOptions<StandardSchema, unknown>,
	) => {
		assertFormKitOwnership(form, descriptor, "kit.useBindForm")
		return useFormBinding(form as never, options) as unknown
	}) as unknown as RuntimeFormKit["useBindForm"]

	let kit: RuntimeFormKit
	const forContext = () => kit
	kit = Object.freeze({
		controls,
		slots,
		extend,
		forContext,
		defineForm,
		createForm,
		useCreateForm,
		useBindForm,
		Form: createFormComponent(controls, descriptor),
		Submit: createSubmitComponent(slots.Submit),
		Fields: createFieldsComponent(controls, slots),
		AutoForm: createAutoFormComponent(controls, slots, descriptor),
	})
	return kit
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
		"Submit",
	] as const) {
		if (slots[key] === undefined) {
			throw new TypeError(`${owner} requires a ${key} slot`)
		}
	}
}

function assertDefinitionControls(
	definition: RuntimeKitDefinition,
	controls: ControlDefinitionRegistry,
): void {
	for (const node of definition.nodes) {
		if (node.kind === "field" && !Object.hasOwn(controls, node.control)) {
			throw new TypeError(
				`kit.createForm requires control "${node.control}" used by the definition`,
			)
		}
	}
}

export type { KitFormProps, SubmitProps }
