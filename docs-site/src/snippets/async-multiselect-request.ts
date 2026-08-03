import { z } from "zod"

import type { AsyncMultiSelectOption } from "./async-multiselect"

const cityOptionsSchema = z.array(
	z.object({
		value: z.string(),
		label: z.string(),
		disabled: z.boolean().optional(),
	}),
)

export async function searchCitiesRequest(
	search: string,
	signal: AbortSignal,
): Promise<readonly AsyncMultiSelectOption[]> {
	const query = new URLSearchParams({ q: search })
	const response = await fetch(`/api/cities?${query.toString()}`, { signal })

	if (!response.ok) {
		throw new Error(`City search failed with status ${response.status}`)
	}

	return cityOptionsSchema.parse(await response.json())
}
