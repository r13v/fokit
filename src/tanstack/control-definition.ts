"use client"

import type { ComponentType } from "react"

import type {
	ControlDefinition,
	ControlFormData,
	ControlProps,
} from "./types.js"

type IsAny<Value> = 0 extends 1 & Value ? true : false
type IsNever<Value> = [Value] extends [never] ? true : false
type IsUnknown<Value> = unknown extends Value
	? [Value] extends [unknown]
		? true
		: false
	: false
type IsValidValue<Value> =
	IsNever<Value> extends true
		? false
		: IsAny<Value> extends true
			? false
			: IsUnknown<Value> extends true
				? false
				: true

export type TanStackDefineControlInput<Value, Options, Context> =
	IsValidValue<Value> extends true
		? {
				readonly component: ComponentType<ControlProps<Value, Options, Context>>
				readonly formData?: ControlFormData<Value, Options, Context>
			}
		: never

export function defineControl<
	Value,
	Options = Record<string, never>,
	Context = unknown,
>(
	input: TanStackDefineControlInput<Value, Options, Context>,
): ControlDefinition<Value, Options, Context> {
	return Object.freeze({
		component: input.component,
		formData: input.formData ?? { mode: "none" },
	}) as ControlDefinition<Value, Options, Context>
}
