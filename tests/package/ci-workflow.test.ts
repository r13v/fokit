import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

const ciWorkflow = (
	await readFile(new URL("../../.github/workflows/ci.yml", import.meta.url), {
		encoding: "utf8",
	})
).replaceAll("\r\n", "\n")
const matrixNodeVersionExpression =
	"node-version: $" + "{{ matrix.node-version }}"

describe("release-equivalent CI workflow", () => {
	it("runs the local release-equivalent package gates on Node 20 and 22", () => {
		expect(ciWorkflow).toContain("name: CI")
		expect(ciWorkflow).toContain("pull_request:")
		expect(ciWorkflow).toContain("push:")
		expect(ciWorkflow).toContain("branches:\n      - main")
		expect(ciWorkflow).toContain("contents: read")
		expect(ciWorkflow).toContain("node-version: [20, 22]")
		expect(ciWorkflow).toContain("uses: actions/checkout@v6")
		expect(ciWorkflow).toContain("uses: actions/setup-node@v6")
		expect(ciWorkflow).toContain(matrixNodeVersionExpression)
		expect(ciWorkflow).toContain("cache: npm")
		expect(ciWorkflow).toContain("run: npm ci")
		expect(ciWorkflow).toContain(
			"run: npx playwright install --with-deps chromium",
		)
		expect(ciWorkflow).toContain("run: npm run verify")
		expect(ciWorkflow).toContain("run: npm pack --dry-run")
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
