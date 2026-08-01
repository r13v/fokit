import { describe, expect, it, vi } from "vitest"
import { normalizeDefinition } from "./definition.js"
import {
	FORM_FEATURE_PROTOCOL_VERSION,
	type FormFeatureCapability,
	formFeatureCapabilityKey,
	getFormFeatureCapability,
} from "./feature-protocol.js"
import {
	createFormStoreWithMiddleware,
	getFormStoreDocument,
} from "./form-store.js"
import type { AnyFormMiddleware, FormMiddleware } from "./middleware.js"
import type { StandardSchema } from "./standard-schema.js"

type Values = { name: string; items: { name: string }[] }
type Context = { locale: string }

const schema = {
	"~standard": {
		version: 1,
		vendor: "feature-protocol-test",
		validate: vi.fn((value: Values) => ({ value })),
	},
} as StandardSchema<Values>

const definition = normalizeDefinition({
	schema,
	controls: {},
	ui: [],
})

function createStore(middleware: readonly FormMiddleware<Values, Context>[]) {
	return createFormStoreWithMiddleware(
		{
			definition,
			defaultValues: { name: "Ada", items: [] },
			context: { locale: "en" },
		},
		middleware as readonly AnyFormMiddleware[],
	)
}

describe("feature capability protocol", () => {
	it("validates the stable structural capability and version without class identity", () => {
		const operations = {
			getDocument: vi.fn(),
			restoreDocument: vi.fn(),
			installCleanBaseline: vi.fn(),
			validateRestoredInput: vi.fn(),
			advanceEventSequenceFloor: vi.fn(),
			subscribeFinalized: vi.fn(),
		}
		const host = {
			[Symbol.for("form-please.feature-capability")]: {
				version: FORM_FEATURE_PROTOCOL_VERSION,
				...operations,
			},
		}

		expect(formFeatureCapabilityKey).toBe(
			Symbol.for("form-please.feature-capability"),
		)
		expect(getFormFeatureCapability(host).getDocument).toBe(
			operations.getDocument,
		)
		expect(() =>
			getFormFeatureCapability({
				[formFeatureCapabilityKey]: {
					...host[formFeatureCapabilityKey],
					version: 2,
				},
			}),
		).toThrow(/expected version 1, received 2/i)
		expect(() =>
			getFormFeatureCapability({
				[formFeatureCapabilityKey]: {
					...host[formFeatureCapabilityKey],
					restoreDocument: undefined,
				},
			}),
		).toThrow(/missing restoreDocument operation/i)
	})

	it("exposes document, restore, schema validation, baseline, and sequence operations", async () => {
		let capability: FormFeatureCapability<typeof schema, Context> | undefined
		const notifications: { type: string; sequence: number }[] = []
		const feature: FormMiddleware<Values, Context> = (api) => {
			capability = getFormFeatureCapability<typeof schema, Context>(api)
			capability.subscribeFinalized(({ event, document }) => {
				notifications.push({ type: event.type, sequence: event.sequence })
				if (event.type === "document/restored" && event.origin === "hydrate") {
					capability?.installCleanBaseline(document)
				}
			})
			return (next) => (transaction) => next(transaction)
		}
		const form = createStore([feature])
		const protocol = capability as unknown as FormFeatureCapability<
			typeof schema,
			Context
		>
		const initial = protocol.getDocument()

		form.setValue("name", "Grace")
		expect(form.getSnapshot().isDirty).toBe(true)
		protocol.restoreDocument(initial, "hydrate")
		expect(form.getSnapshot().values.name).toBe("Ada")
		expect(form.getSnapshot().isDirty).toBe(false)

		await expect(
			protocol.validateRestoredInput({ name: "Lin", items: [] }),
		).resolves.toEqual({
			success: true,
			value: { name: "Lin", items: [] },
		})

		const documentBeforeFloor = getFormStoreDocument(form)
		protocol.advanceEventSequenceFloor(50)
		expect(getFormStoreDocument(form)).toBe(documentBeforeFloor)
		form.setValue("name", "Lin")
		expect(notifications.at(-1)).toEqual({
			type: "document/committed",
			sequence: 51,
		})
	})

	it.each(["before", "after"] as const)(
		"notifies a %s feature exactly once when another middleware throws after commit",
		(position) => {
			const finalized = vi.fn()
			const feature: FormMiddleware<Values, Context> = (api) => {
				getFormFeatureCapability<typeof schema, Context>(
					api,
				).subscribeFinalized(finalized)
				return (next) => (transaction) => next(transaction)
			}
			const throwing: FormMiddleware<Values, Context> =
				() => (next) => (transaction) => {
					next(transaction)
					throw new Error("post-commit")
				}
			const form = createStore(
				position === "before" ? [feature, throwing] : [throwing, feature],
			)

			expect(() => form.setValue("name", "Grace")).toThrow("post-commit")
			expect(finalized).toHaveBeenCalledOnce()
			expect(finalized.mock.calls[0]?.[0].event.type).toBe("document/committed")
		},
	)
})
