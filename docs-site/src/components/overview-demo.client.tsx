"use client"

import {
	createFormKit,
	type FormInput,
	type FormOutput,
	nativeControls,
} from "fokit"
import { useState } from "react"
import { z } from "zod"

const profileSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Enter a valid email"),
	newsletter: z.boolean(),
})

const defaultValues = {
	name: "Ada Lovelace",
	email: "ada@example.com",
	newsletter: true,
} satisfies FormInput<typeof profileSchema>

const kit = createFormKit({
	controls: nativeControls,
})

const profileDefinition = kit.defineForm({
	schema: profileSchema,
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			label: "Name",
			required: true,
			options: {
				placeholder: "Ada Lovelace",
				autoComplete: "name",
			},
		},
		{
			kind: "field",
			path: "email",
			control: "text",
			label: "Email",
			required: true,
			options: {
				type: "email",
				placeholder: "ada@example.com",
				autoComplete: "email",
			},
		},
		{
			kind: "field",
			path: "newsletter",
			control: "checkbox",
			label: "Send me product news",
		},
	],
})

export function OverviewDemoClient() {
	const [saved, setSaved] = useState<FormOutput<typeof profileSchema>>()

	return (
		<section
			aria-label="Live Fokit profile form"
			className="fokit-lab fokit-overview-demo"
			data-testid="overview-demo"
		>
			<p className="fokit-lab__kicker">Live public package</p>
			<p className="fokit-lab__summary">
				Edit the profile, submit it, and see the schema-validated output.
			</p>
			<kit.AutoForm
				className="fokit-overview-demo__form"
				defaultValues={defaultValues}
				definition={profileDefinition}
				onSubmit={({ value }) => setSaved(value)}
			>
				<kit.Submit className="fokit-lab__primary">Save profile</kit.Submit>
			</kit.AutoForm>
			<div
				aria-atomic="true"
				aria-live="polite"
				className="fokit-overview-demo__result"
			>
				<span>Validated output</span>
				<pre data-testid="overview-output">
					<code>
						{saved === undefined
							? "Submit the form to see typed output."
							: JSON.stringify(saved, null, 2)}
					</code>
				</pre>
			</div>
		</section>
	)
}
