import type { StandardSchemaV1 } from "@standard-schema/spec"
import type * as CorePublic from "../../src/core/index.js"
import type {
	DocumentCommittedEvent,
	DocumentRestoredEvent,
	FormDocument,
	FormDocumentEvent,
	RowIdentityChange,
} from "../../src/core/index.js"
import type * as RootPublic from "../../src/index.js"
import type {
	DocumentCommittedEvent as RootDocumentCommittedEvent,
	FormDocument as RootFormDocument,
} from "../../src/index.js"

type Input = {
	name?: string
	rows: readonly { value: string }[]
}

type Schema = StandardSchemaV1<Input>

declare const document: FormDocument<Input>
declare const committed: DocumentCommittedEvent<Input>
declare const restored: DocumentRestoredEvent<Input>
declare const event: FormDocumentEvent<Input>
declare const rootDocument: RootFormDocument<Input>
declare const rootCommitted: RootDocumentCommittedEvent<Input>

document.values.rows[0]?.value satisfies string
rootDocument.values.name satisfies string | undefined
committed.changes satisfies readonly {
	readonly type: "set" | "unset"
	readonly path: string
}[]
committed.rowIdentityChanges satisfies readonly RowIdentityChange[]
restored.document satisfies FormDocument<Input>
event.type satisfies "document/committed" | "document/restored"
rootCommitted.sequence satisfies number

// @ts-expect-error row identity storage is opaque outside the core
document.rowIdentity.rows

// @ts-expect-error replaced array commands are no longer public
export type RemovedArrayCommand = CorePublic.ArrayCommand

// @ts-expect-error replaced array command changes are no longer public
export type RemovedArrayCommandChange = RootPublic.ArrayCommandChange

// @ts-expect-error row identity entries are not public
export type RemovedArrayRowState = CorePublic.ArrayRowState

// @ts-expect-error row identity maps are not public
export type RemovedArrayRowsState = RootPublic.ArrayRowsState

declare const schema: Schema
void schema
