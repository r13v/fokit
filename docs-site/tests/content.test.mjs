import assert from "node:assert/strict"
import { constants } from "node:fs"
import { access, readdir, readFile } from "node:fs/promises"
import { test } from "node:test"

const siteRoot = new URL("../", import.meta.url)
const repositoryRoot = new URL("../", siteRoot)

const requiredDependencies = {
	"@floating-ui/react": "0.27.20",
	"@fontsource-variable/newsreader": "5.3.0",
	"@heroicons/react": "2.2.0",
	"@tanstack/react-query": "5.101.4",
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
		description:
			"Typed, schema-validated React forms that keep native semantics and your design system.",
		navText: "Overview",
	},
	{
		path: "src/pages/get-started.mdx",
		route: "/get-started",
		title: "Get started",
		description:
			"Build and submit your first typed Fokit form, then see how schema, UI, and controls fit together.",
	},
	{
		path: "src/pages/guides/tutorial.mdx",
		route: "/guides/tutorial",
		title: "Tutorial",
		description:
			"Grow the first Fokit form into a production-ready profile editor with validation, conditional fields, arrays, and typed output.",
		navText: "Build a production form",
	},
	{
		path: "src/pages/guides/ui-definitions.mdx",
		route: "/guides/ui-definitions",
		title: "UI definitions",
		description:
			"Describe fields, sections, arrays, layout, and derived interaction state in one typed UI tree.",
	},
	{
		path: "src/pages/guides/validation.mdx",
		route: "/guides/validation",
		title: "Validation and errors",
		description:
			"Control when Fokit validates, when errors become visible, and how server errors recover after editing.",
		navText: "Validation & errors",
	},
	{
		path: "src/pages/guides/conditional-fields.mdx",
		route: "/guides/conditional-fields",
		title: "Conditional fields",
		description:
			"Derive visibility, interaction state, labels, and options from automatically tracked form values and runtime context.",
	},
	{
		path: "src/pages/guides/arrays.mdx",
		route: "/guides/arrays",
		title: "Arrays",
		description:
			"Render repeatable fields with stable row identity, typed commands, and safe native FormData.",
	},
	{
		path: "src/pages/guides/controls.mdx",
		route: "/guides/controls",
		title: "Controls",
		description:
			"Connect native inputs or a design system to Fokit's typed values, accessibility wiring, and FormData behavior.",
		navText: "Controls & design systems",
	},
	{
		path: "src/pages/guides/async-multiselect.mdx",
		route: "/guides/async-multiselect",
		title: "Async multiselect",
		description:
			"Build a searchable multi-select that stores typed IDs in Fokit, loads options with TanStack Query, and delegates popup behavior to Floating UI.",
	},
	{
		path: "src/pages/guides/styling.mdx",
		route: "/guides/styling",
		title: "Styling",
		description:
			"Add responsive structure and a copyable visual baseline without giving form state ownership of your design system.",
	},
	{
		path: "src/pages/guides/react-19-actions.mdx",
		route: "/guides/react-19-actions",
		title: "React 19 Actions",
		description:
			"Connect a Fokit definition to a React 19 Action with safe FormData parsing, pending state, and serializable server errors.",
	},
	{
		path: "src/pages/advanced.mdx",
		route: "/advanced",
		title: "Production recipes",
		description:
			"Focused Fokit patterns for manual composition, loaded edit forms, server safety, accessibility, and public-boundary tests.",
	},
	{
		path: "src/pages/api.mdx",
		route: "/api",
		title: "API",
		description:
			"Signatures, defaults, and entry-point boundaries for Fokit's public React, core, server, and React 19 APIs.",
	},
	{
		path: "src/pages/types.mdx",
		route: "/types",
		title: "Types",
		description:
			"Use the TypeScript contracts that carry schema input and output through definitions, controls, hooks, slots, and server results.",
		navText: "TypeScript",
	},
	{
		path: "src/pages/faqs.mdx",
		route: "/faqs",
		title: "FAQs",
		description:
			"Direct answers about when to use Fokit, validation, defaults, design systems, servers, and React versions.",
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
		terms: ["createFormKit", "visible:", "profileSchema"],
	},
	{
		target: "src/snippets/basic-form.tsx",
		include: "~/snippets/basic-form.tsx",
		terms: ["kit.AutoForm", "ProfileEditor", "ProfileOutput"],
	},
	{
		target: "src/snippets/server-action.ts",
		include: "~/snippets/server-action.ts",
		terms: ["parseFormData", "FormResult", "saveProfileAction"],
	},
	{
		target: "src/snippets/async-multiselect.tsx",
		include: "~/snippets/async-multiselect.tsx",
		terms: ["defineControl", "useQuery", "useFloating", "QueryClientProvider"],
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
	"src/pages/index.mdx": {
		headings: [
			"See it work",
			"One explicit model",
			"The responsibility boundary",
			"When to reach for Fokit",
			"Start with the working path",
		],
		terms: [
			"Forms that stay typed, native, and yours",
			"Schema owns validity",
			"UI definition owns structure",
			"Your kit owns rendering",
			"OverviewDemo",
			"nativeControls",
			"kit.AutoForm",
		],
	},
	"src/pages/get-started.mdx": {
		headings: [
			"Installation",
			"Build your first form",
			"What just happened",
			"Try the production loop",
			"What you get out of the box",
			"Make it yours",
			"Choose your next step",
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
			"Entry points",
			"createFormKit",
			"kit.defineForm",
			"AutoForm",
			"useForm",
			"Hooks",
			"FormInstance",
			"defineControl",
			"createDefaultSlots",
			"parseFormData",
			"React 19",
			"React-free core",
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
			"FieldPath",
			"ArrayFieldPath",
			"valuePolicy",
			"NativeTextOptions",
			"NativeSelectOptions",
			"NativeFileOptions",
			"createFormStore",
			"resolver functions",
			"resolveUi",
			"setErrors",
			"clearErrors",
		],
	},
	"src/pages/types.mdx": {
		headings: [
			"Input and output",
			"Typed definitions and paths",
			"Form instances and context",
			"Custom control inference",
			"State and validation",
			"Structural slot props",
			"Server results",
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
			"Choose a focused guide",
			"Compose generated and bespoke UI",
			"Load an edit-form baseline",
			"Treat FormData as untrusted",
			"Preserve the accessibility contract",
			"Test the public experience",
		],
		terms: [
			"labelProps",
			"kit.Fields",
			"useFormState",
			"form.reset(profile)",
			"parseFormData",
			"FormResult",
		],
	},
	"src/pages/faqs.mdx": {
		headings: [
			"Why use Fokit instead of a smaller form hook?",
			"Does Fokit require Zod?",
			"Are Fokit controls controlled or uncontrolled?",
			"Why are complete default values required?",
			"How do I load an existing profile?",
			"Does Fokit support async validation?",
			"Can I use an existing component library?",
			"Why is there no built-in theme?",
			"What happens when a field becomes hidden?",
			"How do I reset a form?",
			"How do server errors reach fields?",
			"How do React 18 and React 19 differ?",
			"Does every field rerender on each change?",
			"Does Fokit provide wizards or autosave?",
		],
		terms: [
			"nativeControls",
			"createDefaultSlots",
			"defineControl",
			"Standard Schema",
			"form.reset()",
			"form.setErrors()",
			"useField",
		],
	},
}

