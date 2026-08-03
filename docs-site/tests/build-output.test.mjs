import assert from "node:assert/strict"
import { constants } from "node:fs"
import { access, readFile } from "node:fs/promises"
import { test } from "node:test"

const publicRoot = new URL("../dist/public/", import.meta.url)
const expectProductionUrl = process.env.EXPECT_PRODUCTION_URL === "true"

async function exists(path) {
	try {
		await access(new URL(path, publicRoot), constants.F_OK)
		return true
	} catch {
		return false
	}
}

test("Vocs emits every supported Markdown route and index artifact", async () => {
	for (const file of [
		"index.html",
		"404.html",
		"assets/md/index.md",
		"assets/md/get-started.md",
		"assets/md/definitions.md",
		"assets/md/validation.md",
		"assets/md/conditional-fields.md",
		"assets/md/arrays.md",
		"assets/md/controls.md",
		"assets/md/resources.md",
		"assets/md/styling.md",
		"assets/md/api.md",
		"assets/md/advanced.md",
		"assets/md/types.md",
		"assets/md/faqs.md",
		"assets/md/examples.md",
		"assets/md/examples/mui-yup.md",
		"assets/md/examples/shadcn-valibot.md",
		"assets/md/examples/async-multiselect.md",
		"assets/md/examples/research-grant.md",
		"assets/md/examples/studio-policies.md",
		"assets/md/examples/makerspace-launch.md",
		"assets/md/examples/learning-cohort.md",
		"assets/md/examples/membership-ladder.md",
		"assets/md/examples/campaign-builder.md",
		"llms.txt",
		"llms-full.txt",
		"sitemap.xml",
		"robots.txt",
	]) {
		assert.equal(await exists(file), true, `${file} should exist`)
	}
})

test("generated LLM documentation describes the current runtime", async () => {
	const full = await readFile(new URL("llms-full.txt", publicRoot), "utf8")
	assert.match(full, /form\.api\.Field/)
	assert.match(full, /fromResource/)
	assert.match(full, /TanStack Form submission recommendation/)
	assert.doesNotMatch(full, /form-please\/core/)
	assert.doesNotMatch(full, /valuePolicy/)
})

test("production metadata uses the GitHub Pages URL", async () => {
	if (!expectProductionUrl) return
	const html = await readFile(
		new URL("get-started/index.html", publicRoot),
		"utf8",
	)
	assert.doesNotMatch(html, /http:\/\/127\.0\.0\.1/)
	assert.match(
		html,
		/<link rel="canonical" href="https:\/\/r13v\.github\.io\/form-please\/get-started"/,
	)
})
