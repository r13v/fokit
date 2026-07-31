import type { ReactElement } from "react"

import { StudioPoliciesDemoClient } from "./studio-policies-demo.client"

export const StudioPoliciesDemo = Object.assign(
	function StudioPoliciesDemo(): ReactElement {
		return <StudioPoliciesDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The studio policy editor runs in a browser. It loads two baselines, coordinates cross-section rules and arrays, then publishes two resources.",
				"complex-studio-policies.tsx",
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
