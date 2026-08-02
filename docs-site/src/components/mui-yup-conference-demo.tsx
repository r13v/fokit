import type { ReactElement } from "react"
import { markdownFallback } from "./markdown-fallback"
import { MuiYupConferenceDemoClient } from "./mui-yup-conference-demo.client"

export const MuiYupConferenceDemo = Object.assign(
	function MuiYupConferenceDemo(): ReactElement {
		return <MuiYupConferenceDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The Material UI conference form runs in a browser. It uses the official preset and validates the proposal directly with Yup through Standard Schema.",
				"docs-site/src/snippets/mui-yup-conference.tsx",
			)
		},
	},
)
