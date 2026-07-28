type Primitive = bigint | boolean | null | number | string | symbol | undefined
type FileListLike = {
	readonly length: number
	item(index: number): unknown
}
type NativeLeaf = Blob | Date | File | FileListLike | RegExp
type CallableLeaf = (...args: never[]) => unknown
type Leaf = CallableLeaf | NativeLeaf | Primitive
type NonZeroDigit = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
type IntegerString = `${bigint}`
export type CanonicalArrayIndex = IntegerString &
	("0" | `${NonZeroDigit}${string}`)
type ArrayIndex = CanonicalArrayIndex
type DefaultDepth = readonly [1, 1, 1, 1, 1, 1, 1, 1]

type StringKeyOf<Value> = Extract<keyof Value, string>

type Decrement<Depth extends readonly unknown[]> = Depth extends readonly [
	unknown,
	...infer Rest,
]
	? Rest
	: readonly []

type Join<Prefix extends string, Suffix> = Suffix extends string
	? `${Prefix}.${Suffix}`
	: never

type ValidPathKey<
	Key extends string,
	IsTopLevel extends boolean,
> = Key extends ""
	? never
	: Key extends `${string}.${string}`
		? never
		: Key extends `${number}`
			? never
			: Key extends "__proto__" | "constructor" | "prototype"
				? never
				: IsTopLevel extends true
					? Key extends "__fokit"
						? never
						: Key
					: Key

type ValidObjectKey<Value, IsTopLevel extends boolean> =
	StringKeyOf<Value> extends infer Key
		? Key extends string
			? ValidPathKey<Key, IsTopLevel>
			: never
		: never

type FieldPathInternal<
	Value,
	IsTopLevel extends boolean,
	Depth extends readonly unknown[],
> = Depth extends readonly []
	? never
	: NonNullable<Value> extends Leaf
		? never
		: NonNullable<Value> extends readonly (infer Item)[]
			? ArrayItemFieldPath<Item, Decrement<Depth>>
			: NonNullable<Value> extends object
				? ObjectFieldPath<NonNullable<Value>, IsTopLevel, Depth>
				: never

type ObjectFieldPath<
	Value,
	IsTopLevel extends boolean,
	Depth extends readonly unknown[],
> = {
	[Key in ValidObjectKey<Value, IsTopLevel>]:
		| Key
		| ChildFieldPath<Key, Value[Key], Decrement<Depth>>
}[ValidObjectKey<Value, IsTopLevel>]

type ChildFieldPath<
	Key extends string,
	Value,
	Depth extends readonly unknown[],
> =
	NonNullable<Value> extends Leaf
		? never
		: NonNullable<Value> extends readonly (infer Item)[]
			?
					| `${Key}.${ArrayIndex}`
					| Join<`${Key}.${ArrayIndex}`, FieldPathInternal<Item, false, Depth>>
			: NonNullable<Value> extends object
				? Join<Key, FieldPathInternal<Value, false, Depth>>
				: never

type ArrayItemFieldPath<Item, Depth extends readonly unknown[]> =
	NonNullable<Item> extends Leaf
		? ArrayIndex
		: NonNullable<Item> extends readonly (infer NestedItem)[]
			? ArrayIndex | Join<ArrayIndex, ArrayItemFieldPath<NestedItem, Depth>>
			: Join<ArrayIndex, FieldPathInternal<Item, false, Depth>>

type ArrayFieldPathInternal<
	Value,
	IsTopLevel extends boolean,
	Depth extends readonly unknown[],
> = Depth extends readonly []
	? never
	: NonNullable<Value> extends Leaf
		? never
		: NonNullable<Value> extends readonly (infer Item)[]
			? Join<ArrayIndex, ArrayFieldPathInternal<Item, false, Decrement<Depth>>>
			: NonNullable<Value> extends object
				? ObjectArrayFieldPath<NonNullable<Value>, IsTopLevel, Depth>
				: never

type ObjectArrayFieldPath<
	Value,
	IsTopLevel extends boolean,
	Depth extends readonly unknown[],
> = {
	[Key in ValidObjectKey<Value, IsTopLevel>]: ArrayChildPath<
		Key,
		Value[Key],
		Decrement<Depth>
	>
}[ValidObjectKey<Value, IsTopLevel>]

type ArrayChildPath<
	Key extends string,
	Value,
	Depth extends readonly unknown[],
> =
	NonNullable<Value> extends readonly (infer Item)[]
		?
				| Key
				| Join<
						`${Key}.${ArrayIndex}`,
						ArrayFieldPathInternal<Item, false, Depth>
				  >
		: NonNullable<Value> extends Leaf
			? never
			: NonNullable<Value> extends object
				? Join<Key, ArrayFieldPathInternal<Value, false, Depth>>
				: never

type UndefinedFromParent<Value> = undefined extends Value ? undefined : never

type SegmentValue<Value, Segment extends string> = Segment extends ArrayIndex
	? NonNullable<Value> extends readonly (infer Item)[]
		? Item | UndefinedFromParent<Value>
		: never
	: Segment extends keyof NonNullable<Value>
		? NonNullable<Value>[Segment] | UndefinedFromParent<Value>
		: never

export type FieldPath<Value> = FieldPathInternal<Value, true, DefaultDepth>

export type ArrayFieldPath<Value> = ArrayFieldPathInternal<
	Value,
	true,
	DefaultDepth
>

export type PathValue<
	Value,
	Path extends string,
> = Path extends `${infer Segment}.${infer Rest}`
	? PathValue<SegmentValue<Value, Segment>, Rest>
	: SegmentValue<Value, Path>
