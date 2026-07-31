"use client"

import type { StandardSchemaV1 } from "@standard-schema/spec"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderToString } from "react-dom/server"
import { beforeEach, describe, expect, it } from "vitest"

import { createFormStore } from "../core/index.js"
import { assertActionFormCompatible } from "../react19/action-form.js"
import { parseFormData } from "../server/index.js"
import { type ControlProps, defineControl } from "./control.js"
import { createFormKit } from "./create-form-kit.js"
import { nativeControls } from "./native-controls.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	SectionSlotProps,
} from "./slots.js"
import { useForm } from "./use-form.js"

type Contact = {
	readonly email: string
}

type Values = {
	readonly name: string
	readonly hiddenCode?: string
	readonly disabledCode: string
	readonly readonlyCode: string
	readonly invisibleNote?: string
	readonly unsetNote?: string
	readonly count: number
	readonly birthday: Date
	readonly subscribed: boolean
	readonly contacts: readonly Contact[]
	readonly unavailable?: string
}

type Output = {
	readonly name: string
	readonly hiddenCode?: string
	readonly disabledCode: string
	readonly readonlyCode: string
	readonly invisibleNote?: string
	readonly count: number
	readonly birthday: string
	readonly subscribed: boolean
	readonly contacts: readonly Contact[]
}

type UploadValues = {
	readonly avatar?: File
}

type NestedValues = {
	readonly groups: readonly {
		readonly name: string
		readonly members: readonly {
			readonly email: string
		}[]
	}[]
}

type NativeTextLikeValues = {
	readonly name?: string
	readonly note?: string
	readonly count?: number
	readonly birthday?: string
	readonly openingTime?: string
}

type NativeChoiceFileValues = {
	readonly status: string
	readonly representation?: "registered" | "forming"
	readonly subscribed: boolean
	readonly avatar?: File
	readonly disabledStatus: string
	readonly hiddenStatus: string
	readonly disabledSubscribed: boolean
	readonly hiddenSubscribed: boolean
	readonly disabledAvatar?: File
	readonly hiddenAvatar?: File
}

type Context = {
	readonly prefix: string
}

type TextOptions = {
	readonly suffix?: string
}

type SerializeCall = {
	readonly value: unknown
	readonly path: string
	readonly name: string
	readonly options: unknown
	readonly context: unknown
}

const serializeCalls: SerializeCall[] = []

const schema = createSchema<Values, Output>((value) => {
	const input = value as Partial<
		Omit<Values, "birthday" | "contacts" | "subscribed"> & {
			readonly birthday?: Date | string
			readonly contacts?: readonly Partial<Contact>[]
			readonly subscribed?: boolean | string
		}
	>

	return {
		value: {
			name: String(input.name ?? ""),
			hiddenCode: optionalString(input.hiddenCode),
			disabledCode: String(input.disabledCode ?? ""),
			readonlyCode: String(input.readonlyCode ?? ""),
			invisibleNote: optionalString(input.invisibleNote),
			count: Number(input.count ?? 0),
			birthday: normalizeDate(input.birthday),
			subscribed:
				input.subscribed === true ||
				input.subscribed === "on" ||
				input.subscribed === "true",
			contacts: (input.contacts ?? []).map((contact) => ({
				email: String(contact.email ?? ""),
			})),
		},
	}
})

const uploadSchema = createSchema<UploadValues, UploadValues>((value) => ({
	value: value as UploadValues,
}))
const nestedSchema = createSchema<NestedValues, NestedValues>((value) => ({
	value: value as NestedValues,
}))
const nativeTextLikeSchema = createSchema<
	NativeTextLikeValues,
	NativeTextLikeValues
>((value) => {
	const input = value as Partial<Record<keyof NativeTextLikeValues, unknown>>

	return {
		value: {
			name: optionalString(input.name),
			note: optionalString(input.note),
			count: input.count === undefined ? undefined : Number(input.count),
			birthday: optionalString(input.birthday),
			openingTime: optionalString(input.openingTime),
		},
	}
})
const nativeChoiceFileSchema = createSchema<
	NativeChoiceFileValues,
	NativeChoiceFileValues
