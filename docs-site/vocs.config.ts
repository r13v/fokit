import { defineConfig } from "vocs/config"

export default defineConfig({
	title: "Fokit",
	description:
		"Code-first, schema-validated React forms without giving up native HTML semantics.",
	baseUrl: process.env.BASE_URL ?? "https://r13v.github.io",
	basePath: process.env.BASE_PATH ?? "/",
	renderStrategy: "full-static",
	checkDeadlinks: true,
	codeHighlight: {
		themes: {
			light: "github-light",
			dark: "github-dark",
		},
	},
	socials: [{ icon: "github", link: "https://github.com/r13v/fokit" }],
	editLink: {
		link: "https://github.com/r13v/fokit/edit/main/docs-site/:path",
		text: "Edit this page",
	},
	sidebar: [
		{
			text: "Start",
			collapsed: false,
			items: [
				{ text: "Overview", link: "/" },
				{ text: "Get started", link: "/get-started" },
				{ text: "Build a production form", link: "/guides/tutorial" },
			],
		},
		{
			text: "Guides",
			collapsed: false,
			items: [
				{ text: "UI definitions", link: "/guides/ui-definitions" },
				{ text: "Validation & errors", link: "/guides/validation" },
				{
					text: "Conditional fields",
					link: "/guides/conditional-fields",
				},
				{ text: "Arrays", link: "/guides/arrays" },
				{ text: "Controls & design systems", link: "/guides/controls" },
				{ text: "Styling", link: "/guides/styling" },
				{ text: "React 19 Actions", link: "/guides/react-19-actions" },
				{ text: "Production recipes", link: "/advanced" },
			],
		},
		{
			text: "Reference",
			collapsed: false,
			items: [
				{ text: "API", link: "/api" },
				{ text: "TypeScript", link: "/types" },
			],
		},
		{
			text: "Help",
			collapsed: false,
			items: [{ text: "FAQs", link: "/faqs" }],
		},
	],
})
