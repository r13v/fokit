import assert from "node:assert/strict"
import { constants } from "node:fs"
import { access, readdir, readFile } from "node:fs/promises"
import { test } from "node:test"

const siteRoot = new URL("../", import.meta.url)
const repositoryRoot = new URL("../", siteRoot)

const requiredDependencies = {
	"@fontsource-variable/newsreader": "5.3.0",
	"@types/react": "19.2.17",
	"@types/react-dom": "19.2.3",
	fokit: "file:..",
	react: "19.2.8",
	"react-dom": "19.2.8",
	typescript: "5.9.3",
	vite: "8.1.5",
	vocs: "2.7.2",
	waku: "1.0.0-beta.6",
	zod: "4.4.3",
}

const canonicalPages = [
	{
		path: "src/pages/index.mdx",
		route: "/",
		title: "Fokit",
		description: "Code-first React forms with native HTML semantics.",
		navText: "Overview",
	},
	{
		path: "src/pages/get-started.mdx",
		route: "/get-started",
		title: "Get started",
		description:
			"Render a Fokit form with native controls and default structural slots.",
	},
	{
		path: "src/pages/api.mdx",
		route: "/api",
		title: "API",
		description: "The public Fokit entry points and React form kit APIs.",
	},
	{
		path: "src/pages/types.mdx",
		route: "/types",
		title: "Types",
		description:
			"The TypeScript contracts that connect schemas, definitions, controls, and slots.",
	},
	{
		path: "src/pages/advanced.mdx",
		route: "/advanced",
		title: "Advanced",
		description:
			"Generated rendering, composition, submission, and state patterns for production forms.",
	},
	{
		path: "src/pages/faqs.mdx",
		route: "/faqs",
		title: "FAQs",
		description:
			"Common Fokit questions about defaults, themes, servers, and React versions.",
	},
	{
		path: "src/pages/guides/controls.mdx",
		route: "/guides/controls",
		title: "Controls",
		description:
			"How native controls and custom controls define values, metadata, and FormData.",
	},
	{
		path: "src/pages/guides/styling.mdx",
		route: "/guides/styling",
		title: "Styling",
		description:
			"Where Fokit's unstyled defaults end and application-owned styling begins.",
	},
	{
		path: "src/pages/guides/react-19-actions.mdx",
		route: "/guides/react-19-actions",
		title: "React 19 Actions",
		description:
			"How Fokit keeps React 19 server actions aligned with the same form store.",
	},
	{
		path: "src/pages/guides/tutorial.mdx",
		route: "/guides/tutorial",
		title: "Tutorial",
		description:
			"Build a generated Fokit form from the shipped defaults to production boundaries.",
	},
]

const publicApiTerms = [
	"createFormKit",
	"createDefaultSlots",
	"nativeControls",
	"defineControl",
	"useForm",
	"FormInstance",
	"parseFormData",
	"ActionForm",
]

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function readTextFrom(root, path) {
	return await readFile(new URL(path, root), "utf8")
}

async function readText(path) {
	return await readTextFrom(siteRoot, path)
}

async function readRepositoryText(path) {
	return await readTextFrom(repositoryRoot, path)
}

async function readJson(path) {
	return JSON.parse(await readText(path))
}

async function readRepositoryJson(path) {
	return JSON.parse(await readRepositoryText(path))
}

async function pathExists(path) {
	try {
		await access(new URL(path, siteRoot), constants.F_OK)
		return true
	} catch {
		return false
	}
}

async function listFiles(path) {
	const root = new URL(path, siteRoot)
	const entries = await readdir(root, { withFileTypes: true })
	const files = []

	for (const entry of entries) {
		const childPath = `${path}${entry.name}`

		if (entry.isDirectory()) {
			files.push(...(await listFiles(`${childPath}/`)))
			continue
		}

		if (entry.isFile()) {
			files.push(childPath)
		}
	}

	return files
}

test("docs package uses the Vocs shell scripts and dependencies", async () => {
	const packageJson = await readJson("package.json")

	assert.deepEqual(packageJson.scripts, {
		dev: "vocs dev",
		build: "vocs build",
		preview: "vocs preview",
		test: "node --test tests/content.test.mjs",
		typecheck: "tsc --project tsconfig.docs.json",
		"test:output": "node --test tests/build-output.test.mjs",
		"test:markdown": "vocs markdown-audit",
	})
	assert.deepEqual(packageJson.dependencies, requiredDependencies)
	assert.equal(packageJson.devDependencies, undefined)
})

test("docs TypeScript and verification gates are wired", async () => {
	const tsconfig = await readJson("tsconfig.docs.json")
	const rootPackageJson = await readRepositoryJson("package.json")
	const knipConfig = (
		await import(new URL("knip.config.js", repositoryRoot).href)
	).default
	const gitignore = await readRepositoryText(".gitignore")

	assert.deepEqual(tsconfig, {
		extends: "../tsconfig.json",
		include: [
			"vocs.config.ts",
			"src/components/**/*.ts",
			"src/components/**/*.tsx",
			"src/snippets/**/*.ts",
			"src/snippets/**/*.tsx",
		],
	})
	assert.equal(
		rootPackageJson.scripts["test:docs"],
		"npm run build && npm run typecheck --prefix docs-site",
	)
	assert.equal(
		rootPackageJson.scripts["site:verify"],
		"npm run site:test && npm run test:docs && BASE_PATH=/fokit npm run site:build && npm run test:markdown --prefix docs-site && npm run test:output --prefix docs-site && npm run site:test:e2e",
	)
	assert.equal(rootPackageJson.scripts.verify.includes("test:docs"), false)
	assert.deepEqual(knipConfig.workspaces["docs-site"].entry, [
		"vocs.config.ts",
		"src/pages/**/*.mdx",
		"src/pages/**/*.css",
	])
	assert.deepEqual(knipConfig.workspaces["docs-site"].project, [
		"src/**/*.{js,jsx,mjs,ts,tsx,mdx,css}",
	])
	assert.equal(typeof knipConfig.compilers.css, "function")
	assert.equal(knipConfig.compilers.mdx, true)
	assert.match(gitignore, /^docs-site\/\.vocs\/$/m)
})

