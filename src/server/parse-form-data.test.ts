import { readdir, readFile } from "node:fs/promises"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { describe, expect, it, vi } from "vitest"

import {
	type FormResult,
	type ParseResult,
	parseFormData,
	type SubmissionIssue,
} from "./index.js"
import { fokitArrayMarkerName, invalidFormDataCode } from "./protocol.js"

type AccountInput = {
	readonly name: string
	readonly tags: readonly string[]
}

type AccountOutput = AccountInput & {
	readonly slug: string
}

type TestSchema = StandardSchemaV1<AccountInput, AccountOutput>

describe("parseFormData", () => {
	it("validates normalized FormData through Standard Schema and returns typed output", async () => {
		const formData = new FormData()
		formData.append(fokitArrayMarkerName, "tags")
		formData.append("name", "Ada Lovelace")
		formData.append("tags", "math")
		formData.append("tags", "systems")
		const schema = createSchema((value) => {
			const input = value as AccountInput
			return {
				value: {
					...input,
					slug: input.name.toLowerCase().replaceAll(" ", "-"),
				},
			}
		})

		const result: ParseResult<AccountOutput> = await parseFormData(
			formData,
			schema,
		)

		expect(result).toEqual({
			success: true,
			value: {
				name: "Ada Lovelace",
				tags: ["math", "systems"],
				slug: "ada-lovelace",
			},
		})
	})

	it("preserves File values for schema-level file validation", async () => {
		const resume = new File(["resume"], "resume.txt", { type: "text/plain" })
		const formData = new FormData()
		formData.append("resume", resume)
		const schema = createUnknownSchema((value) => ({ value }))

		const result = await parseFormData(formData, schema)

		expect(result.success).toBe(true)
		if (!result.success) {
			return
		}
		expect((result.value as { resume: File }).resume).toBe(resume)
	})

	it("returns one server issue for structural failure and does not call the schema", async () => {
		const formData = new FormData()
		formData.append("__fokit.unexpected", "x")
		const validate = vi.fn(() => ({
			value: { name: "Ada", tags: [], slug: "ada" },
		}))
		const schema = createSchema(validate)

		const result = await parseFormData(formData, schema)

		expect(validate).not.toHaveBeenCalled()
		expect(result.success).toBe(false)
		if (result.success) {
			return
		}
		expect(result.issues).toEqual([invalidFormDataIssue()])
		expect(result.reply()).toEqual({
			status: "error",
			issues: [invalidFormDataIssue()],
		} satisfies FormResult)
	})

	it("maps schema issues to submission issues and appends normalized reply issues", async () => {
		const formData = new FormData()
		formData.append("name", "")
		const schema = createSchema(() => ({
			issues: [
				{ message: "Name is required", path: ["name"] },
				{ message: "Unsupported path", path: [Symbol("path")] },
			],
		}))

		const result = await parseFormData(formData, schema)

		expect(result.success).toBe(false)
		if (result.success) {
			return
		}
		expect(result.issues).toEqual([
			{
				source: "schema",
				message: "Name is required",
				path: "name",
			},
			{
				source: "schema",
				message: "Unsupported path",
			},
		])
		expect(
			result.reply([
				{
					source: "server",
					path: "name",
					code: "not_unique",
					message: "Name is already taken",
				},
			]),
		).toEqual({
			status: "error",
			issues: [
				{
					source: "schema",
					message: "Name is required",
					path: "name",
				},
				{
					source: "schema",
					message: "Unsupported path",
				},
				{
					source: "server",
					path: "name",
					code: "not_unique",
					message: "Name is already taken",
				},
			],
		} satisfies FormResult)
	})

	it("awaits asynchronous Standard Schema validation", async () => {
		const formData = new FormData()
		formData.append("name", "Grace")
		const schema = createSchema(async (value) => {
			const input = value as AccountInput
			return {
				value: {
					name: input.name,
					tags: [],
					slug: input.name.toLowerCase(),
				},
			}
		})

		const result = await parseFormData(formData, schema)

		expect(result).toEqual({
			success: true,
			value: {
				name: "Grace",
				tags: [],
				slug: "grace",
			},
		})
	})

	it("exposes serializable error transport", async () => {
		const formData = new FormData()
		formData.append("__fokit.extra", "x")
		const result = await parseFormData(
			formData,
			createUnknownSchema((value) => ({ value })),
		)

		expect(result.success).toBe(false)
		if (result.success) {
			return
		}
		expect(JSON.parse(JSON.stringify(result.reply()))).toEqual({
			status: "error",
			issues: [invalidFormDataIssue()],
		})
	})

	it("keeps source and built server entries free of React and control imports", async () => {
		const sourceFiles = await readServerSourceFiles()
		for (const [file, source] of sourceFiles) {
			expect(source, file).not.toMatch(/from\s+["']react(?:\/|["'])/)
			expect(source, file).not.toMatch(/control-types/)
		}

		for (const [file, builtServer] of await readBuiltServerFiles()) {
			expect(builtServer, file).not.toMatch(/from\s+["']react(?:\/|["'])/)
			expect(builtServer, file).not.toMatch(/require\(["']react(?:\/|["'])/)
			expect(builtServer, file).not.toMatch(/control-types/)
		}
	})
})

function createSchema(
	validate: TestSchema["~standard"]["validate"],
): TestSchema {
	return {
		"~standard": {
			version: 1,
			vendor: "fokit-test",
			validate,
		},
	} as TestSchema
}

function createUnknownSchema(
	validate: StandardSchemaV1["~standard"]["validate"],
): StandardSchemaV1 {
	return {
		"~standard": {
			version: 1,
			vendor: "fokit-test",
			validate,
		},
	}
}

function invalidFormDataIssue(): SubmissionIssue {
	return {
		source: "server",
		code: invalidFormDataCode,
		message: "Invalid form data",
	}
}

async function readServerSourceFiles(): Promise<readonly [string, string][]> {
	const serverDirectory = new URL("./", import.meta.url)
	const files = await readdir(serverDirectory)
	const sourceFiles = files.filter(
		(file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
	)

	return Promise.all(
		sourceFiles.map(async (file) => [
			file,
			await readFile(new URL(file, serverDirectory), "utf8"),
		]),
	)
}

async function readBuiltServerFiles(): Promise<readonly [string, string][]> {
	const distDirectory = new URL("../../dist/", import.meta.url)
	const files = ["server.js", "server.cjs"]

	return Promise.all(
		files.map(async (file) => [
			file,
			await readFile(new URL(file, distDirectory), "utf8"),
		]),
	)
}
