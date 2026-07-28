import type { Computed } from "./computed.js"
import type {
	ControlName,
	ControlOptionsOf,
	ControlRegistry,
} from "./control-types.js"
import type { ArrayFieldPath, FieldPath, PathValue } from "./path-types.js"

export type GridColumns = 1 | 2 | 3 | 4
export type GridSpan = 1 | 2 | 3 | 4 | "full"
export type ValuePolicy = "preserve" | "unset"

export type Resolvable<Value, Input = unknown, Context = unknown> =
	| Value
	| Computed<Value, Input, Context>

type FieldNodeBase<Input, Context> = {
	readonly kind: "field"
	readonly id?: string
	readonly path: FieldPath<Input>
	readonly label?: Resolvable<string, Input, Context>
	readonly description?: Resolvable<string, Input, Context>
	readonly required?: Resolvable<boolean, Input, Context>
	readonly disabled?: Resolvable<boolean, Input, Context>
	readonly readOnly?: Resolvable<boolean, Input, Context>
	readonly visible?: Resolvable<boolean, Input, Context>
	readonly valuePolicy?: ValuePolicy
	readonly className?: string
	readonly span?: GridSpan
}

export type FieldNode<
	Input,
	Controls extends ControlRegistry = ControlRegistry,
	Context = unknown,
> = {
	[Name in ControlName<Controls>]: FieldNodeBase<Input, Context> & {
		readonly control: Name
		readonly options?: Resolvable<
			ControlOptionsOf<Controls[Name]>,
			Input,
			Context
		>
	}
}[ControlName<Controls>]

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
