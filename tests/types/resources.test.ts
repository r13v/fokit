import type { StandardSchemaV1 } from "@standard-schema/spec"
import {
	type ResourceState as CoreResourceState,
	fromResource as fromCoreResource,
	matchResource as matchCoreResource,
} from "../../src/core/index.js"
import {
	createFormKit,
	fromResource,
	matchResource,
	nativeControls,
	type ResourceState,
	type UiResolver,
} from "../../src/index.js"

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false

type Expect<Condition extends true> = Condition

type ExampleInput = {
	kind: "company" | "person"
	country: string
	city: string
}

type Permission = {
	readonly canEdit: boolean
	readonly canView: boolean
}

type PermissionError = {
	readonly reason: "network" | "unauthorized"
}

type RefreshState<Error> =
	| { readonly status: "idle" }
	| { readonly status: "pending" }
	| { readonly status: "error"; readonly error: Error }

type CitiesResource =
	| { readonly status: "pending"; readonly fetchStatus: "fetching" | "paused" }
	| {
			readonly status: "success"
			readonly value: readonly {
				readonly value: string
				readonly label: string
			}[]
			readonly refresh: RefreshState<Error>
	  }
	| { readonly status: "error"; readonly error: Error }

type ExampleContext = {
	readonly permission: ResourceState<Permission, PermissionError>
	readonly cities: CitiesResource
}

type ExampleSchema = StandardSchemaV1<ExampleInput>

declare const schema: ExampleSchema
declare const context: ExampleContext

const kit = createFormKit({ controls: nativeControls })

kit.forContext<ExampleContext>().defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "kind",
			control: "select",
			options: {
				options: [
					{ value: "person", label: "Person" },
					{ value: "company", label: "Company" },
				],
			},
		},
		{
			kind: "field",
			path: "city",
			control: "select",
			visible: fromResource(
				({ kind }, { context: resolverContext }) => {
					const _kind: ExampleInput["kind"] = kind
					return resolverContext.permission
				},
				{
					pending: (_state, values, details) => {
						const _country: string = values.country
						const _permission: ResourceState<Permission, PermissionError> =
							details.context.permission
						return false
					},
					success: ({ value }, { kind }) => value.canView && kind === "company",
					error: ({ error }) => error.reason !== "unauthorized",
				},
			),
			options: fromResource(
				(_values, { context: resolverContext }) => resolverContext.cities,
				{
					pending: ({ fetchStatus }) => {
						const _fetchStatus: "fetching" | "paused" = fetchStatus
						return { options: [] }
					},
					success: ({ value, refresh }) => {
						const _refresh: RefreshState<Error> = refresh
						return { options: value }
					},
					error: ({ error }) => {
						const _error: Error = error
						return { options: [] }
					},
				},
			),
		},
	],
})

kit.forContext<ExampleContext>().defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "city",
			control: "select",
			// @ts-expect-error resource-backed UI mappings must return synchronously
			visible: fromResource(
				(_values, { context: resolverContext }) => resolverContext.permission,
				{
					pending: async () => false,
					success: () => true,
					error: () => false,
				},
			),
		},
	],
})

const matched = matchResource(context.permission, {
	pending: () => ({ status: "pending" }),
	success: ({ value }) => ({ status: "success", value }),
	error: ({ error }) => ({ status: "error", error }),
})

const _matchedStatus: "error" | "pending" | "success" = matched.status

type _coreResourceMatchesMain = Expect<
	Equal<
		CoreResourceState<Permission, PermissionError>,
		ResourceState<Permission, PermissionError>
	>
>

matchCoreResource(context.permission, {
	pending: () => false,
	success: ({ value }) => value.canEdit,
	error: () => false,
})

fromCoreResource(() => context.permission, {
	pending: () => false,
	success: ({ value }) => value.canView,
	error: () => false,
})

// @ts-expect-error resource matching requires every availability branch
matchResource(context.permission, {
	pending: () => false,
	success: ({ value }) => value.canEdit,
})

declare const asyncPermission: UiResolver<
	Promise<ResourceState<Permission, PermissionError>>,
	ExampleInput,
	ExampleContext
>

kit.forContext<ExampleContext>().defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "city",
			control: "select",
			visible: fromResource(
				// @ts-expect-error resource selectors must return synchronously
				asyncPermission,
				{
					pending: () => false,
					success: () => true,
					error: () => false,
				},
			),
		},
	],
})
