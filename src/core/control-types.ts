export type FormDataEntrySpec =
	| {
			readonly kind?: "value"
			readonly name: string
			readonly value: string
	  }
	| {
			readonly kind: "array"
			readonly name: string
	  }

export type ControlFormDataDetails<
	Options = Record<string, never>,
	Context = unknown,
> = {
	readonly path: string
	readonly name: string
	readonly options: Readonly<Options>
	readonly context: Readonly<Context>
}

export type ControlFormData<
	Value,
	Options = Record<string, never>,
	Context = unknown,
> =
	| {
			readonly mode: "native"
			readonly serialize?: (
				value: Value,
				details: ControlFormDataDetails<Options, Context>,
			) => readonly FormDataEntrySpec[]
	  }
	| {
			readonly mode: "hidden"
			readonly serialize: (
				value: Value,
				details: ControlFormDataDetails<Options, Context>,
			) => readonly FormDataEntrySpec[]
	  }
	| {
			readonly mode: "none"
	  }

export type ControlMetadata<Value = never, Options = never, Context = never> = {
	readonly formData: ControlFormData<Value, Options, Context>
}

export type AnyControlMetadata = ControlMetadata<never, never, never>

export type ControlRegistry = Readonly<Record<string, AnyControlMetadata>>

export type ControlName<Controls extends ControlRegistry> = Extract<
	keyof Controls,
	string
>

export type ControlContextOf<Control> =
	Control extends ControlMetadata<infer _Value, infer _Options, infer Context>
		? Context
		: never

export type ControlValueOf<Control> =
	Control extends ControlMetadata<infer Value, infer Options, infer Context>
		? ControlMetadata<Value, Options, Context> extends Control
			? Value
			: Control extends {
						readonly formData: ControlFormData<Value, Options, Context>
					}
				? Value
				: never
		: never

export type ControlOptionsOf<Control> =
	Control extends ControlMetadata<infer Value, infer Options, infer Context>
		? ControlMetadata<Value, Options, Context> extends Control
			? Options
			: Control extends {
						readonly formData: ControlFormData<Value, Options, Context>
					}
				? Options
				: never
		: never

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

export type IsValidControlValue<Value> =
	IsNever<Value> extends true
		? false
		: IsAny<Value> extends true
			? false
			: IsUnknown<Value> extends true
				? false
				: true
