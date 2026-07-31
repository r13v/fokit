import type { ReactElement } from "react"

import { AsyncMultiSelectDemoClient } from "./async-multiselect-demo.client"
import { markdownFallback } from "./markdown-fallback"

export const AsyncMultiSelectDemo = Object.assign(
	function AsyncMultiSelectDemo(): ReactElement {
		return <AsyncMultiSelectDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The live async multiselect runs only in a browser. It stores selected IDs in Fokit, loads matching options through TanStack Query, and manages the popup with Floating UI.",
				"docs-site/src/snippets/async-multiselect.tsx",
			)
		},
	},
)
