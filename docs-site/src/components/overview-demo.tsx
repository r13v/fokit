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
								"The live overview form runs only in a browser. It renders an explicit profile definition, validates it with Standard Schema, and returns typed output.",
						},
					],
				},
				{
					type: "paragraph",
					children: [
						{ type: "text", value: "Source: " },
						{
							type: "link",
							url: "https://github.com/r13v/fokit/blob/main/docs-site/src/components/overview-demo.client.tsx",
							children: [
								{
									type: "text",
									value: "docs-site/src/components/overview-demo.client.tsx",
								},
							],
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
