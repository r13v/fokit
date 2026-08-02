import type {
	ControlContextOf,
	ControlName,
	ControlOptionsOf,
	ControlRegistry,
	ControlValueOf,
	IsValidControlValue,
} from "./control-types.js"
import type { ArrayFieldPath, FieldPath, PathValue } from "./path-types.js"
import type { OptionalFieldPath } from "./transaction.js"

export type DefaultGridValue = 1 | 2 | 3 | 4
export type GridColumns = number
export type GridSpan = number | "full"
export type ValuePolicy = "preserve" | "unset"

export type UiPresentation<
	Content = unknown,
	FieldSlotOptions = unknown,
	SectionSlotOptions = unknown,
	ArraySlotOptions = unknown,
> = {
	readonly content: Content
	readonly fieldSlotOptions: FieldSlotOptions
	readonly sectionSlotOptions: SectionSlotOptions
	readonly arraySlotOptions: ArraySlotOptions
}

export type CoreUiPresentation = UiPresentation<string, never, never, never>
export type AnyUiPresentation = UiPresentation

export type UiResolverDetails<Context = unknown> = {
	readonly context: Readonly<Context>
}

export type UiResolverValues<Input> = [unknown] extends [Input]
	? Readonly<Record<string, unknown>>
	: {
			readonly [Path in FieldPath<Input>]: PathValue<Input, Path>
		}

export type UiResolver<Result, Input = unknown, Context = unknown> = (
	values: UiResolverValues<Input>,
	details: UiResolverDetails<Context>,
) => Result

type StaticResolvableValue<Value> = Value extends (...args: never[]) => unknown
	? never
	: Value

export type Resolvable<Value, Input = unknown, Context = unknown> =
	| StaticResolvableValue<Value>
	| UiResolver<Value, Input, Context>

type FieldNodeBase<
	Input,
	Context,
	Presentation extends UiPresentation,
	Grid extends number,
> = {
	readonly kind: "field"
	readonly id?: string
	readonly label?: Resolvable<Presentation["content"], Input, Context>
	readonly description?: Resolvable<Presentation["content"], Input, Context>
	readonly slotOptions?: Resolvable<
		Presentation["fieldSlotOptions"],
		Input,
		Context
	>
	readonly required?: Resolvable<boolean, Input, Context>
	readonly disabled?: Resolvable<boolean, Input, Context>
	readonly readOnly?: Resolvable<boolean, Input, Context>
	readonly visible?: Resolvable<boolean, Input, Context>
	readonly className?: Resolvable<string, Input, Context>
	readonly span?: Resolvable<Grid | "full", Input, Context>
}

type FieldValuePolicy<Input, Path extends FieldPath<Input>> =
	Path extends OptionalFieldPath<Input> ? ValuePolicy : "preserve"

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

type IsUntyped<Value> =
	IsNever<Value> extends true
		? true
		: IsUnknown<Value> extends true
			? true
			: false

type ContextMatches<Context, Requirement> =
	IsUntyped<Requirement> extends true
		? true
		: [Context] extends [Requirement]
			? true
			: false

type CompatibleControlName<
	Input,
	Controls extends ControlRegistry,
	Context,
	Path extends FieldPath<Input>,
> = {
	[Name in ControlName<Controls>]: IsAny<
		ControlValueOf<Controls[Name]>
	> extends true
		? never
		: IsUntyped<ControlValueOf<Controls[Name]>> extends true
			? ContextMatches<Context, ControlContextOf<Controls[Name]>> extends true
				? Name
				: never
			: IsValidControlValue<ControlValueOf<Controls[Name]>> extends true
				? [PathValue<Input, Path>] extends [ControlValueOf<Controls[Name]>]
					? ContextMatches<
							Context,
							ControlContextOf<Controls[Name]>
						> extends true
						? Name
						: never
					: never
				: never
}[ControlName<Controls>]

type FieldNodeForPath<
	Input,
	Controls extends ControlRegistry,
	Context,
	Path extends FieldPath<Input>,
	Presentation extends UiPresentation,
	Grid extends number,
> = FieldNodeBase<Input, Context, Presentation, Grid> & {
	readonly path: Path
	readonly valuePolicy?: FieldValuePolicy<Input, Path>
} & {
		[Name in CompatibleControlName<Input, Controls, Context, Path>]: {
			readonly control: Name
			readonly options?: Resolvable<
				ControlOptionsOf<Controls[Name]>,
				Input,
				Context
			>
		}
	}[CompatibleControlName<Input, Controls, Context, Path>]

export type FieldNode<
	Input,
	Controls extends ControlRegistry = ControlRegistry,
	Context = unknown,
	Presentation extends UiPresentation = CoreUiPresentation,
	Grid extends number = DefaultGridValue,
