"use client"

import { createDevToolsMiddleware } from "form-please/devtools"
import { useState } from "react"
import { defaultValues, kit, profileDefinition } from "./lab-profile-form"

const devToolsFeature = createDevToolsMiddleware({
	name: "Profile form",
	maxAge: 50,
	onError: (error) => console.error("Redux DevTools failed", error),
})

export function DevToolsExample() {
	const form = kit.useCreateForm(profileDefinition, {
		defaultValues,
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
				Change any profile field to create events. Select an earlier event in
				Redux DevTools to restore its document.
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
