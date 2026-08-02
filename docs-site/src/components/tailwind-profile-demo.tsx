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
				"The live Tailwind profile form runs only in a browser. Its account section changes utility classes when the account type changes.",
				"docs-site/src/components/tailwind-profile-demo.client.tsx",
			)
		},
	},
)
