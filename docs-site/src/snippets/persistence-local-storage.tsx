"use client"

import { createFormKit, nativeControls, useSnapshot } from "form-please"
import {
	createLocalStorageAdapter,
	createPersistenceMiddleware,
} from "form-please/persistence"
import { useEffect, useRef, useState } from "react"
import { z } from "zod"

const schema = z.object({ note: z.string() })
const kit = createFormKit({ controls: nativeControls })
const definition = kit.defineForm(schema, {
	ui: [{ kind: "field", path: "note", control: "textarea", label: "Note" }],
})
const persistenceFeature = createPersistenceMiddleware({
	adapter: createLocalStorageAdapter(() => window.localStorage),
	key: "form-please-example-note-v1",
	version: 1,
	onError: (error) => console.error("Draft persistence failed", error),
})

function operationError(fallback: string, error: unknown): string {
	if (error instanceof Error) return error.message
	return fallback
}

export function LocalStoragePersistenceExample() {
	const form = kit.useCreateForm(definition, {
		defaultValues: { note: "" },
		middleware: [persistenceFeature],
	})
	const persistence = persistenceFeature.handle(form)
	const snapshot = useSnapshot(persistence)
	const [message, setMessage] = useState("Loading the saved draft…")
	const restorePromise = useRef<
		ReturnType<typeof persistence.restore> | undefined
	>(undefined)

	async function saveNow() {
		try {
			await persistence.flush()
			setMessage("Draft saved.")
		} catch (error) {
			setMessage(operationError("Save failed", error))
		}
	}

	async function deleteSavedDraft() {
		try {
			await persistence.clear()
			setMessage("Saved draft deleted.")
		} catch (error) {
			setMessage(operationError("Delete failed", error))
		}
	}

	useEffect(() => {
		let active = true
		restorePromise.current ??= persistence.restore()
		restorePromise.current.then(
			(result) => active && setMessage(`Restore result: ${result}`),
			(error) => {
				if (!active) return
				setMessage(operationError("Restore failed", error))
				persistence.start()
			},
		)
		return () => {
			active = false
		}
	}, [persistence])

	return (
		<kit.AutoForm form={form}>
			<button
				disabled={snapshot.phase !== "active"}
				onClick={saveNow}
				type="button"
			>
				Save now
			</button>
			<button
				disabled={snapshot.phase === "restoring"}
				onClick={deleteSavedDraft}
				type="button"
			>
				Delete saved draft
			</button>
			<output aria-live="polite">
				{message} Phase: {snapshot.phase}. Save: {snapshot.save.status}.
			</output>
		</kit.AutoForm>
	)
}
