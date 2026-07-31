import assert from "node:assert/strict"
import { constants } from "node:fs"
import { access, readdir, readFile } from "node:fs/promises"
import { basename } from "node:path"
import { test } from "node:test"

const publicRoot = new URL("../dist/public/", import.meta.url)
const expectProductionUrl = process.env.EXPECT_PRODUCTION_URL === "true"

async function pathExists(path) {
	try {
		await access(new URL(path, publicRoot), constants.F_OK)
		return true
	} catch {
		return false
	}
}

async function listFiles(path = "") {
	const entries = await readdir(new URL(path, publicRoot), {
		withFileTypes: true,
	})
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

test("Vocs public output includes the static Markdown and indexing artifacts", async () => {
	const requiredFiles = [
		"index.html",
		"404.html",
		"assets/md/index.md",
		"assets/md/get-started.md",
		"assets/md/guides/tutorial.md",
		"assets/md/guides/ui-definitions.md",
		"assets/md/guides/validation.md",
		"llms.txt",
		"llms-full.txt",
		"sitemap.xml",
		"robots.txt",
	]

	for (const file of requiredFiles) {
		assert.equal(await pathExists(file), true, `${file} should be generated`)
	}
})

test("production output uses GitHub Pages metadata URLs when requested", async () => {
	if (!expectProductionUrl) {
		return
	}

	const html = await readFile(new URL("get-started/index.html", publicRoot), {
		encoding: "utf8",
	})

	assert.doesNotMatch(html, /http:\/\/127\.0\.0\.1/)
	assert.match(
		html,
		/<link rel="canonical" href="https:\/\/r13v\.github\.io\/fokit\/get-started"/,
	)
	assert.match(
		html,
		/<meta property="og:url" content="https:\/\/r13v\.github\.io\/fokit\/get-started"/,
	)
	assert.match(html, /"url":"https:\/\/r13v\.github\.io\/fokit\/get-started"/)
	assert.match(html, /<base href="https:\/\/r13v\.github\.io"/)
})

test("production output keeps Vocs skip links under the GitHub Pages base path", async () => {
	if (!expectProductionUrl) {
		return
	}

	const files = (await listFiles()).filter((file) => file.endsWith(".html"))
	const skipLinks = []

	for (const file of files) {
		const html = await readFile(new URL(file, publicRoot), "utf8")
		const skipTags =
			html.match(/<a\b(?=[^>]*data-v-skip-to-content(?:="true")?)[^>]*>/g) ?? []

		for (const tag of skipTags) {
			const href = /\bhref="([^"]*)"/.exec(tag)?.[1]
			assert.equal(typeof href, "string", `${file} skip link should have href`)
			skipLinks.push({ file, href })
		}

		if (skipTags.length > 0) {
			assert.match(
				html,
				/data-fokit-vocs-skip-link-base="true"/,
				`${file} should patch hydrated Vocs skip links`,
			)
		}
	}

	assert.notEqual(
		skipLinks.length,
		0,
		"production output should include skip links",
	)

	for (const { file, href } of skipLinks) {
		assert.match(
			href,
			/^\/fokit(?:\/|#)/,
			`${file} skip link should stay under /fokit`,
		)
	}
})

test("Interactive Lab has meaningful generated Markdown fallbacks", async () => {
	const fallbackTerms = [
		"Interactive Fokit Lab",
		"runs only in a browser",
		"createFormKit({ controls: nativeControls })",
	]
	const fallbackFiles = ["assets/md/get-started.md", "llms-full.txt"]

	for (const file of fallbackFiles) {
		const source = await readFile(new URL(file, publicRoot), "utf8")

		for (const term of fallbackTerms) {
			assert.match(
				source,
				new RegExp(escapeRegExp(term)),
				`${file} needs ${term}`,
			)
		}
	}

	const llms = await readFile(new URL("llms.txt", publicRoot), "utf8")
	assert.match(llms, /Build and submit your first typed Fokit form/)
	assert.match(llms, /Grow the first Fokit form into a production-ready/)
	assert.match(llms, /Describe fields, sections, arrays, layout/)
	assert.match(llms, /Control when Fokit validates/)
})

test("overview demo has a meaningful generated Markdown fallback", async () => {
	const fallbackTerms = [
		"live overview form runs only in a browser",
		"validates it with Standard Schema",
		"createFormKit({ controls: nativeControls })",
	]
	const fallbackFiles = ["assets/md/index.md", "llms-full.txt"]

	for (const file of fallbackFiles) {
		const source = await readFile(new URL(file, publicRoot), "utf8")

		for (const term of fallbackTerms) {
			assert.match(
				source,
				new RegExp(escapeRegExp(term), "i"),
				`${file} needs ${term}`,
			)
		}
	}
})

test("generated Markdown links live demos to their canonical source files", async () => {
	const sourceLinks = [
		{
			file: "assets/md/index.md",
			path: "docs-site/src/components/overview-demo.client.tsx",
		},
		{
			file: "assets/md/get-started.md",
			path: "docs-site/src/components/interactive-lab.client.tsx",
		},
		{
			file: "assets/md/guides/async-multiselect.md",
			path: "docs-site/src/snippets/async-multiselect.tsx",
		},
	]
	const llms = await readFile(new URL("llms-full.txt", publicRoot), "utf8")

	for (const { file, path } of sourceLinks) {
		const source = await readFile(new URL(file, publicRoot), "utf8")
		const link = `Source: [${path}](https://github.com/r13v/fokit/blob/main/${path})`

		assert.match(
			source,
			new RegExp(escapeRegExp(link)),
			`${file} needs ${path}`,
		)
		assert.match(
			llms,
			new RegExp(escapeRegExp(link)),
			`llms-full.txt needs ${path}`,
		)
	}
})

test("Vocs public output does not include route or function artifacts", async () => {
	const files = await listFiles()
	const forbiddenRouteFiles = files.filter((file) =>
		/(^|\/)(server|functions|_functions)(\/|$)|(^|\/)api\/(server|functions|_functions)(\/|$)|(^|\/)_worker\.[cm]?js$/i.test(
			file,
		),
	)
	const dynamicOgFiles = files.filter((file) =>
		/(^|\/)og([./-]|$)/i.test(basename(file)),
	)

	assert.deepEqual(forbiddenRouteFiles, [])
	assert.deepEqual(dynamicOgFiles, [])

	for (const file of files.filter((entry) => entry.endsWith(".html"))) {
		const html = await readFile(new URL(file, publicRoot), "utf8")
		assert.doesNotMatch(html, /property="og:image"|name="twitter:image"/)
	}
})

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
