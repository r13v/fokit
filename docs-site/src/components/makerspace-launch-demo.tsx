import type { ReactElement } from "react"

import { MakerspaceLaunchDemoClient } from "./makerspace-launch-demo.client"

export const MakerspaceLaunchDemo = Object.assign(
	function MakerspaceLaunchDemo(): ReactElement {
		return <MakerspaceLaunchDemoClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The makerspace launch wizard runs in a browser. Four form-owned stages preserve address lookup, coordinates, media, pricing, and promotion state.",
				"complex-makerspace-launch.tsx",
			)
		},
	},
)

function markdownFallback(description: string, file: string) {
	return [
		{ type: "paragraph", children: [{ type: "text", value: description }] },
		{
			type: "paragraph",
			children: [
				{ type: "text", value: "Source: " },
				{
					type: "link",
					url: `https://github.com/r13v/fokit/blob/main/docs-site/src/snippets/${file}`,
					children: [{ type: "text", value: `docs-site/src/snippets/${file}` }],
				},
			],
		},
	]
}
