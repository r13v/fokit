import { parsePath } from "./path.js"
import type { FieldPath, PathValue } from "./path-types.js"

declare const computedTypes: unique symbol

type NoInferComputed<Value> = [Value][Value extends unknown ? 0 : never]

export type ComputedDetails<Context = unknown> = {
	readonly context: Readonly<Context>
}

export type ComputedDependencyValues<
	Input,
	Dependencies extends readonly string[],
> = {
	readonly [Dependency in Dependencies[number]]: Dependency extends FieldPath<Input>
		? PathValue<Input, Dependency>
		: unknown
}

export type Computed<
	Result,
	Input = unknown,
	Context = unknown,
	Dependencies extends readonly string[] = readonly string[],
> = {
	readonly __fokitComputed: true
	// Phantom metadata carries the form types without adding runtime state.
	readonly [computedTypes]?: {
		readonly context: Context
		readonly input: Input
	}
	readonly dependencies: Dependencies
	// Construction checks the resolver strictly. Stored resolvers are bivariant so
	// a concrete dependency tuple remains assignable to Resolvable's erased tuple.
	readonly resolver: {
		bivarianceHack(
			values: ComputedDependencyValues<Input, Dependencies>,
			details: ComputedDetails<Context>,
		): Result
	}["bivarianceHack"]
}

export type FormComputed<Input, Context = unknown> = <
	const Dependencies extends readonly FieldPath<Input>[],
	Result,
>(
	dependencies: Dependencies,
	resolver: (
		values: ComputedDependencyValues<Input, Dependencies>,
		details: ComputedDetails<Context>,
	) => Result,
) => Computed<Result, Input, Context, Dependencies>

export function computed<
	const Dependencies extends readonly string[],
	Result,
	Context = unknown,
	Input = unknown,
>(
	dependencies: Dependencies & readonly FieldPath<NoInferComputed<Input>>[],
	resolver: (
		values: ComputedDependencyValues<NoInferComputed<Input>, Dependencies>,
		details: ComputedDetails<NoInferComputed<Context>>,
	) => Result,
): Computed<Result, Input, Context, Dependencies> {
	if (isAsyncFunction(resolver)) {
		throw new TypeError("Computed resolvers must be synchronous")
	}

	for (const dependency of dependencies) {
		parsePath(dependency)
	}

	const normalizedDependencies = Object.freeze([...dependencies]) as unknown as
		| Dependencies
		| readonly string[]

	return Object.freeze({
		__fokitComputed: true,
		dependencies: normalizedDependencies as Dependencies,
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
