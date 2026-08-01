"use client"

import { createFormKit, nativeControls } from "form-please"
import {
	createLocalStorageAdapter,
	createPersistenceMiddleware,
} from "form-please/persistence"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { z } from "zod"

const schema = z.object({ note: z.string() })
const kit = createFormKit({ controls: nativeControls })
const definition = kit.defineForm(schema)({
	ui: [{ kind: "field", path: "note", control: "textarea", label: "Note" }],
})
const persistenceFeature = createPersistenceMiddleware({
	adapter: createLocalStorageAdapter(() => window.localStorage),
	key: "profile-draft",
	version: 1,
	onError: (error) => console.error("Draft persistence failed", error),
})

export function LocalStoragePersistenceExample() {
	const [form] = useState(() =>
		kit.createForm(definition, {
			defaultValues: { note: "" },
			middleware: [persistenceFeature],
		}),
	)
	const persistence = persistenceFeature.handle(form)
	const snapshot = useSyncExternalStore(
		persistence.subscribe,
		persistence.getSnapshot,
		persistence.getSnapshot,
	)
	const [message, setMessage] = useState("Loading the saved draft…")
	const restorePromise = useRef<
		ReturnType<typeof persistence.restore> | undefined
	>(undefined)

	useEffect(() => {
		let active = true
		restorePromise.current ??= persistence.restore()
		restorePromise.current.then(
			(result) => active && setMessage(`Restore result: ${result}`),
			(error) => {
				if (!active) return
				let message = "Restore failed"
				if (error instanceof Error) message = error.message
				setMessage(message)
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
				onClick={() => persistence.flush().catch(console.error)}
				type="button"
			>
				Save now
			</button>
			<button
				onClick={() => persistence.clear().catch(console.error)}
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
