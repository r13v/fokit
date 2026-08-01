import type { FormDocument } from "./form-model.js"
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
