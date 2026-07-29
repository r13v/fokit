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
	sidebar: [{ text: "Get started", link: "/" }],
})
