import { useSyncExternalStore } from "react"

type ExternalStore<Snapshot> = Readonly<{
	getSnapshot(): Snapshot
	subscribe(listener: () => void): () => void
}>

/** Reads and subscribes to a React-compatible external store. */
export function useSnapshot<Snapshot>(
	store: ExternalStore<Snapshot>,
): Snapshot {
	return useSyncExternalStore(
		store.subscribe,
		store.getSnapshot,
		store.getSnapshot,
	)
}
