import fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
	formatPath,
	isAncestorPath,
	isDescendantPath,
	isSamePath,
	parseArrayIndex,
	parsePath,
	pathsOverlap,
} from "./index.js"

describe("canonical paths", () => {
	it("parses and freezes canonical object and array paths", () => {
		const objectPath = parsePath("address.city")
		const arrayPath = parsePath("contacts.0.value")

		expect(objectPath).toEqual(["address", "city"])
		expect(arrayPath).toEqual(["contacts", 0, "value"])
		expect(Object.isFrozen(objectPath)).toBe(true)
		expect(Object.isFrozen(arrayPath)).toBe(true)
		expect(formatPath(objectPath)).toBe("address.city")
		expect(formatPath(arrayPath)).toBe("contacts.0.value")
	})

	it("normalizes structured path segments without object traversal", () => {
		const parsed = parsePath(["contacts", 12, "value"])

		expect(parsed).toEqual(["contacts", 12, "value"])
		expect(formatPath(parsed)).toBe("contacts.12.value")
	})

	it("round-trips canonical generated paths", () => {
		const segment = fc.constantFrom(
			"address",
			"city",
			"contacts",
			"value",
			"kind",
			"items",
		)
		const index = fc.integer({ min: 0, max: 50 })
		const canonicalPath = fc
			.array(fc.oneof(segment, index), { minLength: 1, maxLength: 6 })
			.filter((segments) => typeof segments[0] === "string")

		fc.assert(
			fc.property(canonicalPath, (segments) => {
				const path = formatPath(segments)

				expect(formatPath(parsePath(path))).toBe(path)
			}),
		)
	})

	it("rejects non-canonical and reserved path strings", () => {
		for (const path of [
			"contacts[0].value",
			"address..city",
			".address",
			"address.",
			"0.name",
			"items.-1.value",
			"items.+1.value",
			"items.01.value",
			"user.__proto__.name",
			"user.prototype.name",
			"user.constructor.name",
			"__fokit.array",
		]) {
			expect(() => parsePath(path), path).toThrow(TypeError)
		}
	})

	it("rejects invalid structured segments before formatting", () => {
		for (const segments of [
			["address.city"],
			["0"],
			["contacts", "0"],
			["contacts", -1],
			["contacts", 1.2],
			["contacts", Number.MAX_SAFE_INTEGER + 1],
			["contacts", "__proto__"],
			["__fokit"],
			[0],
		] as const) {
			expect(() => parsePath(segments), JSON.stringify(segments)).toThrow(
				TypeError,
			)
		}
	})

	it("parses array indexes canonically and within bounds", () => {
		expect(parseArrayIndex("0")).toBe(0)
		expect(parseArrayIndex("42")).toBe(42)
		expect(parseArrayIndex("01")).toBeUndefined()
		expect(parseArrayIndex("-1")).toBeUndefined()
		expect(parseArrayIndex("+1")).toBeUndefined()
		expect(() => parseArrayIndex("3", { maxIndex: 2 })).toThrow(TypeError)
		expect(() => parsePath("items.3", { maxIndex: 2 })).toThrow(TypeError)
	})

	it("checks path equality, ancestry, descendants, and overlap", () => {
		expect(isSamePath("contacts.0", ["contacts", 0])).toBe(true)
		expect(isAncestorPath("contacts", "contacts.0.value")).toBe(true)
		expect(isAncestorPath("contacts.0.value", "contacts")).toBe(false)
		expect(isDescendantPath("contacts.0.value", "contacts")).toBe(true)
		expect(pathsOverlap("contacts.0.value", "contacts")).toBe(true)
		expect(pathsOverlap("contacts.0.value", "contacts.1.value")).toBe(false)
	})
})
