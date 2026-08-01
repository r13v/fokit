"use client"

import { createFormKit, type FormInput, nativeControls } from "form-please"
import {
	createHistoryMiddleware,
	type FormJournal,
	replayJournal,
} from "form-please/history"
import { useState, useSyncExternalStore } from "react"
import { z } from "zod"

const schema = z.object({ title: z.string().min(1, "Enter a title") })
type Input = FormInput<typeof schema>

const kit = createFormKit({ controls: nativeControls })
const definition = kit.defineForm(schema)({
	ui: [{ kind: "field", path: "title", control: "text", label: "Title" }],
})
const historyFeature = createHistoryMiddleware({ limit: 50 })

export function HistoryExample() {
	const [form] = useState(() =>
		kit.createForm(definition, {
			defaultValues: { title: "First draft" },
			middleware: [historyFeature],
		}),
	)
	const history = historyFeature.handle(form)
	const snapshot = useSyncExternalStore(
		history.subscribe,
		history.getSnapshot,
		history.getSnapshot,
	)
	const [exported, setExported] = useState<FormJournal<Input>>()
	const [message, setMessage] = useState("Edit the title to create history.")

	async function importJournal() {
		if (exported === undefined) return
		try {
			const result = await history.import(exported)
			setMessage(`Import result: ${result}`)
		} catch (error) {
			let message = "Import failed"
			if (error instanceof Error) message = error.message
			setMessage(message)
		}
	}

	return (
		<kit.AutoForm form={form}>
			<button
				disabled={!snapshot.canUndo}
				onClick={() => history.undo()}
				type="button"
			>
				Undo
			</button>
			<button
				disabled={!snapshot.canRedo}
				onClick={() => history.redo()}
				type="button"
			>
				Redo
			</button>
			<button onClick={() => history.seek(0)} type="button">
				First version
			</button>
			<button
				onClick={() => {
					const journal = history.export()
					setExported(journal)
					const document = replayJournal(journal, journal.cursor)
					setMessage(`Exported title: ${document.values.title}`)
				}}
				type="button"
			>
				Export
			</button>
			<button
				disabled={exported === undefined}
				onClick={importJournal}
				type="button"
			>
				Import
			</button>
			<button onClick={() => history.clear()} type="button">
				Clear history
			</button>
			<output aria-live="polite">
				{message} Position {snapshot.index} of {snapshot.length}.
			</output>
		</kit.AutoForm>
	)
}
