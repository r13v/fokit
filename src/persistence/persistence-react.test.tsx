"use client"

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useFormState } from "react-hook-form"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import type { FormBinding } from "../create-form-kit.js"
import { createFormKit } from "../create-form-kit.js"
import { createDefaultSlots } from "../default-slots/index.js"
import { createNativeControls } from "../native-controls/index.js"
import {
	decodePersistenceEnvelope,
	encodePersistenceEnvelope,
	type JsonValue,
} from "./encoding.js"
import {
	createPersistenceMiddleware,
	type FormPersistenceAdapter,
	type PersistenceHandle,
} from "./persistence.js"

const schema = z.object({
	items: z.array(z.object({ name: z.string() })),
	name: z.string().min(2),
})

const kit = createFormKit({
	controls: createNativeControls(),
	slots: createDefaultSlots(),
})
const definition = kit.defineForm(schema, {
	ui: [{ control: "text", kind: "field", label: "Name", path: "name" }],
})

describe("persistence React Hook Form integration", () => {
	it("restores a draft while preserving defaults and clearing transient form state", async () => {
		const storage = createMemoryAdapter()
		storage.value = await encodePersistenceEnvelope(
			{ items: [], name: "" },
			{ codecs: [], version: 1 },
		)
		const feature = createPersistenceMiddleware({
			adapter: storage.adapter,
			key: "profile",
			version: 1,
		})
		let form!: FormBinding<typeof schema>
		let persistence!: PersistenceHandle

		function View() {
			form = kit.useForm(definition, {
				defaultValues: { items: [], name: "Ada" },
				middleware: [feature],
				mode: "onChange",
			})
			persistence = feature.handle(form)
			const state = useFormState({ control: form.api.control })
			return (
				<kit.AutoForm form={form}>
					<output data-testid="state">
						{JSON.stringify({
							dirty: state.isDirty,
							error: state.errors.name?.message,
							isSubmitted: state.isSubmitted,
							isSubmitSuccessful: state.isSubmitSuccessful,
							submitCount: state.submitCount,
							touched: state.touchedFields.name,
						})}
					</output>
				</kit.AutoForm>
			)
		}

		render(<View />)
		const name = screen.getByLabelText("Name")
		fireEvent.change(name, { target: { value: "Grace" } })
		fireEvent.blur(name)
		await act(async () => {
			await form.api.handleSubmit(() => undefined)()
			form.api.setError("name", { message: "Temporary", type: "manual" })
		})
		await waitFor(() =>
			expect(readState()).toMatchObject({
				dirty: true,
				error: "Temporary",
				isSubmitted: true,
				isSubmitSuccessful: true,
				submitCount: 1,
				touched: true,
			}),
		)

		await act(async () => {
			expect(await persistence.restore()).toBe("applied")
		})
		await waitFor(() =>
			expect(readState()).toEqual({
				dirty: true,
				isSubmitted: false,
				isSubmitSuccessful: false,
				submitCount: 0,
			}),
		)
		expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("")
		expect(form.api.formState.defaultValues).toEqual({
			items: [],
			name: "Ada",
		})
		expect(storage.saveCalls).toHaveLength(0)
	})

	it("autosaves edits made directly by React Hook Form controls", async () => {
		const storage = createMemoryAdapter()
		const feature = createPersistenceMiddleware({
			adapter: storage.adapter,
			key: "profile",
			saveDelay: 10_000,
			version: 1,
		})
		let persistence!: PersistenceHandle

		function View() {
			const form = kit.useForm(definition, {
				defaultValues: { items: [], name: "Ada" },
				middleware: [feature],
			})
			persistence = feature.handle(form)
			return <kit.AutoForm form={form} />
		}

		render(<View />)
		act(() => persistence.start())
		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "Grace" },
		})
		await act(async () => persistence.flush())

		expect(storage.saveCalls).toHaveLength(1)
		expect(
			(
				await decodePersistenceEnvelope(storage.value as JsonValue, {
					codecs: [],
					version: 1,
				})
			).value,
		).toEqual({ items: [], name: "Grace" })
	})
})

function createMemoryAdapter() {
	let storedValue: JsonValue | undefined
	const saveCalls: JsonValue[] = []
	const adapter: FormPersistenceAdapter = {
		async load() {
			return storedValue
		},
		async remove() {
			storedValue = undefined
		},
		async save(_key, nextValue) {
			storedValue = nextValue
			saveCalls.push(nextValue)
		},
	}
	return {
		adapter,
		saveCalls,
		get value() {
			return storedValue
		},
		set value(next: JsonValue | undefined) {
			storedValue = next
		},
	}
}

function readState(): unknown {
	return JSON.parse(screen.getByTestId("state").textContent ?? "null")
}
