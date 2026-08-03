import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { DeepKeys, DeepValue } from "@tanstack/react-form"
import type {
	ComponentPropsWithoutRef,
	ComponentType,
	CSSProperties,
	HTMLAttributes,
	LabelHTMLAttributes,
	ReactElement,
	ReactNode,
} from "react"

export type StandardSchema<Input = unknown, Output = Input> = StandardSchemaV1<
	Input,
	Output
>
export type FormInput<Schema extends StandardSchemaV1> =
	StandardSchemaV1.InferInput<Schema>
export type FormOutput<Schema extends StandardSchemaV1> =
	StandardSchemaV1.InferOutput<Schema>

type Primitive = bigint | boolean | null | number | string | symbol | undefined
type NativeLeaf = Blob | Date | File | RegExp
type Leaf = ((...args: never[]) => unknown) | NativeLeaf | Primitive

export type DeepReadonly<Value> = Value extends Leaf
	? Value
	: Value extends readonly (infer Item)[]
		? readonly DeepReadonly<Item>[]
		: Value extends object
			? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
			: Value

export type FieldPath<Value> = Extract<DeepKeys<Value>, string>
export type PathValue<Value, Path extends FieldPath<Value>> = DeepValue<
	Value,
	Path
>
export type ArrayFieldPath<Value> = {
	[Path in FieldPath<Value>]: NonNullable<
		PathValue<Value, Path>
	> extends readonly unknown[]
		? Path
		: never
}[FieldPath<Value>]

export type FormIssue = {
	readonly message: string
	readonly path?: string
}

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
	readonly options: Readonly<Options>
	readonly context: DeepReadonly<Context>
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly required: boolean
}

declare const controlTypes: unique symbol
type ControlTypes<Value, Options, Context> = {
	readonly value: Value
	readonly options: Options
	readonly context: Context
}

export type ControlDefinition<
	Value,
	Options = Record<string, never>,
	Context = unknown,
> = {
	readonly component: ComponentType<ControlProps<Value, Options, Context>>
	readonly [controlTypes]?: ControlTypes<Value, Options, Context>
}
export type AnyControlDefinition = {
	readonly component: unknown
	readonly [controlTypes]?: ControlTypes<unknown, unknown, unknown>
}
export type ControlDefinitionRegistry = Readonly<
	Record<string, AnyControlDefinition>
>
export type ControlValueOf<Control> = Control extends {
	readonly [controlTypes]?: ControlTypes<infer Value, unknown, unknown>
}
	? Value
	: never
export type ControlOptionsOf<Control> = Control extends {
	readonly [controlTypes]?: ControlTypes<unknown, infer Options, unknown>
}
	? Options
	: never
export type ControlContextOf<Control> = Control extends {
	readonly [controlTypes]?: ControlTypes<unknown, unknown, infer Context>
}
	? Context
	: never

export type DefaultGridValue = 1 | 2 | 3 | 4
export type UiResolverValues<Input> = DeepReadonly<Input>
export type UiResolverDetails<Context = unknown> = {
	readonly context: DeepReadonly<Context>
}
export type UiResolver<Result, Input = unknown, Context = unknown> = (
	values: UiResolverValues<Input>,
	details: UiResolverDetails<Context>,
) => Result
export type Resolvable<Value, Input, Context> =
	| (Value extends (...args: never[]) => unknown ? never : Value)
	| UiResolver<Value, Input, Context>
export type ReactUiContent = ReactElement | string
export type RenderNodeProps = {
	readonly disabled: boolean
	readonly readOnly: boolean
}
export type RenderNodeComponent = ComponentType<RenderNodeProps>

type IsAny<Value> = 0 extends 1 & Value ? true : false
type IsNever<Value> = [Value] extends [never] ? true : false
type IsUnknown<Value> =
	IsAny<Value> extends true
		? false
		: unknown extends Value
			? [Value] extends [unknown]
				? true
				: false
			: false
type IsUntyped<Value> = IsNever<Value> extends true ? true : IsUnknown<Value>
type ContextMatches<Context, Requirement> =
	IsUntyped<Requirement> extends true
		? true
		: [Context] extends [Requirement]
			? true
			: false
