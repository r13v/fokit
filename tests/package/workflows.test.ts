import { access, readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"
import { parse } from "yaml"

const rootDirectory = fileURLToPath(new URL("../..", import.meta.url))
const pagesWorkflow = await readOptionalFile(".github/workflows/pages.yml")
const publishWorkflow = await readOptionalFile(".github/workflows/publish.yml")
const pages = parse(pagesWorkflow) as Record<string, unknown>
const publish = parse(publishWorkflow) as Record<string, unknown>
const pagesUrlExpression = "$" + "{{ steps.deployment.outputs.page_url }}"
const releaseTagExpression = "$" + "{{ github.event.release.tag_name }}"

describe("GitHub Pages workflow", () => {
	it("deploys verified docs-site output from GitHub Actions", () => {
		const build = job(pages, "build")
		const deploy = job(pages, "deploy")
		const buildSteps = workflowSteps(build)
		const deploySteps = workflowSteps(deploy)

		expect(pages.name).toBe("Deploy Pages")
		expect(record(record(pages.on).push).branches).toEqual(["main"])
		expect(record(pages.on).workflow_dispatch).toBeNull()
		expect(record(pages.permissions)).toMatchObject({
			contents: "read",
			pages: "write",
			"id-token": "write",
		})
		expect(record(pages.concurrency)).toEqual({
			group: "pages",
			"cancel-in-progress": true,
		})
		expect(build["runs-on"]).toBe("ubuntu-latest")
		expect(buildSteps.map((step) => step.name)).toEqual([
			"Checkout",
			"Setup Node",
			"Configure Pages",
			"Install dependencies",
			"Install docs dependencies",
			"Install Chromium",
			"Verify docs site",
			"Upload Pages artifact",
		])
		expect(buildSteps[0]?.uses).toBe("actions/checkout@v6")
		expect(buildSteps[1]?.uses).toBe("actions/setup-node@v6")
		expect(record(buildSteps[1]?.with)["node-version"]).toBe(24)
		expect(record(buildSteps[1]?.with).cache).toBe("npm")
		expect(
			String(record(buildSteps[1]?.with)["cache-dependency-path"]),
		).toContain("docs-site/package-lock.json")
		expect(buildSteps[2]?.uses).toBe("actions/configure-pages@v5")
		expect(buildSteps.map((step) => step.run).filter(Boolean)).toEqual([
			"npm ci",
			"npm ci --prefix docs-site",
			"npx playwright install --with-deps chromium",
			"BASE_PATH=/fokit/ npm run site:verify",
		])
		expect(buildSteps[7]?.uses).toBe("actions/upload-pages-artifact@v4")
		expect(record(buildSteps[7]?.with).path).toBe("docs-site/dist")
		expect(deploy.needs).toBe("build")
		expect(record(deploy.environment)).toEqual({
			name: "github-pages",
			url: pagesUrlExpression,
		})
		expect(deploySteps[0]?.uses).toBe("actions/deploy-pages@v4")
		expect(pagesWorkflow).not.toContain("run: npm run site:build")
	})

	it("does not add non-Pages hosting artifacts", async () => {
		await expect(fileMissing(".openai/hosting.json")).resolves.toBe(true)
		await expect(fileMissing("worker.js")).resolves.toBe(true)
		await expect(fileMissing("_redirects")).resolves.toBe(true)
		await expect(fileMissing("CNAME")).resolves.toBe(true)
	})
})

describe("trusted npm publishing workflow", () => {
	it("runs only for stable published GitHub Releases with OIDC permissions", () => {
		const publishJob = job(publish, "publish")
		const steps = workflowSteps(publishJob)

		expect(publish.name).toBe("Publish")
		expect(record(record(publish.on).release).types).toEqual(["published"])
		expect(publishJob.if).toBe("github.event.release.prerelease == false")
		expect(record(publish.permissions)).toEqual({
			contents: "read",
			"id-token": "write",
		})
		expect(record(publish.concurrency)).toEqual({
			group: `release-${releaseTagExpression}`,
			"cancel-in-progress": false,
		})
		expect(publishJob["runs-on"]).toBe("ubuntu-latest")
		expect(steps[0]?.uses).toBe("actions/checkout@v6")
		expect(steps[1]?.uses).toBe("actions/setup-node@v6")
		expect(record(steps[1]?.with)["node-version"]).toBe(24)
		expect(record(steps[1]?.with)["registry-url"]).toBe(
			"https://registry.npmjs.org",
		)
		expect(record(steps[1]?.with).cache).toBeUndefined()
		expect(record(publish.permissions).pages).toBeUndefined()
		expect(publishJob.environment).toBeUndefined()
	})

	it("verifies the release completely before publishing", () => {
		const steps = workflowSteps(job(publish, "publish"))
		const releaseGuard = steps[2]

		expect(record(releaseGuard?.env).FOKIT_RELEASE_TAG).toBe(
			releaseTagExpression,
		)
		expect(steps.map((step) => step.run).filter(Boolean)).toEqual([
			"node scripts/verify-release.mjs",
			"npm ci",
			"npx playwright install --with-deps chromium",
			"npm run verify",
			"npm ci --prefix docs-site",
			"npm run site:verify",
			"npm pack --dry-run",
			"npm publish --access public",
		])
	})

	it("does not configure branch publishing or long-lived npm credentials", () => {
		expect(publishWorkflow).not.toContain("push:")
		expect(publishWorkflow).not.toContain("workflow_dispatch:")
		expect(publishWorkflow).not.toContain("pull_request:")
		expect(publishWorkflow).not.toContain("NPM_TOKEN")
		expect(publishWorkflow).not.toContain("NODE_AUTH_TOKEN")
		expect(publishWorkflow).not.toContain("secrets.")
		expect(publishWorkflow).not.toContain("--provenance")
		expect(publishWorkflow).not.toMatch(/\bnpm version\b/)
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

function job(
	workflow: Record<string, unknown>,
	name: string,
): Record<string, unknown> {
	return record(record(workflow.jobs)[name])
}

function workflowSteps(
	jobDefinition: Record<string, unknown>,
): readonly Record<string, unknown>[] {
	const steps = jobDefinition.steps
	if (!Array.isArray(steps)) {
		throw new Error("Expected workflow job steps")
	}

	return steps.map((step) => record(step))
}

function record(value: unknown): Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("Expected workflow object")
	}

	return value as Record<string, unknown>
}
