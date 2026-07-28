import {
	DEFAULT_LESSON_ID,
	DEFAULT_LOCALE,
	getAdjacentLessons,
	getLesson,
	isLessonId,
	isLocale,
} from "./content.js"

const STORAGE_KEY = "fokit.docs.locale"

export function routeHash(locale, lessonId) {
	const safeLocale = isLocale(locale) ? locale : DEFAULT_LOCALE
	const safeLessonId = isLessonId(lessonId) ? lessonId : DEFAULT_LESSON_ID
	return `#/${safeLocale}/${safeLessonId}`
}

export function readSavedLocale(storage = globalThis.localStorage) {
	try {
		const value = storage?.getItem(STORAGE_KEY)
		return isLocale(value) ? value : undefined
	} catch {
		return undefined
	}
}

export function resolveRoute(hash = "", { savedLocale } = {}) {
	const parts = parseHash(hash)
	const hashLocale = parts[0]
	const hasValidHashLocale = isLocale(hashLocale)
	const locale = hasValidHashLocale
		? hashLocale
		: isLocale(savedLocale)
			? savedLocale
			: DEFAULT_LOCALE
	const lessonId =
		hasValidHashLocale && isLessonId(parts[1]) ? parts[1] : DEFAULT_LESSON_ID
	const normalizedHash = routeHash(locale, lessonId)

	return {
		locale,
		lessonId,
		hash: normalizedHash,
		normalized: hash !== normalizedHash,
	}
}

export function getRouteLinks(route) {
	const adjacent = getAdjacentLessons(route.locale, route.lessonId)
	const crossLocale = route.locale === "en" ? "ru" : "en"

	return {
		previous: adjacent.previous
			? toRouteLink(route.locale, adjacent.previous)
			: undefined,
		next: adjacent.next ? toRouteLink(route.locale, adjacent.next) : undefined,
		crossLocale: toRouteLink(
			crossLocale,
			getLesson(crossLocale, route.lessonId),
		),
	}
}

export function applyRouteSideEffects(
	route,
	{ document = globalThis.document, storage = globalThis.localStorage } = {},
) {
	try {
		storage?.setItem(STORAGE_KEY, route.locale)
	} catch {
		// Persistence is a convenience; routing still works when storage is blocked.
	}

	if (document?.documentElement) {
		document.documentElement.lang = route.locale
	}

	if (document) {
		document.title = `${getLesson(route.locale, route.lessonId).title} | Fokit`
	}
}

function parseHash(hash) {
	if (typeof hash !== "string" || !hash.startsWith("#/")) {
		return []
	}

	return hash.slice(2).split("/").filter(Boolean)
}

function toRouteLink(locale, lesson) {
	return {
		locale,
		lessonId: lesson.id,
		label: lesson.title,
		hash: routeHash(locale, lesson.id),
	}
}
