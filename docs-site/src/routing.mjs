import {
	DEFAULT_LOCALE,
	DEFAULT_PAGE_ID,
	getAdjacentPages,
	getPage,
	isLocale,
	isPageId,
} from "./content.js"

const STORAGE_KEY = "fokit.docs.locale"

const legacyPageMap = {
	overview: "get-started",
	"first-form": "get-started",
	"controls-and-slots": "get-started",
	"validation-and-conditions": "advanced",
	arrays: "advanced",
	"manual-composition": "advanced",
	"classic-submit": "advanced",
	"server-form-data": "advanced",
	"react19-actions": "advanced",
	"styling-testing-boundaries": "advanced",
}

export function routeHash(locale, pageId, sectionId) {
	const safeLocale = isLocale(locale) ? locale : DEFAULT_LOCALE
	const safePageId = isPageId(pageId) ? pageId : DEFAULT_PAGE_ID
	const safeSectionId = isSectionId(safeLocale, safePageId, sectionId)
		? sectionId
		: undefined
	return `#/${safeLocale}/${safePageId}${safeSectionId ? `/${safeSectionId}` : ""}`
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
	const requestedPageId = parts[1]
	const legacyPageId = legacyPageMap[requestedPageId]
	const pageId =
		hasValidHashLocale && isPageId(requestedPageId)
			? requestedPageId
			: hasValidHashLocale && legacyPageId !== undefined
				? legacyPageId
				: DEFAULT_PAGE_ID
	const requestedSectionId = parts[2]
	const sectionId = isSectionId(locale, pageId, requestedSectionId)
		? requestedSectionId
		: undefined
	const normalizedHash = routeHash(locale, pageId, sectionId)

	return {
		locale,
		pageId,
		sectionId,
		hash: normalizedHash,
		normalized: hash !== normalizedHash,
	}
}

export function getRouteLinks(route) {
	const adjacent = getAdjacentPages(route.locale, route.pageId)
	const crossLocale = route.locale === "en" ? "ru" : "en"

	return {
		previous: adjacent.previous
			? toRouteLink(route.locale, adjacent.previous)
			: undefined,
		next: adjacent.next ? toRouteLink(route.locale, adjacent.next) : undefined,
		crossLocale: toRouteLink(
			crossLocale,
			getPage(crossLocale, route.pageId),
			route.sectionId,
		),
	}
}

function isSectionId(locale, pageId, sectionId) {
	if (typeof sectionId !== "string") {
		return false
	}

	const page = getPage(locale, pageId)
	return (
		page.sections.some((section) => section.id === sectionId) ||
		(page.showLab === true && sectionId === "live-lab")
	)
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
		const page = getPage(route.locale, route.pageId)
		document.title = `${page.title} | Fokit`
		document
			.querySelector?.('meta[name="description"]')
			?.setAttribute("content", page.subtitle)
		document
			.querySelector?.('meta[property="og:title"]')
			?.setAttribute("content", `${page.title} | Fokit`)
		document
			.querySelector?.('meta[property="og:description"]')
			?.setAttribute("content", page.subtitle)
	}
}

function parseHash(hash) {
	if (typeof hash !== "string" || !hash.startsWith("#/")) {
		return []
	}

	return hash.slice(2).split("/").filter(Boolean)
}

function toRouteLink(locale, page, sectionId) {
	return {
		locale,
		pageId: page.id,
		label: page.title,
		hash: routeHash(locale, page.id, sectionId),
	}
}
