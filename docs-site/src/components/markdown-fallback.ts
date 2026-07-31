export function markdownFallback(description: string, sourcePath: string) {
	return [
		{ type: "paragraph", children: [{ type: "text", value: description }] },
		{
			type: "paragraph",
			children: [
				{ type: "text", value: "Source: " },
				{
					type: "link",
					url: `https://github.com/r13v/fokit/blob/main/${sourcePath}`,
					children: [{ type: "text", value: sourcePath }],
				},
			],
		},
	]
}
