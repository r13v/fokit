"use client"

import { createFormKit, nativeControls } from "form-please"
import { createDevToolsMiddleware } from "form-please/devtools"
import { useState } from "react"
import { z } from "zod"

const schema = z.object({ title: z.string() })
const kit = createFormKit({ controls: nativeControls })
const definition = kit.defineForm(schema)({
	ui: [{ kind: "field", path: "title", control: "text", label: "Title" }],
})
const devToolsFeature = createDevToolsMiddleware({
	name: "Article editor",
	maxAge: 50,
	onError: (error) => console.error("Redux DevTools failed", error),
})

export function DevToolsExample() {
	const [form] = useState(() =>
		kit.createForm(definition, {
			defaultValues: { title: "Draft" },
			middleware: [devToolsFeature],
		}),
	)
	const devTools = devToolsFeature.handle(form)

	return (
		<kit.AutoForm form={form}>
			<p>Open Redux DevTools to inspect committed form events.</p>
			<button onClick={() => devTools.disconnect()} type="button">
				Disconnect DevTools
			</button>
		</kit.AutoForm>
	)
}
