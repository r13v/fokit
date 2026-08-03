import assert from "node:assert/strict"
import { access, readFile } from "node:fs/promises"
import { test } from "node:test"

const siteRoot = new URL("../", import.meta.url)
const repositoryRoot = new URL("../", siteRoot)

const pages = [
	["src/pages/index.mdx", "Form, Please"],
	["src/pages/get-started.mdx", "Get started"],
	["src/pages/definitions.mdx", "Definitions"],
	["src/pages/validation.mdx", "Validation and submission"],
	["src/pages/conditional-fields.mdx", "Conditional fields"],
	["src/pages/arrays.mdx", "Arrays"],
	["src/pages/controls.mdx", "Controls and slots"],
	["src/pages/async-multiselect.mdx", "Async multiselect"],
	["src/pages/resources.mdx", "Resource state"],
	["src/pages/styling.mdx", "Styling"],
	["src/pages/api.mdx", "API"],
	["src/pages/advanced.mdx", "Production recipes"],
	["src/pages/types.mdx", "TypeScript"],
	["src/pages/faqs.mdx", "FAQs"],
	["src/pages/examples/index.mdx", "Examples"],
	["src/pages/examples/mui-yup.mdx", "Material UI with Yup"],
	["src/pages/examples/shadcn-valibot.mdx", "Shadcn with Valibot"],
	["src/pages/examples/research-grant.mdx", "Research grant application"],
	["src/pages/examples/studio-policies.mdx", "Creative studio policies"],
	["src/pages/examples/makerspace-launch.mdx", "Makerspace launch wizard"],
	["src/pages/examples/learning-cohort.mdx", "Learning cohort editor"],
	["src/pages/examples/membership-ladder.mdx", "Membership ladder"],
	["src/pages/examples/campaign-builder.mdx", "Campaign builder"],
]

const exampleSnippets = [
	"src/snippets/mui-yup-conference.tsx",
	"src/snippets/shadcn-valibot-workshop.tsx",
	"src/snippets/complex-research-grant.tsx",
	"src/snippets/complex-studio-policies.tsx",
	"src/snippets/complex-makerspace-launch.tsx",
	"src/snippets/complex-learning-cohort.tsx",
	"src/snippets/complex-membership-ladder.tsx",
	"src/snippets/complex-campaign-builder.tsx",
	"src/snippets/lab-profile-form.tsx",
	"src/snippets/async-multiselect.tsx",
]

const referenceSnippets = [
	"src/snippets/api-reference.tsx",
	"src/snippets/production-recipes.tsx",
]

test("documents only the supported navigation surface", async () => {
	const config = await readFile(new URL("vocs.config.ts", siteRoot), "utf8")
	for (const [path, title] of pages) {
		const source = await readFile(new URL(path, siteRoot), "utf8")
		assert.match(
			source,
			new RegExp(`^---[\\s\\S]*title: ${escapeRegExp(title)}`, "m"),
		)
	}

	for (const route of [
		"/get-started",
		"/definitions",
		"/validation",
		"/conditional-fields",
		"/arrays",
		"/controls",
		"/async-multiselect",
		"/resources",
		"/styling",
		"/api",
		"/advanced",
		"/types",
		"/faqs",
		"/examples",
		"/examples/mui-yup",
		"/examples/shadcn-valibot",
		"/examples/research-grant",
		"/examples/studio-policies",
		"/examples/makerspace-launch",
		"/examples/learning-cohort",
		"/examples/membership-ladder",
		"/examples/campaign-builder",
	]) {
		assert.match(config, new RegExp(`link: "${escapeRegExp(route)}"`))
	}
})

test("documents the TanStack runtime decisions", async () => {
	const allPages = (
		await Promise.all(
			pages.map(([path]) => readFile(new URL(path, siteRoot), "utf8")),
		)
	).join("\n")

	for (const term of [
		"form.api.Field",
		"form.api.FormGroup",
		"form.api.Subscribe",
		"fromResource",
		"complete schema input",
		"Hidden fields preserve",
		"index identity",
		"parses the same input a second time",
	]) {
		assert.match(
			allPages,
			new RegExp(escapeRegExp(term), "i"),
			`missing ${term}`,
		)
	}
})

test("does not teach retired runtime entries or APIs", async () => {
	const files = [
		...pages.map(([path]) => path),
		"src/snippets/profile-form.tsx",
		...exampleSnippets,
		...referenceSnippets,
		"src/components/ui/form-please/shadcn-form-kit.tsx",
		"vocs.config.ts",
	]
	const source = (
		await Promise.all(
			files.map((path) => readFile(new URL(path, siteRoot), "utf8")),
		)
	).join("\n")

	for (const forbidden of [
		"form-please/core",
		"form-please/tanstack",
		"form-please/react19",
		"form-please/server",
		"form-please/history",
		"form-please/persistence",
		"form-please/devtools",
		"useCreateForm",
		"useBindForm",
		"useFormContext",
		"useFormState",
		"useArrayField",
		"valuePolicy",
		"kit.tf",
	]) {
		assert.doesNotMatch(source, new RegExp(escapeRegExp(forbidden)))
	}
})

test("keeps the supported live documentation demos", async () => {
	for (const [path, expected] of [
		["src/pages/index.mdx", "<OverviewDemo />"],
		["src/pages/get-started.mdx", "<InteractiveLab />"],
		["src/pages/styling.mdx", "<TailwindProfileDemo />"],
		["src/pages/async-multiselect.mdx", "<AsyncMultiSelectDemo />"],
		["src/pages/validation.mdx", "~/snippets/zod-error-messages.ts"],
	]) {
		const source = await readFile(new URL(path, siteRoot), "utf8")
		assert.match(source, new RegExp(escapeRegExp(expected)))
	}
})