>((value) => {
	const input = value as Partial<Record<keyof NativeChoiceFileValues, unknown>>

	return {
		value: {
			status: String(input.status ?? ""),
			representation:
				input.representation === "" || input.representation === undefined
					? undefined
					: (String(input.representation) as "registered" | "forming"),
			subscribed:
				input.subscribed === true ||
				input.subscribed === "true" ||
				input.subscribed === "on",
			avatar: optionalFile(input.avatar),
			disabledStatus: String(input.disabledStatus ?? ""),
			hiddenStatus: String(input.hiddenStatus ?? ""),
			disabledSubscribed:
				input.disabledSubscribed === true ||
				input.disabledSubscribed === "true" ||
				input.disabledSubscribed === "on",
			hiddenSubscribed:
				input.hiddenSubscribed === true ||
				input.hiddenSubscribed === "true" ||
				input.hiddenSubscribed === "on",
			disabledAvatar: optionalFile(input.disabledAvatar),
			hiddenAvatar: optionalFile(input.hiddenAvatar),
		},
	}
})

const nativeText = defineControl<string | undefined, TextOptions, Context>({
	component({
		path,
		value,
		setValue,
		blur,
		input,
		options,
		disabled,
		readOnly,
	}: ControlProps<string | undefined, TextOptions, Context>) {
		return (
			<input
				aria-label={path}
				data-suffix={options.suffix}
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => setValue(event.currentTarget.value)}
				readOnly={readOnly}
				ref={input.ref}
				value={value ?? ""}
			/>
		)
	},
	formData: {
		mode: "native",
		serialize(value, details) {
			recordSerialize(value, details)
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

const hiddenText = defineControl<string | undefined, TextOptions, Context>({
	component({
		path,
		value,
		setValue,
		blur,
		input,
		options,
	}: ControlProps<string | undefined, TextOptions, Context>) {
		return (
			<input
				aria-label={path}
				data-input-name={input.name}
				data-suffix={options.suffix}
				id={input.id}
				onBlur={blur}
				onChange={(event) => setValue(event.currentTarget.value)}
				ref={input.ref}
				value={value ?? ""}
			/>
		)
	},
	formData: {
		mode: "hidden",
		serialize(value, details) {
			recordSerialize(value, details)
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

const numberControl = defineControl<number, Record<string, never>, Context>({
	component({
		path,
		value,
		setValue,
		blur,
		input,
		disabled,
		readOnly,
	}: ControlProps<number, Record<string, never>, Context>) {
		return (
			<input
				aria-label={path}
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => setValue(Number(event.currentTarget.value))}
				readOnly={readOnly}
				ref={input.ref}
				type="number"
				value={String(value)}
			/>
		)
	},
	formData: {
		mode: "native",
	},
})

const dateControl = defineControl<Date, Record<string, never>, Context>({
	component({
		path,
		value,
		setValue,
		blur,
		input,
		disabled,
		readOnly,
	}: ControlProps<Date, Record<string, never>, Context>) {
		return (
			<input
				aria-label={path}
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) =>
					setValue(new Date(`${event.currentTarget.value}T00:00:00.000Z`))
				}
				readOnly={readOnly}
				ref={input.ref}
				type="date"
				value={formatDate(value)}
			/>
		)
	},
	formData: {
		mode: "native",
	},
})

const checkboxControl = defineControl<boolean, Record<string, never>, Context>({
	component({
		path,
		value,
		setValue,
		blur,
		input,
		disabled,
		readOnly,
	}: ControlProps<boolean, Record<string, never>, Context>) {
		return (
			<input
				aria-label={path}
				checked={value}
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => setValue(event.currentTarget.checked)}
				readOnly={readOnly}
				ref={input.ref}
				type="checkbox"
				value="on"
			/>
		)
	},
	formData: {
		mode: "native",
	},
})

const unavailableControl = defineControl<
	string | undefined,
	Record<string, never>,
	Context
>({
	component({
		path,
		value,
		setValue,
		blur,
		input,
	}: ControlProps<string | undefined, Record<string, never>, Context>) {
		return (
			<input
				aria-label={path}
				data-input-name={input.name}
				id={input.id}
				onBlur={blur}
				onChange={(event) => setValue(event.currentTarget.value)}
				ref={input.ref}
				value={value ?? ""}
			/>
		)
	},
	formData: {
		mode: "none",
	},
})

const fileControl = defineControl<
	File | undefined,
	Record<string, never>,
	unknown
>({
	component({
		path,
		setValue,
		blur,
		input,
		disabled,
		readOnly,
	}: ControlProps<File | undefined>) {
		return (
			<input
				aria-label={path}
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) =>
					setValue(event.currentTarget.files?.item(0) ?? undefined)
				}
				readOnly={readOnly}
				ref={input.ref}
				type="file"
			/>
		)
	},
	formData: {
		mode: "native",
	},
})

const kit = createFormKit({
	controls: {
		nativeText,
		hiddenText,
		number: numberControl,
		date: dateControl,
		checkbox: checkboxControl,
		unavailable: unavailableControl,
	},
	slots: {
		Field: FieldSlot,
		Section: SectionSlot,
		Array: ArraySlot,
		ArrayItem: ArrayItemSlot,
		ErrorMessage,
	},
})

const uploadKit = createFormKit({
	controls: {
		file: fileControl,
	},
	slots: {
		Field: FieldSlot,
		Section: SectionSlot,
		Array: ArraySlot,
		ArrayItem: ArrayItemSlot,
		ErrorMessage,
	},
})

const nativeTextLikeKit = createFormKit({
	controls: nativeControls,
	slots: {
		Field: FieldSlot,
		Section: SectionSlot,
		Array: ArraySlot,
		ArrayItem: ArrayItemSlot,
		ErrorMessage,
	},
})

const definition = kit.defineForm(schema).withContext<Context>({
	ui: [
		{
			kind: "field",
			path: "name",
			control: "nativeText",
			label: "Name",
		},
		{
			kind: "field",
			path: "hiddenCode",
			control: "hiddenText",
			label: "Hidden code",
			options: {
				suffix: "resolved",
			},
		},
		{
			kind: "field",
			path: "disabledCode",
			control: "nativeText",
			label: "Disabled code",
			disabled: true,
		},
		{
			kind: "field",
			path: "readonlyCode",
			control: "nativeText",
			label: "Readonly code",
			readOnly: true,
		},
		{
			kind: "field",
			path: "invisibleNote",
			control: "nativeText",
			label: "Invisible note",
			visible: false,
		},
		{
			kind: "field",
			path: "unsetNote",
			control: "nativeText",
			label: "Unset note",
			visible: false,
			valuePolicy: "unset",
		},
		{
			kind: "field",
			path: "count",
			control: "number",
			label: "Count",
		},
		{
			kind: "field",
			path: "birthday",
			control: "date",
			label: "Birthday",
		},
		{
			kind: "field",
			path: "subscribed",
			control: "checkbox",
			label: "Subscribed",
		},
		{
			kind: "field",
			path: "unavailable",
			control: "unavailable",
			label: "Unavailable",
		},
		{
			kind: "array",
			path: "contacts",
			label: "Contacts",
			itemDefault: {
				email: "",
			},
			children: [
				{
					kind: "field",
					path: "email",
					control: "nativeText",
					label: "Email",
				},
			],
		},
	],
})

const incompatibleDefinition = kit.defineForm(schema).withContext<Context>({
	ui: [
		{
			kind: "field",
			path: "count",
			control: "number",
			label: "Count",
			disabled: true,
		},
	],
})

const uploadDefinition = uploadKit.defineForm(uploadSchema)({
	ui: [
		{
			kind: "field",
			path: "avatar",
			control: "file",
			label: "Avatar",
		},
	],
})

const nestedDefinition = kit.defineForm(nestedSchema).withContext<Context>({
	ui: [
		{
			kind: "array",
			path: "groups",
			itemDefault: {
				name: "",
				members: [],
			},
			children: [
				{
					kind: "field",
					path: "name",
					control: "nativeText",
				},
				{
					kind: "array",
					path: "members",
					itemDefault: {
						email: "",
					},
					children: [
						{
							kind: "field",
							path: "email",
							control: "nativeText",
						},
					],
				},
			],
		},
	],
})

const nativeTextLikeDefinition = nativeTextLikeKit.defineForm(
	nativeTextLikeSchema,
)({
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			label: "Name",
			disabled: true,
		},
		{
			kind: "field",
			path: "note",
			control: "textarea",
			label: "Note",
			visible: false,
		},
		{
			kind: "field",
			path: "openingTime",
			control: "time",
			label: "Opening time",
			visible: false,
		},
		{
			kind: "field",
			path: "count",
			control: "number",
			label: "Count",
			disabled: true,
		},
		{
			kind: "field",
			path: "birthday",
			control: "date",
			label: "Birthday",
			visible: false,
		},
	],
})

