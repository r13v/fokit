import { defineConfig } from "@playwright/test"

export default defineConfig({
	testDir: "./tests/browser",
	testIgnore: "docs-site.spec.ts",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	reporter: "list",
})
