import { expect, test } from "@playwright/test"

test.describe("Fokit docs shell", () => {
	test("opens direct hash routes and keeps desktop lesson navigation focused", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 })
		await page.goto("./#/en/arrays")

		const title = page.getByTestId("lesson-title")
		await expect(title).toHaveText("Arrays with stable row identity")
		await expect(
			page
				.getByRole("navigation", { name: "Curriculum" })
				.getByRole("link", { name: "Arrays with stable row identity" }),
		).toHaveAttribute("aria-current", "page")

		await page.keyboard.press("Tab")
		const skip = page.getByRole("button", { name: "Skip to lesson" })
		await expect(skip).toBeFocused()
		await expect(skip).toHaveCSS("outline-style", "solid")
		await page.keyboard.press("Enter")
		await expect(title).toBeFocused()

		await page
			.getByRole("link", { name: "Next lesson: Compose manually where needed" })
			.click()
		await expect(page).toHaveURL(/#\/en\/manual-composition$/)
		await expect(title).toHaveText("Compose manually where needed")
		await expect(title).toBeFocused()

		await page
			.getByRole("link", {
				name: "Previous lesson: Arrays with stable row identity",
			})
			.click()
		await expect(page).toHaveURL(/#\/en\/arrays$/)
		await expect(title).toHaveText("Arrays with stable row identity")
	})

	test("normalizes fallback routes and persists locale switches", async ({
		page,
	}) => {
		await page.goto("./#/ru/arrays")
		await expect(page.getByTestId("lesson-title")).toHaveText(
			"Массивы со стабильными строками",
		)
		await expect(
			page.evaluate(() => localStorage.getItem("fokit.docs.locale")),
		).resolves.toBe("ru")

		await page.goto("./#/missing/arrays")
		await expect(page).toHaveURL(/#\/ru\/overview$/)
		await expect(page.getByTestId("lesson-title")).toHaveText("Что дает Fokit")

		await page.getByRole("link", { name: "Switch to English" }).click()
		await expect(page).toHaveURL(/#\/en\/overview$/)
		await expect(page.getByTestId("lesson-title")).toHaveText(
			"What Fokit gives you",
		)
		await expect(
			page.evaluate(() => localStorage.getItem("fokit.docs.locale")),
		).resolves.toBe("en")
	})

	test("renders copyable examples from raw example files", async ({ page }) => {
		await page.setViewportSize({ width: 1100, height: 820 })
		await page.goto("./#/en/styling-testing-boundaries")

		const example = page.getByRole("region", {
			name: "Form kit and definition",
		})
		await expect(example.getByText("examples/form-kit.tsx")).toBeVisible()
		await expect(example.getByTestId("example-code")).toContainText(
			'from "fokit"',
		)

		await example
			.getByRole("button", { name: "Copy examples/form-kit.tsx" })
			.click()
		await expect(
			example.getByRole("button", { name: "Copied examples/form-kit.tsx" }),
		).toBeVisible()

		const github = page.getByRole("link", { name: "Fokit GitHub" })
		await expect(github).toHaveAttribute(
			"href",
			"https://github.com/r13v/fokit",
		)
		await expect(github).toHaveAttribute("target", "_blank")

		const metrics = await page.evaluate(() => {
			const code = document.querySelector("[data-testid='example-code']")
			return {
				codeOverflowX: code ? getComputedStyle(code).overflowX : "",
				pageWidth: document.documentElement.scrollWidth,
				viewportWidth: document.documentElement.clientWidth,
			}
		})
		expect(metrics.codeOverflowX).toBe("auto")
		expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1)
	})

	test("uses a dismissible mobile drawer without horizontal page scrolling", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 760 })
		await page.goto("./#/en/overview")

		const drawer = page.getByTestId("lesson-drawer")
		await expect(drawer).toHaveAttribute("data-open", "false")

		await page.getByRole("button", { name: "Open lessons" }).click()
		await expect(drawer).toHaveAttribute("data-open", "true")
		await page.keyboard.press("Escape")
		await expect(drawer).toHaveAttribute("data-open", "false")

		await page.getByRole("button", { name: "Open lessons" }).click()
		await page
			.getByRole("link", { name: "Arrays with stable row identity" })
			.click()
		await expect(page).toHaveURL(/#\/en\/arrays$/)
		await expect(page.getByTestId("lesson-title")).toHaveText(
			"Arrays with stable row identity",
		)
		await expect(page.getByTestId("lesson-title")).toBeFocused()
		await expect(drawer).toHaveAttribute("data-open", "false")

		const widths = await page.evaluate(() => ({
			pageWidth: document.documentElement.scrollWidth,
			viewportWidth: document.documentElement.clientWidth,
		}))
		expect(widths.pageWidth).toBeLessThanOrEqual(widths.viewportWidth + 1)
	})

	test("runs the Fokit lab through validation, conditions, reset, and classic submit", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 920 })
		await page.goto("./#/en/first-form")

		const lab = page.getByRole("region", { name: "Interactive Fokit lab" })
		await expect(lab.getByTestId("lab-values")).toContainText(
			'"name": "Ada Lovelace"',
		)
		await expect(lab.getByTestId("lab-dirty")).toHaveText("false")
		await expect(lab.getByTestId("lab-form-data")).toContainText(
			"__fokit.array=contacts",
		)
		await expect(lab.getByTestId("lab-form-data")).toContainText(
			"contacts.0.email=ada@example.com",
		)

		await lab.getByLabel("Name").fill("")
		await lab.getByRole("button", { name: "Save profile" }).click()
		await expect(
			lab.locator(".lab-error", { hasText: "Name is required" }),
		).toBeVisible()
		await expect(lab.getByTestId("lab-issues")).toContainText(
			"name: Name is required",
		)

		await lab.getByLabel("Name").fill("Grace Hopper")
		await lab.getByLabel("Account type").selectOption("company")
		await lab.getByLabel("Company name").fill("Compiler Labs")
		await expect(lab.getByTestId("lab-values")).toContainText(
			'"companyName": "Compiler Labs"',
		)
		await lab.getByLabel("Account type").selectOption("personal")
		await expect(lab.getByLabel("Company name")).toHaveCount(0)
		await expect(lab.getByTestId("lab-values")).not.toContainText("companyName")
		await expect(lab.getByTestId("lab-form-data")).not.toContainText(
			"companyName",
		)

		await expect(lab.getByTestId("lab-dirty")).toHaveText("true")
		await lab.getByRole("button", { name: "Reset lab" }).click()
		await expect(lab.getByLabel("Name")).toHaveValue("Ada Lovelace")
		await expect(lab.getByTestId("lab-dirty")).toHaveText("false")

		await lab.getByRole("button", { name: "Save profile" }).click()
		await expect(lab.getByTestId("lab-submission")).toContainText(
			"Saved Ada Lovelace with 1 contact",
		)
	})

	test("keeps lab array commands and native FormData inspector in parity", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1180, height: 900 })
		await page.goto("./#/en/arrays")

		const lab = page.getByRole("region", { name: "Interactive Fokit lab" })
		await lab.getByRole("button", { name: "Add contact" }).click()
		await expect(lab.locator("[data-lab-array-item]")).toHaveCount(2)

		await lab.getByLabel("Email").nth(1).fill("support@example.com")
		await expect(lab.getByTestId("lab-values")).toContainText(
			'"email": "support@example.com"',
		)
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
		await expect(lab.locator("[data-lab-array-item]")).toHaveCount(1)
		await expect(lab.getByTestId("lab-form-data")).not.toContainText(
			"contacts.1.email",
		)
		await expect(lab.getByTestId("lab-form-data")).toContainText(
			"__fokit.array=contacts",
		)
	})

	test("captures wide and narrow lab screenshots for docs CI review", async ({
		page,
	}, testInfo) => {
		await page.setViewportSize({ width: 1360, height: 1000 })
		await page.goto("./#/en/overview")
		const wideLab = page.getByRole("region", {
			name: "Interactive Fokit lab",
		})
		await expect(wideLab).toBeVisible()
		await wideLab.screenshot({
			path: testInfo.outputPath("fokit-lab-wide.png"),
		})

		await page.setViewportSize({ width: 390, height: 860 })
		await page.goto("./#/en/overview")
		await expect(page.getByTestId("lesson-drawer")).toHaveAttribute(
			"data-open",
			"false",
		)
		const narrowLab = page.getByRole("region", {
			name: "Interactive Fokit lab",
		})
		await expect(narrowLab).toBeVisible()
		const widths = await page.evaluate(() => ({
			pageWidth: document.documentElement.scrollWidth,
			viewportWidth: document.documentElement.clientWidth,
		}))
		expect(widths.pageWidth).toBeLessThanOrEqual(widths.viewportWidth + 1)
		await narrowLab.screenshot({
			path: testInfo.outputPath("fokit-lab-narrow.png"),
		})
	})
})
