import { describe, expect, it, vi } from "vitest"

import type {
	ControlMetadata,
	NormalizedFormDefinition,
	ResourceState,
	StandardSchema,
	UiNode,
	UiPresentation,
	UiResolver,
	UiResolverValues,
} from "./index.js"
import { fromResource, normalizeDefinition, resolveUi } from "./index.js"

type ExampleValues = {
	name: string
	kind: "person" | "company"
	country: "ca" | "us"
	city: string
	unrelated: string
	address?: {
		country: string
	}
	companyName?: string
	contacts?: readonly {
		readonly value: string
	}[]
}

type ExampleContext = {
	readonly locked: boolean
	readonly companyAccessByCountry?: Readonly<
		Record<string, ResourceState<boolean, string>>
	>
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

function normalize(
	ui: readonly UiNode<ExampleValues, ExampleControls, ExampleContext>[],
) {
	return normalizeDefinition<typeof schema, ExampleControls, ExampleContext>({
		schema,
		controls,
		ui,
	})
}

function normalizeWithRender(ui: readonly unknown[]) {
	const normalizeOpaque = normalizeDefinition as (input: {
		readonly schema: typeof schema
		readonly controls: ExampleControls
		readonly ui: readonly unknown[]
	}) => NormalizedFormDefinition<typeof schema, ExampleControls, () => null>

	return normalizeOpaque({
		schema,
		controls,
		ui,
	})
}

describe("resolveUi", () => {
	it("transports opaque render components without invoking them", () => {
		const Summary = vi.fn(() => null)
		const definition = normalizeWithRender([
			{
				kind: "render",
				id: "summary",
				component: Summary,
				visible: ({ name }: ExampleValues) => name === "Ada",
				disabled: true,
				readOnly: (
					_values: ExampleValues,
					{ context }: { context: ExampleContext },
				) => context.locked,
			},
		])

		const resolved = resolveUi(
			definition,
			{
				name: "Ada",
				kind: "person",
				country: "us",
				city: "nyc",
				unrelated: "same",
			},
			{
				locked: false,
				citiesByCountry: {},
			},
		)
		const summary = resolved.nodesById.summary

		expect(summary.kind).toBe("render")
		if (summary.kind !== "render") {
			throw new Error("Expected a render node")
		}
		expect(summary.component).toBe(Summary)
		expect(summary.visible).toBe(true)
		expect(summary.disabled).toBe(true)
		expect(summary.readOnly).toBe(false)
		expect(Summary).not.toHaveBeenCalled()
	})

	it("resolves labels, descriptions, options, required state, layout, context, and inherited flags", () => {
		const definition = normalize([
			{
				kind: "section",
				id: "account",
				title: "Account",
				description: () => "Profile settings",
				columns: 2,
				className: "account-section",
				disabled: (_values, { context }) => context.locked,
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
						label: ({ country }) => `City in ${country.toUpperCase()}`,
						options: ({ country }, { context }) => ({
							items: context.citiesByCountry[country] ?? [],
						}),
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

	it("reruns UI resolvers only when a dependency or context reference changes", () => {
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
				label,
			},
			{
				kind: "field",
				path: "city",
				control: "select",
				options,
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

	it("tracks path reads from both resource selection and branch mapping", () => {
		const selectAccess: UiResolver<
			ResourceState<boolean, string>,
			ExampleValues,
			ExampleContext
		> = vi.fn(
			({ country }, { context }) =>
				context.companyAccessByCountry?.[country] ?? { status: "pending" },
		)
		const visible: UiResolver<boolean, ExampleValues, ExampleContext> =
			fromResource(selectAccess, {
				pending: () => false,
				success: ({ value }, { kind }) => value && kind === "company",
				error: () => false,
			})
		const definition = normalize([
			{
				kind: "field",
				path: "companyName",
				control: "text",
				visible,
			},
		])
		const context = {
			locked: false,
			companyAccessByCountry: {
				us: { status: "success", value: true },
			},
			citiesByCountry: {},
		} satisfies ExampleContext
		const values = {
			name: "Ada",
			kind: "company",
			country: "us",
			city: "nyc",
			unrelated: "same",
		} satisfies ExampleValues

		const first = resolveUi(definition, values, context)
		const unrelatedChange = resolveUi(
			definition,
			{ ...values, unrelated: "changed" },
			context,
			{ previous: first },
		)
		const branchDependencyChange = resolveUi(
			definition,
			{ ...values, kind: "person" },
			context,
			{ previous: unrelatedChange },
		)

		expect(first.fieldsByPath.companyName.visible).toBe(true)
		expect(first.computedCache["companyName:visible"]?.dependencies).toEqual([
			{ path: "country", value: "us" },
			{ path: "kind", value: "company" },
		])
		expect(unrelatedChange.computedCache["companyName:visible"]).toBe(
			first.computedCache["companyName:visible"],
		)
		expect(branchDependencyChange.fieldsByPath.companyName.visible).toBe(false)
		expect(selectAccess).toHaveBeenCalledTimes(2)
	})

	it("resolves and caches structural slot options like other UI resolvers", () => {
		type Presentation = UiPresentation<
			string,
			{ readonly tooltip: string },
			{ readonly tone: "quiet" | "strong" },
			{ readonly empty: boolean }
		>
		const fieldSlotOptions = vi.fn(({ name }: ExampleValues) => ({
			tooltip: `Help for ${name}`,
		}))
		const sectionSlotOptions = vi.fn(
			(_values: ExampleValues, { context }: { context: ExampleContext }) => ({
				tone: context.locked ? ("strong" as const) : ("quiet" as const),
			}),
		)
		const arraySlotOptions = vi.fn(({ contacts }: ExampleValues) => ({
			empty: contacts?.length === 0,
		}))
		const definition = normalizeDefinition<
			typeof schema,
			ExampleControls,
			ExampleContext,
			never,
			Presentation
		>({
			schema,
			controls,
			ui: [
				{
					kind: "section",
					id: "account",
					slotOptions: sectionSlotOptions,
					children: [
						{
							kind: "field",
							path: "name",
							control: "text",
							slotOptions: fieldSlotOptions,
						},
					],
				},
				{
					kind: "array",
					path: "contacts",
					slotOptions: arraySlotOptions,
					itemDefault: {
						value: "",
					},
					children: [
						{
							kind: "field",
							path: "value",
							control: "text",
						},
					],
				},
			],
		})
		const context = {
			locked: false,
			citiesByCountry: {},
		} satisfies ExampleContext
		const values = {
			name: "Ada",
			kind: "person",
			country: "us",
			city: "nyc",
			unrelated: "same",
			contacts: [],
		} satisfies ExampleValues

		const first = resolveUi(definition, values, context)
		const unrelatedChange = resolveUi(
			definition,
			{ ...values, unrelated: "changed" },
			context,
			{ previous: first },
		)
		const dependencyChange = resolveUi(
			definition,
			{ ...values, name: "Grace", unrelated: "changed" },
			context,
			{ previous: unrelatedChange },
		)
		const arrayDependencyChange = resolveUi(
			definition,
			{
				...values,
				name: "Grace",
				unrelated: "changed",
				contacts: [{ value: "ada@example.test" }],
			},
			context,
			{ previous: dependencyChange },
		)
		const contextChange = resolveUi(
			definition,
			{
				...values,
				name: "Grace",
				unrelated: "changed",
				contacts: [{ value: "ada@example.test" }],
			},
			{ ...context, locked: true },
			{ previous: arrayDependencyChange },
		)
		const firstSection = first.nodesById.account
		const contextSection = contextChange.nodesById.account

		if (firstSection.kind !== "section" || contextSection.kind !== "section") {
			throw new Error("Expected account to resolve as a section")
		}

		expect(first.fieldsByPath.name.slotOptions).toEqual({
			tooltip: "Help for Ada",
		})
		expect(firstSection.slotOptions).toEqual({ tone: "quiet" })
		expect(first.arraysByPath.contacts.slotOptions).toEqual({ empty: true })
		expect(unrelatedChange.fieldsByPath.name.slotOptions).toBe(
			first.fieldsByPath.name.slotOptions,
		)
		expect(unrelatedChange.arraysByPath.contacts.slotOptions).toBe(
			first.arraysByPath.contacts.slotOptions,
		)
		expect(arrayDependencyChange.arraysByPath.contacts.slotOptions).toEqual({
			empty: false,
		})
		expect(fieldSlotOptions).toHaveBeenCalledTimes(3)
		expect(sectionSlotOptions).toHaveBeenCalledTimes(2)
		expect(arraySlotOptions).toHaveBeenCalledTimes(3)
		expect(contextSection.slotOptions).toEqual({ tone: "strong" })
	})

	it("tracks conditional dependencies again after the active branch changes", () => {
		const label = vi.fn((values: UiResolverValues<ExampleValues>) =>
			values.kind === "company"
				? `Company: ${values.companyName ?? ""}`
				: `Person: ${values.name}`,
		)
		const definition = normalize([
			{
				kind: "field",
				path: "name",
				control: "text",
				label,
			},
		])
		const context = {
			locked: false,
			citiesByCountry: {},
		} satisfies ExampleContext
		const values = {
			name: "Ada",
			kind: "person",
			country: "us",
			city: "nyc",
			unrelated: "same",
			companyName: "Analytical Engines",
		} satisfies ExampleValues

		const first = resolveUi(definition, values, context)
		const inactiveChange = resolveUi(
			definition,
			{ ...values, companyName: "Difference Engines" },
			context,
			{ previous: first },
		)
		const branchChange = resolveUi(
			definition,
			{ ...values, kind: "company", companyName: "Difference Engines" },
			context,
			{ previous: inactiveChange },
		)
		const previousBranchChange = resolveUi(
			definition,
			{
				...values,
				kind: "company",
				name: "Grace",
				companyName: "Difference Engines",
			},
			context,
			{ previous: branchChange },
		)
		const activeChange = resolveUi(
			definition,
			{ ...values, kind: "company", companyName: "Fokit" },
			context,
			{ previous: previousBranchChange },
		)

		expect(first.computedCache["name:label"]?.dependencies).toEqual([
			{ path: "kind", value: "person" },
			{ path: "name", value: "Ada" },
		])
		expect(branchChange.computedCache["name:label"]?.dependencies).toEqual([
			{ path: "kind", value: "company" },
			{ path: "companyName", value: "Difference Engines" },
		])
		expect(inactiveChange.fieldsByPath.name.label).toBe("Person: Ada")
		expect(branchChange.fieldsByPath.name.label).toBe(
			"Company: Difference Engines",
		)
		expect(previousBranchChange.fieldsByPath.name.label).toBe(
			"Company: Difference Engines",
		)
		expect(activeChange.fieldsByPath.name.label).toBe("Company: Fokit")
		expect(label).toHaveBeenCalledTimes(3)
	})

	it("tracks canonical nested paths and rejects enumerating the values proxy", () => {
		const definition = normalize([
			{
				kind: "field",
				path: "name",
				control: "text",
				label: ({ "address.country": country }) => country ?? "Unknown",
			},
		])
		const values = {
			name: "Ada",
			kind: "person",
			country: "us",
			city: "nyc",
			unrelated: "same",
			address: { country: "GB" },
		} satisfies ExampleValues
		const context = {}

		const first = resolveUi(definition, values, context)
		const changed = resolveUi(
			definition,
			{ ...values, address: { country: "FR" } },
			context,
			{ previous: first },
		)

		expect(first.fieldsByPath.name.label).toBe("GB")
		expect(first.computedCache["name:label"]?.dependencies).toEqual([
			{ path: "address.country", value: "GB" },
		])
		expect(changed.fieldsByPath.name.label).toBe("FR")

		const enumeratingDefinition = normalize([
			{
				kind: "field",
				path: "name",
				control: "text",
				label: (resolverValues) => Object.keys(resolverValues).join(","),
			},
		])

		expect(() => resolveUi(enumeratingDefinition, values, {})).toThrow(
			/cannot be enumerated/i,
		)
	})

	it("revokes resolver values after the synchronous resolver returns", () => {
		let captured: UiResolverValues<ExampleValues> | undefined
		const definition = normalize([
			{
				kind: "field",
				path: "name",
				control: "text",
				label: (values) => {
					captured = values
					return values.name
				},
			},
		])

		resolveUi(
			definition,
			{
				name: "Ada",
				kind: "person",
				country: "us",
				city: "nyc",
				unrelated: "same",
			},
			{},
		)

		expect(() => captured?.name).toThrow(/revoked/i)
	})

	it("rejects mutations through the resolver values proxy", () => {
		const definition = normalize([
			{
				kind: "field",
				path: "name",
				control: "text",
				label: (values) => {
					const mutableValues = values as Record<string, unknown>
					mutableValues.name = "Grace"
					return "unreachable"
				},
			},
		])

		expect(() =>
			resolveUi(
				definition,
				{
					name: "Ada",
					kind: "person",
					country: "us",
					city: "nyc",
					unrelated: "same",
				},
				{},
			),
		).toThrow(/read-only/i)
	})

	it("rejects promise results from resolvers that are not native async functions", () => {
		const promiseLabel = (() =>
			Promise.resolve("Profile")) as unknown as UiResolver<
			string,
			ExampleValues
		>
		const definition = normalize([
			{
				kind: "field",
				path: "name",
				control: "text",
				label: promiseLabel,
			},
		])

		expect(() =>
			resolveUi(
				definition,
				{
					name: "Ada",
					kind: "person",
					country: "us",
					city: "nyc",
					unrelated: "same",
				},
				{},
			),
		).toThrow(/synchronous/i)
	})
})
