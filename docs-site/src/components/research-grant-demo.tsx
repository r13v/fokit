import type { ReactElement } from "react"

import { ResearchGrantDemoClient } from "./research-grant-demo.client"

export const ResearchGrantDemo = Object.assign(
	function ResearchGrantDemo(): ReactElement {
		return <ResearchGrantDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The research grant example runs in a browser. It combines branching identity, registry lookup, transactional cleanup, live preview, and two fake requests.",
				"complex-research-grant.tsx",
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
