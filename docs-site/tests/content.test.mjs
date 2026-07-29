import assert from "node:assert/strict"
import { constants } from "node:fs"
import { access, readdir, readFile } from "node:fs/promises"
import { test } from "node:test"

const siteRoot = new URL("../", import.meta.url)

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

async function readText(path) {
	return await readFile(new URL(path, siteRoot), "utf8")
}

async function readJson(path) {
	return JSON.parse(await readText(path))
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
		"test:markdown": "vocs markdown-audit",
	})
	assert.deepEqual(packageJson.dependencies, requiredDependencies)
	assert.equal(packageJson.devDependencies, undefined)
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
		/sidebar:\s*\[[\s\S]*text:\s*"Get started"[\s\S]*link:\s*"\/"/,
	)
	assert.doesNotMatch(source, /mcp\s*:/)
	assert.doesNotMatch(source, /feedback\s*:/)
	assert.doesNotMatch(source, /ogImageUrl\s*:/)
	assert.doesNotMatch(source, /redirects\s*:/)
})

test("minimal Vocs page and root CSS replace the custom app shell", async () => {
	const page = await readText("src/pages/index.mdx")
	const css = await readText("src/pages/_root.css")

	assert.match(page, /^---\ntitle: Get started\ndescription: /)
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
