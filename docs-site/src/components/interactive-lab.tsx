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
								"The Interactive Fokit Lab runs only in a browser. It demonstrates a generated form, validation, reset, classic submission, array actions, and native FormData.",
						},
					],
				},
				{
					type: "paragraph",
					children: [
						{ type: "text", value: "Source: " },
						{
							type: "link",
							url: "https://github.com/r13v/fokit/blob/main/docs-site/src/components/interactive-lab.client.tsx",
							children: [
								{
									type: "text",
									value: "docs-site/src/components/interactive-lab.client.tsx",
								},
							],
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
