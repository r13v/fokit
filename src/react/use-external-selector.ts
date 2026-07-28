"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

import type {
	FormInput,
	FormSnapshot,
	FormStore,
	FormStoreSelector,
	StandardSchema,
} from "../core/index.js"

export type ExternalSelectorOptions<Selected> = {
	readonly equalityFn?: (previous: Selected, next: Selected) => boolean
}

export function useExternalSelector<
	Schema extends StandardSchema,
	Context,
	Selected,
>(
	form: FormStore<Schema, Context>,
	selector: FormStoreSelector<FormInput<Schema>, Context, Selected>,
	options: ExternalSelectorOptions<Selected> = {},
): Selected {
	const equalityFn = options.equalityFn ?? Object.is
	const subscribe = useCallback(
		(notify: () => void) =>
			form.subscribe(selector, notify, {
				equalityFn,
			}),
		[form, selector, equalityFn],
	)
	const getSnapshot = useMemo(
		() =>
			createSelectedSnapshotGetter(
				() => form.getSnapshot(),
				selector,
				equalityFn,
			),
		[form, selector, equalityFn],
	)
	const getServerSnapshot = useMemo(
		() =>
			createSelectedSnapshotGetter(
				() => form.getServerSnapshot(),
				selector,
				equalityFn,
			),
		[form, selector, equalityFn],
	)

	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

function createSelectedSnapshotGetter<Input, Context, Selected>(
	getSnapshot: () => FormSnapshot<Input, Context>,
	selector: FormStoreSelector<Input, Context, Selected>,
	equalityFn: (previous: Selected, next: Selected) => boolean,
): () => Selected {
	let hasSelected = false
	let lastSnapshot: FormSnapshot<Input, Context> | undefined
	let lastSelected: Selected | undefined

	return () => {
		const snapshot = getSnapshot()
		if (hasSelected && Object.is(snapshot, lastSnapshot)) {
			return lastSelected as Selected
		}

		const selected = selector(snapshot)
		if (hasSelected && equalityFn(lastSelected as Selected, selected)) {
			lastSnapshot = snapshot
			return lastSelected as Selected
		}

		hasSelected = true
		lastSnapshot = snapshot
		lastSelected = selected
		return selected
	}
}
