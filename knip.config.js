const docsStyleCompiler = (source) => {
	const imports = []
	const importPattern =
		/@import\s+(?:url\(\s*)?(?:"([^"]+)"|'([^']+)'|([^"')\s;]+))/g

	for (const match of source.matchAll(importPattern)) {
		const specifier = match[1] ?? match[2] ?? match[3]

		if (specifier && !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(specifier)) {
			imports.push(`import ${JSON.stringify(specifier)}`)
		}
	}

	return imports.join("\n")
}

export default {
	compilers: {
		css: docsStyleCompiler,
		mdx: true,
	},
	ignore: ["tests/fixtures/**"],
	ignoreDependencies: ["fokit", "zod"],
	ignoreFiles: ["docs-site/src/content.js", "docs-site/src/lab.jsx"],
	workspaces: {
		".": {
			project: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
		},
		"docs-site": {
			entry: [
				"vocs.config.ts",
				"src/pages/**/*.mdx",
				"src/pages/**/*.css",
				"src/snippets/**/*.ts",
				"src/snippets/**/*.tsx",
			],
			project: ["src/**/*.{js,jsx,mjs,ts,tsx,mdx,css}"],
		},
	},
	tags: ["-lintignore"],
}
