import type { StandardSchemaV1 } from "@standard-schema/spec"
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
type NonZeroDigit = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
type ArrayIndex = `${bigint}` & ("0" | `${NonZeroDigit}${string}`)
type DefaultDepth = readonly [1, 1, 1, 1]
type Decrement<Depth extends readonly unknown[]> = Depth extends readonly [
	unknown,
	...infer Rest,
]
	? Rest
	: readonly []
type Join<Prefix extends string, Suffix> = Suffix extends string
	? Suffix extends `[${string}`
		? `${Prefix}${Suffix}`
		: `${Prefix}.${Suffix}`
	: never
type ArrayAccessor = `[${ArrayIndex}]`
type StringKey<Value> = Extract<keyof Value, string>
type ValidKey<Key extends string> = Key extends "" | `${string}.${string}`
	? never
	: Key extends `${number}` | "__proto__" | "constructor" | "prototype"
		? never
		: Key
type ObjectKeys<Value> =
	StringKey<Value> extends infer Key
		? Key extends string
			? ValidKey<Key>
			: never
		: never
type FieldPathInternal<
	Value,
	Depth extends readonly unknown[],
> = Depth extends readonly []
	? never
	: NonNullable<Value> extends Leaf
		? never
		: NonNullable<Value> extends readonly (infer Item)[]
			? ArrayItemFieldPath<Item, Decrement<Depth>>
			: NonNullable<Value> extends object
				? ObjectFieldPath<NonNullable<Value>, Depth>
				: never
type ObjectFieldPath<Value, Depth extends readonly unknown[]> = {
	[Key in ObjectKeys<Value>]:
		| Key
		| ChildFieldPath<Key, Value[Key], Decrement<Depth>>
}[ObjectKeys<Value>]
type ChildFieldPath<
	Key extends string,
	Value,
	Depth extends readonly unknown[],
> =
	NonNullable<Value> extends Leaf
		? never
		: NonNullable<Value> extends readonly (infer Item)[]
			?
					| `${Key}${ArrayAccessor}`
					| Join<`${Key}${ArrayAccessor}`, FieldPathInternal<Item, Depth>>
			: NonNullable<Value> extends object
				? Join<Key, FieldPathInternal<Value, Depth>>
				: never
type ArrayItemFieldPath<Item, Depth extends readonly unknown[]> =
	NonNullable<Item> extends Leaf
		? ArrayAccessor
		: NonNullable<Item> extends readonly (infer Nested)[]
			? ArrayAccessor | Join<ArrayAccessor, ArrayItemFieldPath<Nested, Depth>>
			: Join<ArrayAccessor, FieldPathInternal<Item, Depth>>
type ArrayFieldPathInternal<
	Value,
	Depth extends readonly unknown[],
> = Depth extends readonly []
	? never
	: NonNullable<Value> extends Leaf
		? never
		: NonNullable<Value> extends readonly (infer Item)[]
			? Join<ArrayAccessor, ArrayFieldPathInternal<Item, Decrement<Depth>>>
			: NonNullable<Value> extends object
				? ObjectArrayFieldPath<NonNullable<Value>, Depth>
				: never
type ObjectArrayFieldPath<Value, Depth extends readonly unknown[]> = {
	[Key in ObjectKeys<Value>]: ArrayChildPath<Key, Value[Key], Decrement<Depth>>
}[ObjectKeys<Value>]
type ArrayChildPath<
	Key extends string,
	Value,
	Depth extends readonly unknown[],
> =
	NonNullable<Value> extends readonly (infer Item)[]
		? Key | Join<`${Key}${ArrayAccessor}`, ArrayFieldPathInternal<Item, Depth>>
		: NonNullable<Value> extends Leaf
			? never
			: NonNullable<Value> extends object
				? Join<Key, ArrayFieldPathInternal<Value, Depth>>
				: never
type UndefinedFromParent<Value> = undefined extends Value ? undefined : never
type PropertySegmentValue<
	Value,
	Segment extends string,
> = Segment extends keyof NonNullable<Value>
	? NonNullable<Value>[Segment] | UndefinedFromParent<Value>
	: never
type ArraySegmentValue<Value, Rest extends string> =
	NonNullable<Value> extends readonly (infer Item)[]
		? Rest extends ""
			? Item | UndefinedFromParent<Value>
			: SegmentValue<Item | UndefinedFromParent<Value>, Rest>
		: never
type SegmentValue<
	Value,
	Segment extends string,
> = Segment extends `${infer Key}[${infer Index}]${infer Rest}`
	? Index extends ArrayIndex
		? ArraySegmentValue<
				Key extends "" ? Value : PropertySegmentValue<Value, Key>,
				Rest
			>
		: never
	: PropertySegmentValue<Value, Segment>

export type FieldPath<Value> = FieldPathInternal<Value, DefaultDepth>
export type ArrayFieldPath<Value> = ArrayFieldPathInternal<Value, DefaultDepth>
export type PathValue<
	Value,
	Path extends string,
> = Path extends `${infer Segment}.${infer Rest}`
	? PathValue<SegmentValue<Value, Segment>, Rest>
	: SegmentValue<Value, Path>

export type ControlFormData<Value, Options, Context> =
	| {
			readonly mode: "hidden"
			serialize(
				value: Value,
				details: {
					readonly path: string
					readonly name: string
					readonly options: Readonly<Options>
					readonly context: Readonly<Context>
				},
			): readonly { readonly name: string; readonly value: string }[]
	  }
	| { readonly mode: "native" }
	| { readonly mode: "none" }

