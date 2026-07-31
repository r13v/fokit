import { defineConfig } from "vocs/config"

export default defineConfig({
	title: "Form, Please",
	description:
		"Typed, schema-validated React forms that keep native HTML semantics and your design system.",
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
	socials: [{ icon: "github", link: "https://github.com/r13v/form-please" }],
	editLink: {
		link: "https://github.com/r13v/form-please/edit/main/docs-site/:path",
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
				{ text: "Transaction hooks", link: "/guides/transaction-hooks" },
				{ text: "Arrays", link: "/guides/arrays" },
				{ text: "Controls & design systems", link: "/guides/controls" },
				{
					text: "Async multiselect",
					link: "/guides/async-multiselect",
				},
				{ text: "Async fields", link: "/guides/async-fields" },
				{ text: "Styling", link: "/guides/styling" },
				{ text: "React 19 Actions", link: "/guides/react-19-actions" },
				{ text: "Production recipes", link: "/advanced" },
			],
		},
		{
			text: "Examples",
			collapsed: false,
			items: [
				{ text: "Complex examples", link: "/examples" },
				{ text: "Research grant", link: "/examples/research-grant" },
				{ text: "Studio policies", link: "/examples/studio-policies" },
				{ text: "Makerspace launch", link: "/examples/makerspace-launch" },
				{ text: "Learning cohort", link: "/examples/learning-cohort" },
				{ text: "Membership ladder", link: "/examples/membership-ladder" },
				{ text: "Campaign builder", link: "/examples/campaign-builder" },
			],
		},
		{
			text: "Reference",
			collapsed: false,
			items: [
				{ text: "API", link: "/api" },
				{ text: "TypeScript", link: "/types" },
				{
					text: "LLM documentation index",
					link: "https://r13v.github.io/form-please/llms.txt",
				},
				{
					text: "Full documentation for LLMs",
					link: "https://r13v.github.io/form-please/llms-full.txt",
				},
			],
		},
		{
			text: "Help",
			collapsed: false,
			items: [{ text: "FAQs", link: "/faqs" }],
		},
	],
})
