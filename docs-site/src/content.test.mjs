import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { z } from "zod"

import {
	curriculum,
	exampleFiles,
	getAdjacentLessons,
	LESSON_IDS,
	LOCALES,
} from "./content.js"

const repositoryRoot = new URL("../../", import.meta.url)
const lessonSchema = z.object({
	id: z.string(),
	title: z.string().min(1),
	summary: z.string().min(1),
	sections: z.array(z.string().min(1)).min(1),
	links: z.array(z.object({ lessonId: z.string() })),
	exampleIds: z.array(z.string()),
})

test("curriculum keeps equivalent English and Russian lesson sets", () => {
	assert.deepEqual(LOCALES, ["en", "ru"])

	for (const locale of LOCALES) {
		const lessons = curriculum[locale]
		assert.ok(Array.isArray(lessons), `${locale} lessons must be an array`)
		assert.deepEqual(
			lessons.map((lesson) => lesson.id),
			LESSON_IDS,
			`${locale} lesson IDs must match the shared curriculum order`,
		)

		for (const lesson of lessons) {
			lessonSchema.parse(lesson)
			assert.equal(Object.hasOwn(lesson, "code"), false)
		}
	}
})

test("internal lesson links, adjacent links, and cross-locale pairs are valid", () => {
	const lessonSet = new Set(LESSON_IDS)

	for (const locale of LOCALES) {
		for (const lesson of curriculum[locale]) {
			for (const link of lesson.links) {
				assert.ok(
					lessonSet.has(link.lessonId),
					`${locale}/${lesson.id} links to missing ${link.lessonId}`,
				)
			}

			const adjacent = getAdjacentLessons(locale, lesson.id)
			if (lesson.id === LESSON_IDS[0]) {
				assert.equal(adjacent.previous, undefined)
			} else {
				assert.ok(adjacent.previous)
				assert.ok(lessonSet.has(adjacent.previous.id))
			}

			if (lesson.id === LESSON_IDS.at(-1)) {
				assert.equal(adjacent.next, undefined)
			} else {
				assert.ok(adjacent.next)
				assert.ok(lessonSet.has(adjacent.next.id))
			}

			const oppositeLocale = locale === "en" ? "ru" : "en"
			assert.equal(
				curriculum[oppositeLocale].some((item) => item.id === lesson.id),
				true,
			)
		}
	}
})

test("full copyable examples come only from executable root example files", async () => {
	const examplesModule = await readFile(
		new URL("./examples.js", import.meta.url),
		"utf8",
	)
	const declaredIds = new Set(Object.keys(exampleFiles))

	for (const lesson of Object.values(curriculum).flat()) {
		for (const exampleId of lesson.exampleIds) {
			assert.ok(
				declaredIds.has(exampleId),
				`${lesson.id} references missing example ${exampleId}`,
			)
		}
	}

	for (const [exampleId, example] of Object.entries(exampleFiles)) {
		assert.match(example.path, /^examples\/.+\.(ts|tsx)$/)
		const source = await readFile(new URL(example.path, repositoryRoot), "utf8")
		assert.match(source, /from "fokit/)
		assert.ok(source.length > 200)
		assert.match(
			examplesModule,
			new RegExp(`${example.path.replaceAll("/", "\\/")}\\?raw`),
			`${exampleId} must be imported as raw text by examples.js`,
		)
	}
})
