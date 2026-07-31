import type { ReactElement } from "react"

import { MembershipLadderDemoClient } from "./membership-ladder-demo.client"

export const MembershipLadderDemo = Object.assign(
	function MembershipLadderDemo(): ReactElement {
		return <MembershipLadderDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The membership ladder runs in a browser. Four nested tiers cascade safely while workspace connection and pause-calendar mutations stay in sync.",
				"complex-membership-ladder.tsx",
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