const nativeChoiceFileDefinition = nativeTextLikeKit.defineForm(
	nativeChoiceFileSchema,
)({
	ui: [
		{
			kind: "field",
			path: "status",
			control: "select",
			label: "Status",
			options: {
				options: [
					{ value: "draft", label: "Draft" },
					{ value: "published", label: "Published" },
				],
			},
		},
		{
			kind: "field",
			path: "representation",
			control: "select",
			label: "Representation",
			options: {
				emptyOption: { label: "Choose a representation", disabled: true },
				options: [
					{ value: "registered", label: "Registered" },
					{ value: "forming", label: "Forming" },
				],
			},
		},
		{
			kind: "field",
			path: "subscribed",
			control: "checkbox",
			label: "Subscribed",
		},
		{
			kind: "field",
			path: "avatar",
			control: "file",
			label: "Avatar",
		},
	],
})

const nativeChoicePreservationDefinition = nativeTextLikeKit.defineForm(
	nativeChoiceFileSchema,
)({
	ui: [
		{
			kind: "field",
			path: "disabledStatus",
			control: "select",
			label: "Disabled status",
			disabled: true,
			options: {
				options: [
					{ value: "draft", label: "Draft" },
					{ value: "published", label: "Published" },
				],
			},
		},
		{
			kind: "field",
			path: "hiddenStatus",
			control: "select",
			label: "Hidden status",
			visible: false,
			options: {
				options: [
					{ value: "draft", label: "Draft" },
					{ value: "published", label: "Published" },
				],
			},
		},
		{
			kind: "field",
			path: "disabledSubscribed",
			control: "checkbox",
			label: "Disabled subscribed",
			disabled: true,
		},
		{
			kind: "field",
			path: "hiddenSubscribed",
			control: "checkbox",
			label: "Hidden subscribed",
			visible: false,
		},
	],
})

