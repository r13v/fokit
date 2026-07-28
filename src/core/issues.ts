import type { StandardSchemaV1 } from "@standard-schema/spec"

import { reindexArrayPath } from "./array-state.js"
import {
	formatPath,
	isDescendantPath,
	isSamePath,
	type PathInput,
	type PathSegment,
	pathsOverlap,
} from "./path.js"
import type { ResolvedUiState } from "./resolve-ui.js"

export type FormIssue = {
	readonly path?: string
	readonly code?: string
	readonly message: string
	readonly source: "manual" | "schema" | "server"
}

type ImperativeIssueSource = "manual" | "server"

export type ImperativeFormIssue = Omit<FormIssue, "source"> & {
	readonly source: ImperativeIssueSource
}

export type FormErrors = {
	readonly form: readonly FormIssue[]
	readonly fields: ReadonlyMap<string, readonly FormIssue[]>
}

export type DisplayFormErrors = FormErrors & {
	readonly summary: readonly FormIssue[]
}

export type DerivedFormErrors = {
	readonly errors: FormErrors
	readonly displayErrors: DisplayFormErrors
}

type IssueExposureState = {
	readonly all: boolean
	readonly form: boolean
	readonly paths: ReadonlySet<string>
	readonly imperativeFormSources: ReadonlySet<ImperativeIssueSource>
	readonly imperativePathSources: ReadonlyMap<
		string,
		ReadonlySet<ImperativeIssueSource>
	>
}

export type IssueState = {
	readonly issues: readonly FormIssue[]
	readonly exposure: IssueExposureState
}

const imperativeSources = new Set(["manual", "server"])

const emptyIssues = Object.freeze([]) as readonly FormIssue[]
const emptyExposure = createIssueExposureState()
const emptyIssueState = Object.freeze({
	issues: emptyIssues,
	exposure: emptyExposure,
}) satisfies IssueState

export function createIssueState(
	issues: readonly FormIssue[] = emptyIssues,
): IssueState {
	if (issues.length === 0) {
		return emptyIssueState
	}

	return createIssueStateFromNormalized(
		issues.map((issue) => normalizeFormIssue(issue)),
		emptyExposure,
	)
}

export function isIssueStateEmpty(state: IssueState): boolean {
	return state.issues.length === 0 && isExposureEmpty(state.exposure)
}

export function deriveFormErrors<Context>(
	state: IssueState,
	resolvedUi: ResolvedUiState<Context>,
): DerivedFormErrors {
	const formIssues: FormIssue[] = []
	const fieldIssues = new Map<string, FormIssue[]>()
	const displayFormIssues: FormIssue[] = []
	const displayFieldIssues = new Map<string, FormIssue[]>()
	const summaryIssues: FormIssue[] = []

	for (const issue of state.issues) {
		if (issue.path === undefined) {
			formIssues.push(issue)
		} else {
			pushMapIssue(fieldIssues, issue.path, issue)
		}

		if (!isIssueExposed(issue, state.exposure)) {
			continue
		}

		if (issue.path === undefined) {
			displayFormIssues.push(issue)
			summaryIssues.push(issue)
			continue
		}

		pushMapIssue(displayFieldIssues, issue.path, issue)
		if (!hasVisibleOwner(issue.path, resolvedUi)) {
			summaryIssues.push(issue)
		}
	}

	return Object.freeze({
		errors: createFormErrors(formIssues, fieldIssues),
		displayErrors: createDisplayFormErrors(
			displayFormIssues,
			displayFieldIssues,
			summaryIssues,
		),
	})
}

export function setImperativeIssues(
	state: IssueState,
	issues: readonly ImperativeFormIssue[],
): IssueState {
	const normalized = issues.map((issue) => normalizeImperativeIssue(issue))
	const suppliedSources = new Set(
		normalized.map((issue) => issue.source),
	) as ReadonlySet<ImperativeIssueSource>

	if (suppliedSources.size === 0) {
		return clearImperativeIssues(state)
	}

	const nextIssues = [
		...state.issues.filter(
			(issue) =>
				!isImperativeSource(issue.source) || !suppliedSources.has(issue.source),
		),
		...normalized,
	]
	const nextExposure = exposeImperativeIssues(state.exposure, normalized)

	return createIssueStateFromNormalized(nextIssues, nextExposure)
}

