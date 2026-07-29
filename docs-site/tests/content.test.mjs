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
			"Render a Fokit form with native controls, default structural slots, and the Interactive Fokit Lab.",
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

const canonicalSnippets = [
	{
		target: "src/snippets/form-kit.tsx",
		include: "~/snippets/form-kit.tsx",
		terms: ["createFormKit", "defineControl", "profileSchema"],
	},
	{
		target: "src/snippets/basic-form.tsx",
		include: "~/snippets/basic-form.tsx",
		terms: ["useForm", "kit.Form", "ProfileEditor"],
	},
	{
		target: "src/snippets/server-action.ts",
		include: "~/snippets/server-action.ts",
		terms: ["parseFormData", "FormResult", "saveProfileAction"],
	},
]

const supersededRepositoryFiles = [
	"docs/getting-started.md",
	"docs/controls.md",
	"docs/styling.md",
	"docs/react19-actions.md",
	"docs/tutorial.md",
	"examples/form-kit.tsx",
	"examples/basic-form.tsx",
	"examples/server-action.ts",
]

const requiredCorePageContent = {
	"src/pages/get-started.mdx": {
		headings: [
			"Installation",
			"Build your first form",
			"Create a kit with native controls",
			"Render a generated form",
			"Validation follows the schema",
			"Submit with native form semantics",
			"Native FormData caveats",
		],
		terms: [
			"createFormKit",
			"nativeControls",
			"createDefaultSlots",
			"kit.AutoForm",
			"Standard Schema",
			"FormData",
		],
	},
	"src/pages/api.mdx": {
		headings: [
			"Entry-point boundaries",
			"useForm",
			"createFormKit",
			"defineControl",
			"Granular hooks",
			"FormInstance",
			"React-free core",
			"parseFormData",
			"ActionForm and ActionSubmit",
		],
		terms: [
			"fokit/core",
			"fokit/server",
			"fokit/react19",
			"kit.defineForm",
			"kit.AutoForm",
			"kit.Fields",
			"useArrayField",
			"useFormState",
			"createFormStore",
			"computed",
			"resolveUi",
		],
	},
	"src/pages/types.mdx": {
		headings: [
			"Input and output",
			"Definitions and UI nodes",
			"Instance and options",
			"Control inference",
			"Structural slot props",
			"Snapshot and issues",
			"Paths",
			"Result types",
		],
		terms: [
			"FormInput",
			"FormOutput",
			"FormDefinition",
			"ControlProps",
			"NativeSelectOptions",
			"FieldSlotProps",
			"FormSnapshot",
			"FieldPath",
			"FormResult",
		],
	},
	"src/pages/advanced.mdx": {
		headings: [
			"Accessibility",
			"Generated and manual composition",
			"Reactive dependencies",
			"Hidden values",
			"Stable array identity",
			"Untrusted FormData",
			"React 19 Actions",
			"Structural layout",
			"Public-boundary testing",
		],
		terms: [
			"labelProps",
			"kit.Fields",
			"computed",
			"valuePolicy",
			"useArrayField",
			"parseFormData",
			"ActionForm",
			"fokit/layout.css",
		],
	},
	"src/pages/faqs.mdx": {
		headings: [
			"Why use Fokit instead of a smaller form hook?",
			"Are Fokit controls controlled or uncontrolled?",
			"Does Fokit require Zod?",
			"Why are complete default values required?",
			"Can I use an existing component library?",
			"What happens when a field becomes hidden?",
			"How do I reset a form?",
			"How do server errors reach fields?",
			"How do React 18 and React 19 differ?",
			"Does every field rerender on each change?",
			"Why is there no built-in theme?",
		],
		terms: [
			"nativeControls",
			"createDefaultSlots",
			"defineControl",
			"Standard Schema",
			"form.reset()",
			"SubmissionIssue",
			"useField",
		],
	},
}

