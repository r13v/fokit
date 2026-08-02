import type { ComponentType } from "react"

import type {
	ControlFormData,
	ControlMetadata,
	FormIssue,
	IsValidControlValue,
} from "../core/index.js"

export type ControlProps<
	Value,
	Options = Record<string, never>,
	Context = unknown,
> = {
	readonly path: string
	readonly value: Value
	setValue(value: Value): void
	blur(): void
	readonly input: {
		readonly id: string
		readonly name: string
		ref(element: HTMLElement | null): void
		readonly "aria-describedby"?: string
	}
	readonly meta: {
		readonly dirty: boolean
		readonly touched: boolean
		readonly validating: boolean
		readonly errors: readonly FormIssue[]
		readonly displayErrors: readonly FormIssue[]
		readonly invalid: boolean
	}
	readonly options: Options
	readonly context: Readonly<Context>
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly required: boolean
}

export type ControlDefinition<
	Value,
	Options = Record<string, never>,
	Context = unknown,
> = ControlMetadata<Value, Options, Context> & {
	readonly component: ComponentType<ControlProps<Value, Options, Context>>
}

export type AnyControlDefinition = ControlMetadata<never, never, never> & {
	readonly component: unknown
}

export type ControlDefinitionRegistry = Readonly<
	Record<string, AnyControlDefinition>
>

export type DefineControlInput<Value, Options, Context> =
	IsValidControlValue<Value> extends true
		? {
				readonly component: ComponentType<ControlProps<Value, Options, Context>>
				readonly formData: ControlFormData<Value, Options, Context>
			}
		: never

export function defineControl<
	Value,
	Options = Record<string, never>,
	Context = unknown,
>(
	input: DefineControlInput<Value, Options, Context>,
): ControlDefinition<Value, Options, Context> {
	return Object.freeze({
		component: input.component,
		formData: input.formData,
	}) as ControlDefinition<Value, Options, Context>
}
