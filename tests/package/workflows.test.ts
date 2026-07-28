import { access, readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

const rootDirectory = fileURLToPath(new URL("../..", import.meta.url))
const deployPageUrlExpression =
	"url: $" + "{{ steps.deployment.outputs.page_url }}"
const pagesWorkflow = await readOptionalFile(".github/workflows/pages.yml")

describe("GitHub Pages workflow", () => {
	it("deploys verified docs-site output from GitHub Actions", () => {
		expect(pagesWorkflow).toContain("name: Deploy Pages")
		expect(pagesWorkflow).toContain("push:")
		expect(pagesWorkflow).toContain("branches:\n      - main")
		expect(pagesWorkflow).toContain("workflow_dispatch:")
		expect(pagesWorkflow).toContain("contents: read")
		expect(pagesWorkflow).toContain("pages: write")
		expect(pagesWorkflow).toContain("id-token: write")
		expect(pagesWorkflow).toContain("group: pages")
		expect(pagesWorkflow).toContain("cancel-in-progress: true")
		expect(pagesWorkflow).toContain("runs-on: ubuntu-latest")
		expect(pagesWorkflow).toContain("uses: actions/checkout@v6")
		expect(pagesWorkflow).toContain("uses: actions/setup-node@v6")
		expect(pagesWorkflow).toContain("node-version: 24")
		expect(pagesWorkflow).toContain("package-lock.json")
		expect(pagesWorkflow).toContain("docs-site/package-lock.json")
		expect(pagesWorkflow).toContain("uses: actions/configure-pages@v5")
		expect(pagesWorkflow).toContain("run: npm ci")
		expect(pagesWorkflow).toContain("run: npm ci --prefix docs-site")
		expect(pagesWorkflow).toContain(
			"run: npx playwright install --with-deps chromium",
		)
		expect(pagesWorkflow).toContain(
			"run: BASE_PATH=/fokit/ npm run site:verify",
		)
		expect(pagesWorkflow).toContain("uses: actions/upload-pages-artifact@v4")
		expect(pagesWorkflow).toContain("path: docs-site/dist")
		expect(pagesWorkflow).toContain("needs: build")
		expect(pagesWorkflow).toContain("environment:")
		expect(pagesWorkflow).toContain("name: github-pages")
		expect(pagesWorkflow).toContain(deployPageUrlExpression)
		expect(pagesWorkflow).toContain("uses: actions/deploy-pages@v4")
		expect(pagesWorkflow).not.toContain("run: npm run site:build")
	})

	it("does not add non-Pages hosting artifacts", async () => {
		await expect(fileMissing(".openai/hosting.json")).resolves.toBe(true)
		await expect(fileMissing("worker.js")).resolves.toBe(true)
		await expect(fileMissing("_redirects")).resolves.toBe(true)
		await expect(fileMissing("CNAME")).resolves.toBe(true)
	})
})

async function readOptionalFile(path: string): Promise<string> {
	try {
		return await readFile(join(rootDirectory, path), "utf8")
	} catch (error) {
		if (isNotFoundError(error)) {
			return ""
		}
		throw error
	}
}

async function fileMissing(path: string): Promise<boolean> {
	try {
		await access(join(rootDirectory, path))
		return false
	} catch (error) {
		if (isNotFoundError(error)) {
			return true
		}
		throw error
	}
}

function isNotFoundError(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "ENOENT"
}
