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
				"The live Persistence workflow runs only in a browser. It restores, schedules, saves, and deletes one versioned local draft.",
				"docs-site/src/snippets/persistence-local-storage.tsx",
			)
		},
	},
)
