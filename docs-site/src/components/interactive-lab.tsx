import type { ReactElement } from "react"

import { InteractiveLabClient } from "./interactive-lab.client"
import { markdownFallback } from "./markdown-fallback"

export const InteractiveLab = Object.assign(
	function InteractiveLab(): ReactElement {
		return <InteractiveLabClient />
	},
	{
		toMarkdown() {
			return [
				...markdownFallback(
					"The Interactive 'Form, Please' Lab runs only in a browser. It demonstrates a generated form, TanStack validation, reset, array actions, subscriptions, and a diagnostic native FormData snapshot. Submission uses TanStack Form values.",
					"docs-site/src/components/interactive-lab.client.tsx",
				),
				{
					type: "paragraph",
					children: [
						{ type: "text", value: "Its form kit uses " },
						{ type: "inlineCode", value: "controls: createNativeControls()" },
						{ type: "text", value: " and " },
						{ type: "inlineCode", value: "slots: createDefaultSlots()" },
						{ type: "text", value: "." },
					],
				},
			]
		},
	},
)
