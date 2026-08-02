export type SnapshotSelector<Snapshot, Selected> = (
	snapshot: Snapshot,
) => Selected

export type SnapshotListener<Selected> = (
	selected: Selected,
	previous: Selected,
) => void

type Subscription<Snapshot, Selected = unknown> = {
	readonly selector: SnapshotSelector<Snapshot, Selected>
	readonly listener: SnapshotListener<Selected>
	readonly equalityFn: (previous: Selected, next: Selected) => boolean
	selected: Selected
}

export class FormPublication<Snapshot> {
	readonly #serverSnapshot: Snapshot
	readonly #subscriptions = new Set<Subscription<Snapshot>>()
	#snapshot: Snapshot

	constructor(snapshot: Snapshot) {
		this.#snapshot = snapshot
		this.#serverSnapshot = snapshot
	}

	getSnapshot(): Snapshot {
		return this.#snapshot
	}

	getServerSnapshot(): Snapshot {
		return this.#serverSnapshot
	}

	subscribe<Selected>(
		selector: SnapshotSelector<Snapshot, Selected>,
		listener: SnapshotListener<Selected>,
		equalityFn: (previous: Selected, next: Selected) => boolean,
	): () => void {
		const subscription: Subscription<Snapshot, Selected> = {
			selector,
			listener,
			equalityFn,
			selected: selector(this.#snapshot),
		}
		this.#subscriptions.add(subscription as Subscription<Snapshot>)

		return () => {
			this.#subscriptions.delete(subscription as Subscription<Snapshot>)
		}
	}

	publish(snapshot: Snapshot): void {
		if (Object.is(snapshot, this.#snapshot)) return
		this.#snapshot = snapshot

		for (const subscription of [...this.#subscriptions]) {
			if (!this.#subscriptions.has(subscription)) continue
			const nextSelected = subscription.selector(snapshot)
			if (subscription.equalityFn(subscription.selected, nextSelected)) continue
			const previousSelected = subscription.selected
			subscription.selected = nextSelected
			subscription.listener(nextSelected, previousSelected)
		}
	}
}
