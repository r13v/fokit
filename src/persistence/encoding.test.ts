import { describe, expect, it } from "vitest"

import { createDateCodec } from "./codecs.js"
import {
	decodePersistenceEnvelope,
	encodePersistenceEnvelope,
	normalizePersistenceCodecs,
	type PersistenceCodec,
} from "./encoding.js"

const dateCodec = createDateCodec()

describe("persistence encoding", () => {
	it("round-trips editable JSON shapes without losing undefined or dates", async () => {
		const input = {
			active: true,
			createdAt: new Date("2026-08-06T08:00:00.000Z"),
			items: [undefined, null, 3, -0, "form"],
			optional: undefined,
		}

		const envelope = await encodePersistenceEnvelope(input, {
			codecs: [dateCodec],
			version: 2,
		})
		const decoded = await decodePersistenceEnvelope(envelope, {
			codecs: [dateCodec],
			version: 2,
		})

		expect(decoded.migrated).toBe(false)
		expect(decoded.value).toEqual(input)
		expect(Object.is((decoded.value as typeof input).items[3], -0)).toBe(true)
		expect(Object.getPrototypeOf(decoded.value)).toBeNull()
	})

	it("migrates decoded old values and reports both application versions", async () => {
		const envelope = await encodePersistenceEnvelope(
			{ fullName: "Ada Lovelace" },
			{ codecs: [], version: 1 },
		)
		const migrationCalls: unknown[] = []

		const decoded = await decodePersistenceEnvelope(envelope, {
			codecs: [],
			migrate(value, fromVersion, toVersion) {
				migrationCalls.push([value, fromVersion, toVersion])
				return { name: (value as { fullName: string }).fullName }
			},
			version: 2,
		})

		expect(decoded).toEqual({
			migrated: true,
			value: { name: "Ada Lovelace" },
		})
		expect(migrationCalls).toEqual([[{ fullName: "Ada Lovelace" }, 1, 2]])
	})

	it("requires an explicit migration when the application version changes", async () => {
		const envelope = await encodePersistenceEnvelope(
			{ name: "Ada" },
			{ codecs: [], version: 1 },
		)

		await expect(
			decodePersistenceEnvelope(envelope, { codecs: [], version: 2 }),
		).rejects.toThrow("requires a migration to version 2")
	})

	it("rejects values that cannot cross the configured storage boundary", async () => {
		const cyclic: { self?: unknown } = {}
		cyclic.self = cyclic
		const symbolKey = Symbol("hidden")

		for (const [value, message] of [
			[{ nested: { amount: Number.NaN } }, '"nested.amount": non-finite'],
			[{ nested: 1n }, '"nested": bigint'],
			[{ nested: Symbol("value") }, '"nested": symbol'],
			[{ nested: () => undefined }, '"nested": function'],
			[{ nested: /form/ }, '"nested": RegExp'],
			[cyclic, '"self": cyclic value'],
			[{ [symbolKey]: "value" }, '"<root>": symbol key'],
		] as const) {
			await expect(
				encodePersistenceEnvelope(value, { codecs: [], version: 1 }),
			).rejects.toThrow(message)
		}
	})

	it("rejects unknown codecs and malformed envelopes before restoring data", async () => {
		const envelope = await encodePersistenceEnvelope(
			{ createdAt: new Date("2026-08-06T08:00:00.000Z") },
			{ codecs: [dateCodec], version: 1 },
		)

		await expect(
			decodePersistenceEnvelope(envelope, { codecs: [], version: 1 }),
		).rejects.toThrow('Unknown persistence codec tag "date"')
		await expect(
			decodePersistenceEnvelope(
				{ protocol: "other", protocolVersion: 1, version: 1, payload: {} },
				{ codecs: [], version: 1 },
			),
		).rejects.toThrow("Unsupported persistence protocol identifier")
	})

	it("validates codec registration and codec JSON output", async () => {
		const invalidCodec: PersistenceCodec<Date> = {
			canEncode: (value): value is Date => value instanceof Date,
			decode: () => new Date(),
			encode: () => undefined as never,
			tag: "invalid",
		}

		expect(() => normalizePersistenceCodecs([dateCodec, dateCodec])).toThrow(
			'Duplicate persistence codec tag "date"',
		)
		const applicationCodec = { ...dateCodec }
		normalizePersistenceCodecs([applicationCodec])
		expect(Object.isFrozen(applicationCodec)).toBe(false)
		await expect(
			encodePersistenceEnvelope(
				{ date: new Date() },
				{ codecs: [invalidCodec], version: 1 },
			),
		).rejects.toThrow('Persistence codec "invalid" output must be JSON')
	})

	it("allows shared objects when an asynchronous codec suspends encoding", async () => {
		const asyncDateCodec: PersistenceCodec<Date> = {
			...dateCodec,
			async encode(value) {
				await Promise.resolve()
				return value.toISOString()
			},
		}
		const shared = { createdAt: new Date("2026-08-06T08:00:00.000Z") }
		const envelope = await encodePersistenceEnvelope([shared, shared], {
			codecs: [asyncDateCodec],
			version: 1,
		})

		expect(
			(
				await decodePersistenceEnvelope(envelope, {
					codecs: [asyncDateCodec],
					version: 1,
				})
			).value,
		).toEqual([shared, shared])
	})
})
