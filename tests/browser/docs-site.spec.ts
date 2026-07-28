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
				codeScrollable: code ? code.scrollWidth > code.clientWidth : false,
				pageWidth: document.documentElement.scrollWidth,
				viewportWidth: document.documentElement.clientWidth,
			}
		})
		expect(metrics.codeScrollable).toBe(true)
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
})
