import fc from "fast-check"
import { describe, expect, it, vi } from "vitest"

import type {
	ControlMetadata,
	FormStore,
	FormStoreOptions,
	StandardSchema,
	UiNode,
} from "./index.js"
import {
	createFormStore,
	extendValueChanges,
	normalizeDefinition,
} from "./index.js"

type AccountValues = {
	kind: "person" | "company"
	workflowStage: "draft" | "ready"
	profile: {
		first: string
		last: string
		middle?: string
	}
	companyName?: string
	contacts: {
		value: string
		note?: string
	}[]
}

type AccountContext = {
	readonly region: string
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
	workflowStage: "draft",
	profile: {
		first: "Ada",
		last: "Lovelace",
		middle: "Byron",
	},
	companyName: "Analytical Engines Ltd",
	contacts: [{ value: "ada@example.test", note: "work" }],
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
				path: "profile.first",
				control: "text",
			},
			{
				kind: "field",
				path: "profile.last",
				control: "text",
			},
			{
				kind: "field",
				path: "profile.middle",
				control: "text",
			},
			{
				kind: "field",
				path: "companyName",
				control: "text",
			},
			{
				kind: "array",
				path: "contacts",
				itemDefault: {
					value: "",
				},
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
		] satisfies readonly UiNode<
			AccountValues,
			AccountControls,
			AccountContext
		>[],
	})
}

function createAccountStore(
	options: {
		readonly beforeUpdate?: FormStoreOptions<
			typeof schema,
			AccountContext
		>["beforeUpdate"]
		readonly onUpdate?: FormStoreOptions<
			typeof schema,
			AccountContext
		>["onUpdate"]
	} = {},
): FormStore<typeof schema, AccountContext> {
	return createFormStore({
		definition: createDefinition(),
		defaultValues,
		context: {
			region: "EU",
		},
		beforeUpdate: options.beforeUpdate,
		onUpdate: options.onUpdate,
	})
}

