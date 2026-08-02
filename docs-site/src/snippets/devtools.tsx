"use client"

import { createFormKit, nativeControls } from "form-please"
import { createDevToolsMiddleware } from "form-please/devtools"
import { useState } from "react"
import { z } from "zod"

const schema = z.object({ title: z.string() })
const kit = createFormKit({ controls: nativeControls })
const definition = kit.defineForm(schema, {
	ui: [{ kind: "field", path: "title", control: "text", label: "Title" }],
})
const devToolsFeature = createDevToolsMiddleware({
	name: "Article editor",
	maxAge: 50,
	onError: (error) => console.error("Redux DevTools failed", error),
})

export function DevToolsExample() {
	const form = kit.useCreateForm(definition, {
		defaultValues: { title: "Draft" },
		middleware: [devToolsFeature],
	})
	const [isDisconnected, setIsDisconnected] = useState(false)
	const devTools = devToolsFeature.handle(form)

	function disconnectDevTools() {
		devTools.disconnect()
		setIsDisconnected(true)
	}

	let disconnectLabel = "Disconnect DevTools"
	if (isDisconnected) {
		disconnectLabel = "DevTools disconnected"
	}

	return (
		<section className="form-please-lab">
			<p className="form-please-lab__kicker">Redux DevTools</p>
			<p className="form-please-lab__summary">
				Change the title to create events. Select an earlier event in Redux
				DevTools to restore its document.
			</p>
			<kit.AutoForm className="form-please-lab__form" form={form}>
				<div className="form-please-lab__actions">
					<button
						className="form-please-lab__secondary"
						disabled={isDisconnected}
						onClick={disconnectDevTools}
						type="button"
					>
						{disconnectLabel}
					</button>
				</div>
			</kit.AutoForm>
		</section>
	)
}
