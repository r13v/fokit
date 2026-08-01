import { describe, expect, it, vi } from "vitest"
import {
	createFormStoreWithMiddleware,
	replaceFormStoreRuntime,
} from "./form-store.js"
import type {
	ControlMetadata,
	FormStoreOptions,
	StandardSchema,
	UiNode,
} from "./index.js"
import { normalizeDefinition } from "./index.js"
import type { AnyFormMiddleware, FormMiddleware } from "./middleware.js"

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
				visible: ({ kind }, { context }) =>
					context.showCompany && kind === "company",
				valuePolicy: "unset",
			},
			{
				kind: "field",
				path: "taxId",
				control: "text",
				visible: ({ companyName }) => companyName !== undefined,
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
		readonly afterUpdate?: FormStoreOptions<
			typeof schema,
			AccountContext
		>["afterUpdate"]
		readonly middleware?: readonly FormMiddleware<
			AccountValues,
			AccountContext
		>[]
	} = {},
) {
	return createFormStoreWithMiddleware(
		{
			definition: createDefinition(),
			defaultValues,
			context: options.context ?? { showCompany: true },
			beforeUpdate: options.beforeUpdate,
			afterUpdate: options.afterUpdate,
		},
		(options.middleware ?? []) as unknown as readonly AnyFormMiddleware[],
	)
}

describe("visibility-driven valuePolicy", () => {
	it("stabilizes fields that start hidden into the initial baseline", () => {
		const beforeUpdate = vi.fn()
		const afterUpdate = vi.fn()
		const form = createAccountStore({
			context: {
				showCompany: false,
			},
			beforeUpdate,
			afterUpdate,
		})

		expect(form.getValues()).toEqual({
			kind: "company",
		})
		expect(form.getSnapshot().isDirty).toBe(false)
		expect(form.getSnapshot().resolvedUi.fieldsByPath.companyName.visible).toBe(
			false,
		)
		expect(form.getSnapshot().resolvedUi.fieldsByPath.taxId.visible).toBe(false)
		expect(beforeUpdate).not.toHaveBeenCalled()
		expect(afterUpdate).not.toHaveBeenCalled()
	})

	it("expands hidden unsets to stability before beforeUpdate and reports them in one update", () => {
		const beforeUpdate = vi.fn()
		const afterUpdate = vi.fn()
		const form = createAccountStore({ beforeUpdate, afterUpdate })

		form.setValue("kind", "person")

		expect(form.getValues()).toEqual({
			kind: "person",
		})
		expect(beforeUpdate).toHaveBeenCalledTimes(1)
		expect(afterUpdate).toHaveBeenCalledTimes(1)
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
		expect(afterUpdate.mock.calls[0]?.[0]).toMatchObject({
			source: "imperative",
			values: {
				kind: "person",
			},
		})
		expect(afterUpdate.mock.calls[0]?.[0].changes).toEqual(
			beforeUpdate.mock.calls[0]?.[0].changes,
		)
	})

	it("publishes runtime replacement before its separate valuePolicy transaction", () => {
		const beforeUpdate = vi.fn()
		const afterUpdate = vi.fn()
		const form = createAccountStore({ beforeUpdate, afterUpdate })
		const listener = vi.fn()
		const hiddenContext = {
			showCompany: false,
		}
		const runtimeOptions = {
			disabled: true,
		}

		form.blur("kind")
		form.setErrors([
			{
				source: "manual",
				path: "kind",
				message: "Keep this unrelated issue",
			},
		])

		form.subscribe(
			(snapshot) => ({
				showCompany: snapshot.context.showCompany,
				disabled: snapshot.resolvedUi.disabled,
				companyName: snapshot.values.companyName,
				dirty: snapshot.isDirty,
				touched: snapshot.metadata.fieldsByPath.kind.touched,
				kindIssue: snapshot.errors.fields.get("kind")?.[0]?.message,
			}),
			listener,
		)

		replaceFormStoreRuntime(form, hiddenContext, runtimeOptions)

		expect(form.getValues()).toEqual({
			kind: "company",
		})
		expect(listener).toHaveBeenCalledTimes(2)
		expect(listener.mock.calls[0]?.[0]).toEqual({
			showCompany: false,
			disabled: true,
			companyName: "Analytical Engines Ltd",
			dirty: false,
			touched: true,
			kindIssue: "Keep this unrelated issue",
		})
		expect(listener.mock.calls[1]?.[0]).toEqual({
			showCompany: false,
			disabled: true,
			companyName: undefined,
			dirty: true,
			touched: true,
			kindIssue: "Keep this unrelated issue",
		})
		expect(beforeUpdate).toHaveBeenCalledTimes(1)
		expect(afterUpdate).toHaveBeenCalledTimes(1)
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

		replaceFormStoreRuntime(form, hiddenContext, runtimeOptions)

		expect(listener).toHaveBeenCalledTimes(2)
		expect(beforeUpdate).toHaveBeenCalledTimes(1)
		expect(afterUpdate).toHaveBeenCalledTimes(1)
	})

	it("applies valuePolicy after a committed runtime replacement throws", () => {
		const failure = new Error("runtime post-commit failure")
		const throwingReplacement: FormMiddleware<AccountValues, AccountContext> =
			() => (next) => (transaction) => {
				const result = next(transaction)
				if (transaction.type === "runtime/replaced") throw failure
				return result
			}
		const form = createAccountStore({ middleware: [throwingReplacement] })

		expect(() =>
			replaceFormStoreRuntime(form, { showCompany: false }, {}),
		).toThrow(failure)
		expect(form.getSnapshot().context.showCompany).toBe(false)
		expect(form.getValues()).toEqual({ kind: "company" })
	})
})
