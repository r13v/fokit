import type { ReactElement } from "react"

import { InteractiveLabClient } from "./interactive-lab.client"

export const InteractiveLab = Object.assign(
	function InteractiveLab(): ReactElement {
		return <InteractiveLabClient />
	},
	{
		toMarkdown() {
			return [
				{
					type: "paragraph",
					children: [
						{
							type: "text",
							value:
								"The Interactive Fokit Lab is a browser-only lab. It uses the same generated form definition, validation, reset, classic submit, array actions, and native FormData behavior shown on the page.",
						},
					],
				},
				{
					type: "code",
					lang: "ts",
					value:
						'import { createFormKit, nativeControls } from "fokit"\n\nconst kit = createFormKit({ controls: nativeControls })',
				},
			]
		},
	},
)
