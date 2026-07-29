import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { transformWithOxc } from "vite"
import { z } from "zod"

import {
	exampleFiles,
	getAdjacentPages,
	LOCALES,
	PAGE_IDS,
	pages,
} from "./content.js"

const repositoryRoot = new URL("../../", import.meta.url)
const codeSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	source: z.string().min(1),
})
const metaItemSchema = z.union([
	z.string().min(1),
	z.object({
		label: z.string().min(1),
		href: z.string().min(1),
	}),
])
const sectionSchema = z.object({
	id: z.string().min(1),
	navLabel: z.string().min(1),
	title: z.string().min(1),
	paragraphs: z.array(z.string().min(1)).min(1),
	bullets: z.array(z.string().min(1)),
	items: z.array(
		z.object({
			name: z.string().min(1),
			description: z.string().min(1),
		}),
	),
	code: codeSchema.optional(),
	callout: z
		.object({
			title: z.string().min(1),
			text: z.string().min(1),
		})
		.optional(),
	exampleId: z.string().optional(),
})
const pageSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	subtitle: z.string().min(1),
	lead: z.string().min(1),
	metaGroups: z
		.array(
			z.object({
				label: z.string().min(1),
				items: z.array(metaItemSchema).min(1),
			}),
		)
		.min(1),
	sections: z.array(sectionSchema).min(1),
	showLab: z.boolean().optional(),
})

test("documentation keeps complete equivalent English and Russian page maps", () => {
	assert.deepEqual(LOCALES, ["en", "ru"])
	assert.deepEqual(PAGE_IDS, [
		"get-started",
		"api",
		"types",
		"advanced",
		"faqs",
	])

	for (const locale of LOCALES) {
		const localePages = pages[locale]
		assert.deepEqual(
			localePages.map((page) => page.id),
			PAGE_IDS,
			`${locale} page IDs must match the public navigation order`,
		)

		for (const page of localePages) {
			pageSchema.parse(page)
			const oppositeLocale = locale === "en" ? "ru" : "en"
			const translatedPage = pages[oppositeLocale].find(
				(item) => item.id === page.id,
			)
			assert.ok(translatedPage)
			assert.deepEqual(
				page.sections.map((section) => section.id),
				translatedPage.sections.map((section) => section.id),
				`${page.id} must keep section parity across locales`,
			)
		}
	}
})

test("the five reference-equivalent sections are deep enough to be useful", () => {
	const englishPages = Object.fromEntries(
		pages.en.map((page) => [page.id, page]),
	)

	assert.ok(englishPages["get-started"].sections.length >= 6)
	assert.ok(englishPages.api.sections.length >= 8)
	assert.ok(englishPages.types.sections.length >= 7)
	assert.ok(englishPages.advanced.sections.length >= 8)
	assert.ok(englishPages.faqs.sections.length >= 10)

	assert.equal(englishPages["get-started"].showLab, true)
	assert.ok(
		englishPages.api.sections.some((section) => section.id === "use-form"),
	)
	assert.ok(
		englishPages.types.sections.some(
			(section) => section.id === "input-output",
		),
	)
	assert.ok(
		englishPages.advanced.sections.some(
			(section) => section.id === "react-19-actions",
		),
	)
	assert.ok(
		englishPages.faqs.sections.some((section) => section.id === "performance"),
	)
})

test("adjacent page links follow the public top-level navigation", () => {
	for (const locale of LOCALES) {
		for (const pageId of PAGE_IDS) {
			const adjacent = getAdjacentPages(locale, pageId)
			const index = PAGE_IDS.indexOf(pageId)
			assert.equal(adjacent.previous?.id, PAGE_IDS[index - 1])
			assert.equal(adjacent.next?.id, PAGE_IDS[index + 1])
		}
	}
})

test("full copyable examples come only from executable root example files", async () => {
	const examplesModule = await readFile(
		new URL("./examples.js", import.meta.url),
		"utf8",
	)
	const declaredIds = new Set(Object.keys(exampleFiles))

	for (const page of Object.values(pages).flat()) {
		for (const section of page.sections) {
			if (section.exampleId !== undefined) {
				assert.ok(
					declaredIds.has(section.exampleId),
					`${page.id}/${section.id} references missing ${section.exampleId}`,
				)
			}
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

test("every root runtime export is discoverable in both API languages", async () => {
	const rootEntrySource = await readFile(
		new URL("../../src/index.ts", import.meta.url),
		"utf8",
	)
	const runtimeExportNames = [
		...rootEntrySource.matchAll(
			/export\s*\{([\s\S]*?)\}\s*from\s*["'][^"']+["']/g,
		),
	].flatMap((match) =>
		match[1]
			.split(",")
			.map((name) => name.trim())
			.filter(Boolean),
	)

	assert.ok(runtimeExportNames.length > 0)

	for (const locale of LOCALES) {
		const documentation = JSON.stringify(pages[locale])
		for (const exportName of runtimeExportNames) {
			assert.match(
				documentation,
				new RegExp(`\\b${exportName}\\b`),
				`${locale} docs must mention the public ${exportName} export`,
			)
		}
	}
})

test("inline TypeScript examples remain syntactically executable", async () => {
	for (const page of Object.values(pages).flat()) {
		for (const section of page.sections) {
			if (!section.code || section.code.label === "Shell") {
				continue
			}

			await assert.doesNotReject(
				() =>
					transformWithOxc(
						section.code.source,
						`${page.id}-${section.id}.tsx`,
						{ lang: "tsx" },
					),
				`${page.id}/${section.id} must remain valid TypeScript or TSX`,
			)
		}
	}
})