const requiredGuidePageContent = {
	"src/pages/guides/ui-definitions.mdx": {
		headings: [
			"Read the tree at a glance",
			"Connect paths to controls",
			"Group fields and describe layout",
			"Derive UI from tracked values",
			"Let interaction state flow through the tree",
			"Choose what hidden means for data",
			"Repeat relative fields with arrays",
			"Know the generated boundary",
		],
		terms: [
			"relative child paths",
			"itemDefault",
			"resolver function",
			"valuePolicy",
			"fokit/layout.css",
			"kit.Fields",
		],
	},
	"src/pages/guides/tutorial.mdx": {
		headings: [
			"Model editable input and saved output",
			"Create one kit",
			"Describe the product UI",
			"Render and submit",
			"Know what is already handled",
			"Take the right next branch",
		],
		terms: [
			"FormInput",
			"FormOutput",
			"resolver function",
			'valuePolicy: "unset"',
			"contactCount",
		],
	},
	"src/pages/guides/validation.mdx": {
		headings: [
			"Start with the default",
			"Understand error visibility",
			"Install server errors",
			"Validate deliberately",
			"Choose the right ownership boundary",
		],
		terms: [
			'revalidateMode: "change"',
			"asyncDebounceMs",
			"setErrors",
			"clearErrors",
			"meta.displayErrors",
		],
	},
	"src/pages/guides/conditional-fields.mdx": {
		headings: [
			"Derive UI with resolver functions",
			"Decide what happens to hidden values",
			"Pass loaded data through context",
			"Keep conditional validation in the schema",
		],
		terms: [
			"resolver",
			'valuePolicy: "unset"',
			"Replacing context",
			"superRefine",
		],
	},
	"src/pages/guides/arrays.mdx": {
		headings: [
			"Define an array node",
			"Choose complete defaults",
			"Add manual commands when the UI needs them",
			"Preserve identity while values move",
			"Parse arrays from native FormData",
		],
		terms: [
			'kind: "array"',
			"itemDefault",
			"useArrayField",
			"__fokit.array",
			"parseFormData",
		],
	},
	"src/pages/guides/controls.mdx": {
		headings: [
			"Choose the smallest integration",
			"Wrap a product input",
			"Preserve the control contract",
			"Choose a FormData mode",
			"Native controls",
			"Replace structural slots",
		],
		terms: [
			"nativeControls",
			"defineControl",
			'mode: "native"',
			"createDefaultSlots",
			"ArrayItem",
		],
	},
	"src/pages/guides/async-multiselect.mdx": {
		headings: [
			"See it work",
			"Install the data and interaction layers",
			"Keep one field value",
			"Delegate popup behavior",
			"Load options declaratively",
			"Preserve selected labels",
			"Serialize the array",
			"Copy the complete example",
			"Know the ownership boundary",
		],
		terms: [
			"TanStack Query",
			"Floating UI",
			"QueryClientProvider",
			"AbortSignal",
			'formData.mode: "hidden"',
			"initialOptions",
			"AsyncMultiSelectDemo",
		],
	},
	"src/pages/guides/styling.mdx": {
		headings: [
			"Import responsive structure",
			"Add a product class",
			"Copy a visual baseline",
			"Style public states",
			"Replace markup when selectors are not enough",
		],
		terms: [
			"fokit/layout.css",
			"--fokit-column-gap",
			"data-fokit-node",
			":focus-visible",
			"data-invalid",
		],
	},
	"src/pages/guides/react-19-actions.mdx": {
		headings: [
			"Choose the submission owner",
			"Connect the client form",
			"Parse on the server",
			"Return serializable results",
			"Know the compatibility boundary",
		],
		terms: [
			"fokit/react19",
			"ActionForm",
			"ActionSubmit",
			"parseFormData",
			"FormResult",
			"does **not** run client validation",
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
		postbuild: "node ../scripts/fix-vocs-skip-links.mjs",
		preview: "vocs preview",
		test: "node --test tests/content.test.mjs",
		typecheck: "tsc --project tsconfig.docs.json",
		"test:output": "node --test tests/build-output.test.mjs",
		"test:markdown": "vocs markdown-audit",
	})
	assert.deepEqual(packageJson.dependencies, requiredDependencies)
	assert.equal(packageJson.devDependencies, undefined)
})

