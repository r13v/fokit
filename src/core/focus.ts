import type { FormSnapshot } from "./form-state.js"

type FocusTargetOptions = {
	readonly preventScroll?: boolean
}

export type FocusTarget = {
	focus(options?: FocusTargetOptions): void
}

export class FormFocus<Input, Context> {
	readonly #fieldTargets = new Map<string, FocusTarget>()
	readonly #summaryTargets = new Map<number, FocusTarget>()

	registerField(path: string, element: FocusTarget | null): void {
		if (element === null) {
			this.#fieldTargets.delete(path)
			return
		}
		this.#fieldTargets.set(path, element)
	}

	registerSummary(index: number, element: FocusTarget | null): void {
		if (element === null) {
			this.#summaryTargets.delete(index)
			return
		}
		this.#summaryTargets.set(index, element)
	}

	focusField(path: string, snapshot: FormSnapshot<Input, Context>): boolean {
		const field = snapshot.resolvedUi.fieldsByPath[path]
		if (
			field === undefined ||
			!field.visible ||
			field.disabled ||
			field.readOnly
		) {
			return false
		}
		const target = this.#fieldTargets.get(path)
		if (target === undefined) return false
		target.focus()
		return true
	}

	focusFirstError(
		snapshot: FormSnapshot<Input, Context>,
		paths: readonly string[] | undefined,
		matches: (path: string, paths: readonly string[] | undefined) => boolean,
	): boolean {
		for (const [path, issues] of snapshot.displayErrors.fields) {
			if (
				issues.length > 0 &&
				matches(path, paths) &&
				this.focusField(path, snapshot)
			) {
				return true
			}
		}

		for (const [index, issue] of snapshot.displayErrors.summary.entries()) {
			const issueMatches =
				issue.path === undefined
					? paths === undefined
					: matches(issue.path, paths)
			const target = this.#summaryTargets.get(index)
			if (!issueMatches || target === undefined) continue
			target.focus()
			return true
		}

		return false
	}
}