type ControlName<Controls extends ControlDefinitionRegistry> = Extract<
	keyof Controls,
	string
>
type CompatibleControlName<
	Scope,
	Controls extends ControlDefinitionRegistry,
	Context,
	Path extends FieldPath<Scope>,
> = {
	[Name in ControlName<Controls>]: IsAny<
		ControlValueOf<Controls[Name]>
	> extends true
		? never
		: IsUntyped<ControlValueOf<Controls[Name]>> extends true
			? never
			: [PathValue<Scope, Path>] extends [ControlValueOf<Controls[Name]>]
				? ContextMatches<Context, ControlContextOf<Controls[Name]>> extends true
					? Name
					: never
				: never
}[ControlName<Controls>]

type FieldNodeBase<Root, Context, FieldOptions, Grid extends number> = {
	readonly kind: "field"
	readonly id?: string
	readonly label?: Resolvable<ReactUiContent, Root, Context>
	readonly description?: Resolvable<ReactUiContent, Root, Context>
	readonly slotOptions?: Resolvable<FieldOptions, Root, Context>
	readonly required?: Resolvable<boolean, Root, Context>
	readonly disabled?: Resolvable<boolean, Root, Context>
	readonly readOnly?: Resolvable<boolean, Root, Context>
	readonly visible?: Resolvable<boolean, Root, Context>
	readonly className?: Resolvable<string, Root, Context>
	readonly span?: Resolvable<Grid | "full", Root, Context>
}
type FieldNodeForPath<
	Root,
	Scope,
	Controls extends ControlDefinitionRegistry,
	Context,
	FieldOptions,
	Path extends FieldPath<Scope>,
	Grid extends number,
> = FieldNodeBase<Root, Context, FieldOptions, Grid> & {
	readonly path: Path
} & {
		[Name in CompatibleControlName<Scope, Controls, Context, Path>]: {
			readonly control: Name
			// biome-ignore lint/complexity/noBannedTypes: This conditional detects whether the options type has required properties.
		} & ({} extends ControlOptionsOf<Controls[Name]>
			? {
					readonly options?: Resolvable<
						ControlOptionsOf<Controls[Name]>,
						Root,
						Context
					>
				}
			: {
					readonly options: Resolvable<
						ControlOptionsOf<Controls[Name]>,
						Root,
						Context
					>
				})
	}[CompatibleControlName<Scope, Controls, Context, Path>]

type FieldNodeInScope<
	Root,
	Scope,
	Controls extends ControlDefinitionRegistry,
	Context,
	FieldOptions,
	Grid extends number,
> = {
	[Path in FieldPath<Scope>]: FieldNodeForPath<
		Root,
		Scope,
		Controls,
		Context,
		FieldOptions,
		Path,
		Grid
	>
}[FieldPath<Scope>]

export type FieldNode<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context = unknown,
	FieldOptions = never,
	Grid extends number = DefaultGridValue,
> = FieldNodeInScope<Input, Input, Controls, Context, FieldOptions, Grid>

type SectionNodeInScope<
	Root,
	Scope,
	Controls extends ControlDefinitionRegistry,
	Context,
	FieldOptions,
	SectionOptions,
	ArrayOptions,
	Grid extends number,
> = {
	readonly kind: "section"
	readonly id: string
	readonly title?: Resolvable<ReactUiContent, Root, Context>
	readonly description?: Resolvable<ReactUiContent, Root, Context>
	readonly slotOptions?: Resolvable<SectionOptions, Root, Context>
	readonly visible?: Resolvable<boolean, Root, Context>
	readonly disabled?: Resolvable<boolean, Root, Context>
	readonly readOnly?: Resolvable<boolean, Root, Context>
	readonly className?: Resolvable<string, Root, Context>
	readonly columns?: Resolvable<Grid, Root, Context>
	readonly span?: Resolvable<Grid | "full", Root, Context>
	readonly children: readonly UiNodeInScope<
		Root,
		Scope,
		Controls,
		Context,
		FieldOptions,
		SectionOptions,
		ArrayOptions,
		Grid
	>[]
}

