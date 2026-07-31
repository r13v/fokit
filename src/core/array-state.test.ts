import fc from "fast-check"
import { describe, expect, it, vi } from "vitest"

import type {
	ControlMetadata,
	FormStore,
	FormStoreOptions,
	StandardSchema,
	UiNode,
} from "./index.js"
import { createFormStore, normalizeDefinition } from "./index.js"

type Contact = {
	value: string
	tags: string[]
	note?: string
}

type AccountValues = {
	profile: {
		first: string
	}
	contacts: Contact[]
}

type GroupValues = {
	groups: {
		name: string
		members: {
			name: string
		}[]
	}[]
}

type AccountControls = {
	readonly text: ControlMetadata<string | undefined>
}

const schema = {} as StandardSchema<AccountValues>
const groupSchema = {} as StandardSchema<GroupValues>

const controls = {
	text: {
		formData: {
			mode: "native",
		},
	},
} satisfies AccountControls

const defaultValues = {
	profile: {
		first: "Ada",
	},
	contacts: [
		{ value: "ada@example.test", tags: ["work"], note: "primary" },
		{ value: "grace@example.test", tags: ["personal"] },
	],
} satisfies AccountValues

function createDefinition(
	createDefault: () => Contact = () => ({
		value: "",
		tags: [],
	}),
) {
	return normalizeDefinition<typeof schema, AccountControls>({
		schema,
		controls,
		ui: [
			{
				kind: "field",
				path: "profile.first",
				control: "text",
			},
			{
				kind: "array",
				path: "contacts",
				itemDefault: createDefault,
				children: [
					{
						kind: "field",
						path: "value",
						control: "text",
					},
					{
						kind: "field",
						path: "note",
						control: "text",
					},
				],
			},
		] satisfies readonly UiNode<AccountValues, AccountControls>[],
	})
}

function createAccountStore(
	options: {
		readonly beforeUpdate?: FormStoreOptions<typeof schema>["beforeUpdate"]
		readonly createDefault?: () => Contact
		readonly afterUpdate?: FormStoreOptions<typeof schema>["afterUpdate"]
	} = {},
): FormStore<typeof schema> {
	return createFormStore({
		definition: createDefinition(options.createDefault),
		defaultValues,
		beforeUpdate: options.beforeUpdate,
		afterUpdate: options.afterUpdate,
	})
}

function contactKeys(form: FormStore<typeof schema>): readonly string[] {
	return form
		.getSnapshot()
		.metadata.arraysByPath.contacts.items.map((item) => item.key)
}

function createGroupStore(): FormStore<typeof groupSchema> {
	return createFormStore({
		definition: normalizeDefinition<typeof groupSchema, AccountControls>({
			schema: groupSchema,
			controls,
			ui: [
				{
					kind: "array",
					path: "groups",
					itemDefault: {
						name: "",
						members: [],
					},
					children: [
						{
							kind: "field",
							path: "name",
							control: "text",
						},
						{
							kind: "array",
							path: "members",
							itemDefault: {
								name: "",
							},
							children: [
								{
									kind: "field",
									path: "name",
									control: "text",
								},
							],
						},
					],
				},
			] satisfies readonly UiNode<GroupValues, AccountControls>[],
		}),
		defaultValues: {
			groups: [
				{
					name: "Core",
					members: [{ name: "Ada" }],
				},
				{
					name: "Docs",
					members: [],
				},
			],
		},
	})
}

