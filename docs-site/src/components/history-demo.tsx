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
				"The managed value history preview runs only in a browser. It demonstrates grouped editing, undo, redo, seek, journal export and import, and clearing one form's retained positions.",
				"docs-site/src/snippets/history-guide.tsx",
			)
		},
	},
)