test("keeps API and production guidance executable instead of prose-only", async () => {
	const api = await readFile(new URL("src/pages/api.mdx", siteRoot), "utf8")
	const advanced = await readFile(
		new URL("src/pages/advanced.mdx", siteRoot),
		"utf8",
	)

	for (const region of [
		"define-control",
		"create-form-kit",
		"native-factories",
		"native-preset",
		"mui-preset",
		"define-form",
		"render-node",
		"context-kit",
		"use-form",
		"manual-composition",
		"resource-resolver",
		"resources",
		"public-types",
	]) {
		assert.match(api, new RegExp(`api-reference\\.tsx:${region}`))
	}

	for (const region of [
		"composition",
		"edit-baseline",
		"async-submit",
		"context-resource",
		"accessible-control",
	]) {
		assert.match(advanced, new RegExp(`production-recipes\\.tsx:${region}`))
	}

	for (const snippet of referenceSnippets) {
		await access(new URL(snippet, siteRoot))
	}

	const definitions = await readFile(
		new URL("src/pages/definitions.mdx", siteRoot),
		"utf8",
	)
	const arrays = await readFile(
		new URL("src/pages/arrays.mdx", siteRoot),
		"utf8",
	)
	const conditional = await readFile(
		new URL("src/pages/conditional-fields.mdx", siteRoot),
		"utf8",
	)
	assert.match(definitions, /api-reference\.tsx:render-node/)
	assert.match(arrays, /lab-profile-form\.tsx:array-node/)
	assert.match(conditional, /lab-profile-form\.tsx:conditional-field/)
})

test("does not present native FormData as the submission source", async () => {
	const sources = await Promise.all([
		readFile(new URL("src/pages/get-started.mdx", siteRoot), "utf8"),
		readFile(
			new URL("src/components/interactive-lab.client.tsx", siteRoot),
			"utf8",
		),
		readFile(new URL("src/snippets/lab-profile-form.tsx", siteRoot), "utf8"),
	])
	const source = sources.join("\n")
	assert.doesNotMatch(source, /Form, Please keeps it in FormData/)
	assert.match(source, /Submission uses the TanStack values/)
	assert.match(source, /File stays in the TanStack Form input/)
})

test("keeps the shadcn adapter installable and release-version agnostic", async () => {
	const registry = JSON.parse(
		await readFile(new URL("registry.json", repositoryRoot), "utf8"),
	)
	const components = JSON.parse(
		await readFile(new URL("components.json", siteRoot), "utf8"),
	)
	const page = await readFile(
		new URL("src/pages/examples/shadcn-valibot.mdx", siteRoot),
		"utf8",
	)
	const rootPackage = JSON.parse(
		await readFile(new URL("package.json", repositoryRoot), "utf8"),
	)
	const docsPackage = JSON.parse(
		await readFile(new URL("package.json", siteRoot), "utf8"),
	)
	const rootCss = await readFile(
		new URL("src/pages/_root.css", siteRoot),
		"utf8",
	)
	const [item] = registry.items

	assert.equal(registry.name, "form-please")
	assert.equal(item.name, "shadcn-form-kit")
	assert.deepEqual(item.files, [
		{
			path: "docs-site/src/components/ui/form-please/shadcn-form-kit.tsx",
			type: "registry:component",
			target: "@ui/form-please/shadcn-form-kit.tsx",
		},
	])
	assert.equal(item.dependencies.includes("form-please"), true)
	assert.equal(
		item.dependencies.some((dependency) =>
			dependency.startsWith("form-please@"),
		),
		false,
	)
	assert.equal(components.style, "base-nova")
	assert.equal(components.aliases.ui, "#components/ui")
	assert.equal(docsPackage.dependencies["tw-animate-css"], "1.4.0")
	assert.match(rootCss, /@import "tw-animate-css"/)
	assert.match(page, /npx shadcn@latest add r13v\/form-please\/shadcn-form-kit/)
	assert.match(page, /registry manifest/)
	assert.equal(
		rootPackage.scripts["test:registry"],
		"node scripts/verify-shadcn-registry.mjs",
	)
	assert.match(rootPackage.scripts.verify, /npm run test:registry/)
})

test("keeps only the supported example routes", async () => {
	for (const path of [
		"src/pages/examples/history.mdx",
		"src/pages/examples/devtools.mdx",
		"src/pages/examples/persistence.mdx",
		"src/pages/examples/tanstack-form.mdx",
	]) {
		await assert.rejects(access(new URL(path, siteRoot)))
	}

	const config = await readFile(new URL("vocs.config.ts", siteRoot), "utf8")
	for (const route of [
		"/examples/history",
		"/examples/devtools",
		"/examples/persistence",
		"/examples/tanstack-form",
	]) {
		assert.doesNotMatch(config, new RegExp(escapeRegExp(route)))
	}
})

test("the physical example uses only public package imports", async () => {
	const snippet = await readFile(
		new URL("src/snippets/profile-form.tsx", siteRoot),
		"utf8",
	)
	assert.match(snippet, /from "form-please\/preset-native"/)
	assert.doesNotMatch(snippet, /from "\.\.\//)
	assert.doesNotMatch(snippet, /src\//)

	const packageJson = JSON.parse(
		await readFile(new URL("package.json", siteRoot), "utf8"),
	)
	assert.equal(packageJson.dependencies["@tanstack/react-form"], "1.33.3")
	assert.equal(packageJson.dependencies["form-please"], "file:..")

	const rootPackage = JSON.parse(
		await readFile(new URL("package.json", repositoryRoot), "utf8"),
	)
	assert.equal(rootPackage.peerDependencies["@tanstack/react-form"], "^1.33.3")
})

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
