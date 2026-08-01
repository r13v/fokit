import { describe, expect, it } from "vitest"
import {
	createRowIdentityStateFromEntries,
	getRowIdentityKeys,
} from "../core/array-state.js"
import {
	createDocumentCommittedEvent,
	createFormDocument,
} from "../core/form-reducer.js"
import {
	createFormJournal,
	FORM_JOURNAL_VERSION,
	normalizeJournal,
	replayJournal,
} from "./journal.js"

describe("form journals", () => {
	it("replays nested array values with the exact recorded row identity", () => {
		const checkpoint = createFormDocument(
			{ groups: [{ items: [{ name: "first" }] }] },
			createRowIdentityStateFromEntries([
				{ path: "groups", keys: ["groups:0"], nextKeyIndex: 1 },
				{
					path: "groups.0.items",
					keys: ["groups.0.items:0"],
					nextKeyIndex: 1,
				},
			]),
		)
		const event = createDocumentCommittedEvent<{
			groups: { items: { name: string }[] }[]
		}>({
			sequence: 1,
			source: "array",
			changes: [
				{
					type: "set",
					path: "groups.0.items",
					value: [{ name: "first" }, { name: "second" }],
				},
			],
			rowIdentityChanges: [
				{
					type: "array/inserted",
					path: "groups.0.items",
					index: 1,
					key: "groups.0.items:1",
					nextKeyIndex: 2,
				},
			],
		})
		const journal = createFormJournal(
			[
				{
					checkpoint: { sequence: 0, document: checkpoint },
					groups: [{ events: [event] }],
				},
			],
			1,
		)

		const first = replayJournal(journal, journal.cursor)
		const second = replayJournal(journal, journal.cursor)

		expect(first).toEqual(second)
		expect(first.values.groups[0]?.items).toEqual([
			{ name: "first" },
			{ name: "second" },
		])
		expect(getRowIdentityKeys(first.rowIdentity, "groups.0.items")).toEqual([
			"groups.0.items:0",
			"groups.0.items:1",
		])
	})

	it("rejects invalid versions, paths, sequences, and row identity", () => {
		const checkpoint = createFormDocument(
			{ items: [] as string[] },
			createRowIdentityStateFromEntries([
				{ path: "items", keys: [], nextKeyIndex: 0 },
			]),
		)
		const journal = createFormJournal(
			[
				{
					checkpoint: { sequence: 0, document: checkpoint },
					groups: [
						{
							events: [
								createDocumentCommittedEvent<{ items: string[] }>({
									sequence: 1,
									source: "imperative",
									changes: [{ type: "set", path: "items", value: ["x"] }],
									rowIdentityChanges: [
										{
											type: "array/replaced",
											path: "items",
											keys: ["items:0"],
											nextKeyIndex: 1,
										},
									],
								}),
							],
						},
					],
				},
			],
			1,
		)

		expect(() =>
			normalizeJournal({ ...journal, version: FORM_JOURNAL_VERSION + 1 }),
		).toThrow(/version/i)
		const duplicateSequence = structuredClone(journal) as never
		;(
			duplicateSequence as FormJournalShape
		).segments[0].groups[0].events[0].sequence = 0
		expect(() => normalizeJournal(duplicateSequence)).toThrow(/increasing/i)

		const invalidPath = structuredClone(journal) as never
		;(
			invalidPath as FormJournalShape
		).segments[0].groups[0].events[0].changes[0].path = "items.01"
		expect(() => normalizeJournal(invalidPath)).toThrow(/canonical/i)

		const invalidRows = structuredClone(journal) as never
		;(
			invalidRows as FormJournalShape
		).segments[0].checkpoint.document.rowIdentity.items.keys = ["extra"]
		expect(() => normalizeJournal(invalidRows)).toThrow(/row identity/i)

		const invalidEvent = structuredClone(journal) as never
		;(
			invalidEvent as UnknownRowEventShape
		).segments[0].groups[0].events[0].rowIdentityChanges = [
			{ type: "array/mystery", path: "items" },
		]
		expect(() => normalizeJournal(invalidEvent)).toThrow(
			/unsupported row identity/i,
		)

		const other = createFormJournal(
			[{ checkpoint: { sequence: 0, document: checkpoint }, groups: [] }],
			0,
		)
		expect(() => replayJournal(journal, other.cursor)).toThrow(
			/does not belong/i,
		)
	})
})

type FormJournalShape = {
	segments: {
		checkpoint: {
			document: {
				rowIdentity: Record<string, { keys: string[] }>
			}
		}
		groups: {
			events: {
				sequence: number
				changes: { path: string }[]
			}[]
		}[]
	}[]
}

type UnknownRowEventShape = {
	segments: {
		groups: {
			events: {
				rowIdentityChanges: { type: string; path: string }[]
			}[]
		}[]
	}[]
}
