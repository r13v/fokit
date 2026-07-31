import type { UseQueryResult } from "@tanstack/react-query"

type FetchStatus = "idle" | "fetching" | "paused"

export type RefreshState<Error> =
	| { readonly status: "idle" }
	| { readonly status: "pending" }
	| { readonly status: "paused" }
	| { readonly status: "error"; readonly error: Error }

export type QueryResourceState<Value, Error> =
	| { readonly status: "pending"; readonly fetchStatus: FetchStatus }
	| {
			readonly status: "success"
			readonly value: Value
			readonly refresh: RefreshState<Error>
	  }
	| { readonly status: "error"; readonly error: Error }

function refreshState<Error>(status: FetchStatus): RefreshState<Error> {
	switch (status) {
		case "idle":
			return { status: "idle" }
		case "fetching":
			return { status: "pending" }
		case "paused":
			return { status: "paused" }
	}
}

export function queryToResource<Value, Error>(
	query: UseQueryResult<Value, Error>,
): QueryResourceState<Value, Error> {
	if (query.status === "pending") {
		return { status: "pending", fetchStatus: query.fetchStatus }
	}
	if (query.status === "success") {
		return {
			status: "success",
			value: query.data,
			refresh: refreshState<Error>(query.fetchStatus),
		}
	}
	if (query.isRefetchError) {
		return {
			status: "success",
			value: query.data,
			refresh: { status: "error", error: query.error },
		}
	}
	return { status: "error", error: query.error }
}
