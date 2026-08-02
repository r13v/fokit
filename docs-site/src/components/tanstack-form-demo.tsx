import type { ReactElement } from "react"

import { markdownFallback } from "./markdown-fallback"
import { TanStackFormDemoClient } from "./tanstack-form-demo.client"

export const TanStackFormDemo = Object.assign(
	function TanStackFormDemo(): ReactElement {
		return <TanStackFormDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The TanStack Form example runs in a browser. It includes conditional fields, movable speakers, direct kit.tf components, Standard Schema validation, and parsed output.",
				"docs-site/src/snippets/tanstack-conference-planner.tsx",
			)
		},
	},
)
