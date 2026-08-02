// biome-ignore-all lint/correctness/noUnusedVariables: Named regions are consumed independently by the documentation.
"use client"

import { createFormKit, nativeControls } from "form-please"
import { z } from "zod"

const kit = createFormKit({ controls: nativeControls })
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
