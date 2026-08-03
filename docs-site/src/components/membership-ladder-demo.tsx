import type { ReactElement } from "react"

import { markdownFallback } from "./markdown-fallback"
import { MembershipLadderDemoClient } from "./membership-ladder-demo.client"

export const MembershipLadderDemo = Object.assign(
	function MembershipLadderDemo(): ReactElement {
		return <MembershipLadderDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The membership ladder runs in a browser. Four nested tiers use cross-tier validation with workspace actions and pause-calendar shortcuts.",
				"docs-site/src/snippets/complex-membership-ladder.tsx",
			)
		},
	},
)
