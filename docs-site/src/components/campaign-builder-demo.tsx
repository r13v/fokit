import type { ReactElement } from "react"

import { CampaignBuilderDemoClient } from "./campaign-builder-demo.client"
import { markdownFallback } from "./markdown-fallback"

export const CampaignBuilderDemo = Object.assign(
	function CampaignBuilderDemo(): ReactElement {
		return <CampaignBuilderDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The campaign builder runs in a browser. Seven templates share audience, schedule, payment, preserved conditional values, and create-or-edit network behavior.",
				"docs-site/src/snippets/complex-campaign-builder.tsx",
			)
		},
	},
)
