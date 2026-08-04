import type { ReactElement } from "react"

import { markdownFallback } from "./markdown-fallback"
import { TailwindProfileDemoClient } from "./tailwind-profile-demo.client"

export const TailwindProfileDemo = Object.assign(
	function TailwindProfileDemo(): ReactElement {
		return <TailwindProfileDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The live Tailwind profile form runs only in a browser. A synchronous resolver changes its account-section utility classes from the current React Hook Form values.",
				"docs-site/src/components/tailwind-profile-demo.client.tsx",
			)
		},
	},
)
