import type {
	FormDocument,
	FormRuntimeOptionsState,
	ValidationKind,
} from "./form-model.js"
import type { FormIssue, ImperativeFormIssue } from "./issues.js"
import type { ResolvedUiState } from "./resolve-ui.js"
import type { ValueChange } from "./transaction.js"

export type UpdateSource =
	| "array"
	| "control"
	| "imperative"
	| "reset"
	| "valuePolicy"

export type BaselineDisposition = "preserved" | "replaced"

export type RowIdentityChange =
	| {
			readonly type: "array/initialized"
			readonly path: string
			readonly keys: readonly string[]
			readonly nextKeyIndex: number
	  }
	| {
			readonly type: "array/inserted"
			readonly path: string
			readonly index: number
			readonly key: string
			readonly nextKeyIndex: number
	  }
	| {
			readonly type: "array/removed"
			readonly path: string
			readonly index: number
			readonly key: string
	  }
	| {
			readonly type: "array/moved"
			readonly path: string
			readonly from: number
			readonly to: number
			readonly key: string
	  }
	| {
			readonly type: "array/replaced"
			readonly path: string
			readonly keys: readonly string[]
			readonly nextKeyIndex: number
	  }
	| {
			readonly type: "array/path-reindexed"
			readonly previousPath: string
			readonly path: string
	  }
	| {
			readonly type: "array/paths-reindexed"
			readonly paths: readonly {
				readonly previousPath: string
				readonly path: string
			}[]
	  }
	| {
			readonly type: "array/deleted"
			readonly path: string
	  }

export type DocumentCommittedEvent<Input> = {
	readonly type: "document/committed"
	readonly sequence: number
	readonly source: UpdateSource
	readonly changes: readonly ValueChange<Input>[]
	readonly rowIdentityChanges: readonly RowIdentityChange[]
	readonly baseline: BaselineDisposition
}

export type RestoreOrigin = "undo" | "redo" | "replay" | "hydrate" | "devtools"

export type DocumentRestoredEvent<Input> = {
	readonly type: "document/restored"
	readonly sequence: number
	readonly document: FormDocument<Input>
	readonly origin: RestoreOrigin
	readonly history: "skip" | "record"
}

export type FormDocumentEvent<Input> =
	| DocumentCommittedEvent<Input>
	| DocumentRestoredEvent<Input>

type RuntimeEventBase = {
	readonly sequence: number
}

export type RuntimeReplacedEvent<Context> = RuntimeEventBase & {
	readonly type: "runtime/replaced"
	readonly context: Readonly<Context>
	readonly options: FormRuntimeOptionsState
	readonly resolvedUi: ResolvedUiState<Context>
}

export type RuntimeResetEvent<Input> = RuntimeEventBase & {
	readonly type: "runtime/reset"
	readonly baseline: BaselineDisposition
	readonly baselineDocument?: FormDocument<Input>
}

export type ValidationStartedEvent = RuntimeEventBase & {
	readonly type: "validation/started"
	readonly attemptId: number
	readonly documentRevision: number
	readonly kind: ValidationKind
	readonly exposeAll: boolean
	readonly exposePaths: readonly string[]
}

type ValidationResolvedEventBase = RuntimeEventBase & {
	readonly type: "validation/resolved"
	readonly attemptId: number
	readonly documentRevision: number
}

export type ValidationResolvedEvent =
	| (ValidationResolvedEventBase & {
			readonly status: "valid"
	  })
	| (ValidationResolvedEventBase & {
			readonly status: "invalid"
			readonly issues: readonly FormIssue[]
	  })

export type ValidationFailedEvent = RuntimeEventBase & {
	readonly type: "validation/failed"
	readonly attemptId: number
	readonly documentRevision: number
}

export type SubmissionStartedEvent = RuntimeEventBase & {
	readonly type: "submission/started"
	readonly attemptId: number
	readonly documentRevision: number
}

export type SubmissionFinishedEvent = RuntimeEventBase & {
	readonly type: "submission/finished"
	readonly attemptId: number
	readonly documentRevision: number
}

export type FieldTouchedEvent = RuntimeEventBase & {
	readonly type: "field/touched"
	readonly path: string
}

export type FieldBlurredEvent = RuntimeEventBase & {
	readonly type: "field/blurred"
	readonly path: string
}

export type IssuesChange =
	| {
			readonly type: "imperative/set"
			readonly issues: readonly ImperativeFormIssue[]
	  }
	| {
			readonly type: "imperative/clear"
			readonly path?: string
	  }
	| {
			readonly type: "schema/replace"
			readonly issues: readonly FormIssue[]
			readonly exposeAll?: boolean
			readonly exposePaths?: readonly string[]
	  }
	| {
			readonly type: "server/replace"
			readonly issues: readonly ImperativeFormIssue[]
			readonly exposeAll?: boolean
	  }
	| {
			readonly type: "server/clearChanged"
			readonly paths: readonly string[]
	  }

export type IssuesChangedEvent = RuntimeEventBase & {
	readonly type: "issues/changed"
	readonly change: IssuesChange
}

export type FormRuntimeEvent<Context, Input = unknown> =
	| RuntimeReplacedEvent<Context>
	| RuntimeResetEvent<Input>
	| ValidationStartedEvent
	| ValidationResolvedEvent
	| ValidationFailedEvent
	| SubmissionStartedEvent
	| SubmissionFinishedEvent
	| FieldTouchedEvent
	| FieldBlurredEvent
	| IssuesChangedEvent

export type FormEvent<Input, Context> =
	| FormDocumentEvent<Input>
	| FormRuntimeEvent<Context, Input>
