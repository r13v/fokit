import type { ReactElement } from "react"

import { HistoryDemoClient } from "./history-demo.client"
import { markdownFallback } from "./markdown-fallback"

export const HistoryDemo = Object.assign(
	function HistoryDemo(): ReactElement {
		return <HistoryDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The live History workflow runs only in a browser. It adds undo, redo, seek, journal export, replay, and validated import to one form.",
				"docs-site/src/snippets/history.tsx",
			)
		},
	},
)
