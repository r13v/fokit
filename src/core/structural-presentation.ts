import type { DefaultGridValue, GridColumns, GridSpan } from "./ui-types.js"

const defaultGridScale = Object.freeze([
	1, 2, 3, 4,
]) satisfies readonly DefaultGridValue[]

export function validateClassName(className: unknown): string {
	if (typeof className !== "string") {
		throw new TypeError("className must be a string")
	}

	return className
}

export function normalizeGridScale(
	grid: readonly unknown[] | undefined,
	owner: "createFormKit" | "kit.extend" | "normalizeDefinition",
): readonly number[] {
	if (grid === undefined) {
		return defaultGridScale
	}
	if (!Array.isArray(grid) || grid.length === 0) {
		throw new TypeError(`${owner} grid must be a non-empty array`)
	}

	const values = new Set<number>()
	for (const value of grid) {
		if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
			throw new TypeError(`${owner} grid values must be positive integers`)
		}
		if (values.has(value)) {
			throw new TypeError(`${owner} grid cannot contain duplicate ${value}`)
		}
		values.add(value)
	}
	if (!values.has(1)) {
		throw new TypeError(`${owner} grid must include 1`)
	}

	return Object.freeze([...values].sort((left, right) => left - right))
}

export function extendGridScale(
	grid: readonly number[],
	additions: readonly unknown[],
): readonly number[] {
	if (!Array.isArray(additions) || additions.length === 0) {
		throw new TypeError("kit.extend grid must be a non-empty array")
	}

	return normalizeGridScale([...grid, ...additions], "kit.extend")
}

export function validateGridColumns(
	columns: unknown,
	grid: readonly number[] = defaultGridScale,
): GridColumns {
	if (
		typeof columns !== "number" ||
		!Number.isInteger(columns) ||
		columns <= 0
	) {
		throw new TypeError(
			`Section layout columns must be ${formatAllowedValues(grid)}`,
		)
	}
	if (!grid.includes(columns)) {
		throw new TypeError(
			`Section layout columns must be ${formatAllowedValues(grid)}`,
		)
	}

	return columns
}

export function validateGridSpan(
	span: unknown,
	grid: readonly number[] = defaultGridScale,
	parentColumns?: GridColumns,
): GridSpan {
	if (span === "full") {
		return span
	}
	if (typeof span !== "number" || !Number.isInteger(span) || span <= 0) {
		throw new TypeError(
			`Layout span must be ${formatAllowedValues(grid, true)}`,
		)
	}
	if (!grid.includes(span)) {
		throw new TypeError(
			`Layout span must be ${formatAllowedValues(grid, true)}`,
		)
	}
	if (parentColumns !== undefined && span > parentColumns) {
		throw new TypeError(
			`Layout span ${span} exceeds parent columns ${parentColumns}`,
		)
	}

	return span
}

function formatAllowedValues(
	grid: readonly number[],
	includeFull = false,
): string {
	const values = [...grid.map(String), ...(includeFull ? ["full"] : [])]
	if (values.length === 1) {
		return values[0] ?? ""
	}
	if (values.length === 2) {
		return `${values[0]} or ${values[1]}`
	}

	return `${values.slice(0, -1).join(", ")}, or ${values.at(-1)}`
}