test("Vocs config defines the static English documentation shell", async () => {
	const source = await readText("vocs.config.ts")

	assert.match(source, /from "vocs\/config"/)
	assert.match(source, /title:\s*"Fokit"/)
	assert.match(
		source,
		/description:\s*"Code-first, schema-validated React forms without giving up native HTML semantics\."/,
	)
	assert.match(source, /baseUrl:\s*"https:\/\/r13v\.github\.io\/fokit"/)
	assert.match(source, /basePath:\s*process\.env\.BASE_PATH\s*\?\?\s*"\/"/)
	assert.match(source, /renderStrategy:\s*"full-static"/)
	assert.match(source, /checkDeadlinks:\s*true/)
	assert.match(source, /socials:\s*\[\s*\{\s*icon:\s*"github"/)
	assert.match(source, /link:\s*"https:\/\/github\.com\/r13v\/fokit"/)
	assert.match(
		source,
		/editLink:\s*\{\s*link:\s*"https:\/\/github\.com\/r13v\/fokit\/edit\/main\/docs-site\/:path"/,
	)
	assert.match(source, /codeHighlight:\s*\{[\s\S]*light:\s*"github-light"/)
	assert.match(source, /codeHighlight:\s*\{[\s\S]*dark:\s*"github-dark"/)
	assert.match(
		source,
		/sidebar:\s*\[[\s\S]*text:\s*"Get started"[\s\S]*link:\s*"\/get-started"/,
	)
	assert.doesNotMatch(source, /mcp\s*:/)
	assert.doesNotMatch(source, /feedback\s*:/)
	assert.doesNotMatch(source, /ogImageUrl\s*:/)
	assert.doesNotMatch(source, /redirects\s*:/)
	assert.doesNotMatch(source, /#\/|LOCALES|locale-switch|\/en\/|\/ru\//)
})

test("Vocs pages expose the canonical English route map", async () => {
	const config = await readText("vocs.config.ts")

	for (const page of canonicalPages) {
		const source = await readText(page.path)
		const frontmatter = new RegExp(
			`^---\\ntitle: ${escapeRegExp(page.title)}\\ndescription: ${escapeRegExp(
				page.description,
			)}\\n---\\n`,
		)
		const navText = page.navText ?? page.title
		const sidebarEntry = new RegExp(
			`text:\\s*"${escapeRegExp(navText)}"\\s*,\\s*link:\\s*"${escapeRegExp(
				page.route,
			)}"`,
		)

		assert.match(source, frontmatter, `${page.path} needs English metadata`)
		assert.doesNotMatch(source, /[А-Яа-яЁё]/, `${page.path} must stay English`)
		assert.doesNotMatch(source, /#\/|LOCALES|locale-switch/)
		assert.match(config, sidebarEntry, `${page.route} must be in the sidebar`)
	}
})

test("API shell keeps public exports discoverable", async () => {
	const source = await readText("src/pages/api.mdx")

	for (const term of publicApiTerms) {
		assert.match(source, new RegExp(`\\b${term}\\b`))
	}
})

test("Vocs root page and root CSS replace the custom app shell", async () => {
	const page = await readText("src/pages/index.mdx")
	const css = await readText("src/pages/_root.css")

	assert.match(page, /^---\ntitle: Fokit\ndescription: /)
	assert.match(page, /createFormKit\(\{\s*controls: nativeControls/)
	assert.match(page, /createDefaultSlots/)
	assert.doesNotMatch(page, /[А-Яа-яЁё]/)

	assert.match(css, /@import "@fontsource-variable\/newsreader"/)
	assert.match(css, /--fokit-brand-green:/)
	assert.match(css, /Newsreader Variable/)
	assert.doesNotMatch(css, /\.site-shell|\.locale-switch|\.syntax-token/)
})

test("bespoke SPA files are removed while migration content stays inactive", async () => {
	const deletedFiles = [
		"index.html",
		"vite.config.mjs",
		"src/app.jsx",
		"src/examples.js",
		"src/main.jsx",
		"src/routing.mjs",
		"src/routing.test.mjs",
		"src/styles.css",
		"src/content.test.mjs",
	]

	for (const file of deletedFiles) {
		assert.equal(await pathExists(file), false, `${file} should be removed`)
	}

	assert.equal(await pathExists("src/content.js"), true)

	const inactiveMigrationFiles = new Set(["src/content.js", "src/lab.jsx"])
	const sourceFiles = await listFiles("src/")
	const activeFiles = sourceFiles.filter(
		(file) => !inactiveMigrationFiles.has(file),
	)
	for (const file of activeFiles) {
		const source = await readText(file)
		assert.doesNotMatch(source, /content\.js|LOCALES|#\/|locale-switch/)
		assert.doesNotMatch(source, /@phosphor-icons\/react|syntaxPattern/)
	}
})

test("docs-site instructions describe the English-only Vocs boundary", async () => {
	const source = await readText("AGENTS.md")

	assert.match(source, /English-only Vocs/)
	assert.match(source, /clean path routes/)
	assert.match(source, /static GitHub Pages/)
	assert.match(source, /physical snippets/)
	assert.match(source, /public package imports/)
	assert.doesNotMatch(source, /Russian|hash routes|#\/|locale/i)
})
