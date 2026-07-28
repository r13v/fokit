import { describe, expect, it, vi } from "vitest"

import type { ControlMetadata, StandardSchema, UiNode } from "./index.js"
import { computed, normalizeDefinition, resolveUi } from "./index.js"

type ExampleValues = {
	name: string
	kind: "person" | "company"
	country: "ca" | "us"
	city: string
	unrelated: string
	companyName?: string
}

type ExampleContext = {
	readonly locked: boolean
	readonly citiesByCountry: Readonly<
		Record<
			string,
			readonly { readonly value: string; readonly label: string }[]
		>
	>
}

type TextOptions = {
	readonly autoComplete?: string
}

type SelectOptions = {
	readonly items: readonly {
		readonly value: string
		readonly label: string
	}[]
}

type ExampleControls = {
	readonly text: ControlMetadata<string | undefined, TextOptions>
	readonly select: ControlMetadata<string, SelectOptions>
}

const schema = {} as StandardSchema<ExampleValues>

const controls = {
	text: {
		formData: {
			mode: "native",
		},
	},
	select: {
		formData: {
			mode: "native",
		},
	},
} satisfies ExampleControls

function normalize(ui: readonly unknown[]) {
	return normalizeDefinition<typeof schema, ExampleControls, ExampleContext>({
		schema,
		controls,
		ui: ui as readonly UiNode<ExampleValues, ExampleControls, ExampleContext>[],
	})
}

describe("resolveUi", () => {
	it("resolves labels, descriptions, options, required state, layout, context, and inherited flags", () => {
		const definition = normalize([
			{
				kind: "section",
				id: "account",
				title: "Account",
				description: computed([] as const, () => "Profile settings"),
				columns: 2,
				className: "account-section",
				disabled: computed<readonly [], boolean, ExampleContext, ExampleValues>(
					[] as const,
					(_values, { context }: { context: ExampleContext }) => context.locked,
				),
				children: [
					{
						kind: "field",
						path: "name",
						control: "text",
						label: "Name",
						description: "Legal name",
						required: true,
						readOnly: true,
						options: {
							autoComplete: "name",
						},
					},
					{
						kind: "field",
						path: "city",
						control: "select",
						label: computed<
							readonly ["country"],
							string,
							ExampleContext,
							ExampleValues
						>(
							["country"] as const,
							({ country }) => `City in ${country.toUpperCase()}`,
						),
						options: computed<
							readonly ["country"],
							SelectOptions,
							ExampleContext,
							ExampleValues
						>(
							["country"] as const,
							({ country }, { context }: { context: ExampleContext }) => ({
								items: context.citiesByCountry[country] ?? [],
							}),
						),
						span: 2,
					},
				],
			},
			{
				kind: "section",
				id: "company",
				visible: false,
				children: [
					{
						kind: "field",
						path: "companyName",
						control: "text",
						visible: true,
						disabled: false,
						readOnly: false,
						valuePolicy: "unset",
					},
				],
			},
		])

		const context = {
			locked: true,
			citiesByCountry: {
				us: [{ value: "nyc", label: "New York" }],
			},
		} satisfies ExampleContext

		const resolved = resolveUi(
			definition,
			{
				name: "Ada",
				kind: "person",
				country: "us",
				city: "nyc",
				unrelated: "same",
			},
			context,
		)

		const account = resolved.nodesById.account
		const name = resolved.fieldsByPath.name
		const city = resolved.fieldsByPath.city
		const companyName = resolved.fieldsByPath.companyName

		if (account.kind !== "section") {
			throw new Error("Expected account to resolve as a section")
		}

		expect(account.title).toBe("Account")
		expect(account.description).toBe("Profile settings")
		expect(account.columns).toBe(2)
		expect(account.className).toBe("account-section")
		expect(account.visible).toBe(true)
		expect(account.disabled).toBe(true)
		expect(account.readOnly).toBe(false)

		expect(name.label).toBe("Name")
		expect(name.description).toBe("Legal name")
		expect(name.required).toBe(true)
		expect(name.disabled).toBe(true)
		expect(name.readOnly).toBe(true)
		expect(name.visible).toBe(true)
		expect(name.options).toEqual({ autoComplete: "name" })
		expect(name.context).toBe(context)

		expect(city.label).toBe("City in US")
		expect(city.options).toEqual({
			items: [{ value: "nyc", label: "New York" }],
		})
		expect(city.span).toBe(2)
		expect(city.required).toBe(false)
		expect(city.disabled).toBe(true)
		expect(city.readOnly).toBe(false)

		expect(companyName.visible).toBe(false)
		expect(companyName.disabled).toBe(false)
		expect(companyName.readOnly).toBe(false)
		expect(companyName.valuePolicy).toBe("unset")
		expect(resolved.context).toBe(context)
		expect(Object.isFrozen(resolved)).toBe(true)
		expect(Object.isFrozen(resolved.nodesById)).toBe(true)
	})

	it("reruns computed resolvers only when a dependency or context reference changes", () => {
		const label = vi.fn(
			({ name }: { readonly name: string }) => `Name: ${name}`,
		)
		const options = vi.fn(
			(
				{ country }: { readonly country: ExampleValues["country"] },
				{ context }: { readonly context: ExampleContext },
			) => ({
				items: context.citiesByCountry[country] ?? [],
			}),
		)
		const definition = normalize([
			{
				kind: "field",
				path: "name",
				control: "text",
				label: computed<
					readonly ["name"],
					string,
					ExampleContext,
					ExampleValues
				>(["name"] as const, label),
			},
			{
				kind: "field",
				path: "city",
				control: "select",
				options: computed<
					readonly ["country"],
					SelectOptions,
					ExampleContext,
					ExampleValues
				>(["country"] as const, options),
			},
		])
		const context = {
			locked: false,
			citiesByCountry: {
				ca: [{ value: "tor", label: "Toronto" }],
				us: [{ value: "nyc", label: "New York" }],
			},
		} satisfies ExampleContext
		const values = {
			name: "Ada",
			kind: "person",
			country: "us",
			city: "nyc",
			unrelated: "same",
		} satisfies ExampleValues

		const first = resolveUi(definition, values, context)
		const unrelatedChange = resolveUi(
			definition,
			{
				...values,
				unrelated: "changed",
			},
			context,
			{ previous: first },
		)
		const dependencyChange = resolveUi(
			definition,
			{
				...values,
				country: "ca",
			},
			context,
			{ previous: unrelatedChange },
		)
		const contextChange = resolveUi(
			definition,
			values,
			{ ...context },
			{
				previous: dependencyChange,
			},
		)

		expect(label).toHaveBeenCalledTimes(2)
		expect(options).toHaveBeenCalledTimes(3)
		expect(unrelatedChange.fieldsByPath.city.options).toBe(
			first.fieldsByPath.city.options,
		)
		expect(dependencyChange.fieldsByPath.name.label).toBe(
			unrelatedChange.fieldsByPath.name.label,
		)
		expect(dependencyChange.fieldsByPath.city.options).not.toBe(
			unrelatedChange.fieldsByPath.city.options,
		)
		expect(contextChange.fieldsByPath.name.label).toBe("Name: Ada")
	})
})
