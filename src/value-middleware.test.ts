import type { Draft } from "immer"
import { describe, expect, it, vi } from "vitest"

import {
	type BeforeUpdateResult,
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
		const afterUpdate = vi.fn()
		const harness = createHarness([() => () => () => "cancelled"], undefined, {
			afterUpdate,
		})

		expect(
			harness.coordinator.update((draft) => {
				draft.quantity = 9
			}),
		).toBe("cancelled")
		expect(harness.getValues().quantity).toBe(1)
		expect(harness.commit).not.toHaveBeenCalled()
		expect(afterUpdate).not.toHaveBeenCalled()
	})

	it("adjusts a proposal before middleware and observes the final commit", () => {
		const order: string[] = []
		const afterUpdate = vi.fn((transaction: ValueTransaction<Values>) => {
			order.push("afterUpdate")
			expect(transaction.nextValues).toMatchObject({
				note: "committed",
				quantity: 4,
				total: 8,
			})
		})
		const harness = createHarness(
			[
				() => (next) => (transaction) => {
					order.push("middleware:before")
					expect(transaction.nextValues.total).toBe(8)
					expect(
						transaction.patches.filter((patch) => patch.path[0] === "quantity"),
					).toEqual([{ op: "replace", path: ["quantity"], value: 4 }])
					const result = next([
						...transaction.patches,
						{ op: "add", path: ["note"], value: "committed" },
					])
					order.push("middleware:after")
					return result
				},
			],
			undefined,
			{
				afterUpdate,
				beforeUpdate(draft, transaction) {
					order.push("beforeUpdate")
					expect(transaction.nextValues).toMatchObject({
						quantity: 3,
						total: 2,
					})
					draft.quantity += 1
					draft.total = draft.quantity * 2
				},
			},
		)

		harness.coordinator.update((draft) => {
			draft.quantity = 3
		})

		expect(order).toEqual([
			"beforeUpdate",
			"middleware:before",
			"middleware:after",
			"afterUpdate",
		])
		expect(afterUpdate).toHaveBeenCalledOnce()
		expect(harness.getValues()).toMatchObject({
			note: "committed",
			quantity: 4,
			total: 8,
		})
	})

	it("cancels or erases a proposal before middleware", () => {
		const entered = vi.fn()
		const afterUpdate = vi.fn()
		let cancel = true
		const harness = createHarness(
			[
				() => (next) => (transaction) => {
					entered()
					return next(transaction.patches)
				},
			],
			undefined,
			{
				afterUpdate,
				beforeUpdate(draft, transaction) {
					if (cancel) return false
					draft.quantity = transaction.previousValues.quantity
				},
			},
		)

		expect(
			harness.coordinator.update((draft) => {
				draft.quantity = 3
			}),
		).toBeUndefined()
		cancel = false
		expect(
			harness.coordinator.update((draft) => {
				draft.quantity = 4
			}),
		).toBeUndefined()
		expect(
			harness.coordinator.update(() => ({
				items: harness.getValues().items,
				quantity: 5,
				total: 2,
			})),
		).toBeUndefined()

		expect(entered).not.toHaveBeenCalled()
		expect(afterUpdate).not.toHaveBeenCalled()
		expect(harness.commit).not.toHaveBeenCalled()
		expect(harness.getValues().quantity).toBe(1)
	})

	it("uses the latest hooks and rejects nested updates from either hook", () => {
		const first = vi.fn()
		const second = vi.fn()
		let beforeUpdate: HarnessHooks["beforeUpdate"] = () => first()
		let afterUpdate: HarnessHooks["afterUpdate"] = () => first()
		let coordinator: ReturnType<typeof createHarness>["coordinator"]
		const harness = createHarness([], undefined, {
			get afterUpdate() {
				return afterUpdate
			},
			get beforeUpdate() {
				return beforeUpdate
			},
		})
		coordinator = harness.coordinator
		beforeUpdate = () => {
			second()
			expect(() => coordinator.update(() => undefined)).toThrow(
				"cannot start a nested value transaction",
			)
		}
		afterUpdate = () => {
			second()
			expect(() => coordinator.update(() => undefined)).toThrow(
				"cannot start a nested value transaction",
			)
		}

		harness.coordinator.update((draft) => {
			draft.quantity = 2
		})

		expect(first).not.toHaveBeenCalled()
		expect(second).toHaveBeenCalledTimes(2)
	})

	it("rejects asynchronous hooks at their synchronous boundaries", () => {
		const beforeHarness = createHarness([], undefined, {
			// @ts-expect-error Runtime rejects accidentally asynchronous hooks.
			beforeUpdate: async () => undefined,
		})
		expect(() =>
			beforeHarness.coordinator.update((draft) => {
				draft.quantity = 2
			}),
		).toThrow("beforeUpdate must be synchronous")
		expect(beforeHarness.commit).not.toHaveBeenCalled()

		const afterHarness = createHarness([], undefined, {
			// TypeScript permits async functions where callers ignore a void result.
			afterUpdate: async () => undefined,
		})
		expect(() =>
			afterHarness.coordinator.update((draft) => {
				draft.quantity = 2
			}),
		).toThrow("afterUpdate must be synchronous")
		expect(afterHarness.getValues().quantity).toBe(2)
	})

	it("aggregates middleware and afterUpdate failures after commit", () => {
		const middlewareError = new Error("middleware failed")
		const afterError = new Error("afterUpdate failed")
		const afterUpdate = vi.fn(() => {
			throw afterError
		})
		const harness = createHarness(
			[
				() => (next) => (transaction) => {
					next(transaction.patches)
					throw middlewareError
				},
			],
			undefined,
			{ afterUpdate },
		)

		let failure: unknown
		try {
			harness.coordinator.update((draft) => {
				draft.quantity = 2
			})
		} catch (error) {
			failure = error
		}

		expect(failure).toBeInstanceOf(AggregateError)
		expect((failure as AggregateError).errors).toEqual([
			middlewareError,
			afterError,
		])
		expect(afterUpdate).toHaveBeenCalledOnce()
		expect(harness.getValues().quantity).toBe(2)
	})

	it("aggregates asynchronous middleware and afterUpdate failures", async () => {
		const middlewareError = new Error("async middleware failed")
		const afterError = new Error("afterUpdate failed")
		const harness = createHarness(
			[
				() => (next) => async (transaction) => {
					next(transaction.patches)
					await Promise.resolve()
					throw middlewareError
				},
			],
			undefined,
			{
				afterUpdate() {
					throw afterError
				},
			},
		)

		let failure: unknown
		try {
			await harness.coordinator.update((draft) => {
				draft.quantity = 2
			})
		} catch (error) {
			failure = error
		}

		expect(failure).toBeInstanceOf(AggregateError)
		expect((failure as AggregateError).errors).toEqual([
			middlewareError,
			afterError,
		])
		expect(harness.getValues().quantity).toBe(2)
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

	it("applies the same structural array constraint to beforeUpdate", () => {
		const harness = createHarness(
			[],
			{
				items: [{ name: "Ada" }, { name: "Grace" }],
				quantity: 1,
				total: 2,
			},
			{
				beforeUpdate(draft) {
					draft.items.push({ name: "extra" })
				},
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
		expect(harness.commit).not.toHaveBeenCalled()
	})
})

type HarnessHooks = {
	readonly beforeUpdate?: (
		draft: Draft<Values>,
		transaction: ValueTransaction<Values>,
	) => BeforeUpdateResult
	readonly afterUpdate?: (transaction: ValueTransaction<Values>) => void
}

function createHarness(
	middleware: readonly FormMiddleware<Values>[],
	initialValues: Values = { items: [], quantity: 1, total: 2 },
	hooks: HarnessHooks = {},
) {
	let values = initialValues
	const commit = vi.fn((transaction: ValueTransaction<Values>) => {
		values = transaction.nextValues as Values
	})
	const coordinator = createValueCoordinator({
		commit,
		getAfterUpdate: () => hooks.afterUpdate,
		getBeforeUpdate: () => hooks.beforeUpdate,
		getContext: () => undefined,
		getValues: () => values,
		middleware,
	})
	return { commit, coordinator, getValues: () => values }
}
