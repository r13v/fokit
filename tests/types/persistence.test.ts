import type { StandardSchemaV1 } from "@standard-schema/spec"
import type * as CorePublic from "../../src/core/index.js"
import { createHistoryMiddleware } from "../../src/history/index.js"
import type * as RootPublic from "../../src/index.js"
import { createFormKit, type FormMiddleware } from "../../src/index.js"
import {
	createDateCodec,
	createFileCodec,
	createLocalStorageAdapter,
	createPersistenceMiddleware,
	type FormPersistenceAdapter,
	type JsonValue,
	type PersistenceCodec,
	type PersistenceMigration,
	type PersistenceSnapshot,
} from "../../src/persistence/index.js"

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false
type Expect<Condition extends true> = Condition

type Input = { name: string; when?: Date; items: { value: string }[] }
type Context = { locale: string }
type Schema = StandardSchemaV1<Input>

declare const schema: Schema
declare const adapter: FormPersistenceAdapter
const kit = createFormKit({ controls: {} })
const definition = kit.forContext<Context>().defineForm(schema, { ui: [] })
const history = createHistoryMiddleware()
const documentPersistence = createPersistenceMiddleware({
	adapter,
	key: "document",
	version: 2,
	codecs: [createDateCodec()],
	migrate: async (payload, fromVersion, toVersion) => {
		const json: JsonValue = payload
		const from: number = fromVersion
		const to: number = toVersion
		void from
		void to
		return json
	},
})
const historyPersistence = createPersistenceMiddleware({
	adapter,
	key: "history",
	version: 2,
	history,
})
const middleware: FormMiddleware<Input, Context> = historyPersistence
const form = kit.createForm(definition, {
	defaultValues: { name: "Ada", items: [] },
	context: { locale: "en" },
	middleware: [history, historyPersistence],
})
const handle = historyPersistence.handle(form)
const snapshot: PersistenceSnapshot = handle.getSnapshot()
const restored: Promise<
	"applied" | "empty" | "cancelled" | "transformed" | "unavailable" | "conflict"
> = handle.restore()

const customCodec = {
	tag: "custom",
	canEncode: (value: unknown): value is URL => value instanceof URL,
	encode: (value: URL) => value.href,
	decode: (value: JsonValue) => new URL(String(value)),
} satisfies PersistenceCodec<URL>
const migration: PersistenceMigration = (payload) => payload
const storageAdapter = createLocalStorageAdapter(() => localStorage)
const fileCodec = createFileCodec({ maxSize: 1024, tag: "attachment" })

type _noRootPersistence = Expect<
	Equal<
		"createPersistenceMiddleware" extends keyof typeof RootPublic
			? true
			: false,
		false
	>
>
type _noCorePersistence = Expect<
	Equal<
		"createPersistenceMiddleware" extends keyof typeof CorePublic
			? true
			: false,
		false
	>
>

void documentPersistence
void middleware
void snapshot
void restored
void customCodec
void migration
void storageAdapter
void fileCodec
