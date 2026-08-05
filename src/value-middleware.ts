import {
	type Draft,
	enableMapSet,
	enablePatches,
	Immer,
	type Patch,
} from "immer"
import type { FieldValues } from "react-hook-form"

import type { ArrayFieldPath, DeepReadonly, FieldPath } from "./types.js"

enableMapSet()
enablePatches()

const valueImmer = new Immer({ autoFreeze: false })

/** One authoritative Immer operation in a proposed value update. */
export type ValuePatch = Readonly<
	Omit<Patch, "path" | "value"> & {
		/** Path segments understood by Immer rather than an RHF dot path. */
		readonly path: readonly (string | number)[]
		/** Replacement or added value when the operation carries one. */
		readonly value?: unknown
	}
>

/** A replacement value or the empty result of a mutating Immer recipe. */
// biome-ignore lint/suspicious/noConfusingVoidType: A mutating Immer recipe intentionally returns void.
type FormUpdateRecipeResult<Input> = Input | undefined | void

/** A synchronous Immer recipe used to derive one managed value update. */
export type FormUpdateRecipe<Input> = (
	draft: Draft<Input>,
) => FormUpdateRecipeResult<Input>

/** Identifies the managed operation that proposed a value transaction. */
export type ValueTransactionSource<Input extends FieldValues> =
	| {
			readonly type: "control"
			readonly path: FieldPath<Input>
	  }
	| {
			readonly type: "array"
			readonly path: ArrayFieldPath<Input>
			readonly action: "append"
			readonly index: number
	  }
	| {
			readonly type: "array"
			readonly path: ArrayFieldPath<Input>
			readonly action: "remove"
			readonly index: number
	  }
	| {
			readonly type: "array"
			readonly path: ArrayFieldPath<Input>
			readonly action: "move"
			readonly fromIndex: number
			readonly toIndex: number
	  }
	| {
			readonly type: "update"
	  }

/** A proposed managed value update passed through form middleware. */
export type ValueTransaction<Input extends FieldValues, Context = unknown> = {
	/** Values before the managed update began. */
	readonly previousValues: DeepReadonly<Input>
	/** Values derived by applying `patches` to `previousValues`. */
	readonly nextValues: DeepReadonly<Input>
	/** The authoritative operations used to derive `nextValues`. */
	readonly patches: readonly ValuePatch[]
	/** The generated or imperative operation that proposed the update. */
	readonly source: ValueTransactionSource<Input>
	/** Current application context for this form binding. */
	readonly context: DeepReadonly<Context>
}

/** Operations available while configuring middleware for one form. */
export type FormMiddlewareApi<Input extends FieldValues> = {
	/** Reads the current RHF values as a synchronous readonly view. */
	getValues(): DeepReadonly<Input>
	/** Starts a managed update when no transaction is currently active. */
	update(recipe: FormUpdateRecipe<Input>): unknown
}

/** Forwards authoritative patches to the next middleware or terminal. */
export type FormMiddlewareNext = (patches: readonly ValuePatch[]) => unknown

/** One synchronous Redux-shaped value middleware. */
export type FormMiddleware<Input extends FieldValues, Context = unknown> = (
	api: FormMiddlewareApi<Input>,
) => (
	next: FormMiddlewareNext,
) => (transaction: ValueTransaction<Input, Context>) => unknown

/** Applies a terminal transaction to the RHF-owned runtime. */
export type ValueTransactionCommit<Input extends FieldValues, Context> = (
	transaction: ValueTransaction<Input, Context>,
) => void

type CoordinatorOptions<Input extends FieldValues, Context> = {
	readonly middleware: readonly FormMiddleware<Input, Context>[]
	readonly getValues: () => Input
	readonly getContext: () => Context
	readonly commit: ValueTransactionCommit<Input, Context>
}

type ManagedDispatchOptions<Input extends FieldValues, Context> = {
	readonly commit?: ValueTransactionCommit<Input, Context>
	readonly arrayPath?: readonly (string | number)[]
}

/** Internal managed-update coordinator used by one form binding. */
export type ValueCoordinator<Input extends FieldValues, Context> = {
	/** Starts an imperative update with an `update` source. */
	update(recipe: FormUpdateRecipe<Input>): unknown
	/** Starts a generated control or array update. */
	dispatch(
		recipe: FormUpdateRecipe<Input>,
		source: ValueTransactionSource<Input>,
		options?: ManagedDispatchOptions<Input, Context>,
	): unknown
}

type TransactionDispatch<Input extends FieldValues, Context> = (
	transaction: ValueTransaction<Input, Context>,
) => unknown

type ActiveDispatch<Input extends FieldValues, Context> = {
	readonly commit: ValueTransactionCommit<Input, Context>
	readonly arrayStructure?: {
		readonly path: readonly (string | number)[]
		readonly patches: readonly ValuePatch[]
	}
}

/** Creates one fixed middleware chain around an RHF terminal. */
export function createValueCoordinator<
	Input extends FieldValues,
	Context = unknown,
