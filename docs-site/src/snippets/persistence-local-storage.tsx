"use client"

import { useSnapshot } from "form-please"
import {
	createLocalStorageAdapter,
	createPersistenceMiddleware,
} from "form-please/persistence"
import { useEffect, useRef, useState } from "react"
import { defaultValues, kit, profileDefinition } from "./lab-profile-form"

const persistenceFeature = createPersistenceMiddleware({
	adapter: createLocalStorageAdapter(() => window.localStorage),
	key: "form-please-example-profile-v1",
	version: 1,
	onError: (error) => console.error("Draft persistence failed", error),
})

function operationError(fallback: string, error: unknown): string {
	if (error instanceof Error) return error.message
	return fallback
}

export function LocalStoragePersistenceExample() {
	const form = kit.useCreateForm(profileDefinition, {
		defaultValues,
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
		<section className="form-please-lab">
			<p className="form-please-lab__kicker">Persistence</p>
			<p className="form-please-lab__summary">
				Change the profile, then reload this page to restore the saved draft.
			</p>
			<kit.AutoForm className="form-please-lab__form" form={form}>
				<div className="form-please-lab__actions">
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
				</div>
				<output aria-live="polite">
					{message} Phase: {snapshot.phase}. Save: {snapshot.save.status}.
				</output>
			</kit.AutoForm>
		</section>
	)
}