const disabledNativeFileDefinition = nativeTextLikeKit.defineForm(
	nativeChoiceFileSchema,
)({
	ui: [
		{
			kind: "field",
			path: "disabledAvatar",
			control: "file",
			label: "Disabled avatar",
			disabled: true,
		},
	],
})

const hiddenNativeFileDefinition = nativeTextLikeKit.defineForm(
	nativeChoiceFileSchema,
)({
	ui: [
		{
			kind: "field",
			path: "hiddenAvatar",
			control: "file",
			label: "Hidden avatar",
			visible: false,
		},
	],
})

describe("native FormData serialization", () => {
	beforeEach(() => {
		serializeCalls.length = 0
	})

	it("renders hidden serializer entries in SSR and client output", () => {
		const element = (
			<kit.AutoForm
				context={{ prefix: "ctx" }}
				defaultValues={defaultValues()}
				definition={definition}
				id="profile"
			/>
		)

		const html = renderToString(element)
		expect(html).toContain('type="hidden"')
		expect(html).toContain('name="__fp.array"')
		expect(html).toContain('value="contacts"')
		expect(html).toContain('name="hiddenCode"')
		expect(html).toContain('name="disabledCode"')
		expect(html).toContain('name="invisibleNote"')

		render(element)

		const hiddenEditor = screen.getByLabelText("hiddenCode")
		expect(hiddenEditor.hasAttribute("name")).toBe(false)
		expect(hiddenEditor.getAttribute("data-input-name")).toBe("hiddenCode")
		expect(screen.getByLabelText("unavailable").hasAttribute("name")).toBe(
			false,
		)
		expect(hiddenInput("hiddenCode")?.value).toBe("secret")
		expect(hiddenInput("disabledCode")?.value).toBe("locked")
		expect(hiddenInput("invisibleNote")?.value).toBe("preserved")
		expect(hiddenInput("unsetNote")).toBeNull()
		expect(hiddenInputs("readonlyCode")).toHaveLength(0)
		expect(hiddenInputs("__fp.array").map((input) => input.value)).toContain(
			"contacts",
		)
		expect(
			serializeCalls.some(
				(call) =>
					call.path === "hiddenCode" &&
					call.name === "hiddenCode" &&
					call.value === "secret" &&
					(call.options as TextOptions).suffix === "resolved" &&
					(call.context as Context).prefix === "ctx",
			),
		).toBe(true)
	})

	it("normalizes to the same schema output as the controlled snapshot", async () => {
		render(
			<kit.AutoForm
				context={{ prefix: "ctx" }}
				defaultValues={defaultValues()}
				definition={definition}
				id="profile"
			/>,
		)
		const form = document.querySelector("form")
		if (form === null) {
			throw new Error("Expected a form")
		}
		const controlled = await normalizeSchemaResult(
			schema["~standard"].validate(defaultValues()),
		)

		const parsed = await parseFormData(new FormData(form), schema)

		expect(parsed).toEqual({
			success: true,
			value: controlled,
		})
		expect(new FormData(form).has("subscribed")).toBe(false)
		expect(new FormData(form).has("unavailable")).toBe(false)
	})

	it("keeps empty arrays as arrays with only the reserved marker", async () => {
		render(
			<kit.AutoForm
				context={{ prefix: "ctx" }}
				defaultValues={{
					...defaultValues(),
					contacts: [],
				}}
				definition={definition}
				id="profile"
			/>,
		)
		const form = document.querySelector("form")
		if (form === null) {
			throw new Error("Expected a form")
		}

		const parsed = await parseFormData(new FormData(form), schema)
		const controlled = await normalizeSchemaResult(
			schema["~standard"].validate(defaultValues()),
		)

		expect(parsed).toEqual({
			success: true,
			value: {
				...controlled,
				contacts: [],
			},
		})
		expect(new FormData(form).getAll("__fp.array")).toEqual(["contacts"])
	})

	it("renders hidden serializer entries for manually composed kit.Form", async () => {
		function ManualForm() {
			const form = useForm(definition, {
				defaultValues: {
					...defaultValues(),
					contacts: [],
				},
				context: { prefix: "ctx" },
			})

			return (
				<kit.Form form={form} id="manual-profile">
					<kit.Fields />
				</kit.Form>
			)
		}

		render(<ManualForm />)
		const form = document.querySelector("form")
		if (form === null) {
			throw new Error("Expected a form")
		}

		const formData = new FormData(form)
		const parsed = await parseFormData(formData, schema)
		const controlled = await normalizeSchemaResult(
			schema["~standard"].validate({
				...defaultValues(),
				contacts: [],
			}),
		)

		expect(hiddenInput("hiddenCode")?.value).toBe("secret")
		expect(hiddenInput("disabledCode")?.value).toBe("locked")
		expect(hiddenInput("invisibleNote")?.value).toBe("preserved")
		expect(formData.getAll("__fp.array")).toEqual(["contacts"])
		expect(parsed).toEqual({
			success: true,
			value: controlled,
		})
	})

	it("serializes nested array markers and values from concrete row paths", async () => {
		const defaultValues = {
			groups: [
				{
					name: "Core",
					members: [{ email: "ada@example.test" }],
				},
				{
					name: "Docs",
					members: [],
				},
			],
		} satisfies NestedValues
		render(
			<kit.AutoForm
				context={{ prefix: "ctx" }}
				defaultValues={defaultValues}
				definition={nestedDefinition}
				id="nested"
			/>,
		)
		const form = document.querySelector("form")
		if (form === null) {
			throw new Error("Expected a form")
		}

		const formData = new FormData(form)
		const parsed = await parseFormData(formData, nestedSchema)

		expect(formData.getAll("__fp.array")).toEqual([
			"groups",
			"groups.0.members",
			"groups.1.members",
		])
		expect(parsed).toEqual({
			success: true,
			value: defaultValues,
		})
	})

	it("preserves browser File objects for native file controls", async () => {
		const user = userEvent.setup()
		const avatar = new File(["avatar"], "avatar.txt", { type: "text/plain" })
		render(
			<uploadKit.AutoForm
				defaultValues={{}}
				definition={uploadDefinition}
				id="upload"
			/>,
		)

		const fileInput = screen.getByLabelText("avatar") as HTMLInputElement

		await user.upload(fileInput, avatar)
		const selected = fileInput.files?.item(0)
		expect(selected?.name).toBe("avatar.txt")
		expect(hiddenInputs("avatar")).toHaveLength(0)

		const formData = new FormData()
		formData.append("avatar", selected as File)
		const parsed = await parseFormData(formData, uploadSchema)

		expect(parsed.success).toBe(true)
		if (!parsed.success) {
			return
		}
		expect(parsed.value.avatar).toBeInstanceOf(File)
		expect(parsed.value.avatar?.name).toBe("avatar.txt")
		expect(parsed.value.avatar?.type).toBe("text/plain")
		expect(parsed.value.avatar?.size).toBe(avatar.size)
	})

	it("preserves text-like nativeControls values as hidden FormData entries", async () => {
		const defaultValues = {
			name: "Ada",
			note: "private",
			count: 7,
			birthday: "2026-07-28",
			openingTime: "08:30",
		} satisfies NativeTextLikeValues
		render(
			<nativeTextLikeKit.AutoForm
				defaultValues={defaultValues}
				definition={nativeTextLikeDefinition}
				id="native-text-like"
			/>,
		)
		const form = document.querySelector("form")
		if (form === null) {
			throw new Error("Expected a form")
		}

		const formData = new FormData(form)
		const parsed = await parseFormData(formData, nativeTextLikeSchema)

		expect(formData.get("name")).toBe("Ada")
		expect(formData.get("note")).toBe("private")
		expect(formData.get("count")).toBe("7")
		expect(formData.get("birthday")).toBe("2026-07-28")
		expect(formData.get("openingTime")).toBe("08:30")
		expect(parsed).toEqual({
			success: true,
			value: defaultValues,
		})
	})

	it("uses native FormData protocols for select, checkbox, and file controls", async () => {
		const user = userEvent.setup()
		const avatar = new File(["avatar"], "avatar.png", { type: "image/png" })
		render(
			<nativeTextLikeKit.AutoForm
				defaultValues={{
					status: "draft",
					subscribed: true,
					disabledStatus: "published",
					hiddenStatus: "draft",
					disabledSubscribed: true,
					hiddenSubscribed: false,
				}}
				definition={nativeChoiceFileDefinition}
				id="native-choice-file"
			/>,
		)

		const form = document.querySelector("form")
		if (form === null) {
			throw new Error("Expected a form")
		}
		const fileInput = screen.getByLabelText("Avatar") as HTMLInputElement

		expect(new FormData(form).has("avatar")).toBe(false)
		await user.upload(fileInput, avatar)
		const selected = fileInput.files?.item(0)
		expect(selected?.name).toBe("avatar.png")
		expect(selected?.type).toBe("image/png")
		expect(selected?.size).toBe(avatar.size)
		expect(new FormData(form).get("avatar")).toBeInstanceOf(File)
		expect(new FormData(form).get("status")).toBe("draft")
		expect(new FormData(form).get("representation")).toBe("")
		expect(new FormData(form).get("subscribed")).toBe("true")
		const parsed = await parseFormData(
			new FormData(form),
			nativeChoiceFileSchema,
		)
		expect(parsed.success).toBe(true)
		if (parsed.success) {
			expect(parsed.value.representation).toBeUndefined()
		}

		await user.click(screen.getByLabelText("Subscribed"))
		expect(new FormData(form).has("subscribed")).toBe(false)
	})

	it("preserves hidden and disabled native select and checkbox values", async () => {
		const defaultValues = {
			status: "draft",
			subscribed: false,
			disabledStatus: "published",
			hiddenStatus: "draft",
			disabledSubscribed: true,
			hiddenSubscribed: false,
		} satisfies NativeChoiceFileValues
		render(
			<nativeTextLikeKit.AutoForm
				defaultValues={defaultValues}
				definition={nativeChoicePreservationDefinition}
				id="native-choice-preserved"
			/>,
		)
		const form = document.querySelector("form")
		if (form === null) {
			throw new Error("Expected a form")
		}

		const formData = new FormData(form)
		const parsed = await parseFormData(formData, nativeChoiceFileSchema)

		expect(formData.get("disabledStatus")).toBe("published")
		expect(formData.get("hiddenStatus")).toBe("draft")
		expect(formData.get("disabledSubscribed")).toBe("true")
		expect(formData.get("hiddenSubscribed")).toBe("false")
		expect(parsed.success).toBe(true)
	})

	it("updates hidden serializer entries when values change", () => {
		render(
			<kit.AutoForm
				context={{ prefix: "ctx" }}
				defaultValues={defaultValues()}
				definition={definition}
				id="profile"
			/>,
		)

		fireEvent.change(screen.getByLabelText("hiddenCode"), {
			target: { value: "changed" },
		})

		expect(hiddenInput("hiddenCode")?.value).toBe("changed")
	})

	it("rejects preserved disabled native controls without serializers", () => {
		expect(() => {
			render(
				<kit.AutoForm
					context={{ prefix: "ctx" }}
					defaultValues={defaultValues()}
					definition={incompatibleDefinition}
					id="incompatible"
				/>,
			)
		}).toThrow(
			'Classic form cannot preserve field "count" while it is invisible or disabled without a serializer',
		)
	})

	it.each([
		{
			name: "disabled",
			path: "disabledAvatar",
			definition: disabledNativeFileDefinition,
			defaultValues: {
				disabledAvatar: new File(["avatar"], "avatar.png", {
					type: "image/png",
				}),
			},
		},
		{
			name: "hidden",
			path: "hiddenAvatar",
			definition: hiddenNativeFileDefinition,
			defaultValues: {
				hiddenAvatar: new File(["avatar"], "avatar.png", {
					type: "image/png",
				}),
			},
		},
	])(
		"rejects $name native file preservation in classic and Action FormData",
		({ path, definition, defaultValues }) => {
			const fullDefaultValues = {
				status: "draft",
				subscribed: false,
				disabledStatus: "draft",
				hiddenStatus: "draft",
				disabledSubscribed: false,
				hiddenSubscribed: false,
				...defaultValues,
			} satisfies NativeChoiceFileValues

			expect(() => {
				render(
					<nativeTextLikeKit.AutoForm
						defaultValues={fullDefaultValues}
						definition={definition}
						id="native-file-incompatible"
					/>,
				)
			}).toThrow(
				`Classic form cannot preserve field "${path}" while it is invisible or disabled without a serializer`,
			)

			const snapshot = createFormStore({
				definition,
				defaultValues: fullDefaultValues,
			}).getSnapshot()

			expect(() =>
				assertActionFormCompatible(snapshot, nativeTextLikeKit.controls),
			).toThrow(
				`ActionForm cannot preserve field "${path}" while it is invisible or disabled without a serializer`,
			)
		},
	)

	it.each([
		{
			name: "disabled",
			path: "disabledAvatar",
			definition: disabledNativeFileDefinition,
			defaultValues: {
				disabledAvatar: undefined,
			},
		},
		{
			name: "hidden",
			path: "hiddenAvatar",
			definition: hiddenNativeFileDefinition,
			defaultValues: {
				hiddenAvatar: undefined,
			},
		},
	])(
		"allows undefined $name native file values in classic and Action FormData",
		({ path, definition, defaultValues }) => {
			const fullDefaultValues = {
				status: "draft",
				subscribed: false,
				disabledStatus: "draft",
				hiddenStatus: "draft",
				disabledSubscribed: false,
				hiddenSubscribed: false,
				...defaultValues,
			} satisfies NativeChoiceFileValues

			expect(() => {
				render(
					<nativeTextLikeKit.AutoForm
						defaultValues={fullDefaultValues}
						definition={definition}
						id="native-file-undefined"
					/>,
				)
			}).not.toThrow()
			expect(hiddenInputs(path)).toHaveLength(0)

			const snapshot = createFormStore({
				definition,
				defaultValues: fullDefaultValues,
			}).getSnapshot()

			expect(() =>
				assertActionFormCompatible(snapshot, nativeTextLikeKit.controls),
			).not.toThrow()
		},
	)
})