const requiredGuidePageContent = {
	"src/pages/guides/controls.mdx": {
		headings: [
			"Native controls",
			"Custom control contract",
			"FormData modes",
			"Default structural slots",
			"Kit creation",
		],
		terms: [
			"nativeControls",
			"defineControl",
			'mode: "native"',
			"createDefaultSlots",
			"ArrayItem",
		],
	},
	"src/pages/guides/styling.mdx": {
		headings: [
			"Import the stylesheet",
			"What the CSS does",
			"Custom properties",
			"Data attributes",
			"Styling boundary",
		],
		terms: [
			"fokit/layout.css",
			"@layer fokit",
			"--fokit-column-gap",
			"data-fokit-node",
			"visual theme",
		],
	},
	"src/pages/guides/react-19-actions.mdx": {
		headings: [
			"Entry point",
			"Client form",
			"Server Action",
			"Result transport",
			"Compatibility failures",
		],
		terms: [
			"fokit/react19",
			"ActionForm",
			"ActionSubmit",
			"parseFormData",
			"FormResult",
		],
	},
	"src/pages/guides/tutorial.mdx": {
		headings: [
			"Install",
			"Define the schema",
			"Create the kit with native controls",
			"Define fields",
			"Dynamic options are computed options",
			"Render AutoForm",
			"Compose manually when needed",
			"Use transactions deliberately",
			"Parse FormData on the server",
			"Use React 19 Actions separately",
			"Add layout only when wanted",
			"Test the examples",
			"Product boundary",
		],
		terms: [
			"nativeControls",
			"createDefaultSlots",
			'valuePolicy: "unset"',
			"parseFormData",
			"ActionForm",
		],
	},
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function collectCodeFences(source) {
	return [...source.matchAll(/^```([^\n]*)\n([\s\S]*?)^```$/gm)].map(
		(match) => {
			const info = match[1]?.trim() ?? ""
			const code = match[2] ?? ""

			return {
				info,
				language: info.split(/\s+/)[0] ?? "",
				code,
			}
		},
	)
}

function collectIncludes(source) {
	return [
		...source.matchAll(
			/\/\/ \[!include ([^\]\s:]+)(?::[^\]\s]+)?(?: [^\]]+)?\]/g,
		),
	].map((match) => match[1])
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

async function pathExistsFrom(root, path) {
	try {
		await access(new URL(path, root), constants.F_OK)
		return true
	} catch {
		return false
	}
}

async function pathExists(path) {
	return await pathExistsFrom(siteRoot, path)
}

async function repositoryPathExists(path) {
	return await pathExistsFrom(repositoryRoot, path)
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
		"npm run site:test && npm run test:docs && BASE_URL=http://127.0.0.1:4175 BASE_PATH=/fokit npm run site:build && npm run test:markdown --prefix docs-site && npm run test:output --prefix docs-site && npm run site:test:e2e",
	)
	assert.equal(rootPackageJson.scripts.verify.includes("test:docs"), false)
	assert.deepEqual(knipConfig.workspaces["docs-site"].entry, [
		"vocs.config.ts",
		"src/pages/**/*.mdx",
		"src/pages/**/*.css",
		"src/components/**/*.ts",
		"src/components/**/*.tsx",
		"src/snippets/**/*.ts",
		"src/snippets/**/*.tsx",
	])
	assert.deepEqual(knipConfig.workspaces["docs-site"].project, [
		"src/**/*.{js,jsx,mjs,ts,tsx,mdx,css}",
	])
	assert.equal(typeof knipConfig.compilers.css, "function")
	assert.equal(knipConfig.compilers.mdx, true)
	assert.deepEqual(knipConfig.ignoreFiles, [])
	assert.match(gitignore, /^docs-site\/\.vocs\/$/m)
})

