import type { ReactElement } from "react"

import { CampaignBuilderDemoClient } from "./campaign-builder-demo.client"

export const CampaignBuilderDemo = Object.assign(
	function CampaignBuilderDemo(): ReactElement {
		return <CampaignBuilderDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The campaign builder runs in a browser. Seven templates share audience, schedule, payment, cleanup, and create-or-edit network behavior.",
				"complex-campaign-builder.tsx",
			)
		},
	},
)

function markdownFallback(description: string, file: string) {
	return [
		{ type: "paragraph", children: [{ type: "text", value: description }] },
		{
			type: "paragraph",
			children: [
				{ type: "text", value: "Source: " },
				{
					type: "link",
					url: `https://github.com/r13v/fokit/blob/main/docs-site/src/snippets/${file}`,
					children: [{ type: "text", value: `docs-site/src/snippets/${file}` }],
				},
			],
		},
	]
}
