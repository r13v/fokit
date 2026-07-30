import { describe, expect, it } from "vitest"

import type { ControlMetadata, StandardSchema, UiNode } from "./index.js"
import { computed, normalizeDefinition } from "./index.js"

type ExampleValues = {
	kind: "person" | "company"
	name: string
	companyName?: string
	contacts: {
		value: string
		label?: string
	}[]
}

type ExampleContext = {
	readonly canEditCompanyName: boolean
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
	readonly select: ControlMetadata<ExampleValues["kind"], SelectOptions>
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

describe("form definition normalization", () => {
	it("normalizes fields, sections, arrays, computed values, and immutable indexes", () => {
		const companyVisible = computed<
			readonly ["kind"],
			boolean,
			ExampleContext,
			ExampleValues
		>(["kind"], ({ kind }) => kind === "company")
		const companyDisabled = computed<
			readonly [],
			boolean,
			ExampleContext,
			ExampleValues
		>([], (_values, { context }) => !context.canEditCompanyName)

		const definition = normalize([
			{
				kind: "section",
				id: "account",
				title: "Account",
				columns: 2,
				children: [
					{
						kind: "field",
						path: "name",
						control: "text",
						label: "Name",
						options: {
							autoComplete: "name",
						},
					},
					{
						kind: "field",
						path: "kind",
						control: "select",
						label: "Customer type",
						options: {
							items: [{ value: "company", label: "Company" }],
						},
					},
					{
						kind: "field",
						path: "companyName",
						control: "text",
						label: "Company name",
						visible: companyVisible,
						disabled: companyDisabled,
						valuePolicy: "unset",
					},
				],
			},
			{
				kind: "array",
				path: "contacts",
				itemDefault: {
					value: "",
				},
				children: [
					{
						kind: "field",
						path: "value",
						control: "text",
						label: "Contact",
					},
				],
			},
		])

		expect(definition.schema).toBe(schema)
		expect(definition.ui).toHaveLength(2)
		expect(definition.nodes).toHaveLength(6)
		expect(definition.nodesById.account.kind).toBe("section")
		expect(definition.nodesById.name).toBe(definition.fieldsByPath.name)
		expect(definition.fieldsByPath.companyName.visible).toBe(companyVisible)
		expect(definition.fieldsByPath.companyName.disabled).toBe(companyDisabled)
		expect(definition.fieldsByPath.companyName.valuePolicy).toBe("unset")
		expect(definition.fieldsByPath.name.valuePolicy).toBe("preserve")
		expect(definition.arraysByPath.contacts.id).toBe("contacts")
		const contactChild = definition.arraysByPath.contacts.children[0]
		expect(contactChild?.id).toBe("contacts.value")
		expect(contactChild?.kind).toBe("field")
		if (contactChild?.kind !== "field") {
			throw new Error("Expected the array child to normalize as a field")
		}
		expect(contactChild.path).toBe("value")
		expect(Object.isFrozen(definition.ui)).toBe(true)
		expect(Object.isFrozen(definition.nodes)).toBe(true)
		expect(Object.isFrozen(definition.nodesById)).toBe(true)
		expect(Object.isFrozen(definition.fieldsByPath)).toBe(true)
		expect(Object.isFrozen(definition.arraysByPath)).toBe(true)
		expect(Object.isFrozen(definition.fieldsByPath.name)).toBe(true)
		expect(Object.isFrozen(companyVisible.dependencies)).toBe(true)
		expect(Object.isFrozen(companyVisible)).toBe(true)
	})

	it("rejects duplicate paths and node IDs before rendering can become ambiguous", () => {
		expect(() =>
			normalize([
				{ kind: "field", path: "name", control: "text" },
				{ kind: "field", path: "name", control: "text" },
			]),
		).toThrow(/duplicate path "name"/i)

		expect(() =>
			normalize([
				{
					kind: "section",
					id: "account",
					children: [
						{
							kind: "field",
							id: "account",
							path: "name",
							control: "text",
						},
					],
				},
			]),
		).toThrow(/duplicate node id "account"/i)
	})

	it("rejects bad IDs so generated DOM identity stays deterministic", () => {
		for (const ui of [
			[{ kind: "section", children: [] }],
			[{ kind: "section", id: "", children: [] }],
			[{ kind: "section", id: "billing address", children: [] }],
			[
				{
					kind: "field",
					id: "bad\tid",
					path: "name",
					control: "text",
				},
			],
		]) {
			expect(() => normalize(ui), JSON.stringify(ui)).toThrow(/node id/i)
		}
	})

	it("rejects unknown controls", () => {
		expect(() =>
			normalize([{ kind: "field", path: "name", control: "textarea" }]),
		).toThrow(/unknown control "textarea"/i)
	})

	it("rejects invalid layout ranges and spans that cannot fit their parent grid", () => {
		for (const ui of [
			[{ kind: "section", id: "account", columns: 5, children: [] }],
			[{ kind: "field", path: "name", control: "text", span: "wide" }],
			[
				{
					kind: "section",
					id: "account",
					columns: 2,
					children: [
						{
							kind: "field",
							path: "name",
							control: "text",
							span: 3,
						},
					],
				},
			],
		]) {
			expect(() => normalize(ui), JSON.stringify(ui)).toThrow(/layout|span/i)
		}
	})

	it("rejects invalid relative array paths and unsupported value policies", () => {
		expect(() =>
			normalize([
				{
					kind: "array",
					path: "contacts",
					itemDefault: { value: "" },
					children: [
						{
							kind: "field",
							path: "0.value",
							control: "text",
						},
					],
				},
			]),
		).toThrow(/relative path/i)

		expect(() =>
			normalize([
				{
					kind: "field",
					path: "companyName",
					control: "text",
					valuePolicy: "drop",
				},
			]),
		).toThrow(/valuePolicy/i)
	})

	it("stores computed resolvers as explicit synchronous dependencies", () => {
		const visible = computed<
			readonly ["kind"],
			boolean,
			unknown,
			ExampleValues
		>(["kind"], ({ kind }) => kind === "person")

		expect(visible.dependencies).toEqual(["kind"])
		expect(visible.resolver({ kind: "person" }, { context: {} })).toBe(true)
		expect(() => computed([] as const, async () => true)).toThrow(
			/synchronous/i,
		)
	})
})