describe("form value transactions", () => {
	it("commits setValue, deep setValues, and optional unsetValue atomically", () => {
		const form = createAccountStore()
		const valuesListener = vi.fn()
		form.subscribe((snapshot) => snapshot.values, valuesListener)
		const initial = form.getSnapshot()

		form.setValue("profile.first", "Grace")

		expect(form.getValues()).toEqual({
			...defaultValues,
			profile: {
				first: "Grace",
				last: "Lovelace",
				middle: "Byron",
			},
		})
		expect(form.getSnapshot().values.profile).not.toBe(initial.values.profile)
		expect(form.getSnapshot().values.contacts).toEqual(initial.values.contacts)
		expect(form.getSnapshot().isDirty).toBe(true)
		expect(
			form.getSnapshot().metadata.fieldsByPath["profile.first"].dirty,
		).toBe(true)
		expect(form.getSnapshot().metadata.fieldsByPath["profile.last"].dirty).toBe(
			false,
		)
		expect(valuesListener).toHaveBeenCalledTimes(1)

		form.setValues({
			profile: {
				last: "Hopper",
			},
			contacts: [{ value: "grace@example.test", note: "personal" }],
		})

		expect(form.getValues()).toEqual({
			kind: "company",
			workflowStage: "draft",
			profile: {
				first: "Grace",
				last: "Hopper",
				middle: "Byron",
			},
			companyName: "Analytical Engines Ltd",
			contacts: [{ value: "grace@example.test", note: "personal" }],
		})

		form.unsetValue("companyName")

		expect(form.getValues()).toEqual({
			kind: "company",
			workflowStage: "draft",
			profile: {
				first: "Grace",
				last: "Hopper",
				middle: "Byron",
			},
			contacts: [{ value: "grace@example.test", note: "personal" }],
		})
		expect(Object.isFrozen(form.getValues())).toBe(true)
		expect(Object.isFrozen(form.getValues().profile)).toBe(true)
		expect(Object.isFrozen(form.getValues().contacts)).toBe(true)
		expect(valuesListener).toHaveBeenCalledTimes(3)
	})

	it("applies batched commands in order so the last overlapping write wins", () => {
		const beforeUpdate = vi.fn()
		const onUpdate = vi.fn()
		const form = createAccountStore({ beforeUpdate, onUpdate })

		form.batch(() => {
			form.setValue("profile.first", "Grace")
			form.setValue("profile", {
				first: "Ada",
				last: "King",
				middle: "Countess",
			})
			form.unsetValue("profile.middle")
			form.setValue("profile.last", "Byron")
		})

		expect(form.getValues().profile).toEqual({
			first: "Ada",
			last: "Byron",
		})
		expect(beforeUpdate).toHaveBeenCalledTimes(1)
		expect(onUpdate).toHaveBeenCalledTimes(1)
		expect(beforeUpdate.mock.calls[0]?.[0].changes).toEqual([
			{
				type: "set",
				path: "profile",
				value: {
					first: "Ada",
					last: "King",
					middle: "Countess",
				},
			},
			{
				type: "unset",
				path: "profile.middle",
			},
			{
				type: "set",
				path: "profile.last",
				value: "Byron",
			},
		])
		expect(onUpdate.mock.calls[0]?.[0].changes).toEqual(
			beforeUpdate.mock.calls[0]?.[0].changes,
		)
		expect(onUpdate.mock.calls[0]?.[0].previousValues.profile).toEqual(
			defaultValues.profile,
		)
		expect(onUpdate.mock.calls[0]?.[0].source).toBe("imperative")
	})

	it("skips no-op transactions without notifying subscribers or hooks", () => {
		const beforeUpdate = vi.fn()
		const onUpdate = vi.fn()
		const form = createAccountStore({ beforeUpdate, onUpdate })
		const listener = vi.fn()
		const snapshot = form.getSnapshot()
		form.subscribe((next) => next.values, listener)

		form.setValue("profile.first", "Ada")
		form.setValues({ profile: { first: "Ada" } })
		form.batch(() => {
			form.setValue("profile.first", "Grace")
			form.setValue("profile.first", "Ada")
			form.unsetValue("profile.nickname" as never)
		})

		expect(form.getSnapshot()).toBe(snapshot)
		expect(listener).not.toHaveBeenCalled()
		expect(beforeUpdate).not.toHaveBeenCalled()
		expect(onUpdate).not.toHaveBeenCalled()
	})

	it("lets beforeUpdate accept, cancel, or replace the proposed transaction", () => {
		const accepted = createAccountStore({
			beforeUpdate: (event) => {
				expect(event.currentValues.profile.first).toBe("Ada")
				expect(event.nextValues.profile.first).toBe("Grace")
				expect(event.context).toEqual({ region: "EU" })
				expect(() => {
					;(event.nextValues as AccountValues).kind = "person"
				}).toThrow(TypeError)
				return undefined
			},
		})

		accepted.setValue("profile.first", "Grace")
		expect(accepted.getValues().profile.first).toBe("Grace")

		const cancelledOnUpdate = vi.fn()
		const cancelled = createAccountStore({
			beforeUpdate: () => false,
			onUpdate: cancelledOnUpdate,
		})

		cancelled.setValue("profile.first", "Grace")
		expect(cancelled.getValues()).toEqual(defaultValues)
		expect(cancelledOnUpdate).not.toHaveBeenCalled()

		const replaced = createAccountStore({
			beforeUpdate: () => [
				{
					type: "set",
					path: "profile.last",
					value: "Hamilton",
				},
			],
		})

		replaced.setValue("profile.first", "Grace")
		expect(replaced.getValues().profile).toEqual({
			first: "Ada",
			last: "Hamilton",
			middle: "Byron",
		})

		const schemaPathReplacement = createAccountStore({
			beforeUpdate: () => [
				{
					type: "set",
					path: "workflowStage",
					value: "ready",
				},
			],
		})

		schemaPathReplacement.setValue("profile.first", "Grace")
		expect(schemaPathReplacement.getValues()).toEqual({
			...defaultValues,
			workflowStage: "ready",
		})
	})

	it("extends proposed changes without rebuilding the initiating transaction", () => {
		const form = createAccountStore({
			beforeUpdate: (event) =>
				extendValueChanges(event, [
					{
						type: "set",
						path: "workflowStage",
						value: "ready",
					},
				]),
		})

		form.setValue("profile.first", "Grace")

		expect(form.getValues()).toEqual({
			...defaultValues,
			workflowStage: "ready",
			profile: {
				...defaultValues.profile,
				first: "Grace",
			},
		})
		expect(extendValueChanges({ changes: [] }, [])).toBeUndefined()
	})

	it("rejects nested commands during beforeUpdate and preserves thrown-hook semantics", () => {
		let nestedForm: FormStore<typeof schema, AccountContext>
		nestedForm = createAccountStore({
			beforeUpdate: () => {
				nestedForm.setValue("profile.last", "Hopper")
				return undefined
			},
		})

		expect(() => nestedForm.setValue("profile.first", "Grace")).toThrow(
			/beforeUpdate/i,
		)
		expect(nestedForm.getValues()).toEqual(defaultValues)

		const beforeThrows = createAccountStore({
			beforeUpdate: () => {
				throw new Error("stop before commit")
			},
		})

		expect(() => beforeThrows.setValue("profile.first", "Grace")).toThrow(
			"stop before commit",
		)
		expect(beforeThrows.getValues()).toEqual(defaultValues)

		const afterThrows = createAccountStore({
			onUpdate: () => {
				throw new Error("after commit")
			},
		})

		expect(() => afterThrows.setValue("profile.first", "Grace")).toThrow(
			"after commit",
		)
		expect(afterThrows.getValues().profile.first).toBe("Grace")
	})

	it("allows onUpdate follow-up transactions without merging them into the original commit", () => {
		let form: FormStore<typeof schema, AccountContext>
		const events: string[][] = []
		form = createAccountStore({
			onUpdate: (event) => {
				events.push(event.changes.map((change) => change.path))
				if (event.changes.some((change) => change.path === "profile.first")) {
					form.setValue("profile.last", "Hopper")
				}
			},
		})

		form.setValue("profile.first", "Grace")

		expect(form.getValues().profile).toEqual({
			first: "Grace",
			last: "Hopper",
			middle: "Byron",
		})
		expect(events).toEqual([["profile.first"], ["profile.last"]])
	})

	it("commits nested batches as one transaction and aborts uncommitted work on errors", () => {
		const beforeUpdate = vi.fn()
		const onUpdate = vi.fn()
		const form = createAccountStore({ beforeUpdate, onUpdate })

		form.batch(() => {
			form.setValue("profile.first", "Grace")
			form.batch(() => {
				form.setValue("profile.last", "Hopper")
			})
			form.unsetValue("profile.middle")
		})

		expect(form.getValues().profile).toEqual({
			first: "Grace",
			last: "Hopper",
		})
		expect(beforeUpdate).toHaveBeenCalledTimes(1)
		expect(onUpdate).toHaveBeenCalledTimes(1)

		const callbackThrows = createAccountStore()
		expect(() =>
			callbackThrows.batch(() => {
				callbackThrows.setValue("profile.first", "Grace")
				throw new Error("abort batch")
			}),
		).toThrow("abort batch")
		expect(callbackThrows.getValues()).toEqual(defaultValues)

		const commandThrows = createAccountStore()
		expect(() =>
			commandThrows.batch(() => {
				commandThrows.setValue("profile.first", "Grace")
				commandThrows.setValue("contacts.2.value", "missing")
			}),
		).toThrow(/array/i)
		expect(commandThrows.getValues()).toEqual(defaultValues)
	})

	it("rejects numeric-looking setValues patch keys without side effects", () => {
		const form = createAccountStore()

		expect(() =>
			form.setValues({
				contacts: {
					"1e3": {
						value: "ada@example.test",
					},
				},
			} as never),
		).toThrow(/index/)
		expect(form.getValues()).toEqual(defaultValues)
	})

	it("matches random set, unset, and batch sequences against a reference model", () => {
		type ModelValues = {
			first: string
			last: string
			note?: string
		}
		type ModelStore = {
			readonly form: FormStore<StandardSchema<ModelValues>>
		}

		const modelSchema = {} as StandardSchema<ModelValues>
		const modelControls = {
			text: {
				formData: {
					mode: "native",
				},
			},
		} satisfies {
			readonly text: ControlMetadata<string | undefined>
		}
		const definition = normalizeDefinition({
			schema: modelSchema,
			controls: modelControls,
			ui: [
				{ kind: "field", path: "first", control: "text" },
				{ kind: "field", path: "last", control: "text" },
				{ kind: "field", path: "note", control: "text" },
			] satisfies readonly UiNode<ModelValues, typeof modelControls>[],
		})

		function assertMatches(model: ModelValues, real: ModelStore): void {
			expect(real.form.getValues()).toEqual(model)
		}

		class SetFirstCommand implements fc.Command<ModelValues, ModelStore> {
			constructor(private readonly value: string) {}

			check = () => true

			run(model: ModelValues, real: ModelStore): void {
				model.first = this.value
				real.form.setValue("first", this.value)
				assertMatches(model, real)
			}

			toString = () => `set first to ${JSON.stringify(this.value)}`
		}

		class SetLastCommand implements fc.Command<ModelValues, ModelStore> {
			constructor(private readonly value: string) {}

			check = () => true

			run(model: ModelValues, real: ModelStore): void {
				model.last = this.value
				real.form.setValue("last", this.value)
				assertMatches(model, real)
			}

			toString = () => `set last to ${JSON.stringify(this.value)}`
		}

		class SetNoteCommand implements fc.Command<ModelValues, ModelStore> {
			constructor(private readonly value: string) {}

			check = () => true

			run(model: ModelValues, real: ModelStore): void {
				model.note = this.value
				real.form.setValue("note", this.value)
				assertMatches(model, real)
			}

			toString = () => `set note to ${JSON.stringify(this.value)}`
		}

		class UnsetNoteCommand implements fc.Command<ModelValues, ModelStore> {
			check = () => true

			run(model: ModelValues, real: ModelStore): void {
				delete model.note
				real.form.unsetValue("note")
				assertMatches(model, real)
			}

			toString = () => "unset note"
		}

		class BatchCommand implements fc.Command<ModelValues, ModelStore> {
			constructor(
				private readonly first: string,
				private readonly last: string,
				private readonly note: string | undefined,
			) {}

			check = () => true

			run(model: ModelValues, real: ModelStore): void {
				model.first = this.first
				model.last = this.last
				if (this.note === undefined) {
					delete model.note
				} else {
					model.note = this.note
				}
				real.form.batch(() => {
					real.form.setValue("first", this.first)
					real.form.setValue("last", this.last)
					if (this.note === undefined) {
						real.form.unsetValue("note")
					} else {
						real.form.setValue("note", this.note)
					}
				})
				assertMatches(model, real)
			}

			toString = () =>
				`batch ${JSON.stringify({
					first: this.first,
					last: this.last,
					note: this.note,
				})}`
		}

		const shortString = fc.string({ maxLength: 4 })

		fc.assert(
			fc.property(
				fc.commands(
					[
						shortString.map((value) => new SetFirstCommand(value)),
						shortString.map((value) => new SetLastCommand(value)),
						shortString.map((value) => new SetNoteCommand(value)),
						fc.constant(new UnsetNoteCommand()),
						fc
							.tuple(shortString, shortString, fc.option(shortString))
							.map(
								([first, last, note]) =>
									new BatchCommand(first, last, note ?? undefined),
							),
					],
					{ maxCommands: 40 },
				),
				(commands) => {
					const initialValues: ModelValues = {
						first: "Ada",
						last: "Lovelace",
					}
					fc.modelRun(
						() => ({
							model: { ...initialValues },
							real: {
								form: createFormStore({
									definition,
									defaultValues: initialValues,
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