export function replaceServerIssues(
	state: IssueState,
	issues: readonly ImperativeFormIssue[],
	exposure: {
		readonly all?: boolean
	} = {},
): IssueState {
	const normalized = issues.map((issue) => {
		const normalizedIssue = normalizeImperativeIssue(issue)
		if (normalizedIssue.source !== "server") {
			throw new TypeError("Action results accept only server issues here")
		}

		return normalizedIssue
	})
	const nextIssues = [
		...state.issues.filter((issue) => issue.source !== "server"),
		...normalized,
	]
	const nextExposure =
		exposure.all === true
			? createIssueExposureState({
					...state.exposure,
					all: true,
				})
			: state.exposure

	return createIssueStateFromNormalized(nextIssues, nextExposure)
}

export function clearImperativeIssues(
	state: IssueState,
	path?: PathInput,
): IssueState {
	const canonicalPath = path === undefined ? undefined : formatPath(path)
	let removed = false
	const nextIssues = state.issues.filter((issue) => {
		if (!isImperativeSource(issue.source)) {
			return true
		}

		if (canonicalPath === undefined) {
			removed = true
			return false
		}

		if (
			issue.path !== undefined &&
			(isSamePath(issue.path, canonicalPath) ||
				isDescendantPath(issue.path, canonicalPath))
		) {
			removed = true
			return false
		}

		return true
	})
	const nextExposure = removeImperativeExposure(state.exposure, {
		path: canonicalPath,
		sources: ["manual", "server"],
	})

	if (!removed && nextExposure === state.exposure) {
		return state
	}

	return createIssueStateFromNormalized(nextIssues, nextExposure)
}

export function clearServerIssuesForChanges(
	state: IssueState,
	paths: readonly PathInput[],
): IssueState {
	const changedPaths = paths.map((path) => formatPath(path))
	if (changedPaths.length === 0) {
		return state
	}

	const removedIssues: FormIssue[] = []
	const nextIssues = state.issues.filter((issue) => {
		if (issue.source !== "server") {
			return true
		}

		const stale =
			issue.path === undefined ||
			changedPaths.some((path) => pathsOverlap(issue.path as string, path))

		if (stale) {
			removedIssues.push(issue)
		}

		return !stale
	})

	if (removedIssues.length === 0) {
		return state
	}

	return createIssueStateFromNormalized(
		nextIssues,
		removeImperativeExposureForIssues(state.exposure, removedIssues, "server"),
	)
}

export function exposeIssuePaths(
	state: IssueState,
	paths: readonly PathInput[],
): IssueState {
	if (paths.length === 0) {
		return state
	}

	const nextPaths = new Set(state.exposure.paths)
	let changed = false
	for (const path of paths) {
		const canonicalPath = formatPath(path)
		if (!nextPaths.has(canonicalPath)) {
			changed = true
			nextPaths.add(canonicalPath)
		}
	}

	if (!changed) {
		return state
	}

	return createIssueStateFromNormalized(
		state.issues,
		createIssueExposureState({
			...state.exposure,
			paths: nextPaths,
		}),
	)
}

export function exposeAllIssues(state: IssueState): IssueState {
	if (state.exposure.all) {
		return state
	}

	return createIssueStateFromNormalized(
		state.issues,
		createIssueExposureState({
			...state.exposure,
			all: true,
		}),
	)
}

export function replaceSchemaIssues(
	state: IssueState,
	issues: readonly FormIssue[],
	exposure: {
		readonly all?: boolean
		readonly paths?: readonly PathInput[]
	} = {},
): IssueState {
	const normalized = issues.map((issue) => normalizeSchemaIssue(issue))
	const nextIssues = [
		...state.issues.filter((issue) => issue.source !== "schema"),
		...normalized,
	]
	let nextExposure = state.exposure

	if (exposure.all === true) {
		nextExposure = createIssueExposureState({
			...nextExposure,
			all: true,
		})
	}

	if (exposure.paths !== undefined && exposure.paths.length > 0) {
		const nextPaths = new Set(nextExposure.paths)
		for (const path of exposure.paths) {
			nextPaths.add(formatPath(path))
		}
		nextExposure = createIssueExposureState({
			...nextExposure,
			paths: nextPaths,
		})
	}

	return createIssueStateFromNormalized(nextIssues, nextExposure)
}

