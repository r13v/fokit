import fc from "fast-check"
import { describe, expect, it } from "vitest"

import { normalizeFormData } from "./normalize-form-data.js"
import { fokitArrayMarkerName, invalidFormDataCode } from "./protocol.js"

describe("FormData normalization", () => {
	it("normalizes objects, indexed arrays, repeated names, markers, strings, and File values", () => {
		const avatar = new File(["avatar"], "avatar.png", { type: "image/png" })
		const formData = new FormData()
		formData.append(fokitArrayMarkerName, "contacts")
		formData.append(fokitArrayMarkerName, "tags")
		formData.append(fokitArrayMarkerName, "emptyTags")
		formData.append(fokitArrayMarkerName, "singleTag")
		formData.append("name", "Ada")
		formData.append("address.city", "London")
		formData.append("contacts.0.value", "ada@example.test")
		formData.append("contacts.1.value", "grace@example.test")
		formData.append("tags", "engineer")
		formData.append("tags", "speaker")
		formData.append("singleTag", "friend")
		formData.append("jsonText", '{"enabled":true}')
		formData.append("avatar", avatar)

		const result = normalizeFormData(formData)

		expect(result.success).toBe(true)
		if (!result.success) {
			return
		}
		const value = result.value
		expect(Object.getPrototypeOf(value)).toBeNull()
		expect(Object.getPrototypeOf(value.address)).toBeNull()
		expect(value.name).toBe("Ada")
		expect(value.address).toMatchObject({ city: "London" })
		expect(value.contacts).toEqual([
			{ value: "ada@example.test" },
			{ value: "grace@example.test" },
		])
		expect(value.tags).toEqual(["engineer", "speaker"])
		expect(value.emptyTags).toEqual([])
		expect(value.singleTag).toEqual(["friend"])
		expect(value.jsonText).toBe('{"enabled":true}')
		expect(value.avatar).toBe(avatar)
		expect("subscribe" in value).toBe(false)
	})

	it("uses repeated names as arrays and single names as scalars without markers", () => {
		const formData = new FormData()
		formData.append("color", "red")
		formData.append("roles", "admin")
		formData.append("roles", "owner")

		const result = normalizeFormData(formData)

		expect(result.success).toBe(true)
		if (!result.success) {
			return
		}
		expect(result.value.color).toBe("red")
		expect(result.value.roles).toEqual(["admin", "owner"])
	})

	it.each([
		["unknown reserved metadata", [["__fokit.extra", "x"]]],
		[
			"duplicate array markers",
			[
				[fokitArrayMarkerName, "tags"],
				[fokitArrayMarkerName, "tags"],
			],
		],
		["sparse indexes", [["contacts.1.value", "ada@example.test"]]],
		[
			"mixed indexed and repeated collections",
			[
				["contacts", "ada@example.test"],
				["contacts", "grace@example.test"],
				["contacts.0.value", "ada@example.test"],
			],
		],
		[
			"scalar and nested collisions",
			[
				["address", "London"],
				["address.city", "London"],
			],
		],
		["malformed paths", [["contacts.01.value", "ada@example.test"]]],
		["prototype mutation paths", [["account.__proto__.polluted", "yes"]]],
		["malformed marker paths", [[fokitArrayMarkerName, "0.contacts"]]],
	])("rejects %s", (_name, entries) => {
		const formData = new FormData()
		for (const [name, value] of entries) {
			formData.append(name, value)
		}

		const result = normalizeFormData(formData)

		expectInvalidFormData(result)
	})

	it("rejects File array markers", () => {
		const formData = new FormData()
		formData.append(fokitArrayMarkerName, new File(["x"], "marker.txt"))

		const result = normalizeFormData(formData)

		expectInvalidFormData(result)
	})

	it.each([
		[
			"maxEntries",
			{ maxEntries: 1 },
			[
				["name", "Ada"],
				["email", "a@b.test"],
			],
		],
		["maxPathLength", { maxPathLength: 4 }, [["email", "a@b.test"]]],
		["maxDepth", { maxDepth: 2 }, [["account.profile.name", "Ada"]]],
		["maxArrayIndex", { maxArrayIndex: 1 }, [["contacts.2.value", "Ada"]]],
	])("enforces %s", (_name, options, entries) => {
		const formData = new FormData()
		for (const [name, value] of entries) {
			formData.append(name, value)
		}

		const result = normalizeFormData(formData, options)

		expectInvalidFormData(result)
	})

	it("does not pollute prototypes for hostile generated names", () => {
		const unsafeSegment = fc.constantFrom(
			"__proto__",
			"prototype",
			"constructor",
		)
		const safeSegment = fc.constantFrom("account", "profile", "items", "value")
		const hostilePath = fc
			.array(safeSegment, { minLength: 1, maxLength: 3 })
			.chain((prefix) =>
				unsafeSegment.map((unsafe) =>
					[...prefix, unsafe, "polluted"].join("."),
				),
			)

		fc.assert(
			fc.property(hostilePath, (path) => {
				const formData = new FormData()
				formData.append(path, "yes")

				const result = normalizeFormData(formData)

				expect(result.success).toBe(false)
				expect(Object.prototype).not.toHaveProperty("polluted")
				expect({}).not.toHaveProperty("polluted")
			}),
		)
	})

	it("rejects generated sparse indexed structures before returning a value", () => {
		fc.assert(
			fc.property(
				fc.constantFrom("contacts", "items", "rows"),
				fc.integer({ min: 1, max: 10_000 }),
				(root, index) => {
					const formData = new FormData()
					formData.append(`${root}.${index}.value`, "x")

					const result = normalizeFormData(formData)

					expect(result.success).toBe(false)
					if (!result.success) {
						expect(result.issues).toHaveLength(1)
					}
				},
			),
		)
	})
})

function expectInvalidFormData(
	result: ReturnType<typeof normalizeFormData>,
): void {
	expect(result).toEqual({
		success: false,
		issues: [
			{
				source: "server",
				code: invalidFormDataCode,
				message: "Invalid form data",
			},
		],
	})
}
