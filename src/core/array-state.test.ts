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

type AccountControls = {
	readonly text: ControlMetadata<string | undefined>
}

const schema = {} as StandardSchema<AccountValues>

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
		readonly onUpdate?: FormStoreOptions<typeof schema>["onUpdate"]
	} = {},
): FormStore<typeof schema> {
	return createFormStore({
		definition: createDefinition(options.createDefault),
		defaultValues,
		beforeUpdate: options.beforeUpdate,
		onUpdate: options.onUpdate,
	})
}

function contactKeys(form: FormStore<typeof schema>): readonly string[] {
	return form
		.getSnapshot()
		.metadata.arraysByPath.contacts.items.map((item) => item.key)
}

describe("array commands and row metadata", () => {
	it("appends, inserts, removes, and moves cloned rows while preserving stable keys", () => {
		const firstDefault = {
			value: "new@example.test",
			tags: ["generated"],
		}
		const createDefault = vi.fn(() => ({ ...firstDefault }))
		const beforeUpdate = vi.fn()
		const onUpdate = vi.fn()
		const first = createAccountStore({ createDefault, beforeUpdate, onUpdate })
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
		expect(onUpdate).toHaveBeenCalledTimes(4)
		expect(beforeUpdate.mock.calls.map(([event]) => event.source)).toEqual([
			"array",
			"array",
			"array",
			"array",
		])
		expect(onUpdate.mock.calls.map(([event]) => event.source)).toEqual([
			"array",
			"array",
			"array",
			"array",
		])
		expect(onUpdate.mock.calls.map(([event]) => event.changes)).toEqual(
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
		const onUpdate = vi.fn()
		const form = createAccountStore({ beforeUpdate, onUpdate })
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
			expect(onUpdate).not.toHaveBeenCalled()
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
