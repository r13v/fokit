import { describe, expect, it, vi } from "vitest"

import { createLocalStorageAdapter } from "./local-storage.js"

describe("localStorage persistence adapter", () => {
	it("accesses storage lazily so browser globals are not required at import time", async () => {
		const values = new Map<string, string>()
		const storage = {
			getItem: vi.fn((key: string) => values.get(key) ?? null),
			removeItem: vi.fn((key: string) => values.delete(key)),
			setItem: vi.fn((key: string, value: string) => values.set(key, value)),
		}
		const getStorage = vi.fn(() => storage)
		const adapter = createLocalStorageAdapter(getStorage)

		expect(getStorage).not.toHaveBeenCalled()
		expect(await adapter.load("profile")).toBeUndefined()
		await adapter.save("profile", { name: "Ada" })
		expect(await adapter.load("profile")).toEqual({ name: "Ada" })
		await adapter.remove("profile")
		expect(await adapter.load("profile")).toBeUndefined()
	})

	it("surfaces malformed stored JSON as a load failure", async () => {
		const adapter = createLocalStorageAdapter(() => ({
			getItem: () => "not-json",
			removeItem: () => undefined,
			setItem: () => undefined,
		}))

		await expect(adapter.load("profile")).rejects.toBeInstanceOf(SyntaxError)
	})
})
