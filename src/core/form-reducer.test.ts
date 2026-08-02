import fc from "fast-check"
import { describe, expect, expectTypeOf, it } from "vitest"

import {
	createRowIdentityStateFromEntries,
	getRowIdentityKeys,
	getRowIdentityNextKeyIndex,
} from "./array-state.js"
import type { FormModel, FormRuntimeState } from "./form-model.js"
import {
	createDocumentCommittedEvent,
	createDocumentRestoredEvent,
	createFormDocument,
	reduceFormDocument,
} from "./form-reducer.js"

type Values = {
	name?: string
	rows: { value: string }[]
	groups: { members: string[] }[]
}

function createInitialDocument() {
	return createFormDocument<Values>(
		{
			name: "Ada",
			rows: [{ value: "one" }, { value: "two" }],
			groups: [{ members: ["a"] }, { members: ["b"] }],
		},
		createRowIdentityStateFromEntries([
			{ path: "rows", keys: ["rows:0", "rows:1"], nextKeyIndex: 2 },
			{ path: "groups", keys: ["groups:0", "groups:1"], nextKeyIndex: 2 },
			{
				path: "groups.0.members",
				keys: ["groups.0.members:0"],
				nextKeyIndex: 1,
			},
			{
				path: "groups.1.members",
				keys: ["groups.1.members:0"],
				nextKeyIndex: 1,
			},
		]),
	)
}

