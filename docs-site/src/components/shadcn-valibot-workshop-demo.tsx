import type { ReactElement } from "react"
import { markdownFallback } from "./markdown-fallback"
import { ShadcnValibotWorkshopDemoClient } from "./shadcn-valibot-workshop-demo.client"

export const ShadcnValibotWorkshopDemo = Object.assign(
	function ShadcnValibotWorkshopDemo(): ReactElement {
		return <ShadcnValibotWorkshopDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The shadcn workshop form runs in a browser. It validates with Valibot and renders application-owned Base UI controls from the registry adapter.",
				"docs-site/src/snippets/shadcn-valibot-workshop.tsx",
			)
		},
	},
)
