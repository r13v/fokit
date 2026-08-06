"use client"

import {
	createLocalStorageAdapter,
	createPersistenceMiddleware,
} from "form-please/persistence"
import { nativeFormKit } from "form-please/preset-native"
import { useEffect } from "react"
import { z } from "zod"

const settingsSchema = z.object({ theme: z.string() })
const settingsDefinition = nativeFormKit.defineForm(settingsSchema, {
	ui: [{ control: "text", kind: "field", label: "Theme", path: "theme" }],
})

// [!region local-storage]
const settingsPersistence = createPersistenceMiddleware({
	adapter: createLocalStorageAdapter(() => localStorage),
	key: "settings-draft",
	version: 1,
})

export function SettingsDraftForm() {
	const form = nativeFormKit.useForm(settingsDefinition, {
		defaultValues: { theme: "system" },
		middleware: [settingsPersistence],
	})
	const persistence = settingsPersistence.handle(form)

	useEffect(() => {
		void persistence.restore().catch((error: unknown) => {
			console.error("Could not restore the settings draft", error)
		})
	}, [persistence])

	return <nativeFormKit.AutoForm form={form} />
}
// [!endregion local-storage]