function defaultValues(): Values {
	return {
		name: "Ada",
		hiddenCode: "secret",
		disabledCode: "locked",
		readonlyCode: "readonly",
		invisibleNote: "preserved",
		count: 7,
		birthday: new Date("2026-07-28T00:00:00.000Z"),
		subscribed: false,
		contacts: [
			{
				email: "ada@example.test",
			},
		],
		unavailable: "client-only",
	}
}

function FieldSlot({ rootProps, label, labelProps, control }: FieldSlotProps) {
	return (
		<div {...rootProps}>
			{label === undefined ? null : (
				<label {...labelProps} htmlFor={labelProps.htmlFor}>
					{label}
				</label>
			)}
			{control}
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

function ArraySlot({ rootProps, label, labelProps, children }: ArraySlotProps) {
	return (
		<div {...rootProps}>
			{label === undefined ? null : <div {...labelProps}>{label}</div>}
			{children}
		</div>
	)
}

function ArrayItemSlot({ rootProps, children }: ArrayItemSlotProps) {
	return <div {...rootProps}>{children}</div>
}

function ErrorMessage({ rootProps, issue }: ErrorMessageSlotProps) {
	return <p {...rootProps}>{issue.message}</p>
}

function hiddenInput(name: string): HTMLInputElement | null {
	return document.querySelector(
		`input[type="hidden"][name="${name}"]`,
	) as HTMLInputElement | null
}

function hiddenInputs(name: string): readonly HTMLInputElement[] {
	return [
		...document.querySelectorAll(`input[type="hidden"][name="${name}"]`),
	] as HTMLInputElement[]
}

function recordSerialize(
	value: unknown,
	details: {
		readonly path: string
		readonly name: string
		readonly options: unknown
		readonly context: unknown
	},
): void {
	serializeCalls.push({
		value,
		path: details.path,
		name: details.name,
		options: details.options,
		context: details.context,
	})
}

function createSchema<Input, Output>(
	validate: (value: unknown) => StandardSchemaV1.Result<Output>,
): StandardSchemaV1<Input, Output> {
	return {
		"~standard": {
			version: 1,
			vendor: "form-please-test",
			validate,
		},
	} as StandardSchemaV1<Input, Output>
}

async function normalizeSchemaResult<Output>(
	result:
		| Promise<StandardSchemaV1.Result<Output>>
		| StandardSchemaV1.Result<Output>,
): Promise<Output> {
	const resolved = await result
	if ("issues" in resolved) {
		throw new Error("Expected successful schema result")
	}

	return resolved.value
}

function optionalString(value: unknown): string | undefined {
	return value === undefined ? undefined : String(value)
}

function optionalFile(value: unknown): File | undefined {
	return value instanceof File ? value : undefined
}

function normalizeDate(value: Date | string | undefined): string {
	if (value instanceof Date) {
		return formatDate(value)
	}

	return value ?? ""
}

function formatDate(value: Date): string {
	return value.toISOString().slice(0, 10)
}
