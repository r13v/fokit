"use client"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { ImperativeFormIssue } from "../core/index.js"
import { type ControlProps, defineControl } from "./control.js"
import { createFormKit } from "./create-form-kit.js"
import { useFormContext } from "./form-context.js"
import { useFormState } from "./hooks.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	SectionSlotProps,
} from "./slots.js"

type ProfileValues = {
	readonly kind: "person" | "company"
	readonly name: string
	readonly email: string
	readonly companyName?: string
	readonly hiddenNote?: string
}

type ProfileContext = {
	readonly locked: boolean
	readonly showHidden: boolean
}

type TextOptions = {
	readonly placeholder?: string
}

type ProfileSchema = StandardSchemaV1<ProfileValues>

const schema = {} as ProfileSchema

const text = defineControl<string | undefined, TextOptions, ProfileContext>({
	component({
		value,
		setValue,
		blur,
		input,
		meta,
		options,
		disabled,
		readOnly,
		required,
	}: ControlProps<string | undefined, TextOptions, ProfileContext>) {
		return (
			<input
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => setValue(event.currentTarget.value)}
				placeholder={options.placeholder}
				readOnly={readOnly}
				ref={input.ref}
				required={required}
				value={value ?? ""}
			/>
		)
	},
	formData: {
		mode: "native",
		serialize(value, details) {
			return value === undefined
				? []
				: [
						{
							name: details.name,
							value,
						},
					]
		},
	},
})

const profileKit = createFormKit({
	controls: {
		text,
	},
	slots: {
		Field: FieldSlot,
		Section: SectionSlot,
		Array: ArraySlot,
		ArrayItem: ArrayItemSlot,
		ErrorMessage,
	},
})

function createDefinition(
	optionsResolver: (values: {
		readonly kind: ProfileValues["kind"]
	}) => TextOptions = () => ({ placeholder: "" }),
) {
	return profileKit.defineForm(schema).withContext<ProfileContext>({
		ui: [
			{
				kind: "section",
				id: "account",
				title: "Account",
				description: "Profile settings",
				columns: 2,
				className: "account-section",
				disabled: (_values, { context }) => context.locked,
				children: [
					{
						kind: "field",
						path: "name",
						control: "text",
						label: "Name",
						description: "Legal name",
						required: true,
						className: "name-field",
						options: {
							placeholder: "Full name",
						},
					},
					{
						kind: "field",
						path: "email",
						control: "text",
						label: "Email",
						options: optionsResolver,
					},
					{
						kind: "field",
						path: "companyName",
						control: "text",
						label: "Company",
						visible: ({ kind }) => kind === "company",
					},
				],
			},
			{
				kind: "field",
				path: "hiddenNote",
				control: "text",
				label: "Hidden note",
				visible: (_values, { context }) => context.showHidden,
			},
		],
	})
}

function defaultValues(): ProfileValues {
	return {
		kind: "person",
		name: "Ada",
		email: "ada@example.test",
		companyName: "",
		hiddenNote: "internal",
	}
}

