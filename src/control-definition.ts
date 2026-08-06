"use client"

import type { ComponentType } from "react"

import type { ControlDefinition, ControlProps } from "./types.js"

/** Detects the TypeScript `any` type. */
type IsAny<Value> = 0 extends 1 & Value ? true : false
/** Detects the TypeScript `never` type. */
type IsNever<Value> = [Value] extends [never] ? true : false
/** Detects the TypeScript `unknown` type. */
type IsUnknown<Value> = unknown extends Value
	? [Value] extends [unknown]
		? true
		: false
	: false
/** Rejects value types that cannot provide safe field inference. */
type IsValidValue<Value> =
	IsNever<Value> extends true
		? false
		: IsAny<Value> extends true
			? false
			: IsUnknown<Value> extends true
				? false
				: true

/** Input accepted by `defineControl` when `Value` is a concrete type. */
export type DefineControlInput<Value, Options, Context> =
	IsValidValue<Value> extends true
		? {
				/** The React component that implements the control contract. */
				readonly component: ComponentType<ControlProps<Value, Options, Context>>
			}
		: never

/**
 * Creates an immutable control definition for a form kit.
 *
 * @example
 * ```tsx
 * const rating = defineControl<number>({ component: RatingControl })
 * ```
 *
 * @see https://r13v.github.io/form-please/form-kits
 */
export function defineControl<
	Value,
	Options = Record<string, never>,
	Context = unknown,
>(
	input: DefineControlInput<Value, Options, Context>,
): ControlDefinition<Value, Options, Context> {
	return Object.freeze({
		component: input.component,
	}) as ControlDefinition<Value, Options, Context>
}
