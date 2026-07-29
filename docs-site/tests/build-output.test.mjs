import assert from "node:assert/strict"
import { constants } from "node:fs"
import { access, readdir, readFile } from "node:fs/promises"
import { basename } from "node:path"
import { test } from "node:test"

const publicRoot = new URL("../dist/public/", import.meta.url)

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
		"assets/md/index.md",
		"llms.txt",
		"llms-full.txt",
		"sitemap.xml",
		"robots.txt",
	]

	for (const file of requiredFiles) {
		assert.equal(await pathExists(file), true, `${file} should be generated`)
	}
})

test("Vocs public output does not include route or function artifacts", async () => {
	const files = await listFiles()
	const forbiddenRouteFiles = files.filter((file) =>
		/(^|\/)(api|server|functions|_functions)(\/|$)|(^|\/)_worker\.[cm]?js$/i.test(
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
