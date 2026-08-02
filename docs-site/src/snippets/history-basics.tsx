// biome-ignore-all lint/correctness/noUnusedVariables: Named regions are consumed independently by the documentation.
"use client"

import { createFormKit as createSetupKit } from "form-please"
import { createDefaultSlots } from "form-please/default-slots"
import { createNativeControls } from "form-please/native-controls"
import { z } from "zod"

const kit = createSetupKit({
	controls: createNativeControls(),
	slots: createDefaultSlots(),
})
const schema = z.object({ name: z.string() })
const definition = kit.defineForm(schema, { ui: [] })
const defaultValues = { name: "" }

// [!region first-use]
import { createHistoryMiddleware, replayJournal } from "form-please/history"

const historyFeature = createHistoryMiddleware()
const form = kit.createForm(definition, {
	defaultValues,
	middleware: [historyFeature],
})
const history = historyFeature.handle(form)

history.undo()
history.redo()
// [!endregion first-use]

// [!region replay]
const journal = history.export()
const segment = journal.segments[0]
const checkpoint = replayJournal(journal, segment.checkpoint.cursor)
const firstGroup = replayJournal(journal, segment.groups[0].cursor)
// [!endregion replay]

declare const uploadedText: string
function showResult(_result: Awaited<ReturnType<typeof history.import>>) {}
function showInvalidJournal(_error: unknown) {}

// [!region import]
try {
	const result = await history.import(JSON.parse(uploadedText))
	showResult(result)
} catch (error) {
	showInvalidJournal(error)
}
// [!endregion import]
