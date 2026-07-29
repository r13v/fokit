"use client"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { defineControl } from "./control.js"
import { createFormKit } from "./create-form-kit.js"
import { useFormContext } from "./form-context.js"
import { useField, useFormState } from "./hooks.js"
import { nativeControls } from "./native-controls.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	SectionSlotProps,
} from "./slots.js"
import type { FormInstance } from "./use-form.js"
import { useForm } from "./use-form.js"

type UploadInput = {
	readonly name: string
	readonly avatar?: File
}

type TestSchema = StandardSchemaV1<UploadInput>

const schema = {
	"~standard": {
		version: 1,
		vendor: "fokit-test",
		validate(value) {
			return {
				value: value as UploadInput,
			}
		},
	},
} as TestSchema

const textControl = defineControl<string>({
	component({ path, value, setValue, blur, input, disabled, readOnly }) {
		return (
			<input
				aria-label={path}
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => setValue(event.currentTarget.value)}
				readOnly={readOnly}
				ref={input.ref}
				value={value}
			/>
		)
	},
	formData: {
		mode: "native",
	},
})

const kit = createFormKit({
	controls: {
		text: textControl,
		file: nativeControls.file,
	},
	slots: {
		Field: FieldSlot,
		Section: SectionSlot,
		Array: ArraySlot,
		ArrayItem: ArrayItemSlot,
		ErrorMessage,
	},
})

const definition = kit.defineForm({
	schema,
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			label: "Name",
		},
		{
			kind: "field",
			path: "avatar",
			control: "file",
			label: "Avatar",
		},
	],
})

function defaultValues(values: Partial<UploadInput> = {}): UploadInput {
	return {
		name: "Ada",
		...values,
	}
}

describe("classic React reset", () => {
	it("intercepts native reset buttons and clears same-value metadata without update hooks", async () => {
		const onUpdate = vi.fn()

		render(
			<kit.AutoForm
				aria-label="Profile"
				definition={definition}
				defaultValues={defaultValues()}
				onUpdate={onUpdate}
			>
				<ResetState />
				<ManualErrorButton />
				<button type="reset">Reset profile</button>
			</kit.AutoForm>,
		)

		await userEvent.click(screen.getByLabelText("name"))
		fireEvent.blur(screen.getByLabelText("name"))
		await userEvent.click(screen.getByRole("button", { name: "Set error" }))
		expect(screen.getByTestId("touched").textContent).toBe("true")
		expect(screen.getByText("Manual problem")).not.toBeNull()

		await userEvent.click(screen.getByRole("button", { name: "Reset profile" }))

		expect(screen.getByTestId("touched").textContent).toBe("false")
		expect(screen.queryByText("Manual problem")).toBeNull()
		expect(onUpdate).not.toHaveBeenCalled()
	})

	it("clears submit metadata on a same-value native reset", async () => {
		render(
			<kit.AutoForm
				aria-label="Profile"
				definition={definition}
				defaultValues={defaultValues()}
			>
				<ResetState />
				<button type="submit">Save</button>
				<button type="reset">Reset profile</button>
			</kit.AutoForm>,
		)

		await userEvent.click(screen.getByRole("button", { name: "Save" }))
		expect(screen.getByTestId("submit-count").textContent).toBe("1")

		await userEvent.click(screen.getByRole("button", { name: "Reset profile" }))

		expect(screen.getByTestId("submit-count").textContent).toBe("0")
	})

	it("replaces the reset baseline with provided or hook-replaced values", async () => {
		let form: FormInstance<TestSchema> | undefined

		function View() {
			form = useForm(definition, {
				defaultValues: defaultValues(),
				beforeUpdate: (event) =>
					event.source === "reset"
						? [
								{
									type: "set",
									path: "name",
									value: "Katherine",
								},
							]
						: undefined,
			})
			const name = useField(form, "name")
			const dirty = useFormState(form, (snapshot) => snapshot.isDirty)

			return (
				<kit.Form aria-label="Profile" form={form}>
					<input
						aria-label="name"
						onChange={(event) => name.setValue(event.currentTarget.value)}
						value={name.value}
					/>
					<output data-testid="dirty">{String(dirty)}</output>
					<button
						type="button"
						onClick={() =>
							form?.reset(
								defaultValues({
									name: "Grace",
								}),
							)
						}
					>
						Load Grace
					</button>
				</kit.Form>
			)
		}

		render(<View />)
		await userEvent.clear(screen.getByLabelText("name"))
		await userEvent.type(screen.getByLabelText("name"), "Changed")
		expect(screen.getByTestId("dirty").textContent).toBe("true")

		await userEvent.click(screen.getByRole("button", { name: "Load Grace" }))

		expect((screen.getByLabelText("name") as HTMLInputElement).value).toBe(
			"Katherine",
		)
		expect(screen.getByTestId("dirty").textContent).toBe("false")
	})

	it("applies no native reset metadata when beforeUpdate cancels reset", async () => {
		function View() {
			const form = useForm(definition, {
				defaultValues: defaultValues(),
				beforeUpdate: (event) => (event.source === "reset" ? false : undefined),
			})

			return (
				<kit.Form aria-label="Profile" form={form}>
					<kit.Fields />
					<ResetState />
					<button type="reset">Reset profile</button>
				</kit.Form>
			)
		}

		render(<View />)
		await userEvent.clear(screen.getByLabelText("name"))
		await userEvent.type(screen.getByLabelText("name"), "Changed")
		fireEvent.blur(screen.getByLabelText("name"))

		await userEvent.click(screen.getByRole("button", { name: "Reset profile" }))

		expect((screen.getByLabelText("name") as HTMLInputElement).value).toBe(
			"Changed",
		)
		expect(screen.getByTestId("dirty").textContent).toBe("true")
		expect(screen.getByTestId("touched").textContent).toBe("true")
	})

	it("clears file inputs when hydrated reset prevents the browser reset", async () => {
		let form: FormInstance<TestSchema> | undefined

		function View() {
			form = useForm(definition, {
				defaultValues: defaultValues(),
			})

			return (
				<kit.Form aria-label="Profile" form={form}>
					<kit.Fields />
					<button type="reset">Clear upload</button>
				</kit.Form>
			)
		}

		render(<View />)
		const file = new File(["avatar"], "avatar.png", {
			type: "image/png",
		})
		const input = screen.getByLabelText("Avatar") as HTMLInputElement

		await userEvent.upload(input, file)
		expect(input.files).toHaveLength(1)
		expect(form?.getValue("avatar")).toBe(file)

		await userEvent.click(screen.getByRole("button", { name: "Clear upload" }))

		expect(input.files).toHaveLength(0)
		expect(form?.getValue("avatar")).toBeUndefined()
	})
})

