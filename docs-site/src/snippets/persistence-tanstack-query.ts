import type { QueryClient } from "@tanstack/react-query"
import type { FormPersistenceAdapter, JsonValue } from "form-please/persistence"

export type DraftRequests = Readonly<{
	load(key: string): Promise<JsonValue | undefined>
	remove(key: string): Promise<void>
	save(key: string, value: JsonValue): Promise<void>
}>

// [!region tanstack-query]
export function createTanStackQueryPersistenceAdapter(
	queryClient: QueryClient,
	requests: DraftRequests,
): FormPersistenceAdapter {
	return {
		load(key) {
			return queryClient.fetchQuery({
				queryFn: () => requests.load(key),
				queryKey: ["form-draft", key],
			})
		},
		async remove(key) {
			await requests.remove(key)
			queryClient.setQueryData(["form-draft", key], undefined)
		},
		async save(key, value) {
			await requests.save(key, value)
			queryClient.setQueryData(["form-draft", key], value)
		},
	}
}
// [!endregion tanstack-query]
