import { expect, test } from "@playwright/test"

test.describe("Fokit documentation", () => {
	test("uses clean Vocs routes, sidebar navigation, and direct deep links", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 })
		await page.goto("./get-started")

		await expect(page).toHaveURL(/\/fokit\/get-started$/)
		await expect(
			page.getByRole("heading", { level: 1, name: "Get started" }),
		).toBeVisible()
		const sidebar = page.locator("nav[data-v-sidebar]")
		await expect(sidebar).toBeVisible()
		await expect(
			sidebar.getByRole("link", { name: "Get started" }),
		).toHaveAttribute("data-active", "true")

		await sidebar.getByRole("link", { name: "API", exact: true }).click()
		await expect(page).toHaveURL(/\/fokit\/api$/)
		await expect(
			page.getByRole("heading", { level: 1, name: "API" }),
		).toBeVisible()

		await page.goto("./api#createformkit")
		await expect(page).toHaveURL(/\/fokit\/api#createformkit$/)
		const createFormKitHeading = page.getByRole("heading", {
			level: 2,
			name: "createFormKit",
		})
		await expect(createFormKitHeading).toBeVisible()
		await expect
			.poll(() =>
				createFormKitHeading.evaluate(
					(element) => element.getBoundingClientRect().top,
				),
			)
			.toBeLessThanOrEqual(120)
	})

	test("renders copyable code, rich Twoslash hovers, and static AI Markdown", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, "clipboard", {
				configurable: true,
				value: {
					writeText: async (text: string) => {
						window.sessionStorage.setItem("fokit-test-clipboard", text)
					},
				},
			})
		})
		await page.setViewportSize({ width: 1120, height: 840 })
		await page.goto("./get-started")

		const firstCodeBlock = page.locator("[data-v-code-container]").first()
		await firstCodeBlock.hover()
		const copyButton = firstCodeBlock.getByRole("button", { name: "Copy code" })
		await expect
			.poll(async () => {
				await firstCodeBlock.hover()
				await copyButton.click()
				return page.evaluate(
					() => window.sessionStorage.getItem("fokit-test-clipboard") ?? "",
				)
			})
			.toContain("npm install fokit zod")
		await expect(
			firstCodeBlock.getByRole("button", { name: "Copied" }),
		).toHaveAttribute("data-copied", "true")

		await page.goto("./api#parseformdata")
		const twoslashTrigger = page.locator("[data-v-twoslash-trigger]").first()
		await expect(twoslashTrigger).toBeVisible()
		await twoslashTrigger.click()
		await expect(page.getByText(/ParseResult|PromiseConstructor/)).toBeVisible()

		const llmsResponse = await page.request.get("./llms.txt")
		expect(llmsResponse.ok()).toBe(true)
		await expect
			.poll(async () => await llmsResponse.text())
			.toContain("Interactive Fokit Lab")
	})

	test("runs the Fokit lab through validation, conditions, reset, and classic submit", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 920 })
		await page.goto("./get-started#interactive-fokit-lab")

		const lab = page.getByRole("region", { name: "Interactive Fokit Lab" })
		await expect(lab).toBeVisible()
		await expect(lab.getByTestId("lab-values")).toContainText(
			'"name": "Ada Lovelace"',
		)
		await expect(lab.getByTestId("lab-dirty")).toHaveText("false")
		await expect(lab.getByTestId("lab-form-data")).toContainText(
			"__fokit.array=contacts",
		)
		await expect(lab.locator("[data-fokit-node='field']").first()).toBeVisible()

		await lab.getByLabel("Name").fill("")
		await expect(lab.getByLabel("Name")).toHaveAttribute(
			"placeholder",
			"Enter your name",
		)
		await lab.getByRole("button", { name: "Save profile" }).click()
		const nameError = lab.locator("[data-fokit-node='error-message']", {
			hasText: "Name is required",
		})
		await expect(nameError).toBeVisible()
		await expect(nameError).toHaveAttribute("role", "alert")

		await lab.getByLabel("Name").fill("Grace Hopper")
		await lab.getByLabel("Account type").selectOption("company")
		await lab.getByLabel("Company name").fill("Compiler Labs")
		await expect(lab.getByTestId("lab-values")).toContainText(
			'"companyName": "Compiler Labs"',
		)
		await lab.getByLabel("Account type").selectOption("personal")
		await expect(lab.getByLabel("Company name")).toHaveCount(0)

		await expect(lab.getByTestId("lab-dirty")).toHaveText("true")
		await lab.getByRole("button", { name: "Reset lab" }).click()
		await expect(lab.getByLabel("Name")).toHaveValue("Ada Lovelace")
		await expect(lab.getByTestId("lab-dirty")).toHaveText("false")

		await lab.getByRole("button", { name: "Save profile" }).click()
		await expect(lab.getByTestId("lab-submission")).toContainText(
			"Saved Ada Lovelace with 1 contact",
		)
	})

	test("keeps lab array commands and native FormData in parity", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1180, height: 900 })
		await page.goto("./get-started#interactive-fokit-lab")

		const lab = page.getByRole("region", { name: "Interactive Fokit Lab" })
		await lab.getByRole("button", { name: "Add contact" }).click()
		await expect(lab.locator("[data-fokit-node='array-item']")).toHaveCount(2)

		await lab.getByLabel("Email").nth(1).fill("support@example.com")
		await expect(lab.getByTestId("lab-form-data")).toContainText(
			"contacts.1.email=support@example.com",
		)

		await lab.getByRole("button", { name: "Move contact 2 up" }).click()
		await expect(lab.getByLabel("Email").first()).toHaveValue(
			"support@example.com",
		)
		await expect(lab.getByTestId("lab-form-data")).toContainText(
			"contacts.0.email=support@example.com",
		)

		await lab.getByRole("button", { name: "Remove contact 1" }).click()
		await expect(lab.locator("[data-fokit-node='array-item']")).toHaveCount(1)
		await expect(lab.getByTestId("lab-form-data")).not.toContainText(
			"contacts.1.email",
		)
	})

	test("uses responsive Vocs navigation without horizontal scrolling", async ({
		page,
	}, testInfo) => {
		await page.setViewportSize({ width: 390, height: 760 })
		await page.goto("./get-started")

		await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible()
		await page.getByRole("button", { name: "Open menu" }).click()
		const dialog = page.getByRole("dialog")
		await expect(dialog).toBeVisible()
		await dialog.getByRole("link", { name: "Types" }).click()
		await expect(page).toHaveURL(/\/fokit\/types$/)
		await expect(
			page.getByRole("heading", { level: 1, name: "Types" }),
		).toBeVisible()

		const widths = await page.evaluate(() => ({
			pageWidth: document.documentElement.scrollWidth,
			viewportWidth: document.documentElement.clientWidth,
			contentWidth:
				document.querySelector("[data-v-content]")?.scrollWidth ??
				document.documentElement.scrollWidth,
			layoutWidth:
				document.querySelector("[data-v-content]")?.clientWidth ??
				document.documentElement.clientWidth,
		}))
		expect(widths.pageWidth).toBeLessThanOrEqual(widths.viewportWidth + 1)
		expect(widths.contentWidth).toBeLessThanOrEqual(widths.layoutWidth + 1)

		await page.screenshot({
			path: testInfo.outputPath("fokit-docs-mobile.png"),
		})
	})
})
