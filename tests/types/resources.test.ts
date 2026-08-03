import {
	fromResource,
	matchResource,
	type ResourceState,
} from "../../src/index.js"

type Input = { readonly organizationId: string }
type Context = {
	readonly organization: ResourceState<{ readonly name: string }>
}

const label = fromResource(
	(_values: Readonly<Input>, { context }: { readonly context: Context }) =>
		context.organization,
	{
		pending: (_state, values) => `Loading ${values.organizationId}`,
		success: ({ value }, _values, { context }) =>
			`${value.name}:${context.organization.status}`,
		error: ({ error }) => String(error),
	},
)

label(
	{ organizationId: "org-1" },
	{ context: { organization: { status: "pending" } } },
)

const result = matchResource(
	{ status: "success", value: 42 } as ResourceState<number>,
	{
		pending: () => "pending" as const,
		success: ({ value }) => value,
		error: () => "error" as const,
	},
)

result satisfies number | "pending" | "error"
