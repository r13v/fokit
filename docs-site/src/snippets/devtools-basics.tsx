// biome-ignore-all lint/correctness/noUnusedVariables: Named regions are consumed independently by the documentation.
"use client"

import { createFormKit } from "form-please"
import { createDefaultSlots } from "form-please/default-slots"
import { createNativeControls } from "form-please/native-controls"
import { z } from "zod"

const kit = createFormKit({
	controls: createNativeControls(),
	slots: createDefaultSlots(),
})
const schema = z.object({ name: z.string() })
const definition = kit.defineForm(schema, { ui: [] })
const defaultValues = { name: "" }

// [!region first-use]
import { createDevToolsMiddleware } from "form-please/devtools"

const devToolsFeature = createDevToolsMiddleware({ name: "Profile editor" })
const form = kit.createForm(definition, {
	defaultValues,
	middleware: [devToolsFeature],
})
const devTools = devToolsFeature.handle(form)
// [!endregion first-use]
