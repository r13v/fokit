const docsStyleCompiler = (source) => {
	return source.includes("@fontsource-variable/newsreader")
		? 'import "@fontsource-variable/newsreader"'
		: ""
}

export default {
	compilers: {
		css: docsStyleCompiler,
		mdx: true,
	},
	ignore: ["tests/fixtures/**"],
	ignoreDependencies: ["form-please", "zod"],
	ignoreFiles: [],
	workspaces: {
		".": {
			entry: [
				"src/index.ts",
				"src/core/index.ts",
				"src/history/index.ts",
				"src/react19/index.ts",
				"src/server/index.ts",
			],
			project: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
		},
		"docs-site": {
			entry: [
				"vocs.config.ts",
				"src/pages/**/*.mdx",
				"src/pages/**/*.css",
				"src/components/**/*.tsx",
				"src/snippets/**/*.ts",
				"src/snippets/**/*.tsx",
			],
			project: ["src/**/*.{js,jsx,mjs,ts,tsx,mdx,css}"],
		},
	},
	tags: ["-lintignore"],
}
