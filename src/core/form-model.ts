import type { RowIdentityState } from "./array-state.js"
import type { ValidationStatus } from "./form-state.js"
import type { IssueState } from "./issues.js"
import type { ResolvedUiState } from "./resolve-ui.js"
import type { ValidationOptions } from "./validation.js"

export type FormDocument<Input> = {
	readonly values: Input
	readonly rowIdentity: RowIdentityState
}

export type FormRuntimeOptionsState = {
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly validation: ValidationOptions
}

export type ValidationKind = "nonSubmit" | "submit"

type ValidationStateBase = {
	readonly documentRevision: number
	readonly validationStatus: ValidationStatus
}

export type ValidationState =
	| (ValidationStateBase & {
			readonly status: "idle"
	  })
	| (ValidationStateBase & {
			readonly status: "validating"
			readonly attemptId: number
			readonly kind: ValidationKind
			readonly exposeAll: boolean
			readonly exposePaths: readonly string[]
	  })

export type SubmissionState =
	| {
			readonly status: "idle"
			readonly submitCount: number
	  }
	| {
			readonly status: "submitting"
			readonly attemptId: number
			readonly documentRevision: number
			readonly submitCount: number
	  }

export type FormRuntimeState<Context, Input = unknown> = {
	readonly baselineDocument: FormDocument<Input>
	readonly documentRevision: number
	readonly touchedPaths: ReadonlySet<string>
	readonly issues: IssueState
	readonly validation: ValidationState
	readonly submission: SubmissionState
	readonly context: Readonly<Context>
	readonly options: FormRuntimeOptionsState
	readonly resolvedUi: ResolvedUiState<Context>
}

export type FormModel<Input, Context> = {
	readonly document: FormDocument<Input>
	readonly runtime: FormRuntimeState<Context, Input>
}
