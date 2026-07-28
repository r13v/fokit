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
	it("structurally clones arrays, plain objects, and mutable native leaves", () => {
		const date = new Date("2026-07-28T00:00:00.000Z")
		const pattern = /ada/gy
		pattern.lastIndex = 2
		const file = new File(["avatar"], "avatar.txt")
		const values = {
			profile: { name: "Ada", birthday: date, pattern },
			files: [file],
		}

		const cloned = cloneValue(values)

		expect(cloned).toEqual(values)
		expect(cloned).not.toBe(values)
		expect(cloned.profile).not.toBe(values.profile)
		expect(cloned.files).not.toBe(values.files)
		expect(cloned.profile.birthday).not.toBe(date)
		expect(cloned.profile.birthday.getTime()).toBe(date.getTime())
		expect(cloned.profile.pattern).not.toBe(pattern)
		expect(cloned.profile.pattern.source).toBe(pattern.source)
		expect(cloned.profile.pattern.flags).toBe(pattern.flags)
		expect(cloned.profile.pattern.lastIndex).toBe(pattern.lastIndex)
		expect(cloned.files[0]).toBe(file)

		date.setTime(0)
		pattern.lastIndex = 0

		expect(cloned.profile.birthday.toISOString()).toBe(
			"2026-07-28T00:00:00.000Z",
		)
		expect(cloned.profile.pattern.lastIndex).toBe(2)
	})

	it("preserves hostile prototype keys as data properties", () => {
		const values = JSON.parse(
			'{"__proto__":{"polluted":true},"profile":{"__proto__":{"admin":true}}}',
		) as { readonly profile: Record<string, unknown> } & Record<string, unknown>

		const cloned = cloneValue(values)

		expect(Object.getPrototypeOf(cloned)).toBe(Object.prototype)
		expect(Object.hasOwn(cloned, "__proto__")).toBe(true)
		expect("polluted" in cloned).toBe(false)
		expect(Object.getPrototypeOf(cloned.profile)).toBe(Object.prototype)
		expect(Object.hasOwn(cloned.profile, "__proto__")).toBe(true)
		expect("admin" in cloned.profile).toBe(false)

		const merged = mergePathValue(
			{ profile: { name: "Ada" } },
			"profile",
			JSON.parse('{"__proto__":{"admin":true}}') as Record<string, unknown>,
		)

		expect(Object.getPrototypeOf(merged.profile)).toBe(Object.prototype)
		expect(Object.hasOwn(merged.profile, "__proto__")).toBe(true)
		expect("admin" in merged.profile).toBe(false)
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
		expect(next.account.createdAt).not.toBe(nextDate)
		expect(next.account.createdAt.getTime()).toBe(nextDate.getTime())
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
		const leftPattern = /ada/g
		const rightPattern = /ada/g
		leftPattern.lastIndex = 1
		rightPattern.lastIndex = 1
		expect(isDirtyEqual(/ada/gi, /ada/gi)).toBe(true)
		expect(isDirtyEqual(leftPattern, rightPattern)).toBe(true)
		rightPattern.lastIndex = 0
		expect(isDirtyEqual(leftPattern, rightPattern)).toBe(false)
		expect(isDirtyEqual(/ada/g, /ada/i)).toBe(false)
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
