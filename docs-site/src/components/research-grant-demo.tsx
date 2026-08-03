import type { ReactElement } from "react"

import { markdownFallback } from "./markdown-fallback"
import { ResearchGrantDemoClient } from "./research-grant-demo.client"

export const ResearchGrantDemo = Object.assign(
	function ResearchGrantDemo(): ReactElement {
		return <ResearchGrantDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The research grant example runs in a browser. It combines branching identity, registry lookup, preserved conditional values, live preview, and two fake requests.",
				"docs-site/src/snippets/complex-research-grant.tsx",
			)
		},
	},
)
