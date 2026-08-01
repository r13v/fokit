import type { FormEvent, RestoreOrigin } from "./form-events.js"
import type { FormDocument } from "./form-model.js"
import type {
	FormInput,
	FormOutput,
	StandardSchema,
} from "./standard-schema.js"
import type { ValidationResult } from "./validation.js"

export const FORM_FEATURE_PROTOCOL_VERSION = 1
export const formFeatureCapabilityKey = Symbol.for(
	"form-please.feature-capability",
)

export type FinalizedFormEventListener<Input, Context> = (
	notification: Readonly<{
		event: FormEvent<Input, Context>
		document: FormDocument<Input>
		changedPaths: readonly string[]
	}>,
) => void

export type FormFeatureCapability<
	Schema extends StandardSchema = StandardSchema,
	Context = unknown,
> = Readonly<{
	version: typeof FORM_FEATURE_PROTOCOL_VERSION
	getDocument(): FormDocument<FormInput<Schema>>
	restoreDocument(
		document: FormDocument<FormInput<Schema>>,
		origin: RestoreOrigin,
	): void
	installCleanBaseline(document: FormDocument<FormInput<Schema>>): void
	validateRestoredInput(
		input: FormInput<Schema>,
	): Promise<ValidationResult<FormOutput<Schema>>>
	advanceEventSequenceFloor(sequence: number): void
	subscribeFinalized(
		listener: FinalizedFormEventListener<FormInput<Schema>, Context>,
	): () => void
}>

type FeatureCapabilityHost = {
	readonly [formFeatureCapabilityKey]?: unknown
}

export function attachFormFeatureCapability(
	target: object,
	capability: FormFeatureCapability,
): void {
	Object.defineProperty(target, formFeatureCapabilityKey, {
		configurable: false,
		enumerable: false,
		writable: false,
		value: capability,
	})
}

export function getFormFeatureCapability<
	Schema extends StandardSchema,
	Context = unknown,
>(target: object): FormFeatureCapability<Schema, Context> {
	const candidate = (target as FeatureCapabilityHost)[formFeatureCapabilityKey]
	if (typeof candidate !== "object" || candidate === null) {
		throw new TypeError(
			"Form Please feature initialization requires a compatible Form Please form capability",
		)
	}

	const capability = candidate as Partial<FormFeatureCapability>
	if (capability.version !== FORM_FEATURE_PROTOCOL_VERSION) {
		throw new TypeError(
			`Incompatible Form Please feature protocol: expected version ${FORM_FEATURE_PROTOCOL_VERSION}, received ${String(capability.version)}`,
		)
	}
	for (const operation of [
		"getDocument",
		"restoreDocument",
		"installCleanBaseline",
		"validateRestoredInput",
		"advanceEventSequenceFloor",
		"subscribeFinalized",
	] as const) {
		if (typeof capability[operation] !== "function") {
			throw new TypeError(
				`Incompatible Form Please feature protocol version ${FORM_FEATURE_PROTOCOL_VERSION}: missing ${operation} operation`,
			)
		}
	}

	return capability as FormFeatureCapability<Schema, Context>
}
