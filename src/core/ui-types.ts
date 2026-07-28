import type { Computed } from "./computed.js"
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

export type GridColumns = 1 | 2 | 3 | 4
export type GridSpan = 1 | 2 | 3 | 4 | "full"
export type ValuePolicy = "preserve" | "unset"

export type Resolvable<Value, Input = unknown, Context = unknown> =
	| Value
	| Computed<Value, Input, Context>

type FieldNodeBase<Input, Context> = {
	readonly kind: "field"
	readonly id?: string
	readonly label?: Resolvable<string, Input, Context>
	readonly description?: Resolvable<string, Input, Context>
	readonly required?: Resolvable<boolean, Input, Context>
	readonly disabled?: Resolvable<boolean, Input, Context>
	readonly readOnly?: Resolvable<boolean, Input, Context>
	readonly visible?: Resolvable<boolean, Input, Context>
	readonly className?: string
	readonly span?: GridSpan
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
> = FieldNodeBase<Input, Context> & {
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
> = {
	[Path in FieldPath<Input>]: FieldNodeForPath<Input, Controls, Context, Path>
}[FieldPath<Input>]

export type SectionNode<
	Input,
	Controls extends ControlRegistry = ControlRegistry,
	Context = unknown,
> = {
	readonly kind: "section"
	readonly id: string
	readonly title?: Resolvable<string, Input, Context>
	readonly description?: Resolvable<string, Input, Context>
	readonly visible?: Resolvable<boolean, Input, Context>
	readonly disabled?: Resolvable<boolean, Input, Context>
	readonly readOnly?: Resolvable<boolean, Input, Context>
	readonly className?: string
	readonly columns?: GridColumns
	readonly span?: GridSpan
	readonly children: readonly UiNode<Input, Controls, Context>[]
}

export type ArrayItemValue<Input, Path extends ArrayFieldPath<Input>> =
	NonNullable<PathValue<Input, Path>> extends readonly (infer Item)[]
		? Item
		: never

type ArrayNodeForPath<
	Input,
	Controls extends ControlRegistry,
	Context,
	Path extends ArrayFieldPath<Input>,
> = {
	readonly kind: "array"
	readonly id?: string
	readonly path: Path
	readonly label?: Resolvable<string, Input, Context>
	readonly description?: Resolvable<string, Input, Context>
	readonly visible?: Resolvable<boolean, Input, Context>
	readonly disabled?: Resolvable<boolean, Input, Context>
	readonly readOnly?: Resolvable<boolean, Input, Context>
	readonly className?: string
	readonly span?: GridSpan
	readonly itemDefault:
		| ArrayItemValue<Input, Path>
		| (() => ArrayItemValue<Input, Path>)
	readonly children: readonly RelativeUiNode<
		ArrayItemValue<Input, Path>,
		Controls,
		Context
	>[]
}

export type ArrayNode<
	Input,
	Controls extends ControlRegistry = ControlRegistry,
	Context = unknown,
> = {
	[Path in ArrayFieldPath<Input>]: ArrayNodeForPath<
		Input,
		Controls,
		Context,
		Path
	>
}[ArrayFieldPath<Input>]

export type UiNode<
	Input,
	Controls extends ControlRegistry = ControlRegistry,
	Context = unknown,
> =
	| FieldNode<Input, Controls, Context>
	| SectionNode<Input, Controls, Context>
	| ArrayNode<Input, Controls, Context>

export type RelativeUiNode<
	Input,
	Controls extends ControlRegistry = ControlRegistry,
	Context = unknown,
> = UiNode<Input, Controls, Context>