describe("reduceFormDocument", () => {
	it("keeps the clean baseline in non-historical runtime state", () => {
		expectTypeOf<
			FormModel<Values, { locale: string }>["runtime"]
		>().toEqualTypeOf<FormRuntimeState<{ locale: string }, Values>>()
	})

	it("reduces set and unset changes without changing row identity", () => {
		const initial = createInitialDocument()
		const event = createDocumentCommittedEvent<Values>({
			sequence: 1,
			source: "imperative",
			changes: [
				{ type: "set", path: "rows.0.value", value: "changed" },
				{ type: "unset", path: "name" },
			],
		})

		const next = reduceFormDocument(initial, event)

		expect(next.values).toEqual({
			rows: [{ value: "changed" }, { value: "two" }],
			groups: [{ members: ["a"] }, { members: ["b"] }],
		})
		expect(next.rowIdentity).toBe(initial.rowIdentity)
	})

	it("rejects a commit that would let array values and identity diverge", () => {
		const initial = createInitialDocument()
		const event = createDocumentCommittedEvent<Values>({
			sequence: 1,
			source: "imperative",
			changes: [
				{
					type: "set",
					path: "rows",
					value: [...initial.values.rows, { value: "unidentified" }],
				},
			],
		})

		expect(() => reduceFormDocument(initial, event)).toThrow(
			'Row identity at "rows" does not match its array',
		)
		expect(initial.values.rows).toHaveLength(2)
	})

	it("reduces every array operation with its assigned stable identity", () => {
		let document = createInitialDocument()

		document = reduceFormDocument(
			document,
			createDocumentCommittedEvent<Values>({
				sequence: 1,
				source: "array",
				changes: [
					{
						type: "set",
						path: "rows",
						value: [...document.values.rows, { value: "append" }],
					},
				],
				rowIdentityChanges: [
					{
						type: "array/inserted",
						path: "rows",
						index: 2,
						key: "rows:2",
						nextKeyIndex: 3,
					},
				],
			}),
		)
		expect(getRowIdentityKeys(document.rowIdentity, "rows")).toEqual([
			"rows:0",
			"rows:1",
			"rows:2",
		])

		document = reduceFormDocument(
			document,
			createDocumentCommittedEvent<Values>({
				sequence: 2,
				source: "array",
				changes: [
					{
						type: "set",
						path: "rows",
						value: [
							...document.values.rows.slice(0, 1),
							{ value: "insert" },
							...document.values.rows.slice(1),
						],
					},
				],
				rowIdentityChanges: [
					{
						type: "array/inserted",
						path: "rows",
						index: 1,
						key: "rows:3",
						nextKeyIndex: 4,
					},
				],
			}),
		)

		const movedRows = document.values.rows.slice()
		const [movedRow] = movedRows.splice(3, 1)
		movedRows.splice(0, 0, movedRow as { value: string })
		document = reduceFormDocument(
			document,
			createDocumentCommittedEvent<Values>({
				sequence: 3,
				source: "array",
				changes: [{ type: "set", path: "rows", value: movedRows }],
				rowIdentityChanges: [
					{
						type: "array/moved",
						path: "rows",
						from: 3,
						to: 0,
						key: "rows:2",
					},
				],
			}),
		)

		const removedRows = document.values.rows.slice()
		removedRows.splice(2, 1)
		document = reduceFormDocument(
			document,
			createDocumentCommittedEvent<Values>({
				sequence: 4,
				source: "array",
				changes: [{ type: "set", path: "rows", value: removedRows }],
				rowIdentityChanges: [
					{
						type: "array/removed",
						path: "rows",
						index: 2,
						key: "rows:3",
					},
				],
			}),
		)

		expect(document.values.rows.map((row) => row.value)).toEqual([
			"append",
			"one",
			"two",
		])
		expect(getRowIdentityKeys(document.rowIdentity, "rows")).toEqual([
			"rows:2",
			"rows:0",
			"rows:1",
		])
		expect(getRowIdentityNextKeyIndex(document.rowIdentity, "rows")).toBe(4)
	})

	it("replays nested arrays and identity-only structural changes exactly", () => {
		const initial = createInitialDocument()
		const movedGroups = [initial.values.groups[1], initial.values.groups[0]]
		const events = [
			createDocumentCommittedEvent<Values>({
				sequence: 1,
				source: "array",
				changes: [{ type: "set", path: "groups", value: movedGroups }],
				rowIdentityChanges: [
					{
						type: "array/moved",
						path: "groups",
						from: 1,
						to: 0,
						key: "groups:1",
					},
					{
						type: "array/paths-reindexed",
						paths: [
							{
								previousPath: "groups.0.members",
								path: "groups.1.members",
							},
							{
								previousPath: "groups.1.members",
								path: "groups.0.members",
							},
						],
					},
				],
			}),
			createDocumentCommittedEvent<Values>({
				sequence: 2,
				source: "array",
				changes: [],
				rowIdentityChanges: [
					{
						type: "array/replaced",
						path: "groups.0.members",
						keys: ["groups.0.members:replacement"],
						nextKeyIndex: 2,
					},
				],
			}),
		]

		const replay = () => events.reduce(reduceFormDocument<Values>, initial)

		expect(replay()).toEqual(replay())
		expect(replay().values.groups).toEqual([
			{ members: ["b"] },
			{ members: ["a"] },
		])
		expect(
			getRowIdentityKeys(replay().rowIdentity, "groups.0.members"),
		).toEqual(["groups.0.members:replacement"])
	})

	it("creates immutable restore events and installs a detached document", () => {
		const initial = createInitialDocument()
		const target = reduceFormDocument(
			initial,
			createDocumentCommittedEvent<Values>({
				sequence: 1,
				source: "imperative",
				changes: [{ type: "set", path: "name", value: "Grace" }],
				baseline: "replaced",
			}),
		)
		const event = createDocumentRestoredEvent({
			sequence: 2,
			document: target,
			origin: "replay",
			history: "skip",
		})

		expect(Object.isFrozen(event)).toBe(true)
		expect(Object.isFrozen(event.document)).toBe(true)
		expect(reduceFormDocument(initial, event)).toEqual(target)
		expect(event.document).not.toBe(target)
	})

	it("detaches Date and RegExp leaves while retaining opaque immutable identities", () => {
		class OpaqueValue {}
		type LeafValues = {
			date: Date
			pattern: RegExp
			opaque: OpaqueValue
			rows: never[]
		}
		const opaque = new OpaqueValue()
		const date = new Date("2026-08-01T00:00:00.000Z")
		const pattern = /form/gi
		pattern.lastIndex = 2
		const initial = createFormDocument<LeafValues>(
			{ date, pattern, opaque, rows: [] },
			createRowIdentityStateFromEntries([
				{ path: "rows", keys: [], nextKeyIndex: 0 },
			]),
		)

		date.setUTCFullYear(2000)
		pattern.lastIndex = 0

		expect(initial.values.date.toISOString()).toBe("2026-08-01T00:00:00.000Z")
		expect(initial.values.pattern.lastIndex).toBe(2)
		expect(initial.values.opaque).toBe(opaque)

		const nextDate = new Date("2027-01-01T00:00:00.000Z")
		const event = createDocumentCommittedEvent<LeafValues>({
			sequence: 1,
			source: "imperative",
			changes: [{ type: "set", path: "date", value: nextDate }],
		})
		nextDate.setUTCFullYear(1999)
		const next = reduceFormDocument(initial, event)
		expect(next.values.date.toISOString()).toBe("2027-01-01T00:00:00.000Z")
	})

	it("matches a reference value/key model for random array operations", () => {
		type ArrayValues = { rows: { value: string }[] }
		type Operation = {
			readonly type: "append" | "insert" | "move" | "remove"
			readonly a: number
			readonly b: number
			readonly value: string
		}
		const operation = fc.record({
			type: fc.constantFrom("append", "insert", "move", "remove"),
			a: fc.nat(20),
			b: fc.nat(20),
			value: fc.string({ maxLength: 4 }),
		}) as fc.Arbitrary<Operation>

		fc.assert(
			fc.property(fc.array(operation, { maxLength: 40 }), (operations) => {
				let document = createFormDocument<ArrayValues>(
					{ rows: [] as { value: string }[] },
					createRowIdentityStateFromEntries([
						{ path: "rows", keys: [], nextKeyIndex: 0 },
					]),
				)
				const values: { value: string }[] = []
				const keys: string[] = []
				let nextKeyIndex = 0
				let sequence = 0

				for (const item of operations) {
					if (item.type === "append" || item.type === "insert") {
						const index =
							item.type === "append"
								? values.length
								: item.a % (values.length + 1)
						const key = `rows:${nextKeyIndex}`
						values.splice(index, 0, { value: item.value })
						keys.splice(index, 0, key)
						nextKeyIndex += 1
						document = reduceFormDocument(
							document,
							createDocumentCommittedEvent<ArrayValues>({
								sequence: ++sequence,
								source: "array",
								changes: [{ type: "set", path: "rows", value: values }],
								rowIdentityChanges: [
									{
										type: "array/inserted",
										path: "rows",
										index,
										key,
										nextKeyIndex,
									},
								],
							}),
						)
					} else if (values.length > 0 && item.type === "remove") {
						const index = item.a % values.length
						const [key] = keys.splice(index, 1)
						values.splice(index, 1)
						document = reduceFormDocument(
							document,
							createDocumentCommittedEvent<ArrayValues>({
								sequence: ++sequence,
								source: "array",
								changes: [{ type: "set", path: "rows", value: values }],
								rowIdentityChanges: [
									{
										type: "array/removed",
										path: "rows",
										index,
										key: key as string,
									},
								],
							}),
						)
					} else if (values.length > 1 && item.type === "move") {
						const from = item.a % values.length
						const to = item.b % values.length
						const [value] = values.splice(from, 1)
						const [key] = keys.splice(from, 1)
						values.splice(to, 0, value as { value: string })
						keys.splice(to, 0, key as string)
						document = reduceFormDocument(
							document,
							createDocumentCommittedEvent<ArrayValues>({
								sequence: ++sequence,
								source: "array",
								changes: [{ type: "set", path: "rows", value: values }],
								rowIdentityChanges: [
									{
										type: "array/moved",
										path: "rows",
										from,
										to,
										key: key as string,
									},
								],
							}),
						)
					}

					expect(document.values.rows).toEqual(values)
					expect(getRowIdentityKeys(document.rowIdentity, "rows")).toEqual(keys)
					expect(getRowIdentityNextKeyIndex(document.rowIdentity, "rows")).toBe(
						nextKeyIndex,
					)
				}
			}),
		)
	})
})