>(
	options: CoordinatorOptions<Input, Context>,
): ValueCoordinator<Input, Context> {
	let activeDispatch: ActiveDispatch<Input, Context> | undefined
	let pipelineReady = false
	let pipeline: TransactionDispatch<Input, Context>

	const api: FormMiddlewareApi<Input> = {
		getValues: () => options.getValues() as DeepReadonly<Input>,
		update: (recipe) => dispatch(recipe, { type: "update" }),
	}

	const terminal: TransactionDispatch<Input, Context> = (transaction) => {
		if (activeDispatch === undefined) {
			throw new TypeError("Value middleware next called outside a transaction")
		}
		activeDispatch.commit(transaction)
		return transaction
	}

	pipeline = options.middleware.reduceRight<
		TransactionDispatch<Input, Context>
	>((nextDispatch, middleware, index) => {
		let frame:
			| {
					called: boolean
					open: boolean
					readonly transaction: ValueTransaction<Input, Context>
			  }
			| undefined
		const configured = middleware(api)
		const handle = configured((patches) => {
			if (frame === undefined || !frame.open) {
				throw new TypeError(
					`Value middleware ${index} must call next synchronously`,
				)
			}
			if (frame.called) {
				throw new TypeError(
					`Value middleware ${index} cannot call next more than once`,
				)
			}
			frame.called = true
			const replacement = createTransaction(
				frame.transaction.previousValues as Input,
				patches,
				frame.transaction.source,
				frame.transaction.context as Context,
			)
			assertActiveArrayStructure(replacement.patches, activeDispatch)
			return nextDispatch(replacement)
		})
		return (transaction) => {
			if (frame !== undefined) {
				throw new TypeError(
					`Value middleware ${index} cannot dispatch recursively`,
				)
			}
			frame = { called: false, open: true, transaction }
			try {
				return handle(transaction)
			} finally {
				frame.open = false
				frame = undefined
			}
		}
	}, terminal)
	pipelineReady = true

	function dispatch(
		recipe: FormUpdateRecipe<Input>,
		source: ValueTransactionSource<Input>,
		dispatchOptions: ManagedDispatchOptions<Input, Context> = {},
	): unknown {
		if (!pipelineReady) {
			throw new TypeError(
				"Form middleware cannot update values while the pipeline initializes",
			)
		}
		if (activeDispatch !== undefined) {
			throw new TypeError(
				"Form middleware cannot start a nested value transaction",
			)
		}
		const previousValues = options.getValues()
		const [, producedPatches] = valueImmer.produceWithPatches(
			previousValues,
			// biome-ignore lint/suspicious/noConfusingVoidType: The public mutating recipe intentionally returns void.
			(draft) => recipe(draft) as Draft<Input> | undefined | void,
		)
		if (producedPatches.length === 0) return undefined

		const patches = producedPatches as readonly ValuePatch[]
		const transaction = createTransaction(
			previousValues,
			patches,
			source,
			options.getContext(),
		)
		const arrayStructure =
			dispatchOptions.arrayPath === undefined
				? undefined
				: {
						path: dispatchOptions.arrayPath,
						patches: structuralArrayPatches(patches, dispatchOptions.arrayPath),
					}
		activeDispatch = {
			commit: dispatchOptions.commit ?? options.commit,
			...(arrayStructure === undefined ? {} : { arrayStructure }),
		}
		try {
			return pipeline(transaction)
		} finally {
			activeDispatch = undefined
		}
	}

	return {
		dispatch,
		update: (recipe) => dispatch(recipe, { type: "update" }),
	}
}

/** Creates a consistent immutable-view transaction from authoritative patches. */
function createTransaction<Input extends FieldValues, Context>(
	previousValues: Input,
	patches: readonly ValuePatch[],
	source: ValueTransactionSource<Input>,
	context: Context,
): ValueTransaction<Input, Context> {
	const nextValues = valueImmer.applyPatches(
		previousValues,
		patches as readonly Patch[],
	)
	assertNoTopLevelRemoval(previousValues, nextValues, patches)
	return {
		context: context as DeepReadonly<Context>,
		nextValues: nextValues as DeepReadonly<Input>,
		patches,
		previousValues: previousValues as DeepReadonly<Input>,
		source,
	}
}

/** Rejects a value shape that RHF `setValues` cannot represent exactly. */
function assertNoTopLevelRemoval(
	previousValues: FieldValues,
	nextValues: FieldValues,
	patches: readonly ValuePatch[],
): void {
	const removesTopLevel = patches.some(
		(patch) => patch.op === "remove" && patch.path.length === 1,
	)
	const omitsPreviousKey = Object.keys(previousValues).some(
		(key) => !Object.hasOwn(nextValues, key),
	)
	if (removesTopLevel || omitsPreviousKey) {
		throw new TypeError(
			"Managed updates cannot remove a top-level form value; assign undefined instead",
		)
	}
}

/** Keeps an array action's length and ordering patches unchanged. */
function assertActiveArrayStructure<Input extends FieldValues, Context>(
	patches: readonly ValuePatch[],
	active: ActiveDispatch<Input, Context> | undefined,
): void {
	if (active?.arrayStructure === undefined) return
	const actual = structuralArrayPatches(patches, active.arrayStructure.path)
	const expected = active.arrayStructure.patches
	if (
		actual.length !== expected.length ||
		actual.some((patch, index) => !samePatch(patch, expected[index]))
	) {
		throw new TypeError(
			"Array middleware cannot change length or order beyond the source action",
		)
	}
}

/** Selects patches that can replace an array or its direct row ordering. */
function structuralArrayPatches(
	patches: readonly ValuePatch[],
	arrayPath: readonly (string | number)[],
): readonly ValuePatch[] {
	return patches.filter((patch) => {
		const sharedLength = Math.min(patch.path.length, arrayPath.length)
		for (let index = 0; index < sharedLength; index += 1) {
			if (patch.path[index] !== arrayPath[index]) return false
		}
		return (
			patch.path.length <= arrayPath.length ||
			patch.path.length === arrayPath.length + 1
		)
	})
}

/** Compares structural patches without cloning their potentially opaque values. */
function samePatch(left: ValuePatch, right: ValuePatch | undefined): boolean {
	if (
		right === undefined ||
		left.op !== right.op ||
		left.path.length !== right.path.length ||
		!Object.is(left.value, right.value)
	) {
		return false
	}
	return left.path.every((segment, index) => segment === right.path[index])
}
