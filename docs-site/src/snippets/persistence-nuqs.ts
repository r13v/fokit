"use client"

import type { FormPersistenceAdapter, JsonValue } from "form-please/persistence"
import { parseAsJson, useQueryState } from "nuqs"
import { useMemo, useRef } from "react"

const jsonParser = parseAsJson<JsonValue>((value) => {
	if (isJsonValue(value)) return value
	return null
})

export function useNuqsPersistenceAdapter(
	parameter = "form",
): FormPersistenceAdapter {
	const [value, setValue] = useQueryState(parameter, jsonParser)
	const current = useRef(value)
	current.current = value

	return useMemo(
		() => ({
			async load() {
				return current.current ?? undefined
			},
			async save(_key: string, nextValue: JsonValue) {
				await setValue(nextValue, { history: "replace", shallow: true })
			},
			async remove() {
				await setValue(null, { history: "replace", shallow: true })
			},
		}),
		[setValue],
	)
}

function isJsonValue(value: unknown): value is JsonValue {
	if (value === null || typeof value === "boolean" || typeof value === "string")
		return true
	if (typeof value === "number") return Number.isFinite(value)
	if (Array.isArray(value)) return value.every(isJsonValue)
	if (typeof value !== "object") return false
	return Object.values(value).every(isJsonValue)
}
