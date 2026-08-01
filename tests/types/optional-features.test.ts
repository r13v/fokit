import type * as RootPublic from "form-please"
import type * as CorePublic from "form-please/core"
import type * as DevToolsPublic from "form-please/devtools"
import type {
	CreateDevToolsOptions,
	DevToolsFeature,
	DevToolsFormState,
	DevToolsHandle,
	DevToolsRevisionToken,
	LogicalRowIdentity,
} from "form-please/devtools"
import type * as HistoryPublic from "form-please/history"
import type {
	CreateHistoryOptions,
	FormJournal,
	HistoryFeature,
	HistoryHandle,
	HistoryOperationResult,
	HistorySnapshot,
	JournalCursor,
} from "form-please/history"
import type * as PersistencePublic from "form-please/persistence"
import type {
	CreateFileCodecOptions,
	CreatePersistenceOptions,
	FormPersistenceAdapter,
	JsonValue,
	PersistenceCodec,
	PersistenceFeature,
	PersistenceHandle,
	PersistenceMigration,
	PersistenceRestoreResult,
	PersistenceSnapshot,
	PersistenceStorage,
} from "form-please/persistence"
import type * as React19Public from "form-please/react19"
import type * as ServerPublic from "form-please/server"

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false
type Expect<Condition extends true> = Condition

type HistoryExports = "createHistoryMiddleware" | "replayJournal"

type PersistenceExports =
	| "createDateCodec"
	| "createFileCodec"
	| "createLocalStorageAdapter"
	| "createPersistenceMiddleware"

type DevToolsExports = "createDevToolsMiddleware"

type OptionalExports = HistoryExports | PersistenceExports | DevToolsExports

type _historyExports = Expect<Equal<keyof typeof HistoryPublic, HistoryExports>>
type _persistenceExports = Expect<
	Equal<keyof typeof PersistencePublic, PersistenceExports>
>
type _devToolsExports = Expect<
	Equal<keyof typeof DevToolsPublic, DevToolsExports>
>
type _noRootOptionalExports = Expect<
	Equal<Extract<keyof typeof RootPublic, OptionalExports>, never>
>
type _noCoreOptionalExports = Expect<
	Equal<Extract<keyof typeof CorePublic, OptionalExports>, never>
>
type _noReact19OptionalExports = Expect<
	Equal<Extract<keyof typeof React19Public, OptionalExports>, never>
>
type _noServerOptionalExports = Expect<
	Equal<Extract<keyof typeof ServerPublic, OptionalExports>, never>
>

type _historyTypes = [
	CreateHistoryOptions,
	FormJournal<unknown>,
	HistoryFeature,
	HistoryHandle<unknown>,
	HistoryOperationResult,
	HistorySnapshot,
	JournalCursor,
]
type _persistenceTypes = [
	CreateFileCodecOptions,
	CreatePersistenceOptions,
	FormPersistenceAdapter,
	JsonValue,
	PersistenceCodec,
	PersistenceFeature,
	PersistenceHandle,
	PersistenceMigration,
	PersistenceRestoreResult,
	PersistenceSnapshot,
	PersistenceStorage,
]
type _devToolsTypes = [
	CreateDevToolsOptions,
	DevToolsFeature,
	DevToolsFormState<unknown>,
	DevToolsHandle,
	DevToolsRevisionToken,
	LogicalRowIdentity,
]
