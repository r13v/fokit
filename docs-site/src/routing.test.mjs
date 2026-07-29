import assert from "node:assert/strict"
import { test } from "node:test"

import { PAGE_IDS } from "./content.js"
import {
	applyRouteSideEffects,
	getRouteLinks,
	resolveRoute,
	routeHash,
} from "./routing.mjs"

function createStorage(initialLocale) {
	const values = new Map(
		initialLocale === undefined ? [] : [["fokit.docs.locale", initialLocale]],
	)

	return {
		getItem(key) {
			return values.get(key) ?? null
		},
		setItem(key, value) {
			values.set(key, value)
		},
		value(key) {
			return values.get(key)
		},
	}
}

test("routes prefer valid hash locale, then saved locale, then English", () => {
	assert.deepEqual(resolveRoute("", { savedLocale: undefined }), {
		locale: "en",
		pageId: "get-started",
		sectionId: undefined,
		hash: "#/en/get-started",
		normalized: true,
	})
	assert.equal(resolveRoute("", { savedLocale: "ru" }).locale, "ru")
	assert.equal(resolveRoute("#/en/types", { savedLocale: "ru" }).locale, "en")
	assert.equal(resolveRoute("#/ru/not-a-page").pageId, "get-started")
	assert.deepEqual(resolveRoute("#/missing/types", { savedLocale: "ru" }), {
		locale: "ru",
		pageId: "get-started",
		sectionId: undefined,
		hash: "#/ru/get-started",
		normalized: true,
	})
})

test("legacy lesson routes land in the nearest new documentation section", () => {
	assert.deepEqual(resolveRoute("#/en/overview"), {
		locale: "en",
		pageId: "get-started",
		sectionId: undefined,
		hash: "#/en/get-started",
		normalized: true,
	})
	assert.deepEqual(resolveRoute("#/ru/arrays"), {
		locale: "ru",
		pageId: "advanced",
		sectionId: undefined,
		hash: "#/ru/advanced",
		normalized: true,
	})
})

test("section routes stay shareable, validated, and locale-aware", () => {
	assert.deepEqual(resolveRoute("#/en/api/use-form"), {
		locale: "en",
		pageId: "api",
		sectionId: "use-form",
		hash: "#/en/api/use-form",
		normalized: false,
	})
	assert.deepEqual(resolveRoute("#/en/api/not-public"), {
		locale: "en",
		pageId: "api",
		sectionId: undefined,
		hash: "#/en/api",
		normalized: true,
	})
	assert.equal(
		routeHash("en", "get-started", "live-lab"),
		"#/en/get-started/live-lab",
	)
	assert.equal(routeHash("en", "api", "not-public"), "#/en/api")
	assert.equal(
		getRouteLinks(resolveRoute("#/en/api/use-form")).crossLocale.hash,
		"#/ru/api/use-form",
	)
})

test("route hashes, previous/next links, and cross-locale links use hash URLs", () => {
	for (const locale of ["en", "ru"]) {
		for (const pageId of PAGE_IDS) {
			const hash = routeHash(locale, pageId)
			assert.equal(hash, `#/${locale}/${pageId}`)

			const route = resolveRoute(hash)
			const links = getRouteLinks(route)
			assert.equal(
				links.crossLocale.hash,
				`#/${locale === "en" ? "ru" : "en"}/${pageId}`,
			)

			const index = PAGE_IDS.indexOf(pageId)
			assert.equal(
				links.previous?.hash,
				index > 0 ? `#/${locale}/${PAGE_IDS[index - 1]}` : undefined,
			)
			assert.equal(
				links.next?.hash,
				index < PAGE_IDS.length - 1
					? `#/${locale}/${PAGE_IDS[index + 1]}`
					: undefined,
			)
		}
	}
})

test("route side effects persist locale and update document metadata", () => {
	const storage = createStorage()
	const description = {
		value: "",
		setAttribute(name, value) {
			if (name === "content") {
				this.value = value
			}
		},
	}
	const document = {
		documentElement: { lang: "" },
		title: "",
		querySelector() {
			return description
		},
	}

	applyRouteSideEffects(
		{
			locale: "ru",
			pageId: "advanced",
			hash: "#/ru/advanced",
			normalized: false,
		},
		{ document, storage },
	)

	assert.equal(storage.value("fokit.docs.locale"), "ru")
	assert.equal(document.documentElement.lang, "ru")
	assert.match(document.title, /Fokit/)
	assert.match(document.title, /сценар/i)
	assert.match(description.value, /форм/i)
})
