import { createRowIdentityChanges } from "./array-state.js"
import type { FinalizedFormEventListener } from "./feature-protocol.js"
import type { FormEvent } from "./form-events.js"
import type { FormDocument } from "./form-model.js"
import { isPlainObject } from "./object.js"
import { isDirtyEqual } from "./value.js"

export class CommitTimeline<Input, Context> {
	#listeners: Set<FinalizedFormEventListener<Input, Context>> | undefined

	get hasListeners(): boolean {
		return this.#listeners !== undefined
	}

	subscribe(listener: FinalizedFormEventListener<Input, Context>): () => void {
		if (typeof listener !== "function") {
			throw new TypeError("Finalized-event listener must be a function")
		}

		this.#listeners ??= new Set()
		const listeners = this.#listeners
		listeners.add(listener)
		let subscribed = true
		return () => {
			if (!subscribed) return
			subscribed = false
			listeners.delete(listener)
			if (listeners.size === 0) this.#listeners = undefined
		}
	}

	finalize(
		event: FormEvent<Input, Context>,
		previousDocument: FormDocument<Input>,
		document: FormDocument<Input>,
	): void {
		const listeners = this.#listeners
		if (listeners === undefined) return

		const notification = Object.freeze({
			event,
			document,
			changedPaths: deriveEffectiveChangedPaths(
				event,
				previousDocument,
				document,
			),
		})
		for (const listener of [...listeners]) listener(notification)
	}
}

function deriveEffectiveChangedPaths<Input, Context>(
	event: FormEvent<Input, Context>,
	previousDocument: FormDocument<Input>,
	document: FormDocument<Input>,
): readonly string[] {
	if (
		event.type !== "document/committed" &&
		event.type !== "document/restored"
	) {
		return Object.freeze([])
	}

	const paths = new Set<string>()
	if (event.type === "document/committed") {
		for (const change of event.changes) paths.add(change.path)
		for (const change of event.rowIdentityChanges) {
			if ("previousPath" in change) paths.add(change.previousPath)
			if ("path" in change) paths.add(change.path)
			if (change.type === "array/paths-reindexed") {
				for (const pathChange of change.paths) {
					paths.add(pathChange.previousPath)
					paths.add(pathChange.path)
				}
			}
		}
	} else {
		collectChangedValuePaths(
			previousDocument.values,
			document.values,
			"",
			paths,
		)
		for (const change of createRowIdentityChanges(
			previousDocument.rowIdentity,
			document.rowIdentity,
		)) {
			if ("path" in change) paths.add(change.path)
		}
	}

	return Object.freeze([...paths])
}

function collectChangedValuePaths(
	previous: unknown,
	next: unknown,
	path: string,
	paths: Set<string>,
): void {
	if (isDirtyEqual(previous, next)) return

	if (Array.isArray(previous) && Array.isArray(next)) {
		if (previous.length !== next.length && path !== "") paths.add(path)
		const length = Math.max(previous.length, next.length)
		for (let index = 0; index < length; index++) {
			const itemPath = path === "" ? String(index) : `${path}.${index}`
			if (index >= previous.length || index >= next.length) {
				paths.add(itemPath)
			} else {
				collectChangedValuePaths(previous[index], next[index], itemPath, paths)
			}
		}
		return
	}

	if (isPlainObject(previous) && isPlainObject(next)) {
		const keys = new Set([...Object.keys(previous), ...Object.keys(next)])
		for (const key of keys) {
			const itemPath = path === "" ? key : `${path}.${key}`
			if (!(key in previous) || !(key in next)) {
				paths.add(itemPath)
			} else {
				collectChangedValuePaths(previous[key], next[key], itemPath, paths)
			}
		}
		return
	}

	paths.add(path)
}
