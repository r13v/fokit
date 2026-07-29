import type { ReactElement } from "react"

import { InteractiveLabClient } from "./interactive-lab.client"

type MarkdownText = {
	readonly type: "text"
	readonly value: string
}

type MarkdownNode =
	| {
			readonly type: "paragraph"
			readonly children: readonly MarkdownText[]
	  }
	| {
			readonly type: "code"
			readonly lang: string
			readonly value: string
	  }

type InteractiveLabComponent = {
	(): ReactElement
	toMarkdown(): readonly MarkdownNode[]
}

export const InteractiveLab = Object.assign(
	function InteractiveLab(): ReactElement {
		return <InteractiveLabClient />
	},
	{
		toMarkdown(): readonly MarkdownNode[] {
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
) satisfies InteractiveLabComponent