export type SectionNode<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context = unknown,
	FieldOptions = never,
	SectionOptions = never,
	ArrayOptions = never,
	Grid extends number = DefaultGridValue,
> = SectionNodeInScope<
	Input,
	Input,
	Controls,
	Context,
	FieldOptions,
	SectionOptions,
	ArrayOptions,
	Grid
>

type ArrayItem<Scope, Path extends ArrayFieldPath<Scope>> =
	NonNullable<PathValue<Scope, Path>> extends readonly (infer Item)[]
		? Item
		: never
type ArrayNodeInScope<
	Root,
	Scope,
	Controls extends ControlDefinitionRegistry,
	Context,
	FieldOptions,
	SectionOptions,
	ArrayOptions,
	Grid extends number,
> = {
	[Path in ArrayFieldPath<Scope>]: {
		readonly kind: "array"
		readonly id?: string
		readonly path: Path
		readonly label?: Resolvable<ReactUiContent, Root, Context>
		readonly description?: Resolvable<ReactUiContent, Root, Context>
		readonly slotOptions?: Resolvable<ArrayOptions, Root, Context>
		readonly visible?: Resolvable<boolean, Root, Context>
		readonly disabled?: Resolvable<boolean, Root, Context>
		readonly readOnly?: Resolvable<boolean, Root, Context>
		readonly className?: Resolvable<string, Root, Context>
		readonly span?: Resolvable<Grid | "full", Root, Context>
		readonly itemDefault:
			| ArrayItem<Scope, Path>
			| (() => ArrayItem<Scope, Path>)
		readonly children: readonly UiNodeInScope<
			Root,
			ArrayItem<Scope, Path>,
			Controls,
			Context,
			FieldOptions,
			SectionOptions,
			ArrayOptions,
			Grid
		>[]
	}
}[ArrayFieldPath<Scope>]

export type ArrayNode<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context = unknown,
	FieldOptions = never,
	SectionOptions = never,
	ArrayOptions = never,
	Grid extends number = DefaultGridValue,
> = ArrayNodeInScope<
	Input,
	Input,
	Controls,
	Context,
	FieldOptions,
	SectionOptions,
	ArrayOptions,
	Grid
>

export type RenderNode<Input, Context = unknown> = {
	readonly kind: "render"
	readonly id: string
	readonly component: RenderNodeComponent
	readonly visible?: Resolvable<boolean, Input, Context>
	readonly disabled?: Resolvable<boolean, Input, Context>
	readonly readOnly?: Resolvable<boolean, Input, Context>
}

type UiNodeInScope<
	Root,
	Scope,
	Controls extends ControlDefinitionRegistry,
	Context,
	FieldOptions,
	SectionOptions,
	ArrayOptions,
	Grid extends number,
> =
	| ArrayNodeInScope<
			Root,
			Scope,
			Controls,
			Context,
			FieldOptions,
			SectionOptions,
			ArrayOptions,
			Grid
	  >
	| FieldNodeInScope<Root, Scope, Controls, Context, FieldOptions, Grid>
	| RenderNode<Root, Context>
	| SectionNodeInScope<
			Root,
			Scope,
			Controls,
			Context,
			FieldOptions,
			SectionOptions,
			ArrayOptions,
			Grid
	  >

export type UiNode<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context = unknown,
	FieldOptions = never,
	SectionOptions = never,
	ArrayOptions = never,
	Grid extends number = DefaultGridValue,
> = UiNodeInScope<
	Input,
	Input,
	Controls,
	Context,
	FieldOptions,
	SectionOptions,
	ArrayOptions,
	Grid
>

export type FormDefinitionSource<
	Schema extends StandardSchema,
	Controls extends ControlDefinitionRegistry,
	Context,
	FieldOptions,
	SectionOptions,
	ArrayOptions,
	Grid extends number,
> = {
	readonly ui: readonly UiNode<
		FormInput<Schema>,
		Controls,
		Context,
		FieldOptions,
		SectionOptions,
		ArrayOptions,
		Grid
	>[]
}

export type NormalizedNode = Readonly<Record<string, unknown>> & {
	readonly id: string
	readonly kind: "array" | "field" | "render" | "section"
	readonly parentId?: string
	readonly scopePath: string
}

