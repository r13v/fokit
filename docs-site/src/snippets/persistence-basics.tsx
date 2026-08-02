// biome-ignore-all lint/correctness/noUnusedVariables: Named regions are consumed independently by the documentation.
"use client"

import { createFormKit, nativeControls } from "form-please"
import type { FormPersistenceAdapter, JsonValue } from "form-please/persistence"
import { z } from "zod"

const kit = createFormKit({ controls: nativeControls })
const schema = z.object({ name: z.string() })
const definition = kit.defineForm(schema, { ui: [] })
const defaultValues = { name: "" }
declare const adapter: FormPersistenceAdapter

// [!region first-use]
import {
	createLocalStorageAdapter,
	createPersistenceMiddleware,
} from "form-please/persistence"

const persistenceFeature = createPersistenceMiddleware({
	adapter: createLocalStorageAdapter(() => window.localStorage),
	key: "profile-draft",
	version: 1,
})

const form = kit.createForm(definition, {
	defaultValues,
	middleware: [persistenceFeature],
})
const persistence = persistenceFeature.handle(form)
await persistence.restore()

// [!endregion first-use]

// [!region history-mode]
import { createHistoryMiddleware } from "form-please/history"

const historyFeature = createHistoryMiddleware()
const historyPersistenceFeature = createPersistenceMiddleware({
	adapter,
	key: "draft",
	version: 1,
	history: historyFeature,
})

const historyForm = kit.createForm(definition, {
	defaultValues,
	middleware: [historyFeature, historyPersistenceFeature],
})
// [!endregion history-mode]

function migrateProfile(payload: JsonValue): JsonValue {
	return payload
}

// [!region migration]
const migratingPersistenceFeature = createPersistenceMiddleware({
	adapter,
	key: "profile",
	version: 2,
	migrate: async (payload, fromVersion, toVersion) => {
		if (fromVersion === 1 && toVersion === 2) return migrateProfile(payload)
		throw new Error("Unsupported profile draft version")
	},
})
// [!endregion migration]