test("Vocs skip-link runtime escapes base paths before injecting HTML", async () => {
	const { runtimePatch } = await import(
		new URL("scripts/fix-vocs-skip-links.mjs", repositoryRoot).href
	)
	const patch = runtimePatch(
		'/</script><script>alert("x")</script>&\u2028\u2029',
	)

	assert.equal((patch.match(/<script/g) ?? []).length, 1)
	assert.equal((patch.match(/<\/script>/g) ?? []).length, 1)
	assert.match(patch, /\\u003c\/script\\u003e\\u003cscript\\u003e/)
	assert.match(patch, /\\u0026/)
	assert.match(patch, /\\u2028\\u2029/)
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
		"npm run site:test && npm run test:docs && BASE_URL=http://127.0.0.1:4175 BASE_PATH=/fokit npm run site:build && npm run test:markdown --prefix docs-site && npm run test:output --prefix docs-site && npm run site:test:e2e && BASE_PATH=/fokit npm run site:build && EXPECT_PRODUCTION_URL=true npm run test:output --prefix docs-site",
	)
	assert.equal(rootPackageJson.scripts.verify.includes("test:docs"), false)
	assert.deepEqual(knipConfig.workspaces["docs-site"].entry, [
		"vocs.config.ts",
		"src/pages/**/*.mdx",
		"src/pages/**/*.css",
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
	assert.match(gitignore, /^docs-site\/src\/pages\.gen\.ts$/m)
})

test("Interactive Lab uses Vocs components and public Fokit defaults", async () => {
	const wrapper = await readText("src/components/interactive-lab.tsx")
	const client = await readText("src/components/interactive-lab.client.tsx")
	const getStarted = await readText("src/pages/get-started.mdx")

	assert.match(wrapper, /from "\.\/interactive-lab\.client"/)
	assert.match(wrapper, /toMarkdown/)
	assert.match(wrapper, /Interactive Fokit Lab runs only in a browser/)
	assert.match(wrapper, /createFormKit\(\{ controls: nativeControls \}\)/)
	assert.match(wrapper, /type:\s*"link"/)
	assert.match(
		wrapper,
		/https:\/\/github\.com\/r13v\/fokit\/blob\/main\/docs-site\/src\/components\/interactive-lab\.client\.tsx/,
	)
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
	assert.match(getStarted, /^### Interactive Fokit Lab$/m)
	assert.match(getStarted, /<InteractiveLab \/>/)
})

test("overview proves the public Fokit loop with a live typed form", async () => {
	const wrapper = await readText("src/components/overview-demo.tsx")
	const client = await readText("src/components/overview-demo.client.tsx")
	const overview = await readText("src/pages/index.mdx")

	assert.match(wrapper, /from "\.\/overview-demo\.client"/)
	assert.match(wrapper, /toMarkdown/)
	assert.match(wrapper, /live overview form runs only in a browser/i)
	assert.match(wrapper, /type:\s*"link"/)
	assert.match(
		wrapper,
		/https:\/\/github\.com\/r13v\/fokit\/blob\/main\/docs-site\/src\/components\/overview-demo\.client\.tsx/,
	)
	assert.match(client, /^"use client"/)
	assert.match(client, /createFormKit/)
	assert.match(client, /controls:\s*nativeControls/)
	assert.match(client, /type:\s*"email"/)
	assert.match(client, /FormOutput<typeof profileSchema>/)
	assert.match(client, /onSubmit=\{\(\{ value \}\) => setSaved\(value\)\}/)
	assert.match(overview, /import \{ OverviewDemo \}/)
	assert.match(overview, /<OverviewDemo \/>/)
	assert.match(overview, /Fokit does not\s+guess a product UI/)
})

test("async multiselect guide runs the same typed Floating UI and TanStack Query example it documents", async () => {
	const wrapper = await readText("src/components/async-multiselect-demo.tsx")
	const client = await readText(
		"src/components/async-multiselect-demo.client.tsx",
	)
	const snippet = await readText("src/snippets/async-multiselect.tsx")
	const guide = await readText("src/pages/guides/async-multiselect.mdx")

	assert.match(wrapper, /from "\.\/async-multiselect-demo\.client"/)
	assert.match(wrapper, /toMarkdown/)
	assert.match(wrapper, /type:\s*"link"/)
	assert.match(
		wrapper,
		/https:\/\/github\.com\/r13v\/fokit\/blob\/main\/docs-site\/src\/snippets\/async-multiselect\.tsx/,
	)
	assert.match(client, /^"use client"/)
	assert.match(client, /from "\.\.\/snippets\/async-multiselect"/)
	assert.match(snippet, /from "@floating-ui\/react"/)
	assert.match(snippet, /useFloating\(/)
	assert.match(snippet, /useDismiss\(context\)/)
	assert.match(snippet, /useListNavigation\(context/)
	assert.match(snippet, /<FloatingFocusManager/)
	assert.match(snippet, /from "@tanstack\/react-query"/)
	assert.match(
		snippet,
		/queryKey:\s*\[\.\.\.options\.queryKey, debouncedSearch\]/,
	)
	assert.match(snippet, /queryFn:\s*\(\{ signal \}\)/)
	assert.match(snippet, /placeholderData:\s*keepPreviousData/)
	assert.match(snippet, /mode:\s*"hidden"/)
	assert.match(snippet, /kind:\s*"array" as const/)
	assert.match(snippet, /QueryClientProvider/)
	assert.match(guide, /<AsyncMultiSelectDemo \/>/)
	assert.match(guide, /~\/snippets\/async-multiselect\.tsx/)
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
		/description:\s*"Typed, schema-validated React forms that keep native HTML semantics and your design system\."/,
	)
	assert.match(
		source,
		/baseUrl:\s*process\.env\.BASE_URL\s*\?\?\s*"https:\/\/r13v\.github\.io"/,
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
		/sidebar:\s*\[[\s\S]*text:\s*"Start"[\s\S]*text:\s*"Get started"[\s\S]*link:\s*"\/get-started"/,
	)
	assert.match(
		source,
		/text:\s*"Guides"[\s\S]*text:\s*"UI definitions"[\s\S]*link:\s*"\/guides\/ui-definitions"[\s\S]*text:\s*"Validation & errors"[\s\S]*link:\s*"\/guides\/validation"/,
	)
	assert.match(
		source,
		/text:\s*"Reference"[\s\S]*text:\s*"API"[\s\S]*link:\s*"\/api"/,
	)
	assert.match(
		source,
		/text:\s*"Help"[\s\S]*text:\s*"FAQs"[\s\S]*link:\s*"\/faqs"/,
	)
	assert.doesNotMatch(source, /mcp\s*:/)
	assert.doesNotMatch(source, /feedback\s*:/)
	assert.doesNotMatch(source, /ogImageUrl\s*:/)
	assert.doesNotMatch(source, /redirects\s*:/)
	assert.doesNotMatch(source, /#\/|LOCALES|locale-switch|\/en\/|\/ru\//)
})

test("sidebar follows the learning path before reference material", async () => {
	const source = await readText("vocs.config.ts")
	const getStarted = source.indexOf('link: "/get-started"')
	const tutorial = source.indexOf('link: "/guides/tutorial"')
	const uiDefinitions = source.indexOf('link: "/guides/ui-definitions"')
	const validation = source.indexOf('link: "/guides/validation"')
	const controls = source.indexOf('link: "/guides/controls"')
	const asyncMultiselect = source.indexOf('link: "/guides/async-multiselect"')
	const api = source.indexOf('link: "/api"')
	const types = source.indexOf('link: "/types"')

	for (const index of [
		getStarted,
		tutorial,
		uiDefinitions,
		validation,
		controls,
		asyncMultiselect,
		api,
		types,
	]) {
		assert.notEqual(index, -1)
	}

	assert.ok(getStarted < tutorial)
	assert.ok(tutorial < uiDefinitions)
	assert.ok(uiDefinitions < validation)
	assert.ok(validation < controls)
	assert.ok(controls < asyncMultiselect)
	assert.ok(asyncMultiselect < api)
	assert.ok(api < types)
})

test("LLM documentation stays discoverable from the README and site", async () => {
	const readme = await readRepositoryText("README.md")
	const config = await readText("vocs.config.ts")

	for (const path of ["llms.txt", "llms-full.txt"]) {
		const url = `https://r13v.github.io/fokit/${path}`

		assert.match(readme, new RegExp(escapeRegExp(url)))
		assert.match(config, new RegExp(escapeRegExp(url)))
	}
})

test("Vocs pages expose the canonical English route map", async () => {
	const config = await readText("vocs.config.ts")

	for (const page of canonicalPages) {
		const source = await readText(page.path)
		const frontmatter = new RegExp(
			`^---\\ntitle: ${escapeRegExp(page.title)}\\ndescription: ${escapeRegExp(
				page.description,
			)}\\nshowAskAi: false\\n---\\n`,
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

test("classic submit docs explain the async lifecycle", async () => {
	const readme = await readRepositoryText("README.md")
	const tutorial = await readRepositoryText("docs/tutorial.ru.md")
	const getStarted = await readText("src/pages/get-started.mdx")
	const api = await readText("src/pages/api.mdx")

	for (const source of [readme, tutorial, getStarted, api]) {
		assert.match(source, /Promise<void>/)
		assert.match(source, /form\.reset\(\.\.\.\)/)
	}

	assert.match(getStarted, /isSubmitting` set to `true`/)
	assert.match(getStarted, /do not call `onSubmit` again/)
	assert.match(api, /rejected promise into a form issue/)
	assert.match(api, /`form\.submit\(\)` uses the same lifecycle/)
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

test("production docs lead to a deliberate next step", async () => {
	for (const page of canonicalPages.filter(
		(page) => page.route !== "/" && page.route !== "/get-started",
	)) {
		const source = await readText(page.path)

		assert.match(
			source,
			/\[[^\]]+\]\(\/[^)]+\)/,
			`${page.path} needs an authored internal link`,
		)
	}
})

test("tutorial stays focused on one copyable production form", async () => {
	const source = await readText("src/pages/guides/tutorial.mdx")
	const fences = collectCodeFences(source)

	assert.ok(fences.length <= 5, "tutorial should stay below six code blocks")
	assert.match(source, /# Build a production form/)
	assert.match(source, /~\/snippets\/form-kit\.tsx:schema/)
	assert.match(source, /~\/snippets\/basic-form\.tsx/)
	assert.doesNotMatch(source, /npm install|docs-site\/src\/snippets/)
	assert.doesNotMatch(source, /npm run (test:docs|check|knip)/)
	assert.doesNotMatch(source, /Use transactions deliberately/)
})

test("documentation uses the public imperative error commands", async () => {
	const paths = [
		"src/pages/api.mdx",
		"src/pages/faqs.mdx",
		"src/pages/guides/validation.mdx",
	]

	for (const path of paths) {
		const source = await readText(path)

		assert.doesNotMatch(source, /\bsetIssues\b|\bclearIssues\b/)
		assert.match(source, /\bsetErrors\b/)
	}
})

test("Vocs root page and root CSS replace the custom app shell", async () => {
	const page = await readText("src/pages/index.mdx")
	const css = await readText("src/pages/_root.css")

	assert.match(page, /^---\ntitle: Fokit\ndescription: /)
	assert.match(page, /# Forms that stay typed, native, and yours/)
	assert.match(page, /<OverviewDemo \/>/)
	assert.match(page, /createFormKit\(\{\s*controls: nativeControls/)
	assert.match(page, /kit\.AutoForm/)
	assert.match(
		page,
		/Kudos to \[Evgeniy Ivaha\]\(https:\/\/github\.com\/ivahaev\) for the idea and the\s+example implementation\./,
	)
	assert.doesNotMatch(page, /[А-Яа-яЁё]/)

	assert.match(css, /@import "@fontsource-variable\/newsreader"/)
	assert.match(css, /--fokit-brand-green:/)
	assert.match(css, /:root\[data-vocs-theme="dark"\]/)
	assert.match(css, /\.fokit-overview-demo/)
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
	assert.match(
		readme,
		/Kudos to \[Evgeniy Ivaha\]\(https:\/\/github\.com\/ivahaev\) for the idea and the\s+example implementation\./,
	)
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
