import type {
	UiResolver,
	UiResolverDetails,
	UiResolverValues,
} from "./ui-types.js"

export type ResourceState<Value, Error = unknown> =
	| {
			readonly status: "pending"
	  }
	| {
			readonly status: "success"
			readonly value: Value
	  }
	| {
			readonly status: "error"
			readonly error: Error
	  }

type AnyResourceState = ResourceState<unknown, unknown>
type ResourceStatus = AnyResourceState["status"]
type ResourceBranch<
	Resource extends AnyResourceState,
	Status extends ResourceStatus,
> = Extract<Resource, { readonly status: Status }>

type ResourceCases<
	Resource extends AnyResourceState,
	PendingResult,
	SuccessResult,
	ErrorResult,
	Arguments extends readonly unknown[],
> = {
	readonly pending: (
		state: ResourceBranch<Resource, "pending">,
		...args: Arguments
	) => PendingResult
	readonly success: (
		state: ResourceBranch<Resource, "success">,
		...args: Arguments
	) => SuccessResult
	readonly error: (
		state: ResourceBranch<Resource, "error">,
		...args: Arguments
	) => ErrorResult
}

export function matchResource<
	Resource extends AnyResourceState,
	const PendingResult,
	const SuccessResult,
	const ErrorResult,
>(
	resource: Resource,
	cases: ResourceCases<
		Resource,
		PendingResult,
		SuccessResult,
		ErrorResult,
		readonly []
	>,
): PendingResult | SuccessResult | ErrorResult {
	return matchResourceWithArguments(resource, cases, [])
}

export function fromResource<
	Resource extends AnyResourceState,
	Input,
	Context,
	const PendingResult,
	const SuccessResult,
	const ErrorResult,
>(
	select: UiResolver<Resource, Input, Context>,
	cases: ResourceCases<
		Resource,
		PendingResult,
		SuccessResult,
		ErrorResult,
		readonly [UiResolverValues<Input>, UiResolverDetails<Context>]
	>,
): UiResolver<PendingResult | SuccessResult | ErrorResult, Input, Context> {
	return (values, details) =>
		matchResourceWithArguments(select(values, details), cases, [
			values,
			details,
		])
}

function matchResourceWithArguments<
	Resource extends AnyResourceState,
	PendingResult,
	SuccessResult,
	ErrorResult,
	Arguments extends readonly unknown[],
>(
	resource: Resource,
	cases: ResourceCases<
		Resource,
		PendingResult,
		SuccessResult,
		ErrorResult,
		Arguments
	>,
	args: Arguments,
): PendingResult | SuccessResult | ErrorResult {
	switch (resource.status) {
		case "pending":
			return cases.pending(
				resource as ResourceBranch<Resource, "pending">,
				...args,
			)
		case "success":
			return cases.success(
				resource as ResourceBranch<Resource, "success">,
				...args,
			)
		case "error":
			return cases.error(resource as ResourceBranch<Resource, "error">, ...args)
		default: {
			const unsupported = resource as { readonly status?: unknown }
			throw new TypeError(
				`Unsupported resource status "${String(unsupported.status)}"`,
			)
		}
	}
}
