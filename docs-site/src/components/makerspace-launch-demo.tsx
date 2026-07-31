import type { ReactElement } from "react"

import { MakerspaceLaunchDemoClient } from "./makerspace-launch-demo.client"
import { markdownFallback } from "./markdown-fallback"

export const MakerspaceLaunchDemo = Object.assign(
	function MakerspaceLaunchDemo(): ReactElement {
		return <MakerspaceLaunchDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The makerspace launch wizard runs in a browser. Four form-owned stages preserve address lookup, coordinates, media, pricing, and promotion state.",
				"docs-site/src/snippets/complex-makerspace-launch.tsx",
			)
		},
	},
)
