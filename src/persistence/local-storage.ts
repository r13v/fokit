import type { FormPersistenceAdapter } from "./persistence.js"

export type PersistenceStorage = Readonly<{
	getItem(key: string): string | null
	setItem(key: string, value: string): void
	removeItem(key: string): void
}>

export function createLocalStorageAdapter(
	getStorage: () => PersistenceStorage,
): FormPersistenceAdapter {
	if (typeof getStorage !== "function") {
		throw new TypeError("localStorage adapter requires a storage getter")
	}
	return Object.freeze({
		async load(key) {
			const value = getStorage().getItem(key)
			return value === null ? undefined : JSON.parse(value)
		},
		async save(key, value) {
			getStorage().setItem(key, JSON.stringify(value))
		},
		async remove(key) {
			getStorage().removeItem(key)
		},
	})
}
