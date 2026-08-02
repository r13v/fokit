import type { GridColumns, GridSpan } from "./ui-types.js"

export function validateClassName(className: unknown): string {
	if (typeof className !== "string") {
		throw new TypeError("className must be a string")
	}

	return className
}

export function validateGridColumns(columns: unknown): GridColumns {
	if (columns === 1 || columns === 2 || columns === 3 || columns === 4) {
		return columns
	}

	throw new TypeError("Section layout columns must be 1, 2, 3, or 4")
}

export function validateGridSpan(
	span: unknown,
	parentColumns?: GridColumns,
): GridSpan {
	if (span !== "full" && span !== 1 && span !== 2 && span !== 3 && span !== 4) {
		throw new TypeError("Layout span must be 1, 2, 3, 4, or full")
	}

	if (
		parentColumns !== undefined &&
		typeof span === "number" &&
		span > parentColumns
	) {
		throw new TypeError(
			`Layout span ${span} exceeds parent columns ${parentColumns}`,
		)
	}

	return span
}
