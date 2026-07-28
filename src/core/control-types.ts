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

export type ControlValueOf<Control> =
	Control extends ControlMetadata<infer Value, infer Options, infer Context>
		? ControlMetadata<Value, Options, Context> extends Control
			? Value
			: never
		: never

export type ControlOptionsOf<Control> =
	Control extends ControlMetadata<infer Value, infer Options, infer Context>
		? ControlMetadata<Value, Options, Context> extends Control
			? Options
			: never
		: never

export type ControlContextOf<Control> =
	Control extends ControlMetadata<infer Value, infer Options, infer Context>
		? ControlMetadata<Value, Options, Context> extends Control
			? Context
			: never
		: never
