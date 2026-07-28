import { describe, expect, it } from "vitest"

import {
	cloneValue,
	getPathValue,
	isDirtyEqual,
	mergePathValue,
	setPathValue,
	unsetPathValue,
} from "./index.js"

describe("immutable value operations", () => {
	it("structurally clones arrays and plain objects without cloning native leaves", () => {
		const date = new Date("2026-07-28T00:00:00.000Z")
		const file = new File(["avatar"], "avatar.txt")
		const values = {
			profile: { name: "Ada", birthday: date },
			files: [file],
		}

		const cloned = cloneValue(values)

		expect(cloned).toEqual(values)
		expect(cloned).not.toBe(values)
		expect(cloned.profile).not.toBe(values.profile)
		expect(cloned.files).not.toBe(values.files)
		expect(cloned.profile.birthday).toBe(date)
		expect(cloned.files[0]).toBe(file)
	})

	it("reads deep values without mutating or creating containers", () => {
		const values = { contacts: [{ value: "ada@example.test" }] }

		expect(getPathValue(values, "contacts.0.value")).toBe("ada@example.test")
		expect(getPathValue(values, "contacts.1.value")).toBeUndefined()
		expect(values).toEqual({ contacts: [{ value: "ada@example.test" }] })
	})

	it("sets deep values immutably and reuses untouched containers", () => {
		const values = {
			account: { email: "old@example.test" },
			profile: { name: "Ada" },
		}

		const next = setPathValue(values, "account.email", "new@example.test")
		const same = setPathValue(next, "account.email", "new@example.test")

		expect(next).toEqual({
			account: { email: "new@example.test" },
			profile: { name: "Ada" },
		})
		expect(next).not.toBe(values)
		expect(next.account).not.toBe(values.account)
		expect(next.profile).toBe(values.profile)
		expect(same).toBe(next)
	})

	it("unsets deep values immutably and reuses the root when already absent", () => {
		const values = {
			company: { name: "ACME", taxId: "123" },
			profile: { name: "Ada" },
		}

		const next = unsetPathValue(values, "company.taxId")
		const same = unsetPathValue(next, "company.taxId")

		expect(next).toEqual({
			company: { name: "ACME" },
			profile: { name: "Ada" },
		})
		expect(next).not.toBe(values)
		expect(next.company).not.toBe(values.company)
		expect(next.profile).toBe(values.profile)
		expect(same).toBe(next)
	})

	it("merges plain-object patches recursively while replacing arrays and native leaves", () => {
		const originalTags = ["friend"]
		const values = {
			account: {
				email: "old@example.test",
				tags: originalTags,
				createdAt: new Date("2026-07-28T00:00:00.000Z"),
			},
			profile: { name: "Ada" },
		}
		const nextTags = ["admin"]
		const nextDate = new Date("2026-07-29T00:00:00.000Z")

		const next = mergePathValue(values, "account", {
			email: "new@example.test",
			tags: nextTags,
			createdAt: nextDate,
		})

		expect(next).toEqual({
			account: {
				email: "new@example.test",
				tags: nextTags,
				createdAt: nextDate,
			},
			profile: { name: "Ada" },
		})
		expect(next.account).not.toBe(values.account)
		expect(next.profile).toBe(values.profile)
		expect(next.account.tags).toEqual(nextTags)
		expect(next.account.tags).not.toBe(nextTags)
		expect(next.account.createdAt).toBe(nextDate)
		expect(originalTags).toEqual(["friend"])
	})

	it("uses the documented dirty equality rules", () => {
		const leftFile = new File(["avatar"], "avatar.txt")
		const rightFile = new File(["avatar"], "avatar.txt")

		expect(isDirtyEqual(Number.NaN, Number.NaN)).toBe(true)
		expect(isDirtyEqual(0, -0)).toBe(false)
		expect(
			isDirtyEqual(
				{ dates: [new Date("2026-07-28T00:00:00.000Z")] },
				{ dates: [new Date("2026-07-28T00:00:00.000Z")] },
			),
		).toBe(true)
		expect(isDirtyEqual(leftFile, leftFile)).toBe(true)
		expect(isDirtyEqual(leftFile, rightFile)).toBe(false)
	})

	it("rejects cyclic values before cloning forever", () => {
		const values: { self?: unknown } = {}
		values.self = values

		expect(() => cloneValue(values)).toThrow(TypeError)
	})

	it("rejects invalid traversal without mutating the original value", () => {
		const values = { profile: "not an object" }

		expect(() => setPathValue(values, "profile.name", "Ada")).toThrow(TypeError)
		expect(() => unsetPathValue(values, "profile.name")).toThrow(TypeError)
		expect(values).toEqual({ profile: "not an object" })
	})
})