describe("kit.AutoForm and kit.Fields", () => {
	it("renders no-prop render nodes in definition order with form hooks available", () => {
		function NamePreview() {
			const form = useFormContext<ProfileSchema, ProfileContext>()
			const name = useFormState(form, (snapshot) => snapshot.values.name)
			return <output data-testid="name-preview">{name}</output>
		}
		const definition = profileKit
			.defineForm(schema)
			.withContext<ProfileContext>({
				ui: [
					{
						kind: "render",
						id: "name-preview",
						component: NamePreview,
					},
					{
						kind: "field",
						path: "name",
						control: "text",
						label: "Name",
					},
				],
			})

		render(
			<profileKit.AutoForm
				context={{
					locked: false,
					showHidden: false,
				}}
				defaultValues={defaultValues()}
				definition={definition}
			/>,
		)

		const preview = screen.getByTestId("name-preview")
		const input = screen.getByLabelText("Name")
		expect(preview.textContent).toBe("Ada")
		expect(
			preview.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy()

		fireEvent.change(input, { target: { value: "Grace" } })
		expect(preview.textContent).toBe("Grace")
	})

	it("renders section, field, and error slots with workflow children after generated nodes", async () => {
		render(
			<profileKit.AutoForm
				context={{
					locked: false,
					showHidden: false,
				}}
				defaultValues={defaultValues()}
				definition={createDefinition()}
				id="profile"
			>
				<ErrorButtons />
				<button type="submit">Save</button>
			</profileKit.AutoForm>,
		)

		const form = document.querySelector("form")
		if (form === null) {
			throw new Error("Expected AutoForm to render a native form")
		}
		const section = screen.getByTestId("section-profile-account")
		const nameField = screen.getByTestId("field-name")
		const layout = section.querySelector("[data-fokit-layout='grid']")
		const save = screen.getByRole("button", { name: "Save" })

		expect(form.firstElementChild).toBe(section)
		expect(layout?.getAttribute("data-fokit-columns")).toBe("2")
		expect(layout?.firstElementChild).toBe(nameField)
		expect(nameField.classList.contains("name-field")).toBe(true)
		expect(nameField.getAttribute("data-fokit-path")).toBe("name")
		expect(nameField.getAttribute("data-fokit-span")).toBe("1")
		expect(
			section.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy()
		expect(screen.queryByTestId("field-hiddenNote")).toBeNull()

		fireEvent.click(screen.getByRole("button", { name: "Show errors" }))

		await waitFor(() => {
			expect(screen.getByText("Name must be reviewed")).toBeTruthy()
		})
		expect(screen.getAllByText("Name must be reviewed")).toHaveLength(1)
		const hiddenSummary = screen.getByText("Hidden note rejected")
		const formSummary = screen.getByText("Server rejected the profile")
		expect(hiddenSummary.getAttribute("data-fokit-node")).toBe("error-message")
		expect(hiddenSummary.tabIndex).toBe(-1)
		expect(form.firstElementChild).toBe(hiddenSummary)
		expect(
			hiddenSummary.compareDocumentPosition(section) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy()
		expect(
			formSummary.compareDocumentPosition(section) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy()
	})

	it("updates derived UI from tracked values and inherited context state", async () => {
		const optionsResolver = vi.fn(
			({ kind }: { readonly kind: ProfileValues["kind"] }) => ({
				placeholder: kind === "company" ? "Work email" : "Personal email",
			}),
		)
		const definition = createDefinition(optionsResolver)

		function View({ locked }: { readonly locked: boolean }) {
			return (
				<profileKit.AutoForm
					context={{
						locked,
						showHidden: false,
					}}
					defaultValues={defaultValues()}
					definition={definition}
					id="profile"
				>
					<KindButtons />
				</profileKit.AutoForm>
			)
		}

		const { rerender } = render(<View locked={false} />)
		const email = screen.getByLabelText("Email") as HTMLInputElement
		expect(email.placeholder).toBe("Personal email")
		expect(optionsResolver).toHaveBeenCalledTimes(1)

		fireEvent.change(screen.getByLabelText("Name"), {
			target: { value: "Grace" },
		})
		expect(optionsResolver).toHaveBeenCalledTimes(1)

		fireEvent.click(screen.getByRole("button", { name: "Company kind" }))
		await waitFor(() => {
			expect(screen.getByTestId("field-companyName")).toBeTruthy()
		})
		expect(email.placeholder).toBe("Work email")
		expect(optionsResolver).toHaveBeenCalledTimes(2)

		rerender(<View locked />)
		await waitFor(() => {
			expect((screen.getByLabelText("Name") as HTMLInputElement).disabled).toBe(
				true,
			)
		})
		expect(
			screen
				.getByTestId("section-profile-account")
				.hasAttribute("data-disabled"),
		).toBe(true)
		expect(screen.getByTestId("field-name").hasAttribute("data-disabled")).toBe(
			true,
		)
	})
})

function ErrorButtons() {
	const form = useFormContext<ProfileSchema, ProfileContext>()

	return (
		<button
			type="button"
			onClick={() => {
				form.setErrors([
					issue("name", "Name must be reviewed"),
					issue("hiddenNote", "Hidden note rejected"),
					{
						source: "server",
						message: "Server rejected the profile",
					},
				])
			}}
		>
			Show errors
		</button>
	)
}

function KindButtons() {
	const form = useFormContext<ProfileSchema, ProfileContext>()

	return (
		<button
			type="button"
			onClick={() => {
				form.setValue("kind", "company")
			}}
		>
			Company kind
		</button>
	)
}

function FieldSlot({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	control,
	errors,
}: FieldSlotProps) {
	return (
		<div {...rootProps} data-testid={`field-${pathFrom(rootProps)}`}>
			{label === undefined ? null : (
				<label {...labelProps} htmlFor={labelProps.htmlFor}>
					{label}
				</label>
			)}
			{description === undefined ? null : (
				<p {...descriptionProps}>{description}</p>
			)}
			{control}
			{errors}
		</div>
	)
}

function SectionSlot({
	rootProps,
	layoutProps,
	title,
	description,
	children,
}: SectionSlotProps) {
	return (
		<section {...rootProps} data-testid={`section-${rootProps.id}`}>
			{title === undefined ? null : <h2>{title}</h2>}
			{description === undefined ? null : <p>{description}</p>}
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

function issue(path: string, message: string): ImperativeFormIssue {
	return {
		source: "manual",
		path,
		message,
	}
}

function pathFrom(rootProps: FieldSlotProps["rootProps"]): string {
	return String(
		(rootProps as FieldSlotProps["rootProps"] & { "data-fokit-path": string })[
			"data-fokit-path"
		],
	)
}