> = {
	[Path in FieldPath<Input>]: FieldNodeForPath<
		Input,
		Controls,
		Context,
		Path,
		Presentation,
		Grid
	>
}[FieldPath<Input>]

export type RenderNode<
	Component = unknown,
	Input = unknown,
	Context = unknown,
> = {
	readonly kind: "render"
	readonly id: string
	readonly component: Component
	readonly visible?: Resolvable<boolean, Input, Context>
	readonly disabled?: Resolvable<boolean, Input, Context>
	readonly readOnly?: Resolvable<boolean, Input, Context>
}

export type SectionNode<
	Input,
	Controls extends ControlRegistry = ControlRegistry,
	Context = unknown,
	RenderComponent = never,
	Presentation extends UiPresentation = CoreUiPresentation,
	Grid extends number = DefaultGridValue,
> = {
	readonly kind: "section"
	readonly id: string
	readonly title?: Resolvable<Presentation["content"], Input, Context>
	readonly description?: Resolvable<Presentation["content"], Input, Context>
	readonly slotOptions?: Resolvable<
		Presentation["sectionSlotOptions"],
		Input,
		Context
	>
	readonly visible?: Resolvable<boolean, Input, Context>
	readonly disabled?: Resolvable<boolean, Input, Context>
	readonly readOnly?: Resolvable<boolean, Input, Context>
	readonly className?: Resolvable<string, Input, Context>
	readonly columns?: Resolvable<Grid, Input, Context>
	readonly span?: Resolvable<Grid | "full", Input, Context>
	readonly children: readonly UiNode<
		Input,
		Controls,
		Context,
		RenderComponent,
		Presentation,
		Grid
	>[]
}

export type ArrayItemValueAtPath<Input, Path extends string> =
	NonNullable<PathValue<Input, Path>> extends readonly (infer Item)[]
		? Item
		: never

export type ArrayItemValue<
	Input,
	Path extends ArrayFieldPath<Input>,
> = ArrayItemValueAtPath<Input, Path>

type ArrayNodeForPath<
	Input,
	Controls extends ControlRegistry,
	Context,
	Path extends ArrayFieldPath<Input>,
	Presentation extends UiPresentation,
	Grid extends number,
> = {
	readonly kind: "array"
	readonly id?: string
	readonly path: Path
	readonly label?: Resolvable<Presentation["content"], Input, Context>
	readonly description?: Resolvable<Presentation["content"], Input, Context>
	readonly slotOptions?: Resolvable<
		Presentation["arraySlotOptions"],
		Input,
		Context
	>
	readonly visible?: Resolvable<boolean, Input, Context>
	readonly disabled?: Resolvable<boolean, Input, Context>
	readonly readOnly?: Resolvable<boolean, Input, Context>
	readonly className?: Resolvable<string, Input, Context>
	readonly span?: Resolvable<Grid | "full", Input, Context>
	readonly itemDefault:
		| ArrayItemValueAtPath<Input, Path>
		| (() => ArrayItemValueAtPath<Input, Path>)
	readonly children: readonly RelativeUiNode<
		ArrayItemValueAtPath<Input, Path>,
		Controls,
		Context,
		Presentation,
		Grid
	>[]
}

export type ArrayNode<
	Input,
	Controls extends ControlRegistry = ControlRegistry,
	Context = unknown,
	Presentation extends UiPresentation = CoreUiPresentation,
	Grid extends number = DefaultGridValue,
> = {
	[Path in ArrayFieldPath<Input>]: ArrayNodeForPath<
		Input,
		Controls,
		Context,
		Path,
		Presentation,
		Grid
	>
}[ArrayFieldPath<Input>]

export type UiNode<
	Input,
	Controls extends ControlRegistry = ControlRegistry,
	Context = unknown,
	RenderComponent = never,
	Presentation extends UiPresentation = CoreUiPresentation,
	Grid extends number = DefaultGridValue,
> =
	| FieldNode<Input, Controls, Context, Presentation, Grid>
	| ([RenderComponent] extends [never]
			? never
			: RenderNode<RenderComponent, Input, Context>)
	| SectionNode<Input, Controls, Context, RenderComponent, Presentation, Grid>
	| ArrayNode<Input, Controls, Context, Presentation, Grid>

export type RelativeUiNode<
	Input,
	Controls extends ControlRegistry = ControlRegistry,
	Context = unknown,
	Presentation extends UiPresentation = CoreUiPresentation,
	Grid extends number = DefaultGridValue,
> =
	| ArrayNode<Input, Controls, Context, Presentation, Grid>
	| FieldNode<Input, Controls, Context, Presentation, Grid>
	| SectionNode<Input, Controls, Context, never, Presentation, Grid>
