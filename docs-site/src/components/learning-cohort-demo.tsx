import type { ReactElement } from "react"

import { LearningCohortDemoClient } from "./learning-cohort-demo.client"
import { markdownFallback } from "./markdown-fallback"

export const LearningCohortDemo = Object.assign(
	function LearningCohortDemo(): ReactElement {
		return <LearningCohortDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The cohort editor runs in a browser. It combines remote title suggestions, configuration and price arrays, media, four offers, and conflict recovery.",
				"docs-site/src/snippets/complex-learning-cohort.tsx",
			)
		},
	},
)
