import { defineConfig, devices } from "@playwright/test"

const port = Number(process.env.PLAYWRIGHT_DOCS_PORT ?? 4175)
const host = "127.0.0.1"
const baseURL = `http://${host}:${port}/form-please/`

export default defineConfig({
	testDir: "./tests/browser",
	testMatch: "docs-site.spec.ts",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL,
		...devices["Desktop Chrome"],
		channel: process.env.GITHUB_ACTIONS ? "chrome" : undefined,
	},
	webServer: {
		command: `npm run preview --prefix docs-site -- --host ${host} --port ${port}`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
	},
})
