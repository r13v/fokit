import type { ReactElement } from "react"

import { AsyncMultiSelectDemoClient } from "./async-multiselect-demo.client"

export const AsyncMultiSelectDemo = Object.assign(
	function AsyncMultiSelectDemo(): ReactElement {
		return <AsyncMultiSelectDemoClient />
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
								"The live async multiselect runs only in a browser. It stores selected IDs in Fokit, loads matching options through TanStack Query, and manages the popup with Floating UI.",
						},
					],
				},
				{
					type: "paragraph",
					children: [
						{ type: "text", value: "Source: " },
						{
							type: "link",
							url: "https://github.com/r13v/fokit/blob/main/docs-site/src/snippets/async-multiselect.tsx",
							children: [
								{
									type: "text",
									value: "docs-site/src/snippets/async-multiselect.tsx",
								},
							],
						},
					],
				},
			]
		},
	},
)
