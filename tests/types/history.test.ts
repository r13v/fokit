import type { StandardSchemaV1 } from "@standard-schema/spec"
import type * as CorePublic from "../../src/core/index.js"
import { createDefaultSlots } from "../../src/default-slots/index.js"
import {
	createHistoryMiddleware,
	type FormJournal,
	type HistoryOperationResult,
	type JournalCursor,
	replayJournal,
} from "../../src/history/index.js"
import type * as RootPublic from "../../src/index.js"
import type { FormMiddleware } from "../../src/index.js"
import { createFormKit } from "../../src/index.js"

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false
type Expect<Condition extends true> = Condition

type Input = {
	name: string
	items: { value: string }[]
}
type Context = { readonly locale: string }
type Schema = StandardSchemaV1<Input>

declare const schema: Schema
const kit = createFormKit({ controls: {}, slots: createDefaultSlots() })
const definition = kit.forContext<Context>().defineForm(schema, { ui: [] })
const historyFeature = createHistoryMiddleware({ limit: 20, groupWindow: 0 })
const middleware: FormMiddleware<Input, Context> = historyFeature
const form = kit.createForm(definition, {
	defaultValues: { name: "Ada", items: [] },
	context: { locale: "en" },
	middleware: [historyFeature],
})
const history = historyFeature.handle(form)
const snapshot = history.getSnapshot()
const canUndo: boolean = snapshot.canUndo
const operation: HistoryOperationResult = history.undo()
const journal = history.export()
const typedJournal: FormJournal<Input> = journal
const replayed = replayJournal(journal, journal.cursor)

type _replayedInput = Expect<Equal<typeof replayed.values, Input>>
type _handleInput = Expect<
	Equal<ReturnType<typeof history.export>, FormJournal<Input>>
>
type _noRootHistory = Expect<
	Equal<
		"createHistoryMiddleware" extends keyof typeof RootPublic ? true : false,
		false
	>
>
type _noCoreHistory = Expect<
	Equal<
		"createHistoryMiddleware" extends keyof typeof CorePublic ? true : false,
		false
	>
>

// @ts-expect-error journal cursors are opaque and cannot be constructed
const forgedCursor: JournalCursor = {}
// @ts-expect-error opaque cursors do not expose journal coordinates
journal.cursor.index
// @ts-expect-error the form does not own a history handle
form.history

void canUndo
void middleware
void operation
void typedJournal
void replayed
void forgedCursor
void history.import({ untrusted: true })