test("Interactive Lab uses Vocs components and public Fokit defaults", async () => {
	const wrapper = await readText("src/components/interactive-lab.tsx")
	const client = await readText("src/components/interactive-lab.client.tsx")
	const getStarted = await readText("src/pages/get-started.mdx")

	assert.match(wrapper, /from "\.\/interactive-lab\.client"/)
	assert.match(wrapper, /toMarkdown/)
	assert.match(wrapper, /browser-only lab/)
	assert.match(wrapper, /createFormKit\(\{ controls: nativeControls \}\)/)
	assert.match(client, /^"use client"/)
	assert.match(client, /createDefaultSlots/)
	assert.match(client, /nativeControls/)
	assert.match(client, /controls:\s*nativeControls/)
	assert.match(client, /slots:\s*createDefaultSlots\(\{\s*i18n:/)
	assert.match(client, /arrayAdd:\s*"Add contact"/)
	assert.match(client, /arrayRemove:\s*\(\{ position \}\) =>/)
	assert.match(client, /arrayMoveUp:\s*\(\{ position \}\) =>/)
	assert.match(client, /arrayMoveDown:\s*\(\{ position \}\) =>/)
	assert.doesNotMatch(
		client,
		/defineControl|fokit\/layout\.css|locale|localStorage/,
	)
	assert.doesNotMatch(client, /[А-Яа-яЁё]/)
	assert.match(
		getStarted,
		/import \{ InteractiveLab \} from "\.\.\/components\/interactive-lab"/,
	)
	assert.match(getStarted, /<InteractiveLab \/>/)
})

test("canonical TypeScript snippets are physical files covered by docs typecheck", async () => {
	const tsconfig = await readJson("tsconfig.docs.json")
	const includeSet = new Set(tsconfig.include)

	assert.equal(includeSet.has("src/snippets/**/*.ts"), true)
	assert.equal(includeSet.has("src/snippets/**/*.tsx"), true)

	for (const snippet of canonicalSnippets) {
		const target = await readText(snippet.target)

		assert.notEqual(target.trim(), "", `${snippet.target} must not be empty`)

		for (const term of snippet.terms) {
			assert.match(
				target,
				new RegExp(escapeRegExp(term)),
				`${snippet.target} must keep ${term} discoverable`,
			)
		}
	}
})

test("TypeScript documentation fences are checked or backed by physical snippets", async () => {
	const pages = (await listFiles("src/pages/")).filter((file) =>
		file.endsWith(".mdx"),
	)
	const expectedIncludes = new Set(
		canonicalSnippets.map((snippet) => snippet.include),
	)
	const seenIncludes = new Set()

	for (const page of pages) {
		const source = await readText(page)

		assert.doesNotMatch(source, /@noErrors/)
		assert.doesNotMatch(source, /@errors:/)

		for (const fence of collectCodeFences(source)) {
			if (fence.language !== "ts" && fence.language !== "tsx") {
				continue
			}

			const includes = collectIncludes(fence.code)

			if (includes.length === 0) {
				assert.match(
					fence.info,
					/(^|\s)twoslash(\s|$)/,
					`${page} has an inline ${fence.language} fence without twoslash`,
				)
				continue
			}

			for (const include of includes) {
				assert.match(
					include,
					/^~\/snippets\/[^/]+\.(ts|tsx)$/,
					`${page} includes ${include} outside src/snippets`,
				)
				assert.equal(
					expectedIncludes.has(include),
					true,
					`${page} includes unexpected snippet ${include}`,
				)
				seenIncludes.add(include)
				assert.equal(
					await pathExists(include.replace(/^~\//, "src/")),
					true,
					`${page} includes missing snippet ${include}`,
				)
			}
		}
	}

	assert.deepEqual(seenIncludes, expectedIncludes)
})

test("Vocs config defines the static English documentation shell", async () => {
	const source = await readText("vocs.config.ts")

	assert.match(source, /from "vocs\/config"/)
	assert.match(source, /title:\s*"Fokit"/)
	assert.match(
		source,
		/description:\s*"Code-first, schema-validated React forms without giving up native HTML semantics\."/,
	)
	assert.match(
		source,
		/baseUrl:\s*process\.env\.BASE_URL\s*\?\?\s*"https:\/\/r13v\.github\.io\/fokit"/,
	)
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

test("core Vocs pages preserve the migrated section groups", async () => {
	for (const [path, content] of Object.entries(requiredCorePageContent)) {
		const source = await readText(path)

		for (const heading of content.headings) {
			assert.match(
				source,
				new RegExp(`^## ${escapeRegExp(heading)}$`, "m"),
				`${path} must expose ${heading}`,
			)
		}

		for (const term of content.terms) {
			assert.match(
				source,
				new RegExp(escapeRegExp(term)),
				`${path} must keep ${term} discoverable`,
			)
		}
	}
})

test("Vocs guides preserve the migrated public guide sections", async () => {
	for (const [path, content] of Object.entries(requiredGuidePageContent)) {
		const source = await readText(path)

		for (const heading of content.headings) {
			assert.match(
				source,
				new RegExp(`^## ${escapeRegExp(heading)}$`, "m"),
				`${path} must expose ${heading}`,
			)
		}

		for (const term of content.terms) {
			assert.match(
				source,
				new RegExp(escapeRegExp(term)),
				`${path} must keep ${term} discoverable`,
			)
		}
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

test("bespoke SPA files and temporary migration content are removed", async () => {
	const deletedFiles = [
		"index.html",
		"vite.config.mjs",
		"src/app.jsx",
		"src/content.js",
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

	const sourceFiles = await listFiles("src/")
	for (const file of sourceFiles) {
		const source = await readText(file)
		assert.doesNotMatch(
			source,
			/content\.js|LOCALES|#\/|locale-switch|fokit\.docs\.locale|localStorage/,
		)
		assert.doesNotMatch(source, /@phosphor-icons\/react|syntaxPattern/)
	}
})

test("superseded public guides and example copies are deleted", async () => {
	const readme = await readRepositoryText("README.md")
	const tutorial = await readRepositoryText("docs/tutorial.ru.md")

	for (const file of supersededRepositoryFiles) {
		assert.equal(
			await repositoryPathExists(file),
			false,
			`${file} should be removed after Vocs parity passes`,
		)
		assert.doesNotMatch(readme, new RegExp(escapeRegExp(file)))
		assert.doesNotMatch(tutorial, new RegExp(escapeRegExp(file)))
	}

	assert.match(readme, /https:\/\/r13v\.github\.io\/fokit\/get-started/)
	assert.match(
		readme,
		/https:\/\/r13v\.github\.io\/fokit\/guides\/react-19-actions/,
	)
	assert.match(readme, /docs-site\/src\/snippets\/form-kit\.tsx/)
	assert.match(tutorial, /https:\/\/r13v\.github\.io\/fokit\/guides\/tutorial/)
	assert.match(tutorial, /docs-site\/src\/snippets\/form-kit\.tsx/)
	assert.match(tutorial, /docs-site\/src\/snippets\/basic-form\.tsx/)
	assert.match(tutorial, /docs-site\/src\/snippets\/server-action\.ts/)
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