function ResetState() {
	const form = useRequiredForm()
	const state = useFormState(form, (snapshot) => ({
		dirty: snapshot.isDirty,
		submitCount: snapshot.submitCount,
		touched: snapshot.isTouched,
	}))

	return (
		<>
			<output data-testid="dirty">{String(state.dirty)}</output>
			<output data-testid="submit-count">{String(state.submitCount)}</output>
			<output data-testid="touched">{String(state.touched)}</output>
		</>
	)
}

function ManualErrorButton() {
	const form = useRequiredForm()

	return (
		<button
			type="button"
			onClick={() =>
				form.setErrors([
					{
						source: "manual",
						path: "name",
						message: "Manual problem",
					},
				])
			}
		>
			Set error
		</button>
	)
}

function useRequiredForm(): FormInstance<TestSchema> {
	return useFormContext() as FormInstance<TestSchema>
}

function FieldSlot({
	rootProps,
	label,
	labelProps,
	control,
	errors,
}: FieldSlotProps) {
	return (
		<div {...rootProps}>
			{label === undefined ? null : (
				<label {...labelProps} htmlFor={labelProps.htmlFor ?? "test-field"}>
					{label}
				</label>
			)}
			{control}
			{errors}
		</div>
	)
}

function SectionSlot({ rootProps, layoutProps, children }: SectionSlotProps) {
	return (
		<section {...rootProps}>
			<div {...layoutProps}>{children}</div>
		</section>
	)
}

function ArraySlot({ rootProps, children }: ArraySlotProps) {
	return <div {...rootProps}>{children}</div>
}

function ArrayItemSlot({ rootProps, children }: ArrayItemSlotProps) {
	return <div {...rootProps}>{children}</div>
}

function ErrorMessage({ rootProps, issue }: ErrorMessageSlotProps) {
	return <p {...rootProps}>{issue.message}</p>
}
