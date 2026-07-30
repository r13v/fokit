import type { FieldPath, PathValue } from "./path-types.js"

declare const computedTypes: unique symbol

type NoInferComputed<Value> = [Value][Value extends unknown ? 0 : never]

export type ComputedDetails<Context = unknown> = {
	readonly context: Readonly<Context>
}

export type ComputedValues<Input> = [unknown] extends [Input]
	? Readonly<Record<string, unknown>>
	: {
			readonly [Path in FieldPath<Input>]: PathValue<Input, Path>
		}

export type Computed<Result, Input = unknown, Context = unknown> = {
	readonly __fokitComputed: true
	// Phantom metadata carries the form types without adding runtime state.
	readonly [computedTypes]?: {
		readonly context: Context
		readonly input: Input
	}
	// Construction checks the resolver strictly. The stored resolver is bivariant
	// so schema-bound computed values remain assignable to Resolvable's erased type.
	readonly resolver: {
		bivarianceHack(
			values: ComputedValues<Input>,
			details: ComputedDetails<Context>,
		): Result
	}["bivarianceHack"]
}

export type FormComputed<Input, Context = unknown> = <Result>(
	resolver: (
		values: ComputedValues<Input>,
		details: ComputedDetails<Context>,
	) => Result,
) => Computed<Result, Input, Context>

export function computed<Result, Input = unknown, Context = unknown>(
	resolver: (
		values: ComputedValues<NoInferComputed<Input>>,
		details: ComputedDetails<NoInferComputed<Context>>,
	) => Result,
): Computed<Result, Input, Context> {
	if (isAsyncFunction(resolver)) {
		throw new TypeError("Computed resolvers must be synchronous")
	}

	return Object.freeze({
		__fokitComputed: true,
		resolver,
	})
}

export function isComputed(value: unknown): value is Computed<unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		(value as { readonly __fokitComputed?: unknown }).__fokitComputed === true
	)
}

function isAsyncFunction(value: unknown): boolean {
	return (
		typeof value === "function" && value.constructor.name === "AsyncFunction"
	)
}
