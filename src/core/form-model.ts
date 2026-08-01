import type { RowIdentityState } from "./array-state.js"

export type FormDocument<Input> = {
	readonly values: Input
	readonly rowIdentity: RowIdentityState
}

export type FormRuntimeState<Context, Input = unknown> = {
	readonly baselineDocument: FormDocument<Input>
	readonly touchedPaths: ReadonlySet<string>
	readonly issues: unknown
	readonly validation: unknown
	readonly submission: unknown
	readonly context: Readonly<Context>
	readonly options: Readonly<Record<string, unknown>>
	readonly resolvedUi: unknown
}

export type FormModel<Input, Context> = {
	readonly document: FormDocument<Input>
	readonly runtime: FormRuntimeState<Context, Input>
}
