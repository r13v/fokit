"use client"

import { describe, expect, it } from "vitest"

import { nativeFormKit } from "./index.js"

describe("nativeFormKit preset", () => {
	it("provides an immutable native kit that can be extended without mutation", () => {
		const extended = nativeFormKit.extend({
			controls: {
				custom: nativeFormKit.controls.text,
			},
		})

		expect(Object.isFrozen(nativeFormKit)).toBe(true)
		expect(Object.isFrozen(nativeFormKit.controls)).toBe(true)
		expect(Object.isFrozen(nativeFormKit.slots)).toBe(true)
		expect(Object.keys(nativeFormKit.controls)).toEqual([
			"text",
			"textarea",
			"select",
			"checkbox",
			"number",
			"date",
			"time",
			"file",
		])
		expect(extended.controls.custom).toBe(nativeFormKit.controls.text)
		expect(nativeFormKit.controls).not.toHaveProperty("custom")
	})
})
