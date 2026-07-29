"use client"

import { useState } from "react"

import {
	defaultValues,
	kit,
	type ProfileOutput,
	profileDefinition,
} from "./form-kit.js"

export function ProfileEditor() {
	const [saved, setSaved] = useState<ProfileOutput>()

	return (
		<>
			<kit.AutoForm
				className="profile-form"
				definition={profileDefinition}
				defaultValues={defaultValues}
				validation={{
					mode: "blur",
					revalidateMode: "change",
				}}
				onSubmit={({ value }) => setSaved(value)}
			>
				<kit.Submit>Save profile</kit.Submit>
			</kit.AutoForm>

			<output aria-live="polite">
				{saved === undefined
					? "Submit the form to see validated output."
					: `Saved ${saved.name} with ${saved.contactCount} contacts.`}
			</output>
		</>
	)
}
