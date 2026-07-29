import type { ReactElement } from "react"

import { OverviewDemoClient } from "./overview-demo.client"

export const OverviewDemo = Object.assign(
	function OverviewDemo(): ReactElement {
		return <OverviewDemoClient />
	},
	{
		toMarkdown() {
			return [
				{
					type: "paragraph",
					children: [
						{
							type: "text",
							value:
								"The live overview form is browser-only. It renders an explicit profile definition, validates with Standard Schema, and returns typed output from the public Fokit package.",
						},
					],
				},
				{
					type: "code",
					lang: "tsx",
					value:
						'import { createFormKit, nativeControls } from "fokit"\n\nconst kit = createFormKit({ controls: nativeControls })\n\n<kit.AutoForm definition={profileDefinition} defaultValues={defaultValues} onSubmit={({ value }) => saveProfile(value)} />',
				},
			]
		},
	},
)
