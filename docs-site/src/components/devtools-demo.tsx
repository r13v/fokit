import type { ReactElement } from "react"

import { DevToolsDemoClient } from "./devtools-demo.client"
import { markdownFallback } from "./markdown-fallback"

export const DevToolsDemo = Object.assign(
	function DevToolsDemo(): ReactElement {
		return <DevToolsDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The Redux DevTools workflow runs in a browser. It connects a live article editor to Redux DevTools and keeps the form usable when the extension is absent.",
				"docs-site/src/snippets/devtools.tsx",
			)
		},
	},
)
