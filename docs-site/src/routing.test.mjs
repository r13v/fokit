import assert from "node:assert/strict"
import { test } from "node:test"

import { LESSON_IDS } from "./content.js"
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
		lessonId: "overview",
		hash: "#/en/overview",
		normalized: true,
	})
	assert.equal(resolveRoute("", { savedLocale: "ru" }).locale, "ru")
	assert.equal(resolveRoute("#/en/arrays", { savedLocale: "ru" }).locale, "en")
	assert.equal(resolveRoute("#/ru/not-a-lesson").lessonId, "overview")
	assert.deepEqual(resolveRoute("#/missing/arrays", { savedLocale: "ru" }), {
		locale: "ru",
		lessonId: "overview",
		hash: "#/ru/overview",
		normalized: true,
	})
})

test("route hashes, previous/next links, and cross-locale links use hash URLs", () => {
	for (const locale of ["en", "ru"]) {
		for (const lessonId of LESSON_IDS) {
			const hash = routeHash(locale, lessonId)
			assert.equal(hash, `#/${locale}/${lessonId}`)

			const route = resolveRoute(hash)
			const links = getRouteLinks(route)
			assert.equal(
				links.crossLocale.hash,
				`#/${locale === "en" ? "ru" : "en"}/${lessonId}`,
			)

			const index = LESSON_IDS.indexOf(lessonId)
			assert.equal(
				links.previous?.hash,
				index > 0 ? `#/${locale}/${LESSON_IDS[index - 1]}` : undefined,
			)
			assert.equal(
				links.next?.hash,
				index < LESSON_IDS.length - 1
					? `#/${locale}/${LESSON_IDS[index + 1]}`
					: undefined,
			)
		}
	}
})

test("route side effects persist locale and update document metadata", () => {
	const storage = createStorage()
	const document = {
		documentElement: { lang: "" },
		title: "",
	}

	applyRouteSideEffects(
		{
			locale: "ru",
			lessonId: "arrays",
			hash: "#/ru/arrays",
			normalized: false,
		},
		{ document, storage },
	)

	assert.equal(storage.value("fokit.docs.locale"), "ru")
	assert.equal(document.documentElement.lang, "ru")
	assert.match(document.title, /Fokit/)
	assert.match(document.title, /массив/i)
})
