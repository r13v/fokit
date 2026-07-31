import type { ReactElement } from "react"

import { markdownFallback } from "./markdown-fallback"
import { OverviewDemoClient } from "./overview-demo.client"

export const OverviewDemo = Object.assign(
	function OverviewDemo(): ReactElement {
		return <OverviewDemoClient />
	},
	{
		toMarkdown() {
			return [
				...markdownFallback(
					"The live overview form runs only in a browser. It renders an explicit profile definition, validates it with Standard Schema, and returns typed output.",
					"docs-site/src/components/overview-demo.client.tsx",
				),
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
