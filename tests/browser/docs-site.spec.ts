import { expect, test } from "@playwright/test"

test.describe("Fokit documentation", () => {
	test("opens direct page routes and keeps desktop navigation focused", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 })
		await page.goto("./#/en/advanced")

		const title = page.getByTestId("page-title")
		await expect(title).toHaveText("Advanced")
		await expect(
			page
				.getByRole("navigation", { name: "Documentation" })
				.getByRole("link", { name: "Advanced" }),
		).toHaveAttribute("aria-current", "page")

		await page.keyboard.press("Tab")
		const skip = page.getByRole("button", { name: "Skip to content" })
		await expect(skip).toBeFocused()
		await expect(skip).toHaveCSS("outline-style", "solid")
		await page.keyboard.press("Enter")
		await expect(title).toBeFocused()

		await page.getByRole("link", { name: "Next: FAQs" }).click()
		await expect(page).toHaveURL(/#\/en\/faqs$/)
		await expect(title).toHaveText("FAQs")
		await expect(title).toBeFocused()
		const focusGeometry = await title.evaluate((element) => ({
			mainWidth: element.closest("main")?.getBoundingClientRect().width ?? 0,
			titleWidth: element.getBoundingClientRect().width,
		}))
		expect(focusGeometry.titleWidth).toBeLessThan(focusGeometry.mainWidth)

		await page.getByRole("link", { name: "Previous: Advanced" }).click()
		await expect(page).toHaveURL(/#\/en\/advanced$/)
		await expect(title).toHaveText("Advanced")
	})

	test("normalizes legacy and fallback routes while persisting locale", async ({
		page,
	}) => {
		await page.goto("./#/ru/arrays")
		await expect(page).toHaveURL(/#\/ru\/advanced$/)
		await expect(page.getByTestId("page-title")).toHaveText(
			"Продвинутые сценарии",
		)
		await expect(
			page.evaluate(() => localStorage.getItem("fokit.docs.locale")),
		).resolves.toBe("ru")

		await page.goto("./#/missing/types")
		await expect(page).toHaveURL(/#\/ru\/get-started$/)
		await expect(page.getByTestId("page-title")).toHaveText("Быстрый старт")

		await page.getByRole("link", { name: "Switch to English" }).click()
		await expect(page).toHaveURL(/#\/en\/get-started$/)
		await expect(page.getByTestId("page-title")).toHaveText("Get started")
		await expect(
			page.evaluate(() => localStorage.getItem("fokit.docs.locale")),
		).resolves.toBe("en")
	})

	test("exposes the complete reference-equivalent top-level content map", async ({
		page,
	}) => {
		await page.goto("./#/en/get-started")
		await expect(
			page.getByRole("heading", { name: "Build your first form" }),
		).toBeVisible()

		const navigation = page.getByRole("navigation", {
			name: "Documentation",
		})
		await navigation.getByRole("link", { name: "API", exact: true }).click()
		await expect(page).toHaveURL(/#\/en\/api$/)
		await expect(page.getByRole("heading", { name: "useForm" })).toBeVisible()
		await expect(
			page.getByLabel("Page notes").getByText("fokit/react19", { exact: true }),
		).toBeVisible()

		await navigation.getByRole("link", { name: "Types", exact: true }).click()
		await expect(page).toHaveURL(/#\/en\/types$/)
		await expect(
			page.getByRole("heading", { name: "FormInput and FormOutput" }),
		).toBeVisible()

		await navigation
			.getByRole("link", { name: "Advanced", exact: true })
			.click()
		await expect(page).toHaveURL(/#\/en\/advanced$/)
		await expect(
			page.getByRole("heading", { name: "Stable array identity" }),
		).toBeVisible()

		await navigation.getByRole("link", { name: "FAQs", exact: true }).click()
		await expect(page).toHaveURL(/#\/en\/faqs$/)
		await expect(
			page.getByRole("heading", {
				name: "Does every field rerender on each change?",
			}),
		).toBeVisible()
		const help = page.getByLabel("Page notes")
		await expect(
			help.getByRole("link", { name: "GitHub issues" }),
		).toHaveAttribute("href", "https://github.com/r13v/fokit/issues")
		await expect(
			help.getByRole("link", { name: "API reference" }),
		).toHaveAttribute("href", "#/en/api")
	})

	test("keeps long-page navigation sticky and API sections shareable", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 })
		await page.goto("./#/en/api/use-form")

		await expect(page).toHaveURL(/#\/en\/api\/use-form$/)
		await expect(page.getByRole("heading", { name: "useForm" })).toBeVisible()
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeGreaterThan(100)

		const onThisPage = page.getByRole("navigation", { name: "On this page" })
		await onThisPage.getByRole("link", { name: "createFormKit" }).click()
		await expect(page).toHaveURL(/#\/en\/api\/create-form-kit$/)
		await expect(
			page.getByRole("heading", { name: "createFormKit" }),
		).toBeVisible()
		const createFormKitSection = page.locator("#create-form-kit")
		await expect
			.poll(() =>
				createFormKitSection.evaluate(
					(element) => element.getBoundingClientRect().top,
				),
			)
			.toBeLessThanOrEqual(110)
		const sectionTop = await createFormKitSection.evaluate(
			(element) => element.getBoundingClientRect().top,
		)
		expect(sectionTop).toBeGreaterThanOrEqual(100)
		await expect(
			onThisPage.getByRole("link", { name: "createFormKit" }),
		).toHaveAttribute("aria-current", "location")

		const stickyGeometry = await page.evaluate(() => ({
			headerTop:
				document.querySelector(".topbar")?.getBoundingClientRect().top ?? -1,
			tocRight:
				document.querySelector(".toc-rail")?.getBoundingClientRect().right ??
				-1,
			tocTop:
				document.querySelector(".toc-rail")?.getBoundingClientRect().top ?? -1,
			viewportWidth: window.innerWidth,
		}))
		expect(stickyGeometry.headerTop).toBeGreaterThanOrEqual(-1)
		expect(stickyGeometry.headerTop).toBeLessThanOrEqual(1)
		expect(stickyGeometry.tocTop).toBeGreaterThanOrEqual(110)
		expect(stickyGeometry.tocTop).toBeLessThanOrEqual(114)
		expect(stickyGeometry.tocRight).toBeLessThanOrEqual(
			stickyGeometry.viewportWidth,
		)

		await page.goBack()
		await expect(page).toHaveURL(/#\/en\/api\/use-form$/)
		await expect(page.getByRole("heading", { name: "useForm" })).toBeVisible()

		await page.getByRole("link", { name: "Switch to Russian" }).click()
		await expect(page).toHaveURL(/#\/ru\/api\/use-form$/)
	})

	test("renders copyable examples from executable example files", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1100, height: 820 })
		await page.goto("./#/en/get-started")

		const example = page.getByRole("region", {
			name: "Form kit and definition",
		})
		await example.getByText("Open complete example").click()
		await expect(example.locator("summary code")).toHaveText(
			"examples/form-kit.tsx",
		)
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

	test("uses a dismissible mobile navigation drawer without horizontal scrolling", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 760 })
		await page.goto("./#/en/get-started")

		const drawer = page.getByTestId("navigation-drawer")
		await expect(drawer).toHaveAttribute("data-open", "false")

		const toggle = page.getByRole("button", { name: "Open navigation" })
		await toggle.click()
		await expect(drawer).toHaveAttribute("data-open", "true")
		await expect(drawer).toHaveAttribute("role", "dialog")
		await expect(drawer).toHaveAttribute("aria-modal", "true")
		const close = drawer.getByRole("button", { name: "Close navigation" })
		await expect(close).toBeFocused()
		await expect(
			page.getByRole("button", { name: "Close navigation" }),
		).toHaveCount(1)
		await page.keyboard.press("Shift+Tab")
		await expect(drawer.getByRole("link", { name: "Live lab" })).toBeFocused()
		await page.keyboard.press("Tab")
		await expect(close).toBeFocused()
		await page.keyboard.press("Escape")
		await expect(drawer).toHaveAttribute("data-open", "false")
		await expect(toggle).toBeFocused()

		await toggle.click()
		await drawer.getByRole("link", { name: "Types" }).click()
		await expect(page).toHaveURL(/#\/en\/types$/)
		await expect(page.getByTestId("page-title")).toHaveText("Types")
		await expect(page.getByTestId("page-title")).toBeFocused()
		await expect(drawer).toHaveAttribute("data-open", "false")

		const widths = await page.evaluate(() => ({
			contentWidth:
				document.querySelector(".docs-layout")?.scrollWidth ??
				document.documentElement.scrollWidth,
			layoutWidth:
				document.querySelector(".docs-layout")?.clientWidth ??
				document.documentElement.clientWidth,
			pageWidth: document.documentElement.scrollWidth,
			viewportWidth: document.documentElement.clientWidth,
		}))
		expect(widths.pageWidth).toBeLessThanOrEqual(widths.viewportWidth + 1)
		expect(widths.contentWidth).toBeLessThanOrEqual(widths.layoutWidth + 1)
	})

	test("runs the Fokit lab through validation, conditions, reset, and classic submit", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 920 })
		await page.goto("./#/en/get-started/live-lab")

		const lab = page.getByRole("region", { name: "Interactive Fokit lab" })
		await expect(
			page
				.getByRole("navigation", { name: "On this page" })
				.getByRole("link", { name: "Live lab" }),
		).toHaveAttribute("aria-current", "location")
		await expect(lab.getByTestId("lab-values")).toContainText(
			'"name": "Ada Lovelace"',
		)
		await expect(lab.getByTestId("lab-dirty")).toHaveText("false")
		await expect(lab.getByTestId("lab-form-data")).toContainText(
			"__fokit.array=contacts",
		)

		await lab.getByLabel("Name").fill("")
		await expect(lab.getByLabel("Name")).toHaveAttribute(
			"placeholder",
			"Enter your name",
		)
		await lab.getByRole("button", { name: "Save profile" }).click()
		const nameError = lab.locator(".lab-error", {
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
		await page.goto("./#/en/get-started")

		const lab = page.getByRole("region", { name: "Interactive Fokit lab" })
		await lab.getByRole("button", { name: "Add contact" }).click()
		await expect(lab.locator("[data-lab-array-item]")).toHaveCount(2)

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
		await expect(lab.locator("[data-lab-array-item]")).toHaveCount(1)
		await expect(lab.getByTestId("lab-form-data")).not.toContainText(
			"contacts.1.email",
		)
	})

	test("captures desktop and mobile documentation screens for CI review", async ({
		page,
	}, testInfo) => {
		await page.setViewportSize({ width: 1440, height: 1024 })
		await page.goto("./#/en/get-started")
		await expect(page.getByTestId("page-title")).toBeVisible()
		await page.screenshot({
			path: testInfo.outputPath("fokit-docs-desktop.png"),
		})

		await page.setViewportSize({ width: 390, height: 860 })
		await page.goto("./#/en/get-started")
		await expect(page.getByTestId("navigation-drawer")).toHaveAttribute(
			"data-open",
			"false",
		)
		const widths = await page.evaluate(() => ({
			contentWidth:
				document.querySelector(".docs-layout")?.scrollWidth ??
				document.documentElement.scrollWidth,
			layoutWidth:
				document.querySelector(".docs-layout")?.clientWidth ??
				document.documentElement.clientWidth,
			pageWidth: document.documentElement.scrollWidth,
			viewportWidth: document.documentElement.clientWidth,
		}))
		expect(widths.pageWidth).toBeLessThanOrEqual(widths.viewportWidth + 1)
		expect(widths.contentWidth).toBeLessThanOrEqual(widths.layoutWidth + 1)
		await page.screenshot({
			path: testInfo.outputPath("fokit-docs-mobile.png"),
		})
	})
})
