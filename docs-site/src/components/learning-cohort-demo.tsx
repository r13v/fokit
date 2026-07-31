import type { ReactElement } from "react"

import { LearningCohortDemoClient } from "./learning-cohort-demo.client"

export const LearningCohortDemo = Object.assign(
	function LearningCohortDemo(): ReactElement {
		return <LearningCohortDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The cohort editor runs in a browser. It combines remote title suggestions, configuration and price arrays, media, four offers, and conflict recovery.",
				"complex-learning-cohort.tsx",
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