export function reindexIssueStateArrayPaths(
	state: IssueState,
	arrayPath: string,
	previousKeys: readonly string[],
	nextKeys: readonly string[],
): IssueState {
	const reindexedSources = new Set(["manual", "schema"])
	const nextIssues: FormIssue[] = []
	let issuesChanged = false

	for (const issue of state.issues) {
		if (issue.path === undefined || !reindexedSources.has(issue.source)) {
			nextIssues.push(issue)
			continue
		}

		const nextPath = reindexArrayPath(
			issue.path,
			arrayPath,
			previousKeys,
			nextKeys,
		)

		if (nextPath === undefined) {
			issuesChanged = true
			continue
		}

		if (nextPath === issue.path) {
			nextIssues.push(issue)
			continue
		}

		issuesChanged = true
		nextIssues.push(
			Object.freeze({
				...issue,
				path: nextPath,
			}),
		)
	}

	const nextExposure = reindexExposureArrayPaths(
		state.exposure,
		arrayPath,
		previousKeys,
		nextKeys,
		reindexedSources,
	)

	if (!issuesChanged && nextExposure === state.exposure) {
		return state
	}

	return createIssueStateFromNormalized(nextIssues, nextExposure)
}

export function normalizeStandardSchemaIssue(
	issue: StandardSchemaV1.Issue,
): FormIssue {
	const code = getIssueCode(issue)
	const base = {
		source: "schema" as const,
		message: issue.message,
		...(code === undefined ? {} : { code }),
	}

	const path = normalizeStandardSchemaPath(issue.path)
	return Object.freeze(path === undefined ? base : { ...base, path })
}

function normalizeFormIssue(issue: FormIssue): FormIssue {
	if (!isObjectRecord(issue)) {
		throw new TypeError("Form issue must be an object")
	}

	const source = normalizeIssueSource(issue.source)
	const message = normalizeIssueMessage(issue.message)
	const code = normalizeIssueCode(issue.code)
	const path = issue.path === undefined ? undefined : formatPath(issue.path)

	return Object.freeze({
		source,
		message,
		...(code === undefined ? {} : { code }),
		...(path === undefined ? {} : { path }),
	})
}

function normalizeImperativeIssue(issue: ImperativeFormIssue): FormIssue {
	const normalized = normalizeFormIssue(issue)
	if (!isImperativeSource(normalized.source)) {
		throw new TypeError("setErrors accepts only manual or server issues")
	}

	return normalized
}

function normalizeSchemaIssue(issue: FormIssue): FormIssue {
	const normalized = normalizeFormIssue(issue)
	if (normalized.source !== "schema") {
		throw new TypeError("Validation accepts only schema issues")
	}

	return normalized
}

function createIssueStateFromNormalized(
	issues: readonly FormIssue[],
	exposure: IssueExposureState,
): IssueState {
	if (issues.length === 0 && isExposureEmpty(exposure)) {
		return emptyIssueState
	}

	return Object.freeze({
		issues: Object.freeze([...issues]),
		exposure,
	})
}

function createIssueExposureState(
	options: Partial<IssueExposureState> = {},
): IssueExposureState {
	return Object.freeze({
		all: options.all === true,
		form: options.form === true,
		paths: new Set(options.paths),
		imperativeFormSources: new Set(options.imperativeFormSources),
		imperativePathSources: createReadonlySourceMap(
			options.imperativePathSources,
		),
	})
}

function createFormErrors(
	form: readonly FormIssue[],
	fields: ReadonlyMap<string, readonly FormIssue[] | FormIssue[]>,
): FormErrors {
	return Object.freeze({
		form: freezeIssueArray(form),
		fields: createReadonlyMap(
			[...fields].map(([path, issues]) => [path, freezeIssueArray(issues)]),
		),
	})
}

function createDisplayFormErrors(
	form: readonly FormIssue[],
	fields: ReadonlyMap<string, readonly FormIssue[] | FormIssue[]>,
	summary: readonly FormIssue[],
): DisplayFormErrors {
	return Object.freeze({
		...createFormErrors(form, fields),
		summary: freezeIssueArray(summary),
	})
}

function pushMapIssue(
	map: Map<string, FormIssue[]>,
	path: string,
	issue: FormIssue,
): void {
	const issues = map.get(path)
	if (issues === undefined) {
		map.set(path, [issue])
		return
	}

	issues.push(issue)
}

