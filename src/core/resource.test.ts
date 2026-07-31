import { describe, expect, it, vi } from "vitest"

import type { ResourceState, UiResolver } from "./index.js"
import { fromResource, matchResource } from "./index.js"

type ExampleInput = {
	readonly kind: "company" | "person"
}

type ExampleContext = {
	readonly access: ResourceState<
		{ readonly canEdit: boolean },
		{ readonly message: string }
	>
}

describe("matchResource", () => {
	it("runs only the mapper for the current availability state", () => {
		const pending = vi.fn(() => "pending" as const)
		const success = vi.fn(() => "success" as const)
		const error = vi.fn(() => "error" as const)
		const resource = {
			status: "success",
			value: { canEdit: true },
		} as const

		expect(matchResource(resource, { pending, success, error })).toBe("success")
		expect(pending).not.toHaveBeenCalled()
		expect(success).toHaveBeenCalledOnce()
		expect(success).toHaveBeenCalledWith(resource)
		expect(error).not.toHaveBeenCalled()
	})

	it("preserves application-specific properties on a resource branch", () => {
		const resource = {
			status: "success",
			value: ["Toronto"],
			refresh: { status: "paused" },
		} as const

		const result = matchResource(resource, {
			pending: () => "unavailable",
			success: (state) => state.refresh.status,
			error: () => "unavailable",
		})

		expect(result).toBe("paused")
	})

	it("maps pending and error states through their matching branches", () => {
		const pending = { status: "pending" } as const
		const failure = new Error("offline")

		expect(
			matchResource(pending, {
				pending: (state) => state,
				success: () => null,
				error: () => null,
			}),
		).toBe(pending)
		expect(
			matchResource(
				{ status: "error", error: failure },
				{
					pending: () => null,
					success: () => null,
					error: ({ error }) => error,
				},
			),
		).toBe(failure)
	})

	it("rejects unsupported runtime states instead of choosing a fallback", () => {
		expect(() =>
			matchResource({ status: "cancelled" } as never, {
				pending: () => false,
				success: () => true,
				error: () => false,
			}),
		).toThrow('Unsupported resource status "cancelled"')
	})

	it("lets mapper failures cross the application boundary unchanged", () => {
		const failure = new Error("render policy failed")
		const error = vi.fn(() => false)

		expect(() =>
			matchResource(
				{ status: "success", value: true },
				{
					pending: () => false,
					success: () => {
						throw failure
					},
					error,
				},
			),
		).toThrow(failure)
		expect(error).not.toHaveBeenCalled()
	})
})

describe("fromResource", () => {
	it("forwards resolver values and details to the selected branch", () => {
		const access = {
			status: "success",
			value: { canEdit: true },
		} as const
		const values = { kind: "company" as const }
		const details = { context: { access } }
		const select: UiResolver<
			ExampleContext["access"],
			ExampleInput,
			ExampleContext
		> = vi.fn((_values, resolverDetails) => resolverDetails.context.access)
		const success = vi.fn(
			(
				state: Extract<ExampleContext["access"], { status: "success" }>,
				resolverValues: Readonly<ExampleInput>,
				resolverDetails: { readonly context: Readonly<ExampleContext> },
			) =>
				state.value.canEdit &&
				resolverValues.kind === "company" &&
				resolverDetails.context.access === access,
		)
		const resolver: UiResolver<boolean, ExampleInput, ExampleContext> =
			fromResource(select, {
				pending: () => false,
				success,
				error: () => false,
			})

		expect(resolver(values, details)).toBe(true)
		expect(select).toHaveBeenCalledOnce()
		expect(select).toHaveBeenCalledWith(values, details)
		expect(success).toHaveBeenCalledOnce()
		expect(success).toHaveBeenCalledWith(access, values, details)
	})
})
