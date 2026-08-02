import type { FormEvent, RestoreOrigin } from "./form-events.js"
import type { FormDocument } from "./form-model.js"
import type { FormDispatchResult } from "./form-transactions.js"
import type {
	FormInput,
	FormOutput,
	StandardSchema,
} from "./standard-schema.js"
import type { ValidationResult } from "./validation.js"

export const FORM_FEATURE_PROTOCOL_VERSION = 1
export const MAX_EVENT_SEQUENCE_FLOOR = Math.floor(Number.MAX_SAFE_INTEGER / 2)
export const formFeatureCapabilityKey = Symbol.for(
	"form-please.feature-capability",
)
export const formBindingFinalizer = Symbol.for(
	"form-please.form-binding-finalizer",
)
const formFeatureMetadataKey = Symbol.for("form-please.feature-metadata")

export type FormBindingFinalizingMiddleware = object & {
	readonly [formBindingFinalizer]?: (form: object) => void
}

type FirstPartyFeatureKind = "devtools" | "history" | "persistence"

export type FormFeatureMetadata = Readonly<{
	kind: FirstPartyFeatureKind
	feature: object
	dependencies?: readonly Readonly<{
		kind: FirstPartyFeatureKind
		feature: object
	}>[]
}>

export type FinalizedFormEventListener<Input, Context> = (
	notification: Readonly<{
		event: FormEvent<Input, Context>
		document: FormDocument<Input>
		changedPaths: readonly string[]
	}>,
) => void

export type FormRestoreFinalizer<Input, Context> = (
	notification: Readonly<{
		event: FormEvent<Input, Context>
		document: FormDocument<Input>
	}>,
) => void

export type FormFeatureCapability<
	Schema extends StandardSchema = StandardSchema,
	Context = unknown,
> = Readonly<{
	version: typeof FORM_FEATURE_PROTOCOL_VERSION
	getDocument(): FormDocument<FormInput<Schema>>
	validateDocument(document: FormDocument<FormInput<Schema>>): void
	restoreDocument(
		document: FormDocument<FormInput<Schema>>,
		origin: RestoreOrigin,
		history?: "skip" | "record",
		onFinalize?: FormRestoreFinalizer<FormInput<Schema>, Context>,
	): FormDispatchResult<FormInput<Schema>, Context>
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

type FeatureMetadataHost = {
	readonly [formFeatureMetadataKey]?: unknown
}

export function attachFormFeatureMetadata(
	target: object,
	metadata: FormFeatureMetadata,
): void {
	Object.defineProperty(target, formFeatureMetadataKey, {
		configurable: false,
		enumerable: false,
		writable: false,
		value: Object.freeze({
			...metadata,
			dependencies: Object.freeze(
				(metadata.dependencies ?? []).map((dependency) =>
					Object.freeze({ ...dependency }),
				),
			),
		}),
	})
}

export function assertFirstPartyFeatureConfiguration(
	middleware: readonly object[],
): void {
	const configured = new Map<FirstPartyFeatureKind, FormFeatureMetadata>()
	const references = new Set(middleware)
	for (const entry of middleware) {
		const metadata = (entry as FeatureMetadataHost)[formFeatureMetadataKey]
		if (metadata === undefined) continue
		if (!isFormFeatureMetadata(metadata) || metadata.feature !== entry) {
			throw new TypeError("Invalid Form Please first-party feature metadata")
		}
		if (configured.has(metadata.kind)) {
			throw new TypeError(
				`A form may configure at most one Form Please ${metadata.kind} feature`,
			)
		}
		for (const dependency of metadata.dependencies ?? []) {
			const dependencyMetadata = (dependency.feature as FeatureMetadataHost)[
				formFeatureMetadataKey
			]
			if (
				!references.has(dependency.feature) ||
				!isFormFeatureMetadata(dependencyMetadata) ||
				dependencyMetadata.feature !== dependency.feature ||
				dependencyMetadata.kind !== dependency.kind
			) {
				throw new TypeError(
					`Form Please ${metadata.kind} requires its configured ${dependency.kind} feature dependency in the same middleware chain`,
				)
			}
		}
		configured.set(metadata.kind, metadata)
	}
}

function isFormFeatureMetadata(value: unknown): value is FormFeatureMetadata {
	if (typeof value !== "object" || value === null) return false
	const candidate = value as Partial<FormFeatureMetadata>
	return (
		(candidate.kind === "history" ||
			candidate.kind === "persistence" ||
			candidate.kind === "devtools") &&
		typeof candidate.feature === "function" &&
		(candidate.dependencies === undefined ||
			(Array.isArray(candidate.dependencies) &&
				candidate.dependencies.every(isFormFeatureDependency)))
	)
}

function isFormFeatureDependency(value: unknown): boolean {
	if (typeof value !== "object" || value === null) return false
	const candidate = value as {
		readonly kind?: unknown
		readonly feature?: unknown
	}
	return (
		(candidate.kind === "history" ||
			candidate.kind === "persistence" ||
			candidate.kind === "devtools") &&
		typeof candidate.feature === "function"
	)
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
		"validateDocument",
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