describe("array commands and row metadata", () => {
	it("appends, inserts, removes, and moves cloned rows while preserving stable keys", () => {
		const firstDefault = {
			value: "new@example.test",
			tags: ["generated"],
		}
		const createDefault = vi.fn(() => ({ ...firstDefault }))
		const beforeUpdate = vi.fn()
		const afterUpdate = vi.fn()
		const first = createAccountStore({
			createDefault,
			beforeUpdate,
			afterUpdate,
		})
		const second = createAccountStore({ createDefault })
		const initialKeys = contactKeys(first)

		expect(contactKeys(second)).toEqual(initialKeys)

		first.append("contacts")
		expect(createDefault).toHaveBeenCalledTimes(1)
		expect(first.getValues().contacts.at(-1)).toEqual(firstDefault)
		const afterAppendKeys = contactKeys(first)
		expect(afterAppendKeys.slice(0, 2)).toEqual(initialKeys)
		expect(afterAppendKeys[2]).not.toBe(initialKeys[0])
		expect(afterAppendKeys[2]).not.toBe(initialKeys[1])

		const inserted = {
			value: "katherine@example.test",
			tags: ["math"],
		}
		first.insert("contacts", 1, inserted)
		inserted.tags.push("mutated-after-insert")

		expect(first.getValues().contacts[1]).toEqual({
			value: "katherine@example.test",
			tags: ["math"],
		})
		const afterInsertKeys = contactKeys(first)
		expect(afterInsertKeys).toEqual([
			initialKeys[0],
			expect.any(String),
			initialKeys[1],
			afterAppendKeys[2],
		])
		expect(Object.hasOwn(first.getValues().contacts[1], "__fokit")).toBe(false)

		first.move("contacts", 3, 0)
		expect(contactKeys(first)).toEqual([
			afterAppendKeys[2],
			initialKeys[0],
			afterInsertKeys[1],
			initialKeys[1],
		])

		first.remove("contacts", 2)
		expect(first.getValues().contacts.map((contact) => contact.value)).toEqual([
			"new@example.test",
			"ada@example.test",
			"grace@example.test",
		])
		expect(contactKeys(first)).toEqual([
			afterAppendKeys[2],
			initialKeys[0],
			initialKeys[1],
		])

		expect(beforeUpdate).toHaveBeenCalledTimes(4)
		expect(afterUpdate).toHaveBeenCalledTimes(4)
		expect(beforeUpdate.mock.calls.map(([event]) => event.source)).toEqual([
			"array",
			"array",
			"array",
			"array",
		])
		expect(afterUpdate.mock.calls.map(([event]) => event.source)).toEqual([
			"array",
			"array",
			"array",
			"array",
		])
		expect(afterUpdate.mock.calls.map(([event]) => event.changes)).toEqual(
			beforeUpdate.mock.calls.map(([event]) => event.changes),
		)
	})

	it("reindexes touched and dirty row metadata by stable row key", () => {
		const form = createAccountStore()
		const originalKeys = contactKeys(form)

		form.blur("contacts.1.value")
		form.setValue("contacts.1.value", "changed@example.test")

		const changedBeforeMove =
			form.getSnapshot().metadata.arraysByPath.contacts.items[1]
		expect(changedBeforeMove).toMatchObject({
			key: originalKeys[1],
			index: 1,
			dirty: true,
			touched: true,
		})

		form.move("contacts", 1, 0)

		expect(form.getValues().contacts.map((contact) => contact.value)).toEqual([
			"changed@example.test",
			"ada@example.test",
		])
		expect(form.getSnapshot().metadata.arraysByPath.contacts.items).toEqual([
			expect.objectContaining({
				key: originalKeys[1],
				index: 0,
				dirty: true,
				touched: true,
			}),
			expect.objectContaining({
				key: originalKeys[0],
				index: 1,
				dirty: false,
				touched: false,
			}),
		])
	})

	it("keeps nested array descendants clean when a parent row moves first", () => {
		const form = createGroupStore()
		const originalMemberKey =
			form.getSnapshot().metadata.arraysByPath["groups.0.members"].items[0]?.key

		form.move("groups", 0, 1)

		const snapshot = form.getSnapshot()
		expect(snapshot.metadata.arraysByPath.groups.items).toEqual([
			expect.objectContaining({
				key: "groups:1",
				index: 0,
				dirty: false,
			}),
			expect.objectContaining({
				key: "groups:0",
				index: 1,
				dirty: false,
			}),
		])
		expect(snapshot.metadata.arraysByPath["groups.1.members"]).toMatchObject({
			dirty: false,
			items: [
				expect.objectContaining({
					key: originalMemberKey,
					index: 0,
					dirty: false,
				}),
			],
		})
		expect(
			snapshot.metadata.fieldsByPath["groups.1.members.0.name"].dirty,
		).toBe(false)
	})

	it("runs commands against nested concrete array paths and reindexes their row state", () => {
		const form = createGroupStore()
		const originalMemberKey =
			form.getSnapshot().metadata.arraysByPath["groups.0.members"].items[0]?.key

		form.append("groups.0.members", { name: "Grace" })

		expect(form.getValues().groups[0]?.members).toEqual([
			{ name: "Ada" },
			{ name: "Grace" },
		])
		const appendedMemberKey =
			form.getSnapshot().metadata.arraysByPath["groups.0.members"].items[1]?.key
		expect(appendedMemberKey).toBe("groups.0.members:1")

		form.move("groups", 0, 1)

		expect(form.getValues().groups.map((group) => group.name)).toEqual([
			"Docs",
			"Core",
		])
		expect(
			form
				.getSnapshot()
				.metadata.arraysByPath["groups.1.members"].items.map(
					(item) => item.key,
				),
		).toEqual([originalMemberKey, appendedMemberKey])

		form.remove("groups.1.members", 0)

		expect(form.getValues().groups[1]?.members).toEqual([{ name: "Grace" }])
	})

	it("discards array reindex metadata when beforeUpdate replaces an array command", () => {
		const form = createAccountStore({
			beforeUpdate: (event) =>
				event.source === "array"
					? [
							{
								type: "set",
								path: "profile.first",
								value: "Grace",
							},
						]
					: undefined,
		})
		const originalKeys = contactKeys(form)
		form.setErrors([
			{
				source: "manual",
				path: "contacts.1.value",
				message: "Keep this issue on the same row",
			},
		])

		form.remove("contacts", 0)

		expect(form.getValues()).toEqual({
			...defaultValues,
			profile: {
				first: "Grace",
			},
		})
		expect(contactKeys(form)).toEqual(originalKeys)
		expect(form.getSnapshot().errors.fields.get("contacts.1.value")).toEqual([
			expect.objectContaining({
				message: "Keep this issue on the same row",
			}),
		])
		expect(form.getSnapshot().errors.fields.has("contacts.0.value")).toBe(false)
	})

	it("reindexes manual issues and exposure by row key while removal drops them", () => {
		const form = createAccountStore()

		form.setErrors([
			{
				source: "manual",
				path: "contacts.1.value",
				message: "Review this contact",
			},
		])

		form.insert("contacts", 0, {
			value: "new@example.test",
			tags: [],
		})

		expect(form.getSnapshot().errors.fields.has("contacts.1.value")).toBe(false)
		expect(form.getSnapshot().errors.fields.get("contacts.2.value")).toEqual([
			expect.objectContaining({ message: "Review this contact" }),
		])
		expect(
			form.getSnapshot().displayErrors.fields.get("contacts.2.value"),
		).toEqual([expect.objectContaining({ message: "Review this contact" })])

		form.move("contacts", 2, 0)

		expect(form.getSnapshot().errors.fields.has("contacts.2.value")).toBe(false)
		expect(form.getSnapshot().errors.fields.get("contacts.0.value")).toEqual([
			expect.objectContaining({ message: "Review this contact" }),
		])
		expect(
			form.getSnapshot().displayErrors.fields.get("contacts.0.value"),
		).toEqual([expect.objectContaining({ message: "Review this contact" })])

		form.remove("contacts", 0)

		expect(form.getSnapshot().errors.fields.size).toBe(0)
		expect(form.getSnapshot().displayErrors.fields.size).toBe(0)
	})

	it("keeps reindexed issue state when array commands are batched", () => {
		const form = createAccountStore()

		form.setErrors([
			{
				source: "manual",
				path: "contacts.1.value",
				message: "Review this contact",
			},
			{
				source: "manual",
				path: "contacts.0.note",
				message: "Keep this note",
			},
		])

		form.batch(() => {
			form.move("contacts", 1, 0)
		})

		expect(form.getSnapshot().errors.fields.has("contacts.1.value")).toBe(false)
		expect(form.getSnapshot().errors.fields.has("contacts.0.note")).toBe(false)
		expect(form.getSnapshot().errors.fields.get("contacts.0.value")).toEqual([
			expect.objectContaining({ message: "Review this contact" }),
		])
		expect(form.getSnapshot().errors.fields.get("contacts.1.note")).toEqual([
			expect.objectContaining({ message: "Keep this note" }),
		])

		form.batch(() => {
			form.remove("contacts", 0)
		})

		expect(form.getSnapshot().errors.fields.has("contacts.0.value")).toBe(false)
		expect(form.getSnapshot().errors.fields.get("contacts.0.note")).toEqual([
			expect.objectContaining({ message: "Keep this note" }),
		])
	})

	it("keeps row metadata aligned when array commands follow batched replacement", () => {
		const form = createAccountStore()

		form.batch(() => {
			form.setValue("contacts", [
				{ value: "one@example.test", tags: [] },
				{ value: "two@example.test", tags: [] },
				{ value: "three@example.test", tags: [] },
			])
			form.append("contacts", { value: "four@example.test", tags: [] })
		})

		expect(contactKeys(form)).toHaveLength(4)

		form.move("contacts", 3, 0)

		expect(form.getValues().contacts.map((contact) => contact.value)).toEqual([
			"four@example.test",
			"one@example.test",
			"two@example.test",
			"three@example.test",
		])
		expect(contactKeys(form)).toHaveLength(4)
	})

	it("applies issue reindexing for identity-only batched array edits", () => {
		const form = createAccountStore()

		form.setErrors([
			{
				source: "manual",
				path: "contacts.0.value",
				message: "Manual stale row issue",
			},
			{
				source: "server",
				path: "contacts.0.value",
				message: "Server stale row issue",
			},
		])

		form.batch(() => {
			form.remove("contacts", 0)
			form.insert("contacts", 0, {
				...defaultValues.contacts[0],
				tags: [...defaultValues.contacts[0].tags],
			})
		})

		expect(form.getValues()).toEqual(defaultValues)
		expect(form.getSnapshot().errors.fields.size).toBe(0)
		expect(form.getSnapshot().displayErrors.fields.size).toBe(0)
	})

	it("clears server issues that overlap array edits without clearing manual issues", () => {
		const form = createAccountStore()

		form.setErrors([
			{
				source: "server",
				message: "Submission rejected",
			},
			{
				source: "server",
				path: "contacts.1.value",
				message: "Server contact issue",
			},
			{
				source: "server",
				path: "profile.first",
				message: "Server profile issue",
			},
			{
				source: "manual",
				path: "contacts.1.value",
				message: "Manual contact issue",
			},
		])

		form.setValue("profile.first", "Grace")

		expect(form.getSnapshot().errors.form).toEqual([])
		expect(
			form.getSnapshot().errors.fields.get("profile.first"),
		).toBeUndefined()
		expect(form.getSnapshot().errors.fields.get("contacts.1.value")).toEqual([
			expect.objectContaining({ message: "Server contact issue" }),
			expect.objectContaining({ message: "Manual contact issue" }),
		])

		form.move("contacts", 1, 0)

		expect(form.getSnapshot().errors.fields.get("contacts.0.value")).toEqual([
			expect.objectContaining({ message: "Manual contact issue" }),
		])
		expect(
			form
				.getSnapshot()
				.errors.fields.get("contacts.0.value")
				?.some((issue) => issue.source === "server"),
		).toBe(false)
	})

	it("rejects malformed paths, non-array targets, sparse indexes, and bad moves without side effects", () => {
		const beforeUpdate = vi.fn()
		const afterUpdate = vi.fn()
		const form = createAccountStore({ beforeUpdate, afterUpdate })
		const listener = vi.fn()
		form.subscribe((snapshot) => snapshot.values, listener)

		const commands = [
			() => form.append("contacts[0]" as never),
			() => form.append("profile.first" as never, { value: "x", tags: [] }),
			() => form.insert("contacts", -1, { value: "x", tags: [] }),
			() => form.insert("contacts", 3, { value: "x", tags: [] }),
			() => form.remove("contacts", 2),
			() => form.move("contacts", 2, 0),
			() => form.move("contacts", 0, 2),
		]

		for (const command of commands) {
			const snapshot = form.getSnapshot()
			const metadata = snapshot.metadata

			expect(command).toThrow()
			expect(form.getSnapshot()).toBe(snapshot)
			expect(form.getSnapshot().metadata).toBe(metadata)
			expect(form.getValues()).toEqual(defaultValues)
			expect(listener).not.toHaveBeenCalled()
			expect(beforeUpdate).not.toHaveBeenCalled()
			expect(afterUpdate).not.toHaveBeenCalled()
		}
	})

	it("matches random array command sequences against a value and key reference model", () => {
		type ModelValues = {
			profile: {
				first: string
			}
			contacts: Contact[]
		}
		type ModelState = {
			nextKeyIndex: number
			keys: string[]
			values: ModelValues
		}
		type RealState = {
			readonly form: FormStore<typeof schema>
		}

		function assertMatches(model: ModelState, real: RealState): void {
			expect(real.form.getValues()).toEqual(model.values)
			expect(contactKeys(real.form)).toEqual(model.keys)
		}

		class AppendCommand implements fc.Command<ModelState, RealState> {
			constructor(private readonly value: string) {}

			check = () => true

			run(model: ModelState, real: RealState): void {
				model.values.contacts.push({ value: this.value, tags: [] })
				model.keys.push(`contacts:${model.nextKeyIndex}`)
				model.nextKeyIndex += 1
				real.form.append("contacts", { value: this.value, tags: [] })
				assertMatches(model, real)
			}

			toString = () => `append ${JSON.stringify(this.value)}`
		}

		class InsertCommand implements fc.Command<ModelState, RealState> {
			constructor(
				private readonly index: number,
				private readonly value: string,
			) {}

			check = (model: ModelState) => this.index <= model.values.contacts.length

			run(model: ModelState, real: RealState): void {
				model.values.contacts.splice(this.index, 0, {
					value: this.value,
					tags: [],
				})
				model.keys.splice(this.index, 0, `contacts:${model.nextKeyIndex}`)
				model.nextKeyIndex += 1
				real.form.insert("contacts", this.index, {
					value: this.value,
					tags: [],
				})
				assertMatches(model, real)
			}

			toString = () => `insert ${this.index} ${JSON.stringify(this.value)}`
		}

		class RemoveCommand implements fc.Command<ModelState, RealState> {
			constructor(private readonly index: number) {}

			check = (model: ModelState) => this.index < model.values.contacts.length

			run(model: ModelState, real: RealState): void {
				model.values.contacts.splice(this.index, 1)
				model.keys.splice(this.index, 1)
				real.form.remove("contacts", this.index)
				assertMatches(model, real)
			}

			toString = () => `remove ${this.index}`
		}

		class MoveCommand implements fc.Command<ModelState, RealState> {
			constructor(
				private readonly from: number,
				private readonly to: number,
			) {}

			check = (model: ModelState) =>
				this.from < model.values.contacts.length &&
				this.to < model.values.contacts.length

			run(model: ModelState, real: RealState): void {
				const [contact] = model.values.contacts.splice(this.from, 1)
				const [key] = model.keys.splice(this.from, 1)
				if (contact === undefined || key === undefined) {
					throw new Error("Reference model removed a missing row")
				}
				model.values.contacts.splice(this.to, 0, contact)
				model.keys.splice(this.to, 0, key)
				real.form.move("contacts", this.from, this.to)
				assertMatches(model, real)
			}

			toString = () => `move ${this.from} to ${this.to}`
		}

		const shortString = fc.string({ maxLength: 4 })
		const index = fc.integer({ min: 0, max: 4 })

		fc.assert(
			fc.property(
				fc.commands(
					[
						shortString.map((value) => new AppendCommand(value)),
						fc
							.tuple(index, shortString)
							.map(([at, value]) => new InsertCommand(at, value)),
						index.map((at) => new RemoveCommand(at)),
						fc
							.tuple(index, index)
							.map(([from, to]) => new MoveCommand(from, to)),
					],
					{ maxCommands: 30 },
				),
				(commands) => {
					fc.modelRun(
						() => ({
							model: {
								nextKeyIndex: defaultValues.contacts.length,
								keys: ["contacts:0", "contacts:1"],
								values: {
									profile: {
										first: defaultValues.profile.first,
									},
									contacts: defaultValues.contacts.map((contact) => ({
										...contact,
										tags: [...contact.tags],
									})),
								},
							},
							real: {
								form: createFormStore({
									definition: createDefinition(),
									defaultValues: {
										contacts: defaultValues.contacts.map((contact) => ({
											...contact,
											tags: [...contact.tags],
										})),
										profile: {
											first: defaultValues.profile.first,
										},
									},
								}),
							},
						}),
						commands,
					)
				},
			),
		)
	})
})
