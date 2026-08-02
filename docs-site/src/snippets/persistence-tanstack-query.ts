import type { QueryClient } from "@tanstack/react-query"
import type { FormPersistenceAdapter, JsonValue } from "form-please/persistence"

type DraftApi = Readonly<{
	load(key: string): Promise<JsonValue | undefined>
	save(key: string, value: JsonValue): Promise<void>
	remove(key: string): Promise<void>
}>

export function createTanStackQueryPersistenceAdapter(
	queryClient: QueryClient,
	api: DraftApi,
): FormPersistenceAdapter {
	return {
		load(key) {
			return queryClient.fetchQuery({
				queryKey: ["form-draft", key],
				queryFn: () => api.load(key),
				staleTime: 0,
			})
		},
		async save(key, value) {
			await api.save(key, value)
			queryClient.setQueryData(["form-draft", key], value)
		},
		async remove(key) {
			await api.remove(key)
			queryClient.removeQueries({ queryKey: ["form-draft", key], exact: true })
		},
	}
}
