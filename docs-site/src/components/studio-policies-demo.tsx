import type { ReactElement } from "react"

import { markdownFallback } from "./markdown-fallback"
import { StudioPoliciesDemoClient } from "./studio-policies-demo.client"

export const StudioPoliciesDemo = Object.assign(
	function StudioPoliciesDemo(): ReactElement {
		return <StudioPoliciesDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The studio policy editor runs in a browser. It combines a loaded baseline with a catalog resource, cross-section rules, arrays, and two writes.",
				"docs-site/src/snippets/complex-studio-policies.tsx",
			)
		},
	},
)
