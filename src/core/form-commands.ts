import type { ImperativeFormIssue } from "./issues.js"
import type { PathInput } from "./path.js"
import type { ArrayFieldPath, FieldPath, PathValue } from "./path-types.js"
import type { FormDeepPartial, OptionalFieldPath } from "./transaction.js"
import type { ArrayItemValueAtPath } from "./ui-types.js"
import type { ValidationOptions } from "./validation.js"

export type SetValueCommand<Input> = {
	readonly type: "value/set"
	readonly path: FieldPath<Input>
	readonly value: PathValue<Input, FieldPath<Input>>
}

export type SetValuesCommand<Input> = {
	readonly type: "values/set"
	readonly values: FormDeepPartial<Input>
}

export type UnsetValueCommand<Input> = {
	readonly type: "value/unset"
	readonly path: OptionalFieldPath<Input>
}

export type ValueCommand<Input> =
	| SetValueCommand<Input>
	| SetValuesCommand<Input>
	| UnsetValueCommand<Input>

type ArrayValueCommand<Input> = {
	readonly path: ArrayFieldPath<Input>
	readonly value?: ArrayItemValueAtPath<Input, ArrayFieldPath<Input>>
}

export type ArrayCommand<Input> =
	| (ArrayValueCommand<Input> & { readonly type: "array/append" })
	| (ArrayValueCommand<Input> & {
			readonly type: "array/insert"
			readonly index: number
	  })
	| {
			readonly type: "array/remove"
			readonly path: ArrayFieldPath<Input>
			readonly index: number
	  }
	| {
			readonly type: "array/move"
			readonly path: ArrayFieldPath<Input>
			readonly from: number
			readonly to: number
	  }

export type ResetCommand<Input> = {
	readonly type: "form/reset"
	readonly values?: Input
}

export type TouchCommand<Input> = {
	readonly type: "field/touch" | "field/blur"
	readonly path: FieldPath<Input>
}

export type ValidationCommand<Input> =
	| { readonly type: "validation/run"; readonly path?: FieldPath<Input> }
	| {
			readonly type: "validation/runPaths"
			readonly paths: readonly FieldPath<Input>[]
	  }

export type IssuesCommand =
	| {
			readonly type: "issues/set"
			readonly issues: readonly ImperativeFormIssue[]
	  }
	| { readonly type: "issues/clear"; readonly path?: PathInput }

export type ReplaceRuntimeCommand<Context> =
	| { readonly type: "runtime/replaceContext"; readonly context: Context }
	| {
			readonly type: "runtime/replaceOptions"
			readonly options: {
				readonly disabled?: boolean
				readonly readOnly?: boolean
				readonly validation?: Partial<ValidationOptions>
			}
	  }

export type FormCommand<Input, Context = unknown> =
	| ValueCommand<Input>
	| ArrayCommand<Input>
	| ResetCommand<Input>
	| TouchCommand<Input>
	| ValidationCommand<Input>
	| IssuesCommand
	| ReplaceRuntimeCommand<Context>
