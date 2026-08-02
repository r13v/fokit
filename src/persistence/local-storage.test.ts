import { describe, expect, it, vi } from "vitest"
import { createLocalStorageAdapter } from "./local-storage.js"

describe("localStorage persistence adapter", () => {
	it("acquires storage lazily and maps JSON records", async () => {
		const values = new Map<string, string>()
		const storage = {
			getItem: vi.fn((key: string) => values.get(key) ?? null),
			setItem: vi.fn((key: string, value: string) => values.set(key, value)),
			removeItem: vi.fn((key: string) => values.delete(key)),
		}
		const getStorage = vi.fn(() => storage)
		const adapter = createLocalStorageAdapter(getStorage)
		expect(getStorage).not.toHaveBeenCalled()

		await expect(adapter.load("draft")).resolves.toBeUndefined()
		await adapter.save("draft", { value: 1 })
		await expect(adapter.load("draft")).resolves.toEqual({ value: 1 })
		await adapter.remove("draft")
		await expect(adapter.load("draft")).resolves.toBeUndefined()
		expect(getStorage).toHaveBeenCalledTimes(5)
	})
})