function isIssueExposed(
	issue: FormIssue,
	exposure: IssueExposureState,
): boolean {
	if (exposure.all) {
		return true
	}

	if (issue.path === undefined) {
		return (
			exposure.form ||
			(isImperativeSource(issue.source) &&
				exposure.imperativeFormSources.has(issue.source))
		)
	}

	for (const path of exposure.paths) {
		if (pathsOverlap(issue.path, path)) {
			return true
		}
	}

	if (!isImperativeSource(issue.source)) {
		return false
	}

	for (const [path, sources] of exposure.imperativePathSources) {
		if (sources.has(issue.source) && pathsOverlap(issue.path, path)) {
			return true
		}
	}

	return false
}

function exposeImperativeIssues(
	exposure: IssueExposureState,
	issues: readonly FormIssue[],
): IssueExposureState {
	const formSources = new Set(exposure.imperativeFormSources)
	const pathSources = cloneSourceMap(exposure.imperativePathSources)

	for (const issue of issues) {
		if (!isImperativeSource(issue.source)) {
			continue
		}

		if (issue.path === undefined) {
			formSources.add(issue.source)
			continue
		}

		addPathSource(pathSources, issue.path, issue.source)
	}

	return createIssueExposureState({
		...exposure,
		imperativeFormSources: formSources,
		imperativePathSources: pathSources,
	})
}

function removeImperativeExposure(
	exposure: IssueExposureState,
	options: {
		readonly path?: string
		readonly sources: readonly ImperativeIssueSource[]
	},
): IssueExposureState {
	const sourceSet = new Set(options.sources)
	const formSources = new Set(exposure.imperativeFormSources)
	const pathSources = cloneSourceMap(exposure.imperativePathSources)
	let changed = false

	if (options.path === undefined) {
		for (const source of sourceSet) {
			changed ||= formSources.delete(source)
		}
		for (const [path, sources] of [...pathSources]) {
			for (const source of sourceSet) {
				changed ||= sources.delete(source)
			}

			if (sources.size === 0) {
				pathSources.delete(path)
			}
		}
	} else {
		for (const [path, sources] of [...pathSources]) {
			if (
				!isSamePath(path, options.path) &&
				!isDescendantPath(path, options.path)
			) {
				continue
			}

			for (const source of sourceSet) {
				changed ||= sources.delete(source)
			}

			if (sources.size === 0) {
				pathSources.delete(path)
			}
		}
	}

	if (!changed) {
		return exposure
	}

	return createIssueExposureState({
		...exposure,
		imperativeFormSources: formSources,
		imperativePathSources: pathSources,
	})
}

function removeImperativeExposureForIssues(
	exposure: IssueExposureState,
	issues: readonly FormIssue[],
	source: ImperativeIssueSource,
): IssueExposureState {
	let nextExposure = exposure
	for (const issue of issues) {
		nextExposure = removeImperativeExposure(nextExposure, {
			path: issue.path,
			sources: [source],
		})
	}

	return nextExposure
}

function reindexExposureArrayPaths(
	exposure: IssueExposureState,
	arrayPath: string,
	previousKeys: readonly string[],
	nextKeys: readonly string[],
	reindexedSources: ReadonlySet<string>,
): IssueExposureState {
	const nextPaths = new Set<string>()
	let changed = false

	for (const path of exposure.paths) {
		const nextPath = reindexArrayPath(path, arrayPath, previousKeys, nextKeys)
		if (nextPath === undefined) {
			changed = true
			continue
		}

		changed ||= nextPath !== path
		nextPaths.add(nextPath)
	}

	const nextImperativePathSources = new Map<
		string,
		Set<ImperativeIssueSource>
	>()
	for (const [path, sources] of exposure.imperativePathSources) {
		for (const source of sources) {
			if (!reindexedSources.has(source)) {
				addPathSource(nextImperativePathSources, path, source)
				continue
			}

			const nextPath = reindexArrayPath(path, arrayPath, previousKeys, nextKeys)
			if (nextPath === undefined) {
				changed = true
				continue
			}

			changed ||= nextPath !== path
			addPathSource(nextImperativePathSources, nextPath, source)
		}
	}

	if (!changed && exposure.paths.size === nextPaths.size) {
		return exposure
	}

	return createIssueExposureState({
		...exposure,
		paths: nextPaths,
		imperativePathSources: nextImperativePathSources,
	})
}

function hasVisibleOwner<Context>(
	path: string,
	resolvedUi: ResolvedUiState<Context>,
): boolean {
	const field = resolvedUi.fieldsByPath[path]
	if (field !== undefined) {
		return field.visible
	}

	const array = resolvedUi.arraysByPath[path]
	if (array !== undefined) {
		return array.visible
	}

	return false
}

