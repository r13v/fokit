import { describe, expect, it } from "vitest"

import type {
	ControlMetadata,
	NormalizedFormDefinition,
	StandardSchema,
	UiNode,
	UiPresentation,
	UiResolver,
} from "./index.js"
import { normalizeDefinition } from "./index.js"

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

describe("form definition normalization", () => {
	it("preserves opaque render components in the ordered UI tree", () => {
		const Summary = () => null
		const Preview = () => null
		const definition = normalizeWithRender([
			{
				kind: "render",
				id: "summary",
				component: Summary,
			},
			{
				kind: "section",
				id: "account",
				children: [
					{
						kind: "render",
						id: "preview",
						component: Preview,
					},
				],
			},
		])

		expect(definition.ui.map((node) => node.id)).toEqual(["summary", "account"])
		expect(definition.nodesById.summary.kind).toBe("render")
		expect(definition.nodesById.preview.kind).toBe("render")
		const summary = definition.nodesById.summary
		const preview = definition.nodesById.preview
		if (summary.kind !== "render" || preview.kind !== "render") {
			throw new Error("Expected render nodes")
		}
		expect(summary.component).toBe(Summary)
		expect(preview.component).toBe(Preview)
		expect(Object.isFrozen(summary)).toBe(true)
	})

	it("rejects render nodes without identity or inside array rows", () => {
		expect(() => normalize([{ kind: "render", id: "summary" }])).toThrow(
			/requires a component/i,
		)
		expect(() =>
			normalize([{ kind: "render", component: () => null }]),
		).toThrow(/render node id/i)
		expect(() =>
			normalize([
				{
					kind: "array",
					path: "contacts",
					itemDefault: { value: "" },
					children: [
						{
							kind: "render",
							id: "row-preview",
							component: () => null,
						},
					],
				},
			]),
		).toThrow(/render nodes.*inside arrays/i)
	})

	it("normalizes fields, sections, arrays, UI resolvers, and immutable indexes", () => {
		const companyVisible: UiResolver<
			boolean,
			ExampleValues,
			ExampleContext
		> = ({ kind }) => kind === "company"
		const companyDisabled: UiResolver<
			boolean,
			ExampleValues,
			ExampleContext
		> = (_values, { context }) => !context.canEditCompanyName

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

	it("stores UI resolver functions unchanged", () => {
		const visible: UiResolver<boolean, ExampleValues> = ({ kind }) =>
			kind === "person"
		const className: UiResolver<string, ExampleValues> = ({ kind }) =>
			kind === "person" ? "person" : "company"
		const columns: UiResolver<1 | 2, ExampleValues> = ({ kind }) =>
			kind === "person" ? 1 : 2
		const span: UiResolver<1 | 2, ExampleValues> = ({ kind }) =>
			kind === "person" ? 1 : 2
		const definition = normalize([
			{
				kind: "section",
				id: "account",
				className,
				columns,
				children: [
					{
						kind: "field",
						path: "companyName",
						control: "text",
						visible,
						span,
					},
				],
			},
		])

		expect(definition.fieldsByPath.companyName?.visible).toBe(visible)
		expect(definition.fieldsByPath.companyName?.span).toBe(span)
		const account = definition.nodesById.account
		expect(account.className).toBe(className)
		expect(account.kind).toBe("section")
		if (account.kind !== "section") {
			throw new Error("Expected a section")
		}
		expect(account.columns).toBe(columns)
	})

	it("keeps presentation content and structural slot options opaque", () => {
		type Presentation = UiPresentation<
			{ readonly text: string },
			{ readonly tooltip: { readonly text: string } },
			{ readonly legend: { readonly compact: boolean } },
			{ readonly controls: { readonly sticky: boolean } }
		>
		const fieldLabel = { text: "Name" }
		const fieldSlotOptions = {
			tooltip: {
				text: "Use the legal name",
			},
		}
		const sectionTitle = { text: "Account" }
		const sectionSlotOptions = {
			legend: {
				compact: true,
			},
		}
		const arrayLabel = { text: "Contacts" }
		const arraySlotOptions = {
			controls: {
				sticky: true,
			},
		}
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
					title: sectionTitle,
					slotOptions: sectionSlotOptions,
					children: [
						{
							kind: "field",
							path: "name",
							control: "text",
							label: fieldLabel,
							slotOptions: fieldSlotOptions,
						},
					],
				},
				{
					kind: "array",
					path: "contacts",
					label: arrayLabel,
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
		const account = definition.nodesById.account

		if (account.kind !== "section") {
			throw new Error("Expected account to normalize as a section")
		}

		expect(definition.fieldsByPath.name.label).toBe(fieldLabel)
		expect(definition.fieldsByPath.name.slotOptions).toBe(fieldSlotOptions)
		expect(account.title).toBe(sectionTitle)
		expect(account.slotOptions).toBe(sectionSlotOptions)
		expect(definition.arraysByPath.contacts.label).toBe(arrayLabel)
		expect(definition.arraysByPath.contacts.slotOptions).toBe(arraySlotOptions)
		expect(Object.isFrozen(fieldLabel)).toBe(false)
		expect(Object.isFrozen(fieldSlotOptions)).toBe(false)
		expect(Object.isFrozen(fieldSlotOptions.tooltip)).toBe(false)
		expect(Object.isFrozen(sectionTitle)).toBe(false)
		expect(Object.isFrozen(sectionSlotOptions.legend)).toBe(false)
		expect(Object.isFrozen(arrayLabel)).toBe(false)
		expect(Object.isFrozen(arraySlotOptions.controls)).toBe(false)
		expect(Object.isFrozen(definition.fieldsByPath.name)).toBe(true)
		expect(Object.isFrozen(account)).toBe(true)
		expect(Object.isFrozen(definition.arraysByPath.contacts)).toBe(true)
	})
})