export type FormIssue = {
	readonly path?: string
	readonly code?: string
	readonly message: string
	readonly source: "manual" | "schema" | "server"
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
	readonly options: Options
	readonly context: Context
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly required: boolean
}

export type ControlDefinition<
	Value,
	Options = Record<string, never>,
	Context = unknown,
> = {
	readonly component: ComponentType<ControlProps<Value, Options, Context>>
	readonly formData: ControlFormData<Value, Options, Context>
}
export type AnyControlDefinition = {
	readonly component: unknown
	readonly formData: unknown
}
export type ControlDefinitionRegistry = Readonly<
	Record<string, AnyControlDefinition>
>
export type DefaultGridValue = 1 | 2 | 3 | 4
export type UiResolverValues<Input> = {
	readonly [Path in FieldPath<Input>]: PathValue<Input, Path>
}
export type Resolvable<Value, Input, Context> =
	| (Value extends (...args: never[]) => unknown ? never : Value)
	| ((
			values: UiResolverValues<Input>,
			details: { readonly context: Readonly<Context> },
	  ) => Value)
export type ReactUiContent = ReactElement | string
export type RenderNodeProps = {
	readonly disabled: boolean
	readonly readOnly: boolean
}
export type RenderNodeComponent = ComponentType<RenderNodeProps>

type FieldNodeForPath<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context,
	Path extends FieldPath<Input>,
	Grid extends number,
> = {
	readonly kind: "field"
	readonly id?: string
	readonly path: Path
	readonly control: Extract<keyof Controls, string>
	readonly label?: Resolvable<ReactUiContent, Input, Context>
	readonly description?: Resolvable<ReactUiContent, Input, Context>
	readonly slotOptions?: Resolvable<unknown, Input, Context>
	readonly required?: Resolvable<boolean, Input, Context>
	readonly disabled?: Resolvable<boolean, Input, Context>
	readonly readOnly?: Resolvable<boolean, Input, Context>
	readonly visible?: Resolvable<boolean, Input, Context>
	readonly className?: Resolvable<string, Input, Context>
	readonly span?: Resolvable<Grid | "full", Input, Context>
	readonly valuePolicy?: "preserve"
	readonly options?: Resolvable<unknown, Input, Context>
}
export type FieldNode<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context,
	Grid extends number,
> = {
	[Path in FieldPath<Input>]: FieldNodeForPath<
		Input,
		Controls,
		Context,
		Path,
		Grid
	>
}[FieldPath<Input>]
export type SectionNode<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context,
	Grid extends number,
> = {
	readonly kind: "section"
	readonly id: string
	readonly title?: Resolvable<ReactUiContent, Input, Context>
	readonly description?: Resolvable<ReactUiContent, Input, Context>
	readonly slotOptions?: Resolvable<unknown, Input, Context>
	readonly visible?: Resolvable<boolean, Input, Context>
	readonly disabled?: Resolvable<boolean, Input, Context>
	readonly readOnly?: Resolvable<boolean, Input, Context>
	readonly className?: Resolvable<string, Input, Context>
	readonly columns?: Resolvable<Grid, Input, Context>
	readonly span?: Resolvable<Grid | "full", Input, Context>
	readonly children: readonly UiNode<Input, Controls, Context, Grid>[]
}
type ArrayItem<Input, Path extends ArrayFieldPath<Input>> =
	NonNullable<PathValue<Input, Path>> extends readonly (infer Item)[]
		? Item
		: never
export type ArrayNode<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context,
	Grid extends number,
> = {
	[Path in ArrayFieldPath<Input>]: {
		readonly kind: "array"
		readonly id?: string
		readonly path: Path
		readonly label?: Resolvable<ReactUiContent, Input, Context>
		readonly description?: Resolvable<ReactUiContent, Input, Context>
		readonly slotOptions?: Resolvable<unknown, Input, Context>
		readonly visible?: Resolvable<boolean, Input, Context>
		readonly disabled?: Resolvable<boolean, Input, Context>
		readonly readOnly?: Resolvable<boolean, Input, Context>
		readonly className?: Resolvable<string, Input, Context>
		readonly span?: Resolvable<Grid | "full", Input, Context>
		readonly itemDefault:
			| ArrayItem<Input, Path>
			| (() => ArrayItem<Input, Path>)
		readonly children: readonly UiNode<
			ArrayItem<Input, Path>,
			Controls,
			Context,
			Grid
		>[]
	}
}[ArrayFieldPath<Input>]
export type RenderNode<Input, Context> = {
	readonly kind: "render"
	readonly id: string
	readonly component: RenderNodeComponent
	readonly visible?: Resolvable<boolean, Input, Context>
	readonly disabled?: Resolvable<boolean, Input, Context>
	readonly readOnly?: Resolvable<boolean, Input, Context>
}
export type UiNode<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context,
	Grid extends number,
> =
	| ArrayNode<Input, Controls, Context, Grid>
	| FieldNode<Input, Controls, Context, Grid>
	| RenderNode<Input, Context>
	| SectionNode<Input, Controls, Context, Grid>

export type NormalizedNode = Readonly<Record<string, unknown>> & {
	readonly id: string
	readonly kind: "array" | "field" | "render" | "section"
	readonly parentId?: string
	readonly scopePath: string
}
export type NormalizedDefinition<
	Schema extends StandardSchema = StandardSchema,
> = {
	readonly schema: Schema
	readonly grid: readonly number[]
	readonly ui: readonly NormalizedNode[]
	readonly nodes: readonly NormalizedNode[]
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
