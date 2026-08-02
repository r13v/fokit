import { useSyncExternalStore } from "react"

type Snapshotable<Snapshot> = {
	subscribe: (onStoreChange: () => void) => () => void
	getSnapshot: () => Snapshot
	getServerSnapshot?: () => Snapshot
}

export function useSnapshot<Snapshot>(s: Snapshotable<Snapshot>): Snapshot {
	return useSyncExternalStore(s.subscribe, s.getSnapshot, s.getSnapshot)
}
