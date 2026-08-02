import { describe, expect, it, vi } from "vitest"
import { createRowIdentityStateFromEntries } from "./array-state.js"
import { CommitTimeline } from "./commit-timeline.js"
import {
	createDocumentCommittedEvent,
	createDocumentRestoredEvent,
	createFormDocument,
} from "./form-reducer.js"

describe("commit timeline", () => {
	it("reports reducer-effective value and structural array paths", () => {
		type Values = {
			profile: { name: string }
			items: readonly { name: string }[]
		}
		const timeline = new CommitTimeline<Values, unknown>()
		const previous = createFormDocument(
			{ profile: { name: "Ada" }, items: [{ name: "One" }] },
			createRowIdentityStateFromEntries([
				{ path: "items", keys: ["items:0"], nextKeyIndex: 1 },
			]),
		)
		const restored = createFormDocument(
			{
				profile: { name: "Grace" },
				items: [{ name: "One" }, { name: "Two" }],
			},
			createRowIdentityStateFromEntries([
				{
					path: "items",
					keys: ["items:0", "items:1"],
					nextKeyIndex: 2,
				},
			]),
		)
		const listener = vi.fn()
		timeline.subscribe(listener)

		timeline.finalize(
			createDocumentRestoredEvent({
				sequence: 2,
				document: restored,
				origin: "undo",
				history: "skip",
			}),
			previous,
			restored,
		)

		expect(listener).toHaveBeenCalledOnce()
		expect(listener.mock.calls[0]?.[0].changedPaths).toEqual([
			"profile.name",
			"items",
			"items.1",
		])
	})

	it("reports normalized ordinary changes and row-identity-only changes", () => {
		type Values = { name: string; items: readonly string[] }
		const timeline = new CommitTimeline<Values, unknown>()
		const previous = createFormDocument(
			{ name: "Ada", items: ["one"] },
			createRowIdentityStateFromEntries([
				{ path: "items", keys: ["items:0"], nextKeyIndex: 1 },
			]),
		)
		const document = createFormDocument(
			{ name: "Grace", items: ["one"] },
			createRowIdentityStateFromEntries([
				{ path: "items", keys: ["items:1"], nextKeyIndex: 2 },
			]),
		)
		const listener = vi.fn()
		timeline.subscribe(listener)

		timeline.finalize(
			createDocumentCommittedEvent<Values>({
				sequence: 1,
				source: "imperative",
				changes: [{ type: "set", path: "name", value: "Grace" }],
				rowIdentityChanges: [
					{
						type: "array/replaced",
						path: "items",
						keys: ["items:1"],
						nextKeyIndex: 2,
					},
				],
			}),
			previous,
			document,
		)

		expect(listener.mock.calls[0]?.[0].changedPaths).toEqual(["name", "items"])
	})

	it("notifies later listeners before rethrowing the first listener error", () => {
		const timeline = new CommitTimeline<{ name: string }, unknown>()
		const document = createFormDocument(
			{ name: "Ada" },
			createRowIdentityStateFromEntries([]),
		)
		const firstError = new Error("first listener")
		const later = vi.fn()
		timeline.subscribe(() => {
			throw firstError
		})
		timeline.subscribe(later)
		timeline.subscribe(() => {
			throw new Error("last listener")
		})

		expect(() =>
			timeline.finalize(
				createDocumentCommittedEvent({
					sequence: 1,
					source: "imperative",
					changes: [],
				}),
				document,
				document,
			),
		).toThrow(firstError)
		expect(later).toHaveBeenCalledOnce()
	})
})