function normalizeStandardSchemaPath(
	path: StandardSchemaV1.Issue["path"],
): string | undefined {
	if (path === undefined || path.length === 0) {
		return undefined
	}

	const segments: PathSegment[] = []
	for (const segment of path) {
		const key = normalizeStandardSchemaPathKey(segment)
		if (key === undefined) {
			return undefined
		}
		segments.push(key)
	}

	try {
		return formatPath(segments)
	} catch {
		return undefined
	}
}

function normalizeStandardSchemaPathKey(
	segment: PropertyKey | StandardSchemaV1.PathSegment,
): PathSegment | undefined {
	const key =
		isObjectRecord(segment) && Object.hasOwn(segment, "key")
			? segment.key
			: segment

	return typeof key === "string" || typeof key === "number" ? key : undefined
}

function getIssueCode(issue: StandardSchemaV1.Issue): string | undefined {
	const candidate = issue as { readonly code?: unknown }
	return typeof candidate.code === "string" ? candidate.code : undefined
}

function normalizeIssueSource(source: unknown): FormIssue["source"] {
	if (source === "manual" || source === "schema" || source === "server") {
		return source
	}

	throw new TypeError(`Unsupported issue source "${String(source)}"`)
}

function normalizeIssueMessage(message: unknown): string {
	if (typeof message !== "string") {
		throw new TypeError("Form issue message must be a string")
	}

	return message
}

function normalizeIssueCode(code: unknown): string | undefined {
	if (code === undefined) {
		return undefined
	}

	if (typeof code !== "string") {
		throw new TypeError("Form issue code must be a string")
	}

	return code
}

function isImperativeSource(
	source: FormIssue["source"],
): source is ImperativeIssueSource {
	return imperativeSources.has(source)
}

function isExposureEmpty(exposure: IssueExposureState): boolean {
	return (
		!exposure.all &&
		!exposure.form &&
		exposure.paths.size === 0 &&
		exposure.imperativeFormSources.size === 0 &&
		exposure.imperativePathSources.size === 0
	)
}

function freezeIssueArray(issues: readonly FormIssue[]): readonly FormIssue[] {
	return Object.freeze([...issues])
}

function cloneSourceMap(
	sourceMap: ReadonlyMap<string, ReadonlySet<ImperativeIssueSource>>,
): Map<string, Set<ImperativeIssueSource>> {
	const cloned = new Map<string, Set<ImperativeIssueSource>>()
	for (const [path, sources] of sourceMap) {
		cloned.set(path, new Set(sources))
	}

	return cloned
}

function addPathSource(
	sourceMap: Map<string, Set<ImperativeIssueSource>>,
	path: string,
	source: ImperativeIssueSource,
): void {
	const sources = sourceMap.get(path)
	if (sources === undefined) {
		sourceMap.set(path, new Set([source]))
		return
	}

	sources.add(source)
}

function createReadonlySourceMap(
	sourceMap:
		| ReadonlyMap<string, ReadonlySet<ImperativeIssueSource>>
		| undefined,
): ReadonlyMap<string, ReadonlySet<ImperativeIssueSource>> {
	const entries =
		sourceMap === undefined
			? []
			: [...sourceMap].map(
					([path, sources]) =>
						[
							path,
							new Set(sources) as ReadonlySet<ImperativeIssueSource>,
						] as const,
				)

	return createReadonlyMap(entries)
}

function createReadonlyMap<K, V>(
	entries: Iterable<readonly [K, V]>,
): ReadonlyMap<K, V> {
	const map = new Map(entries)
	let readonlyMap: ReadonlyMap<K, V>
	const wrapper = {
		get size() {
			return map.size
		},
		get(key: K) {
			return map.get(key)
		},
		has(key: K) {
			return map.has(key)
		},
		forEach(
			callback: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
			thisArg?: unknown,
		) {
			for (const [key, value] of map) {
				callback.call(thisArg, value, key, readonlyMap)
			}
		},
		entries() {
			return map.entries()
		},
		keys() {
			return map.keys()
		},
		values() {
			return map.values()
		},
		[Symbol.iterator]() {
			return map[Symbol.iterator]()
		},
		[Symbol.toStringTag]: "Map",
	}
	readonlyMap = Object.freeze(wrapper) as ReadonlyMap<K, V>
	return readonlyMap
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object") {
		return false
	}

	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}
