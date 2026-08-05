import { describe, expect, it, vi } from "vitest"

import {
	createValueCoordinator,
	type FormMiddleware,
	type ValueTransaction,
} from "./value-middleware.js"

type Values = {
	quantity: number
	total: number
	note?: string
	items: { name: string }[]
}

describe("value middleware coordinator", () => {
	it("commits dependent patches before code after next observes values", () => {
		const order: string[] = []
		const middleware: readonly FormMiddleware<Values>[] = [
			() => (next) => (transaction) => {
				order.push("first:before")
				const result = next([
					...transaction.patches,
					{
						op: "replace",
						path: ["total"],
						value: transaction.nextValues.quantity * 2,
					},
				])
				order.push("first:after")
				return result
			},
			() => (next) => (transaction) => {
				order.push(`second:${transaction.nextValues.total}`)
				return next(transaction.patches)
			},
		]
		const harness = createHarness(middleware)

		const result = harness.coordinator.update((draft) => {
			draft.quantity = 3
		}) as ValueTransaction<Values>

		expect(order).toEqual(["first:before", "second:6", "first:after"])
		expect(harness.getValues()).toMatchObject({ quantity: 3, total: 6 })
		expect(result.nextValues).toMatchObject({ quantity: 3, total: 6 })
		expect(result.source).toEqual({ type: "update" })
	})

	it("lets middleware cancel a proposal without publishing partial values", () => {
		const harness = createHarness([() => () => () => "cancelled"])

		expect(
			harness.coordinator.update((draft) => {
				draft.quantity = 9
			}),
		).toBe("cancelled")
		expect(harness.getValues().quantity).toBe(1)
		expect(harness.commit).not.toHaveBeenCalled()
	})

	it("skips middleware entirely when a recipe changes nothing", () => {
		const entered = vi.fn()
		const harness = createHarness([
			() => (next) => (transaction) => {
				entered()
				return next(transaction.patches)
			},
		])

		expect(harness.coordinator.update(() => undefined)).toBeUndefined()
		expect(entered).not.toHaveBeenCalled()
		expect(harness.commit).not.toHaveBeenCalled()
	})

	it("rejects top-level deletion that RHF setValues cannot commit exactly", () => {
		const harness = createHarness([], {
			items: [],
			note: "keep the key",
			quantity: 1,
			total: 2,
		})

		expect(() =>
			harness.coordinator.update(() => ({
				items: [],
				quantity: 2,
				total: 4,
			})),
		).toThrow("assign undefined instead")
		expect(harness.getValues()).toHaveProperty("note", "keep the key")
		expect(harness.commit).not.toHaveBeenCalled()
	})

	it("forbids nested updates and a second next without rolling back a commit", () => {
		const nestedError = vi.fn()
		const harness = createHarness([
			(api) => (next) => (transaction) => {
				try {
					api.update((draft) => {
						draft.total = 100
					})
				} catch (error) {
					nestedError(error)
				}
				next(transaction.patches)
				return next(transaction.patches)
			},
		])

		expect(() =>
			harness.coordinator.update((draft) => {
				draft.quantity = 4
			}),
		).toThrow("cannot call next more than once")
		expect(nestedError.mock.calls[0]?.[0]).toBeInstanceOf(TypeError)
		expect(harness.getValues().quantity).toBe(4)
		expect(harness.commit).toHaveBeenCalledTimes(1)
	})

	it("allows a new update after async post-commit work", async () => {
		const harness = createHarness([
			(api) => (next) => async (transaction) => {
				const result = next(transaction.patches)
				if (transaction.nextValues.quantity === 2) {
					await Promise.resolve()
					return api.update((draft) => {
						draft.total = 8
					})
				}
				return result
			},
		])

		await harness.coordinator.update((draft) => {
			draft.quantity = 2
		})

		expect(harness.getValues()).toMatchObject({ quantity: 2, total: 8 })
		expect(harness.commit).toHaveBeenCalledTimes(2)
	})

	it("rejects a deferred next before it can commit stale previous values", async () => {
		const harness = createHarness([
			() => (next) => async (transaction) => {
				await Promise.resolve()
				return next(transaction.patches)
			},
		])

		await expect(
			harness.coordinator.update((draft) => {
				draft.quantity = 3
			}),
		).rejects.toThrow("must call next synchronously")
		expect(harness.getValues().quantity).toBe(1)
		expect(harness.commit).not.toHaveBeenCalled()
	})

	it("keeps native array length and order changes owned by the source action", () => {
		const harness = createHarness(
			[
				() => (next) => (transaction) =>
					next([
						...transaction.patches,
						{ op: "add", path: ["items", 2], value: { name: "extra" } },
					]),
			],
			{
				items: [{ name: "Ada" }, { name: "Grace" }],
				quantity: 1,
				total: 2,
			},
		)

		expect(() =>
			harness.coordinator.dispatch(
				(draft) => {
					draft.items.splice(0, 1)
				},
				{ action: "remove", index: 0, path: "items", type: "array" },
				{ arrayPath: ["items"] },
			),
		).toThrow("cannot change length or order")
		expect(harness.getValues().items).toHaveLength(2)
		expect(harness.commit).not.toHaveBeenCalled()
	})
})

function createHarness(
	middleware: readonly FormMiddleware<Values>[],
	initialValues: Values = { items: [], quantity: 1, total: 2 },
) {
	let values = initialValues
	const commit = vi.fn((transaction: ValueTransaction<Values>) => {
		values = transaction.nextValues as Values
	})
	const coordinator = createValueCoordinator({
		commit,
		getContext: () => undefined,
		getValues: () => values,
		middleware,
	})
	return { commit, coordinator, getValues: () => values }
}
