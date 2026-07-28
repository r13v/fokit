"use client"

export function createDomId(idPrefix: string, value: string): string {
	return `${idPrefix}-${encodeDomIdComponent(value)}`
}

function encodeDomIdComponent(value: string): string {
	return encodeURIComponent(value).replaceAll(".", "%2E")
}