declare const definitionTypes: unique symbol
export type FormDefinition<
	Schema extends StandardSchema = StandardSchema,
	Controls extends ControlDefinitionRegistry = ControlDefinitionRegistry,
	Context = unknown,
	FieldOptions = unknown,
	SectionOptions = unknown,
	ArrayOptions = unknown,
	Grid extends number = number,
> = {
	readonly schema: Schema
	readonly grid: readonly Grid[]
	readonly ui: readonly NormalizedNode[]
	readonly nodes: readonly NormalizedNode[]
	readonly [definitionTypes]?: {
		readonly controls: Controls
		readonly context: Context
		readonly fieldOptions: FieldOptions
		readonly sectionOptions: SectionOptions
		readonly arrayOptions: ArrayOptions
	}
}

export type StructuralNodeName =
	| "array"
	| "array-item"
	| "error-message"
	| "field"
	| "section"
export type FormPleaseStyle = CSSProperties &
	Partial<
		Record<
			| "--fp-array-item-gap"
			| "--fp-column-gap"
			| "--fp-row-gap"
			| "--fp-stack-gap",
			string
		>
	>
export type StructuralRootProps = Omit<HTMLAttributes<HTMLElement>, "style"> & {
	readonly "data-fp-node": StructuralNodeName
	ref?(element: HTMLElement | null): void
	readonly style?: FormPleaseStyle
}
export type FieldSlotProps<Options = never> = {
	readonly rootProps: StructuralRootProps
	readonly label?: ReactNode
	readonly labelProps: LabelHTMLAttributes<HTMLLabelElement>
	readonly description?: ReactNode
	readonly descriptionProps: HTMLAttributes<HTMLElement>
	readonly slotOptions?: Readonly<Options>
	readonly control: ReactNode
	readonly errors: readonly ReactNode[]
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly required: boolean
}
export type SectionSlotProps<Options = never> = {
	readonly rootProps: StructuralRootProps
	readonly layoutProps: HTMLAttributes<HTMLElement> & {
		readonly "data-fp-layout": "grid"
		readonly "data-fp-columns": number
	}
	readonly title?: ReactNode
	readonly description?: ReactNode
	readonly slotOptions?: Readonly<Options>
	readonly children: ReactNode
}
export type ArraySlotProps<Options = never> = {
	readonly rootProps: StructuralRootProps
	readonly label?: ReactNode
	readonly labelProps: HTMLAttributes<HTMLElement>
	readonly description?: ReactNode
	readonly descriptionProps: HTMLAttributes<HTMLElement>
	readonly slotOptions?: Readonly<Options>
	readonly errors: readonly ReactNode[]
	readonly invalid: boolean
	readonly canAdd: boolean
	add(): void
	readonly children: ReactNode
}
export type ArrayItemSlotProps = {
	readonly rootProps: StructuralRootProps
	readonly index: number
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly canMoveUp: boolean
	readonly canMoveDown: boolean
	remove(): void
	move(toIndex: number): void
	readonly children: ReactNode
}
export type ErrorMessageSlotProps = {
	readonly rootProps: StructuralRootProps
	readonly issue: FormIssue
}
export type SubmitSlotProps = {
	readonly buttonProps: Omit<
		ComponentPropsWithoutRef<"button">,
		"disabled" | "type"
	> & { readonly disabled: boolean; readonly type: "submit" }
	readonly values: Readonly<Record<string, unknown>>
	readonly isSubmitting: boolean
}
export type FormKitSlots<
	FieldOptions = never,
	SectionOptions = never,
	ArrayOptions = never,
> = {
	readonly Field: ComponentType<FieldSlotProps<FieldOptions>>
	readonly Section: ComponentType<SectionSlotProps<SectionOptions>>
	readonly Array: ComponentType<ArraySlotProps<ArrayOptions>>
	readonly ArrayItem: ComponentType<ArrayItemSlotProps>
	readonly ErrorMessage: ComponentType<ErrorMessageSlotProps>
	readonly Submit: ComponentType<SubmitSlotProps>
}
