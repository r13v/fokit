import { expect, type Page, test } from "@playwright/test"

function pageErrors(page: Page): string[] {
	const errors: string[] = []
	page.on("pageerror", (error) => errors.push(error.message))
	return errors
}

test.describe("Form, Please documentation", () => {
	test("navigates the supported guide and reference routes", async ({
		page,
	}) => {
		const errors = pageErrors(page)
		await page.goto("./get-started")
		await expect(
			page.getByRole("heading", { level: 1, name: "Get started" }),
		).toBeVisible()

		const sidebar = page.locator("nav[data-v-sidebar]")
		await sidebar.getByRole("link", { name: "Definitions" }).click()
		await expect(page).toHaveURL(/\/form-please\/definitions$/)
		await expect(
			page.getByRole("heading", { level: 1, name: "Definitions" }),
		).toBeVisible()

		await sidebar.getByRole("link", { name: "API", exact: true }).click()
		await expect(page).toHaveURL(/\/form-please\/api$/)
		await expect(
			page.getByRole("heading", { level: 2, name: "createFormKit" }),
		).toBeVisible()

		await sidebar.getByRole("link", { name: "Production recipes" }).click()
		await expect(page).toHaveURL(/\/form-please\/advanced$/)
		await expect(
			page.getByRole("heading", {
				level: 2,
				name: "Compose generated and custom UI",
			}),
		).toBeVisible()
		expect(errors).toEqual([])
	})

	test("documents validation and resource behavior", async ({ page }) => {
		const errors = pageErrors(page)
		await page.goto("./validation")
		await expect(
			page.getByText(
				"The resolver validates through React Hook Form once per validation run.",
			),
		).toBeVisible()
		await page.goto("./resources")
		await expect(
			page.getByText("fromResource", { exact: true }).first(),
		).toBeVisible()
		expect(errors).toEqual([])
	})

	test("renders every supported live example", async ({ page }) => {
		const errors = pageErrors(page)
		for (const [route, label] of [
			["examples/mui-yup", "Material UI with Yup conference example"],
			["examples/shadcn-valibot", "Shadcn with Valibot workshop example"],
			["examples/research-grant", "Research grant application example"],
			["examples/studio-policies", "Creative studio policies example"],
			["examples/makerspace-launch", "Makerspace launch wizard example"],
			["examples/learning-cohort", "Learning cohort editor example"],
			["examples/membership-ladder", "Membership ladder example"],
			["examples/campaign-builder", "Campaign builder example"],
		] as const) {
			await page.goto(`./${route}`)
			await expect(page.locator(`[aria-label="${label}"]`)).toBeVisible()
		}
		expect(errors).toEqual([])
	})

	test("submits preset and context examples", async ({ page }) => {
		const errors = pageErrors(page)

		await page.goto("./examples/mui-yup")
		await expect(
			page.getByRole("region", {
				name: "Material UI with Yup conference example",
			}),
		).toHaveAttribute("data-demo-client-ready", "true")
		await page.getByRole("button", { name: "Submit proposal" }).click()
		await expect(
			page.locator('output[aria-live="polite"]').filter({
				hasText: "ready for review",
			}),
		).toBeVisible()

		await page.goto("./examples/shadcn-valibot")
		await page.getByRole("button", { name: "Submit proposal" }).click()
		await expect(
			page.locator('output[aria-live="polite"]').filter({
				hasText: "ready for 24 participants",
			}),
		).toBeVisible()

		await page.goto("./examples/studio-policies")
		await page.getByRole("button", { name: "Publish policies" }).click()
		await expect(
			page.locator('.form-please-complex [aria-live="polite"]').filter({
				hasText: /Revision .* published with/,
			}),
		).toBeVisible()

		expect(errors).toEqual([])
	})

	test("renders and submits the live documentation demos", async ({ page }) => {
		const errors = pageErrors(page)

		await page.goto("./")
		await expect(
			page.getByLabel("Live 'Form, Please' profile form"),
		).toBeVisible()
		await page.getByRole("button", { name: "Save profile" }).click()
		await expect(page.getByTestId("overview-output")).toContainText(
			"Ada Lovelace",
		)

		await page.goto("./get-started")
		await expect(page.getByTestId("lab")).toBeVisible()
		await page.getByRole("button", { name: "Save profile" }).click()
		await expect(page.getByTestId("lab-submission")).toContainText(
			"Saved Ada Lovelace with 1 contact",
		)

		await page.goto("./examples/async-multiselect")
		await expect(page.getByTestId("async-multiselect-demo")).toBeVisible()
		await page.getByRole("button", { name: "Save selection" }).click()
		await expect(page.getByTestId("async-multiselect-output")).toContainText(
			"Saved: tokyo, istanbul, moscow, mumbai",
		)

		await page.goto("./styling")
		await expect(
			page.getByLabel("Tailwind resolver profile form"),
		).toBeVisible()

		expect(errors).toEqual([])
	})

	test("runs the production recipe previews", async ({ page }) => {
		const errors = pageErrors(page)
		await page.goto("./advanced")

		const baseline = page.getByRole("region", {
			name: "Saved baseline recipe preview",
		})
		await expect(baseline).toHaveAttribute("data-demo-client-ready", "true")
		await baseline.getByLabel("Name").fill("Saved name")
		await baseline.getByRole("button", { name: "Save current values" }).click()
		await baseline.getByLabel("Name").fill("Later edit")
		await expect(baseline.getByText("Saved baseline: Saved name")).toBeVisible()
		await expect(baseline.getByText("Unsaved changes")).toBeVisible()

		const atomic = page.getByRole("region", {
			name: "Atomic values recipe preview",
		})
		await atomic.getByLabel("Name").fill("Manual edit")
		await expect(atomic.getByText("No template applied")).toBeVisible()
		await atomic.getByRole("button", { name: "Apply profile template" }).click()
		await expect(atomic.getByLabel("Name")).toHaveValue("Grace Hopper")
		await expect(atomic.getByLabel("Department")).toHaveValue("Compilers")
		await expect(atomic.getByText("Profile template applied.")).toBeVisible()

		const draft = page.getByRole("region", {
			name: "Draft subscription recipe preview",
		})
		await draft.getByLabel("Name").fill("Draft name")
		await expect(draft.getByText("Draft saved for Draft name.")).toBeVisible()

		const wizard = page.getByRole("region", {
			name: "Step validation recipe preview",
		})
		await wizard.getByRole("button", { name: "Continue" }).click()
		await expect(wizard.getByLabel("Name")).toBeFocused()
		await wizard.getByLabel("Name").fill("Ada Lovelace")
		await wizard.getByLabel("Email").fill("ada@example.com")
		await wizard.getByRole("button", { name: "Continue" }).click()
		await expect(wizard.getByLabel("Department")).toBeVisible()

		expect(errors).toEqual([])
	})
})
