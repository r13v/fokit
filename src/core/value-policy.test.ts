import { describe, expect, it, vi } from "vitest"

import type {
	ControlMetadata,
	FormStoreOptions,
	StandardSchema,
	UiNode,
} from "./index.js"
import { computed, createFormStore, normalizeDefinition } from "./index.js"

type AccountValues = {
	kind: "person" | "company"
	companyName?: string
	taxId?: string
}

type AccountContext = {
	readonly showCompany: boolean
}

type AccountControls = {
	readonly text: ControlMetadata<string | undefined>
	readonly select: ControlMetadata<AccountValues["kind"]>
}

const schema = {} as StandardSchema<AccountValues>
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
} satisfies AccountControls

const defaultValues = {
	kind: "company",
	companyName: "Analytical Engines Ltd",
	taxId: "GB-42",
} satisfies AccountValues

function createDefinition() {
	return normalizeDefinition<typeof schema, AccountControls, AccountContext>({
		schema,
		controls,
		ui: [
			{
				kind: "field",
				path: "kind",
				control: "select",
			},
			{
				kind: "field",
				path: "companyName",
				control: "text",
				visible: computed(
					["kind"] as const,
					(
						{ kind }: { readonly kind: AccountValues["kind"] },
						{ context }: { readonly context: AccountContext },
					) => context.showCompany && kind === "company",
				),
				valuePolicy: "unset",
			},
			{
				kind: "field",
				path: "taxId",
				control: "text",
				visible: computed(
					["companyName"] as const,
					({ companyName }: { readonly companyName?: string }) =>
						companyName !== undefined,
				),
				valuePolicy: "unset",
			},
		] satisfies readonly UiNode<
			AccountValues,
			AccountControls,
			AccountContext
		>[],
	})
}

function createAccountStore(
	options: {
		readonly context?: AccountContext
		readonly beforeUpdate?: FormStoreOptions<
			typeof schema,
			AccountContext
		>["beforeUpdate"]
		readonly onUpdate?: FormStoreOptions<
			typeof schema,
			AccountContext
		>["onUpdate"]
	} = {},
) {
	return createFormStore({
		definition: createDefinition(),
		defaultValues,
		context: options.context ?? {
			showCompany: true,
		},
		beforeUpdate: options.beforeUpdate,
		onUpdate: options.onUpdate,
	})
}

describe("visibility-driven valuePolicy", () => {
	it("expands hidden unsets to stability before beforeUpdate and reports them in one update", () => {
		const beforeUpdate = vi.fn()
		const onUpdate = vi.fn()
		const form = createAccountStore({ beforeUpdate, onUpdate })

		form.setValue("kind", "person")

		expect(form.getValues()).toEqual({
			kind: "person",
		})
		expect(beforeUpdate).toHaveBeenCalledTimes(1)
		expect(onUpdate).toHaveBeenCalledTimes(1)
		expect(beforeUpdate.mock.calls[0]?.[0].nextValues).toEqual({
			kind: "person",
		})
		expect(beforeUpdate.mock.calls[0]?.[0].changes).toEqual([
			{
				type: "set",
				path: "kind",
				value: "person",
			},
			{
				type: "unset",
				path: "companyName",
			},
			{
				type: "unset",
				path: "taxId",
			},
		])
		expect(onUpdate.mock.calls[0]?.[0]).toMatchObject({
			source: "imperative",
			values: {
				kind: "person",
			},
		})
		expect(onUpdate.mock.calls[0]?.[0].changes).toEqual(
			beforeUpdate.mock.calls[0]?.[0].changes,
		)
	})

	it("runs one separate valuePolicy transaction after a context-only hide", () => {
		const beforeUpdate = vi.fn()
		const onUpdate = vi.fn()
		const form = createAccountStore({ beforeUpdate, onUpdate })
		const listener = vi.fn()

		form.subscribe(
			(snapshot) => ({
				showCompany: snapshot.context.showCompany,
				companyName: snapshot.values.companyName,
			}),
			listener,
		)

		form.replaceContext({
			showCompany: false,
		})

		expect(form.getValues()).toEqual({
			kind: "company",
		})
		expect(listener).toHaveBeenCalledTimes(2)
		expect(listener.mock.calls[0]?.[0]).toEqual({
			showCompany: false,
			companyName: "Analytical Engines Ltd",
		})
		expect(listener.mock.calls[1]?.[0]).toEqual({
			showCompany: false,
			companyName: undefined,
		})
		expect(beforeUpdate).toHaveBeenCalledTimes(1)
		expect(onUpdate).toHaveBeenCalledTimes(1)
		expect(beforeUpdate.mock.calls[0]?.[0]).toMatchObject({
			source: "valuePolicy",
			nextValues: {
				kind: "company",
			},
		})
		expect(beforeUpdate.mock.calls[0]?.[0].changes).toEqual([
			{
				type: "unset",
				path: "companyName",
			},
			{
				type: "unset",
				path: "taxId",
			},
		])

		form.replaceContext({
			showCompany: false,
		})

		expect(beforeUpdate).toHaveBeenCalledTimes(1)
		expect(onUpdate).toHaveBeenCalledTimes(1)
	})
})
