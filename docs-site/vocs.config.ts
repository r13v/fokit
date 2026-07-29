import { defineConfig } from "vocs/config"

export default defineConfig({
	title: "Fokit",
	description:
		"Code-first, schema-validated React forms without giving up native HTML semantics.",
	baseUrl: "https://r13v.github.io/fokit",
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
		{ text: "Overview", link: "/" },
		{ text: "Get started", link: "/get-started" },
		{ text: "API", link: "/api" },
		{ text: "Types", link: "/types" },
		{ text: "Advanced", link: "/advanced" },
		{ text: "FAQs", link: "/faqs" },
		{ text: "Controls", link: "/guides/controls" },
		{ text: "Styling", link: "/guides/styling" },
		{ text: "React 19 Actions", link: "/guides/react-19-actions" },
		{ text: "Tutorial", link: "/guides/tutorial" },
	],
})
