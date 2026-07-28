import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"
import { parse } from "yaml"

const ciWorkflow = (
	await readFile(new URL("../../.github/workflows/ci.yml", import.meta.url), {
		encoding: "utf8",
	})
).replaceAll("\r\n", "\n")
const ci = parse(ciWorkflow) as Record<string, unknown>
const matrixNodeVersionExpression = "$" + "{{ matrix.node-version }}"

describe("release-equivalent CI workflow", () => {
	it("runs the local release-equivalent package gates on Node 24", () => {
		const verify = job(ci, "verify")
		const steps = workflowSteps(verify)

		expect(ci.name).toBe("CI")
		expect(record(ci.on).pull_request).toBeNull()
		expect(record(record(ci.on).push).branches).toEqual(["main"])
		expect(record(ci.permissions).contents).toBe("read")
		expect(record(record(verify.strategy).matrix)["node-version"]).toEqual([24])
		expect(steps.map((step) => step.name)).toEqual([
			"Checkout",
			"Setup Node",
			"Install dependencies",
			"Install Chromium",
			"Verify package",
			"Dry-run package",
		])
		expect(steps[0]?.uses).toBe("actions/checkout@v6")
		expect(steps[1]?.uses).toBe("actions/setup-node@v6")
		expect(record(steps[1]?.with)["node-version"]).toBe(
			matrixNodeVersionExpression,
		)
		expect(record(steps[1]?.with).cache).toBe("npm")
		expect(steps.map((step) => step.run).filter(Boolean)).toEqual([
			"npm ci",
			"npx playwright install --with-deps chromium",
			"npm run verify",
			"npm pack --dry-run",
		])
	})

	it("does not publish, mutate source, or require credentials", () => {
		expect(ciWorkflow).not.toMatch(/\bnpm publish\b/)
		expect(ciWorkflow).not.toMatch(/\bnpm version\b/)
		expect(ciWorkflow).not.toMatch(/\bcheck:fix\b/)
		expect(ciWorkflow).not.toMatch(/\bbiome check --write\b/)
		expect(ciWorkflow).not.toMatch(/\bgit (?:commit|push)\b/)
		expect(ciWorkflow).not.toMatch(/\b(?:NPM_TOKEN|NODE_AUTH_TOKEN)\b/)
		expect(ciWorkflow).not.toContain("secrets.")
		expect(ciWorkflow).not.toContain("id-token: write")
		expect(ciWorkflow).not.toContain("packages: write")
		expect(ciWorkflow).not.toContain("pages: write")
		expect(ciWorkflow).not.toContain("deploy-pages")
		expect(ciWorkflow).not.toContain("upload-pages-artifact")
	})
})

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
