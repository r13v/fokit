import type { ReactElement } from "react"

import { markdownFallback } from "./markdown-fallback"
import { PersistenceDemoClient } from "./persistence-demo.client"

export const PersistenceDemo = Object.assign(
	function PersistenceDemo(): ReactElement {
		return <PersistenceDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The persistence preview runs only in a browser. It restores and autosaves the editable form input in the URL query string through nuqs.",
				"docs-site/src/snippets/persistence-basics.tsx",
			)
		},
	},
)
