export type PathSegment = number | string
export type PathSegments = readonly PathSegment[]
export type PathInput = PathSegments | string

export type ParsePathOptions = {
	readonly maxIndex?: number
}

const unsafePropertySegments = new Set([
	"__proto__",
	"constructor",
	"prototype",
])
const canonicalIndexPattern = /^(0|[1-9]\d*)$/
const numericLikePattern = /^[+-]?\d+$/
const bracketPattern = /[[\]]/

export function parsePath(
	input: PathInput,
	options: ParsePathOptions = {},
): PathSegments {
	const segments =
		typeof input === "string"
			? parseStringPath(input, options)
			: parseStructuredPath(input, options)

	return Object.freeze(segments)
}

export function formatPath(
	input: PathInput,
	options: ParsePathOptions = {},
): string {
	return parsePath(input, options).join(".")
}

export function parseArrayIndex(
	segment: string,
	options: ParsePathOptions = {},
): number | undefined {
	if (!canonicalIndexPattern.test(segment)) {
		return undefined
	}

	const index = Number(segment)
	const maxIndex = normalizeMaxIndex(options.maxIndex)

	if (index > maxIndex) {
		throw new TypeError(`Path index ${segment} exceeds maximum ${maxIndex}`)
	}

	return index
}

export function isSamePath(left: PathInput, right: PathInput): boolean {
	const leftSegments = parsePath(left)
	const rightSegments = parsePath(right)

	return (
		leftSegments.length === rightSegments.length &&
		leftSegments.every((segment, index) => segment === rightSegments[index])
	)
}

export function isAncestorPath(ancestor: PathInput, path: PathInput): boolean {
	const ancestorSegments = parsePath(ancestor)
	const pathSegments = parsePath(path)

	return (
		ancestorSegments.length < pathSegments.length &&
		ancestorSegments.every((segment, index) => segment === pathSegments[index])
	)
}

export function isDescendantPath(
	descendant: PathInput,
	path: PathInput,
): boolean {
	return isAncestorPath(path, descendant)
}

export function pathsOverlap(left: PathInput, right: PathInput): boolean {
	return (
		isSamePath(left, right) ||
		isAncestorPath(left, right) ||
		isAncestorPath(right, left)
	)
}

function parseStringPath(
	path: string,
	options: ParsePathOptions,
): PathSegment[] {
	if (path.length === 0) {
		throw new TypeError("Path must not be empty")
	}

	if (bracketPattern.test(path)) {
		throw new TypeError(`Path "${path}" uses unsupported bracket syntax`)
	}

	return path.split(".").map((segment, index) => {
		if (segment.length === 0) {
			throw new TypeError(`Path "${path}" contains an empty segment`)
		}

		const parsedIndex = parseArrayIndex(segment, options)
		if (parsedIndex !== undefined) {
			if (index === 0) {
				throw new TypeError(`Path "${path}" starts with an array index`)
			}
			return parsedIndex
		}

		if (numericLikePattern.test(segment)) {
			throw new TypeError(`Path "${path}" contains a non-canonical index`)
		}

		validatePropertySegment(segment, index)
		return segment
	})
}

function parseStructuredPath(
	segments: PathSegments,
	options: ParsePathOptions,
): PathSegment[] {
	if (segments.length === 0) {
		throw new TypeError("Path must not be empty")
	}

	return segments.map((segment, index) => {
		if (typeof segment === "number") {
			return normalizeStructuredIndex(segment, index, options)
		}

		if (typeof segment !== "string") {
			throw new TypeError("Path segments must be strings or numbers")
		}

		validatePropertySegment(segment, index)

		if (parseArrayIndex(segment, options) !== undefined) {
			throw new TypeError(`Path segment "${segment}" is a numeric object key`)
		}

		if (numericLikePattern.test(segment)) {
			throw new TypeError(`Path segment "${segment}" is a non-canonical index`)
		}

		return segment
	})
}

function validatePropertySegment(segment: string, index: number): void {
	if (segment.length === 0) {
		throw new TypeError("Path property segments must not be empty")
	}

	if (segment.includes(".")) {
		throw new TypeError(`Path property segment "${segment}" contains a dot`)
	}

	if (bracketPattern.test(segment)) {
		throw new TypeError(
			`Path property segment "${segment}" uses unsupported bracket syntax`,
		)
	}

	if (unsafePropertySegments.has(segment)) {
		throw new TypeError(`Path property segment "${segment}" is reserved`)
	}

	if (index === 0 && segment === "__fokit") {
		throw new TypeError("Path top-level __fokit namespace is reserved")
	}
}

function normalizeStructuredIndex(
	index: number,
	segmentIndex: number,
	options: ParsePathOptions,
): number {
	if (segmentIndex === 0) {
		throw new TypeError("Path must not start with an array index")
	}

	if (!Number.isSafeInteger(index) || index < 0) {
		throw new TypeError(
			`Path index ${index} is not a safe non-negative integer`,
		)
	}

	const maxIndex = normalizeMaxIndex(options.maxIndex)
	if (index > maxIndex) {
		throw new TypeError(`Path index ${index} exceeds maximum ${maxIndex}`)
	}

	return index
}

function normalizeMaxIndex(maxIndex = Number.MAX_SAFE_INTEGER): number {
	if (!Number.isSafeInteger(maxIndex) || maxIndex < 0) {
		throw new TypeError("maxIndex must be a safe non-negative integer")
	}

	return maxIndex
}
