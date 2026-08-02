"use client"

import { useSnapshot } from "form-please"
import {
	createHistoryMiddleware,
	type FormJournal,
	replayJournal,
} from "form-please/history"
import { useState } from "react"
import {
	defaultValues,
	kit,
	type ProfileInput,
	profileDefinition,
} from "./lab-profile-form"

const historyFeature = createHistoryMiddleware({ limit: 50 })

export function HistoryExample() {
	const form = kit.useCreateForm(profileDefinition, {
		defaultValues,
		middleware: [historyFeature],
	})
	const history = historyFeature.handle(form)
	const snapshot = useSnapshot(history)
	const [exported, setExported] = useState<FormJournal<ProfileInput>>()
	const [message, setMessage] = useState("Edit the profile to create history.")

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
		<section className="form-please-lab">
			<p className="form-please-lab__kicker">History</p>
			<p className="form-please-lab__summary">
				Change any profile field, then move through the retained document
				versions.
			</p>
			<kit.AutoForm className="form-please-lab__form" form={form}>
				<div className="form-please-lab__actions">
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
							setMessage(`Exported profile: ${document.values.name}`)
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
				</div>
				<output aria-live="polite">
					{message} Position {snapshot.index} of {snapshot.length}.
				</output>
			</kit.AutoForm>
		</section>
	)
}
