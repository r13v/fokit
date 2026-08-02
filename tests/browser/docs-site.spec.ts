import { Buffer } from "node:buffer"

import { expect, type Page, test } from "@playwright/test"

function collectPageErrors(page: Page): string[] {
	const errors: string[] = []
	page.on("pageerror", (error) => errors.push(error.message))
	return errors
}

test.describe("Form, Please documentation", () => {
	test("uses clean Vocs routes, sidebar navigation, and direct deep links", async ({
		page,
	}, testInfo) => {
		await page.setViewportSize({ width: 1280, height: 900 })
		await page.goto("./get-started")

		await expect(page).toHaveURL(/\/form-please\/get-started$/)
		await expect(
			page.getByRole("heading", { level: 1, name: "Get started" }),
		).toBeVisible()
		const sidebar = page.locator("nav[data-v-sidebar]")
		await expect(sidebar).toBeVisible()
		await expect(
			sidebar.getByRole("link", { name: "Get started" }),
		).toHaveAttribute("data-active", "true")
		await page.screenshot({
			path: testInfo.outputPath("form-please-get-started.png"),
		})

		await sidebar.getByRole("link", { name: "API", exact: true }).click()
		await expect(page).toHaveURL(/\/form-please\/api$/)
		await expect(
			page.getByRole("heading", { level: 1, name: "API" }),
		).toBeVisible()

		await page.goto("./api#createformkit")
		await expect(page).toHaveURL(/\/form-please\/api#createformkit$/)
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

	test("keeps the learning path ahead of reference pages", async ({
		page,
	}, testInfo) => {
		await page.setViewportSize({ width: 1280, height: 900 })
		await page.goto("./get-started")

		const sidebar = page.locator("nav[data-v-sidebar]")
		await sidebar.getByRole("link", { name: "Build a production form" }).click()

		await expect(page).toHaveURL(/\/form-please\/guides\/tutorial$/)
		await expect(
			page.getByRole("heading", {
				level: 1,
				name: "Build a production form",
			}),
		).toBeVisible()
		await expect(
			page.getByRole("heading", {
				level: 2,
				name: "Model editable input and saved output",
			}),
		).toBeVisible()
		await expect(page.getByRole("button", { name: /Ask AI/ })).toHaveCount(0)

		await page.screenshot({
			path: testInfo.outputPath("form-please-production-tutorial.png"),
		})

		await sidebar.getByRole("link", { name: "Validation & errors" }).click()
		await expect(page).toHaveURL(/\/form-please\/guides\/validation$/)
		await expect(
			page.getByRole("heading", {
				level: 1,
				name: "Validation and errors",
			}),
		).toBeVisible()
		await expect(
			page.getByText("setErrors", { exact: true }).first(),
		).toBeVisible()
	})

	test("overview leads with the outcome and proves the typed submit loop", async ({
		page,
	}, testInfo) => {
		await page.setViewportSize({ width: 1280, height: 920 })
		await page.goto("./")

		await expect(
			page.getByRole("heading", {
				level: 1,
				name: "Build forms with ease",
			}),
		).toBeVisible()
		await expect(
			page.getByRole("link", { name: "Build your first form" }),
		).toHaveAttribute("href", "/form-please/get-started")
		await page.screenshot({
			fullPage: true,
			path: testInfo.outputPath("form-please-overview.png"),
		})

		const demo = page.getByRole("region", {
			name: "Live Form, Please profile form",
		})
		await expect(demo).toBeVisible()
		await expect(demo.getByTestId("overview-output")).toContainText(
			"Submit the form to see typed output.",
		)

		await demo.getByRole("button", { name: "Save profile" }).click()
		await expect(demo.getByTestId("overview-output")).toContainText(
			'"email": "ada@example.com"',
		)
		const saveButton = demo.getByRole("button", { name: "Save profile" })
		const saveButtonTopBeforeError = await saveButton.evaluate(
			(element) => element.getBoundingClientRect().top + window.scrollY,
		)

		await demo.getByLabel("Email").fill("not-an-email")
		await saveButton.click()
		const emailError = demo.locator("[data-fp-node='error-message']", {
			hasText: "Enter a valid email",
		})
		await expect(emailError).toBeVisible()
		await expect(emailError).toHaveCSS("-webkit-line-clamp", "2")
		await expect(emailError).toHaveCSS("overflow", "hidden")
		const saveButtonTopWithError = await saveButton.evaluate(
			(element) => element.getBoundingClientRect().top + window.scrollY,
		)
		expect(
			Math.abs(saveButtonTopWithError - saveButtonTopBeforeError),
		).toBeLessThanOrEqual(0.5)

		await page.evaluate(() => {
			document.documentElement.setAttribute("data-vocs-theme", "dark")
		})
		const headingContrast = await page
			.getByRole("heading", {
				level: 1,
				name: "Build forms with ease",
			})
			.evaluate((heading) => {
				const parseRgb = (value: string) =>
					(value.match(/\d+/g) ?? []).slice(0, 3).map(Number)
				const luminance = ([red = 0, green = 0, blue = 0]: number[]) => {
					const channels = [red, green, blue].map((channel) => {
						const normalized = channel / 255
						return normalized <= 0.04045
							? normalized / 12.92
							: ((normalized + 0.055) / 1.055) ** 2.4
					})

					return (
						(channels[0] ?? 0) * 0.2126 +
						(channels[1] ?? 0) * 0.7152 +
						(channels[2] ?? 0) * 0.0722
					)
				}
				const foreground = luminance(parseRgb(getComputedStyle(heading).color))
				const background = luminance(
					parseRgb(getComputedStyle(document.body).backgroundColor),
				)

				return (
					(Math.max(foreground, background) + 0.05) /
					(Math.min(foreground, background) + 0.05)
				)
			})

		expect(headingContrast).toBeGreaterThanOrEqual(4.5)
	})

	test("keeps demo controls visually consistent and reserves rust for errors", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 920 })
		await page.goto("./get-started#interactive-form-please-lab")

		const lab = page.getByRole("region", {
			name: "Interactive Form, Please Lab",
		})
		await expect(lab.getByTestId("lab-form-data")).toContainText(
			"__fp.array=contacts",
			{ timeout: 15_000 },
		)
		const name = lab.getByLabel("Name")
		const accountType = lab.getByLabel("Account type")
		const addContact = lab.getByRole("button", { name: "Add contact" })
		const moveUp = lab.getByRole("button", { name: "Move contact 1 up" })
		const remove = lab.getByRole("button", { name: "Remove contact 1" })
		await expect(moveUp).toHaveText("↑")
		await expect(moveUp).toHaveAttribute("title", "Move contact 1 up")
		await expect(remove).toHaveText("❌")
		await expect(remove).toHaveAttribute("title", "Remove contact 1")

		const controlHeights = await Promise.all(
			[name, accountType, addContact].map((locator) =>
				locator.evaluate((element) => element.getBoundingClientRect().height),
			),
		)
		for (const height of controlHeights.slice(1)) {
			expect(Math.abs(height - (controlHeights[0] ?? 0))).toBeLessThanOrEqual(1)
		}

		const actionHeights = await Promise.all(
			[moveUp, remove].map((locator) =>
				locator.evaluate((element) => element.getBoundingClientRect().height),
			),
		)
		expect(actionHeights[0]).toBe(actionHeights[1])
		expect(actionHeights[0]).toBeLessThan(controlHeights[0] ?? 0)

		const actionGroup = lab.locator("[data-fp-array-item-actions]").first()
		await expect(actionGroup).toBeVisible()
		await expect(actionGroup).toHaveAttribute("aria-label", "#1")
		await expect(actionGroup.getByText("#1", { exact: true })).toBeVisible()
		const actionGroupStyles = await actionGroup.evaluate((element) => {
			const styles = getComputedStyle(element)
			return {
				background: styles.backgroundColor,
				borderWidth: styles.borderTopWidth,
			}
		})
		expect(actionGroupStyles.background).not.toBe("rgba(0, 0, 0, 0)")
		expect(actionGroupStyles.borderWidth).not.toBe("0px")
		const actionStyles = await remove.evaluate((element) => {
			const styles = getComputedStyle(element)
			return {
				background: styles.backgroundColor,
				border: styles.borderTopColor,
			}
		})
		expect(actionStyles.background).toBe("rgba(0, 0, 0, 0)")
		expect(actionStyles.border).toBe("rgba(0, 0, 0, 0)")

		const accentColors = await Promise.all([
			lab
				.locator(".form-please-lab__kicker")
				.evaluate((element) => getComputedStyle(element).color),
			lab
				.getByRole("button", { name: "Save profile" })
				.evaluate((element) => getComputedStyle(element).backgroundColor),
		])
		expect(accentColors[0]).toBe(accentColors[1])

		await name.fill("")
		await lab.getByRole("button", { name: "Save profile" }).click()
		await expect(name).toBeFocused()
		const invalidColors = await name.evaluate((element) => {
			const styles = getComputedStyle(element)
			return {
				border: styles.borderTopColor,
				outline: styles.outlineColor,
			}
		})
		expect(invalidColors.outline).toBe(invalidColors.border)

		await name.fill("Ada Lovelace")
		const email = lab.getByLabel("Email")
		await email.fill("invalid")
		await lab.getByRole("button", { name: "Save profile" }).click()
		const fieldTops = await lab
			.locator("[data-fp-node='array-item'] [data-fp-node='field']")
			.evaluateAll((elements) =>
				elements.map((element) => element.getBoundingClientRect().top),
			)
		expect(
			Math.abs((fieldTops[0] ?? 0) - (fieldTops[1] ?? 0)),
		).toBeLessThanOrEqual(1)
	})

	test("keeps skip links under the GitHub Pages base path after hydration", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 })
		await page.goto("./get-started", { waitUntil: "networkidle" })

		const skipLink = page.locator("a[data-v-skip-to-content]")
		await expect(skipLink).toHaveAttribute(
			"href",
			/\/form-please\/get-started#vocs-content$/,
		)

		await skipLink.focus()
		await page.keyboard.press("Enter")
		await expect(page).toHaveURL(/\/form-please\/get-started#vocs-content$/)
	})

	test("renders copyable code, rich Twoslash hovers, and static AI Markdown", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, "clipboard", {
				configurable: true,
				value: {
					writeText: async (text: string) => {
						window.sessionStorage.setItem("form-please-test-clipboard", text)
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
					() =>
						window.sessionStorage.getItem("form-please-test-clipboard") ?? "",
				)
			})
			.toContain("npm install form-please zod")
		await expect(
			firstCodeBlock.getByRole("button", { name: "Copied" }),
		).toHaveAttribute("data-copied", "true")

		await page.goto("./api#parseformdata")
		const twoslashTrigger = page
			.locator("[data-v-twoslash-trigger]")
			.filter({ hasText: "createFormKit" })
			.first()
		await expect(twoslashTrigger).toBeVisible()
		await twoslashTrigger.click()
		await expect(
			page.getByText(/function createFormKit<Controls/),
		).toBeVisible()

		const llmsResponse = await page.request.get("./llms.txt")
		expect(llmsResponse.ok()).toBe(true)
		await expect
			.poll(async () => await llmsResponse.text())
			.toContain("Build and submit your first typed form with Form, Please")
	})

	test("searches Vocs content under the GitHub Pages base path", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1120, height: 840 })
		await page.goto("./get-started", { waitUntil: "networkidle" })

		await page
			.getByRole("button", { name: /Search/ })
			.first()
			.click()
		const dialog = page.getByRole("dialog")
		await expect(dialog).toBeVisible()
		await dialog.getByRole("combobox").fill("createNativeControls")

		const createNativeControlsResult = dialog.locator(
			'a[href="/form-please/guides/controls#native-controls"]',
		)
		await expect(createNativeControlsResult).toContainText(
			"createNativeControls",
		)
		await createNativeControlsResult.click()
		await expect(page).toHaveURL(
			/\/form-please\/guides\/controls#native-controls$/,
		)
		await expect(
			page.getByRole("heading", { level: 2, name: "Native controls" }),
		).toBeVisible()
	})

	test("runs the Form, Please lab through validation, conditions, reset, and classic submit", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 920 })
		await page.goto("./get-started#interactive-form-please-lab")

		const lab = page.getByRole("region", {
			name: "Interactive Form, Please Lab",
		})
		await expect(lab).toBeVisible()
		await expect(lab.getByTestId("lab-values")).toContainText(
			'"name": "Ada Lovelace"',
		)
		await expect(lab.getByTestId("lab-dirty")).toHaveText("false")
		await expect(lab.getByTestId("lab-form-data")).toContainText(
			"__fp.array=contacts",
		)
		await expect(lab.locator("[data-fp-node='field']").first()).toBeVisible()

		await lab.getByLabel("Name").fill("")
		await expect(lab.getByLabel("Name")).toHaveAttribute(
			"placeholder",
			"Enter your name",
		)
		await lab.getByRole("button", { name: "Save profile" }).click()
		const nameError = lab.locator("[data-fp-node='error-message']", {
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
		await page.goto("./get-started#interactive-form-please-lab")

		const lab = page.getByRole("region", {
			name: "Interactive Form, Please Lab",
		})
		await lab.getByRole("button", { name: "Add contact" }).click()
		await expect(lab.locator("[data-fp-node='array-item']")).toHaveCount(2)

		await lab.getByLabel("Email").nth(1).fill("support@example.com")
		await expect(lab.getByTestId("lab-form-data")).toContainText(
			"contacts.1.email=support@example.com",
		)

		await lab.getByLabel("Avatar").setInputFiles({
			name: "avatar.png",
			mimeType: "image/png",
			buffer: Buffer.from("avatar"),
		})
		await expect(lab.getByTestId("lab-form-data")).toContainText(
			"avatar=File(avatar.png)",
		)

		await lab.getByRole("button", { name: "Move contact 2 up" }).click()
		await expect(lab.getByLabel("Email").first()).toHaveValue(
			"support@example.com",
		)
		await expect(lab.getByTestId("lab-form-data")).toContainText(
			"contacts.0.email=support@example.com",
		)

		await lab.getByRole("button", { name: "Remove contact 1" }).click()
		await expect(lab.locator("[data-fp-node='array-item']")).toHaveCount(1)
		await expect(lab.getByTestId("lab-form-data")).not.toContainText(
			"contacts.1.email",
		)
	})

	test("resolves Tailwind classes in the live shared profile form", async ({
		page,
	}, testInfo) => {
		await page.setViewportSize({ width: 1280, height: 920 })
		await page.goto(
			"./guides/styling#resolve-tailwind-classes-from-form-values",
		)

		const demo = page.getByRole("region", {
			name: "Tailwind resolver profile form",
		})
		const account = demo.locator('[data-fp-node="section"]')
		await expect(demo).toBeVisible()
		await expect(account).toHaveClass(/border-emerald-300/)
		await expect(account).toHaveCSS(
			"background-color",
			"oklch(0.979 0.021 166.113)",
		)

		await demo.getByLabel("Account type").selectOption("company")
		await expect(demo.getByLabel("Company name")).toBeVisible()
		await expect(account).toHaveClass(/border-amber-300/)
		await expect(account).not.toHaveClass(/border-emerald-300/)
		await expect(account).toHaveCSS(
			"background-color",
			"oklch(0.987 0.022 95.277)",
		)
		await page.screenshot({
			path: testInfo.outputPath("form-please-tailwind-resolver.png"),
		})
	})

	test("searches, toggles, and submits the async multiselect", async ({
		page,
	}, testInfo) => {
		await page.setViewportSize({ width: 1280, height: 920 })
		await page.goto("./guides/async-multiselect")

		const demo = page.getByRole("region", {
			name: "Async multiselect example",
		})
		await expect(demo).toBeVisible()
		await expect(
			demo.getByRole("button", { name: "Remove Tokyo" }),
		).toBeVisible()
		await expect(demo.getByText("+1", { exact: true })).toBeVisible()

		await demo.getByRole("button", { name: "Open options" }).click()
		const search = demo.getByRole("combobox", { name: "Search cities" })
		await expect(search).toBeFocused()
		await search.fill("m")

		const options = demo.getByRole("option")
		await expect(options).toHaveCount(3)
		await expect(demo.getByRole("option", { name: "Moscow" })).toHaveAttribute(
			"aria-selected",
			"true",
		)
		await expect(demo.getByRole("option", { name: "Mumbai" })).toHaveAttribute(
			"aria-selected",
			"true",
		)
		await expect(demo.getByRole("option", { name: "Rome" })).toHaveAttribute(
			"aria-selected",
			"false",
		)
		await search.press("ArrowDown")
		await expect(demo.getByRole("option", { name: "Moscow" })).toBeFocused()

		await demo.getByRole("option", { name: "Moscow" }).click()
		await demo.getByRole("option", { name: "Rome" }).click()
		await demo.getByRole("button", { name: "Close", exact: true }).click()
		await expect(
			demo.getByRole("button", { name: "Open options" }),
		).toBeFocused()

		await expect(
			demo.getByRole("button", { name: "Remove Moscow" }),
		).toHaveCount(0)
		await demo.getByRole("button", { name: "Save selection" }).click()
		await expect(demo.getByTestId("async-multiselect-output")).toContainText(
			"Saved: tokyo, istanbul, mumbai, rome",
		)

		await page.screenshot({
			path: testInfo.outputPath("form-please-async-multiselect.png"),
		})
	})

	test("renders all six complex examples on clean routes", async ({ page }) => {
		const pageErrors = collectPageErrors(page)
		const examples = [
			{
				slug: "research-grant",
				heading: "Research grant application",
				region: "Research grant application example",
			},
			{
				slug: "studio-policies",
				heading: "Creative studio policies",
				region: "Creative studio policies example",
			},
			{
				slug: "makerspace-launch",
				heading: "Makerspace launch wizard",
				region: "Makerspace launch wizard example",
			},
			{
				slug: "learning-cohort",
				heading: "Learning cohort editor",
				region: "Learning cohort editor example",
			},
			{
				slug: "membership-ladder",
				heading: "Membership ladder",
				region: "Membership ladder example",
			},
			{
				slug: "campaign-builder",
				heading: "Campaign builder",
				region: "Campaign builder example",
			},
		]

		for (const example of examples) {
			await page.goto(`./examples/${example.slug}`)
			await expect(page).toHaveURL(
				new RegExp(`/form-please/examples/${example.slug}$`),
			)
			await expect(
				page.getByRole("heading", { level: 1, name: example.heading }),
			).toBeVisible()
			await expect(
				page.getByRole("region", { name: example.region }),
			).toBeVisible()
		}

		await page.setViewportSize({ width: 390, height: 844 })
		await page.goto("./examples/campaign-builder")
		await expect(
			page.getByRole("region", { name: "Campaign builder example" }),
		).toBeVisible()
		const widths = await page.evaluate(() => ({
			page: document.documentElement.scrollWidth,
			viewport: document.documentElement.clientWidth,
		}))
		expect(widths.page).toBeLessThanOrEqual(widths.viewport + 1)
		expect(pageErrors).toEqual([])
	})

	test("runs the branching grant and composite policy request flows", async ({
		page,
	}) => {
		const pageErrors = collectPageErrors(page)
		await page.goto("./examples/research-grant")
		const grant = page.getByRole("region", {
			name: "Research grant application example",
		})

		await grant.getByLabel("Applying as").selectOption("collective")
		await expect(grant.getByLabel("Representation")).toHaveValue("")
		await grant.getByLabel("Representation").selectOption("registered")
		await grant.getByLabel("Search the independent registry").fill("Open")
		await grant
			.getByRole("button", { name: "Open Field Assembly · CA" })
			.click()
		await grant.getByLabel("Disbursement route").selectOption("digital-wallet")
		await expect(grant.getByLabel("Settlement account")).toHaveCount(0)
		await grant.getByLabel("Wallet handle").fill("mina-public")
		await grant.getByLabel("I confirm that the application is accurate").check()
		await grant.getByRole("button", { name: "Preview and send" }).click()
		await expect(grant.getByText(/passed preview and was sent/)).toBeVisible()

		await page.goto("./examples/studio-policies")
		const policies = page.getByRole("region", {
			name: "Creative studio policies example",
		})
		await expect(policies.getByLabel("Earliest arrival")).toHaveAttribute(
			"type",
			"time",
		)
		await policies.getByLabel("Allow early access").uncheck()
		await expect(policies.getByLabel("Earliest arrival")).toHaveCount(0)
		await policies.getByRole("button", { name: "Publish policies" }).click()
		await expect(
			policies.getByText(/published with 1 equipment rule/),
		).toBeVisible()
		expect(pageErrors).toEqual([])
	})

	test("keeps wizard state and cohort conflict recovery inside Form, Please", async ({
		page,
	}) => {
		const pageErrors = collectPageErrors(page)
		await page.goto("./examples/makerspace-launch")
		const wizard = page.getByRole("region", {
			name: "Makerspace launch wizard example",
		})
		await wizard.getByRole("button", { name: "Continue to Location" }).click()
		await wizard.getByLabel("Postal code").fill("Z99")
		await wizard.getByRole("button", { name: "Apply resolved address" }).click()
		await expect(wizard.getByLabel("Street address")).toHaveValue(
			"12 Workshop Crescent",
		)
		await wizard
			.getByRole("button", { name: "Continue to Capacity & media" })
			.click()
		await wizard.getByRole("button", { name: "Continue to Publishing" }).click()
		await wizard.getByRole("button", { name: "Publish makerspace" }).click()
		await expect(
			wizard.getByText(/published with 1 gallery item/),
		).toBeVisible()

		await page.goto("./examples/learning-cohort")
		const cohort = page.getByRole("region", {
			name: "Learning cohort editor example",
		})
		await cohort.getByLabel("Cohort title").fill("Reserved cohort")
		await cohort.getByRole("button", { name: "Save cohort" }).click()
		await expect(
			cohort.locator("[data-fp-node='error-message']", {
				hasText: "That title is already reserved",
			}),
		).toBeVisible()
		await expect(cohort.getByLabel("Cohort title")).toHaveValue(
			"Reserved cohort",
		)
		expect(pageErrors).toEqual([])
	})

	test("cascades membership tiers and switches all campaign variants", async ({
		page,
	}) => {
		const pageErrors = collectPageErrors(page)
		await page.goto("./examples/membership-ladder")
		const membership = page.getByRole("region", {
			name: "Membership ladder example",
		})
		await expect(membership).toBeVisible({ timeout: 15_000 })
		const arrayActions = membership
			.locator("[data-fp-array-item-actions]")
			.first()
		await expect(arrayActions).toBeVisible()
		await expect(arrayActions).toHaveCSS("display", "flex")
		await expect(
			membership.getByRole("button", { name: "Move item 1 up" }).first(),
		).toHaveText("↑")
		await expect(
			membership.getByRole("button", { name: "Remove item 1" }).first(),
		).toHaveText("❌")
		await membership.getByLabel("Reduction percent").first().fill("30")
		await expect(membership.getByText(/Seed 30% → Sprout 30%/)).toBeVisible()
		await expect(membership.getByText(/Canopy 30% → Founder 30%/)).toBeVisible()
		await membership.getByRole("button", { name: "Add winter closure" }).click()
		await expect(membership.getByLabel("Starts")).toHaveCount(2)
		await membership.getByRole("button", { name: "Connect" }).click()
		await expect(
			membership.getByRole("button", { name: "Disconnect" }),
		).toBeVisible()
		await membership
			.getByRole("button", { name: "Save membership ladder" })
			.click()
		await expect(
			membership.getByText(/Membership revision \d+ saved/),
		).toBeVisible()

		await page.goto("./examples/campaign-builder")
		const campaign = page.getByRole("region", {
			name: "Campaign builder example",
		})
		const template = campaign.getByLabel("Campaign template")
		await campaign.getByRole("button", { name: "Start new campaign" }).click()
		await campaign.getByRole("button", { name: "Create campaign" }).click()
		await expect(campaign.getByText(/Created campaign-\d+/)).toBeVisible()
		await campaign.getByRole("button", { name: "Edit loaded draft" }).click()
		await campaign.getByRole("button", { name: "Update campaign" }).click()
		await expect(campaign.getByText(/Updated campaign-204/)).toBeVisible()
		const variants = [
			["newsletter", "Newsletter content"],
			["product-launch", "Product launch"],
			["event-invite", "Event invitation"],
			["fundraiser", "Fundraiser"],
			["course-drop", "Course release"],
			["community-update", "Community update"],
			["feedback-pulse", "Feedback pulse"],
		] as const

		for (const [value, heading] of variants) {
			await template.selectOption(value)
			await expect(
				campaign.getByRole("heading", { level: 2, name: heading }),
			).toBeVisible()
		}
		expect(pageErrors).toEqual([])
	})

	test("runs the shadcn registry adapter with Valibot and explicit FormData shapes", async ({
		page,
	}) => {
		const pageErrors = collectPageErrors(page)
		await page.goto("./examples/shadcn-valibot")

		const workshop = page.getByRole("region", {
			name: "Shadcn with Valibot workshop example",
		})
		await expect(workshop).toBeVisible({ timeout: 15_000 })
		await expect(workshop.getByRole("slider")).toHaveCount(6)
		await expect(workshop.getByRole("combobox")).toHaveCount(3)
		await expect(workshop.getByLabel("Invite code")).toHaveValue("104729")
		await expect(workshop.getByLabel("Venue")).toHaveValue("North studio")
		const checkboxSize = await workshop
			.getByRole("checkbox", { name: "Request an accessibility review" })
			.evaluate((element) => {
				const rectangle = element.getBoundingClientRect()
				return { height: rectangle.height, width: rectangle.width }
			})
		expect(checkboxSize).toEqual({ height: 16, width: 16 })
		const sliderTrackSizes = await workshop
			.locator('[data-slot="slider-track"]')
			.evaluateAll((elements) =>
				elements.map((element) => {
					const rectangle = element.getBoundingClientRect()
					return { height: rectangle.height, width: rectangle.width }
				}),
			)
		expect(sliderTrackSizes).toHaveLength(3)
		for (const size of sliderTrackSizes) {
			expect(size.height).toBe(4)
			expect(size.width).toBeGreaterThan(100)
		}
		const durationSlider = workshop.getByRole("slider", { name: "Duration" })
		const durationTrack = workshop.locator('[data-slot="slider-track"]').first()
		const durationTrackSize = await durationTrack.boundingBox()
		expect(durationTrackSize).not.toBeNull()
		await durationTrack.click({
			position: {
				x: (durationTrackSize?.width ?? 0) * 0.8,
				y: (durationTrackSize?.height ?? 0) / 2,
			},
		})
		await expect(durationSlider).toHaveAttribute("aria-valuenow", "150")
		await expect
			.poll(() =>
				workshop
					.locator("form")
					.evaluate((form) =>
						new FormData(form as HTMLFormElement).get("duration"),
					),
			)
			.toBe("150")
		await expect
			.poll(() =>
				workshop
					.locator("form")
					.evaluate((form) =>
						new FormData(form as HTMLFormElement).get("recordingAllowed"),
					),
			)
			.toBe("false")

		await workshop.getByLabel("Venue").click()
		await page.getByRole("option", { name: "Library lab" }).click()
		await expect(workshop.getByLabel("Venue")).toHaveValue("Library lab")
		await workshop.getByLabel("Topics").click()
		await page.getByRole("option", { name: "Systems thinking" }).click()
		await page.keyboard.press("Escape")
		await workshop.getByLabel("Workshop date").click()
		await page.getByRole("button", { name: "Autumn lab" }).click()
		await durationSlider.focus()
		await page.keyboard.press("ArrowRight")
		await workshop
			.getByRole("slider", { name: "Audience experience range" })
			.first()
			.focus()
		await page.keyboard.press("ArrowRight")
		await workshop
			.getByRole("slider", { name: "Agenda checkpoints" })
			.first()
			.focus()
		await page.keyboard.press("ArrowRight")
		await workshop.getByText("Remote", { exact: true }).click()
		await workshop.getByRole("switch", { name: "Allow a recording" }).click()
		const inviteCode = workshop.getByLabel("Invite code")
		await inviteCode.click()
		await inviteCode.press("ControlOrMeta+A")
		await inviteCode.press("Backspace")
		await expect(inviteCode).toHaveValue("")
		await inviteCode.pressSequentially("654321")
		await expect(inviteCode).toHaveValue("654321")

		const formData = await workshop.locator("form").evaluate((form) => {
			const entries = new FormData(form as HTMLFormElement)
			return {
				format: entries.get("format"),
				recording: entries.get("recordingAllowed"),
				duration: entries.get("duration"),
				audienceRange: entries.getAll("audienceRange"),
				agendaCheckpoints: entries.getAll("agendaCheckpoints"),
				topics: entries.getAll("topics"),
				venue: entries.get("venue"),
				date: entries.get("workshopDate"),
				range: [
					entries.get("availability.from"),
					entries.get("availability.to"),
				],
				code: entries.get("inviteCode"),
				arrays: entries.getAll("__fp.array"),
			}
		})

		expect(formData).toEqual({
			format: "remote",
			recording: "true",
			duration: "165",
			audienceRange: ["3", "7"],
			agendaCheckpoints: ["25", "50", "80"],
			topics: ["research", "prototyping", "systems"],
			venue: "library-lab",
			date: "2027-09-17",
			range: ["2027-04-07", "2027-04-11"],
			code: "654321",
			arrays: ["audienceRange", "agendaCheckpoints", "topics"],
		})

		await workshop.getByRole("button", { name: "Submit proposal" }).click()
		await expect(
			workshop.getByText(/is ready for 24 participants/),
		).toBeVisible()
		expect(pageErrors).toEqual([])
	})

	test("runs the Material UI preset with direct Yup validation", async ({
		page,
	}) => {
		const pageErrors = collectPageErrors(page)
		await page.goto("./examples/mui-yup")

		const proposal = page.getByRole("region", {
			name: "Material UI with Yup conference example",
		})
		await expect(proposal).toBeVisible({ timeout: 15_000 })
		await expect(proposal.getByLabel("Proposal title")).toHaveValue(
			"Designing forms people can finish",
		)
		await expect(proposal.getByRole("slider")).toHaveAttribute(
			"aria-valuenow",
			"4",
		)
		await expect(proposal.getByText("Forms", { exact: true })).toBeVisible()
		const agreement = proposal.getByLabel(
			"I can attend at the selected date and time",
		)
		const agreementWidths = await agreement.evaluate((input) => ({
			control: input.parentElement?.getBoundingClientRect().width ?? 0,
			field:
				input.closest('[data-fp-node="field"]')?.getBoundingClientRect()
					.width ?? 0,
		}))
		expect(agreementWidths.control).toBeLessThan(agreementWidths.field / 2)
		const sliderGap = await proposal.getByRole("slider").evaluate((input) => {
			const slider = input.closest(".MuiSlider-root")
			const field = input.closest('[data-fp-node="field"]')
			const nextField = field?.nextElementSibling ?? null
			if (slider === null || nextField === null) return 0
			return (
				nextField.getBoundingClientRect().left -
				slider.getBoundingClientRect().right
			)
		})
		expect(sliderGap).toBeGreaterThanOrEqual(12)
		const duplicateIds = await proposal
			.locator("[id]")
			.evaluateAll((elements) => {
				const counts = new Map<string, number>()
				for (const element of elements) {
					const id = element.id
					counts.set(id, (counts.get(id) ?? 0) + 1)
				}
				return [...counts.entries()]
					.filter(([, count]) => count > 1)
					.map(([id]) => id)
			})
		expect(duplicateIds).toEqual([])

		await proposal.getByRole("radio", { name: "Workshop" }).click()
		const experience = proposal.getByRole("slider")
		await experience.focus()
		await page.keyboard.press("Home")
		await expect(
			proposal.getByText("Workshops need at least three years of experience"),
		).toBeVisible()
		await experience.focus()
		await page.keyboard.press("End")
		await proposal.getByRole("combobox", { name: "Topics" }).click()
		await page.getByRole("option", { name: "Accessibility" }).click()
		await expect(
			proposal.getByText("Accessibility", { exact: true }),
		).toBeVisible()

		const title = proposal.getByLabel("Proposal title")
		await title.fill("   A focused Material UI proposal   ")
		await proposal.getByLabel("Draft slides").setInputFiles({
			name: "slides.pdf",
			mimeType: "application/pdf",
			buffer: Buffer.from("slides"),
		})
		await proposal.getByRole("button", { name: "Submit proposal" }).click()
		await expect(
			proposal.getByText(
				"A focused Material UI proposal is ready for review. Topics: Forms, Accessibility.",
			),
		).toBeVisible()
		expect(pageErrors).toEqual([])
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
		await dialog.getByRole("link", { name: "TypeScript" }).click()
		await expect(page).toHaveURL(/\/form-please\/types$/)
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
			path: testInfo.outputPath("form-please-docs-mobile.png"),
		})
	})
})
