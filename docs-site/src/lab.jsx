import {
	computed,
	createFormKit,
	defineControl,
	useFormContext,
	useFormState,
} from "fokit"
import "fokit/layout.css"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { z } from "zod"

const profileSchema = z
	.object({
		name: z.string().min(1, "Name is required"),
		accountType: z.enum(["personal", "company"]),
		companyName: z.string().optional(),
		country: z.string().min(2, "Choose a country"),
		newsletter: z.boolean(),
		contacts: z
			.array(
				z.object({
					email: z.string().email("Use a valid email"),
					label: z.string().optional(),
				}),
			)
			.min(1, "Add at least one contact"),
	})
	.superRefine((value, context) => {
		if (
			value.accountType === "company" &&
			(value.companyName ?? "").trim().length === 0
		) {
			context.addIssue({
				code: "custom",
				message: "Company name is required",
				path: ["companyName"],
			})
		}
	})
	.transform((value) => ({
		...value,
		companyName:
			value.companyName === undefined || value.companyName.trim() === ""
				? undefined
				: value.companyName.trim(),
		contactCount: value.contacts.length,
	}))

const defaultValues = {
	name: "Ada Lovelace",
	accountType: "personal",
	country: "GB",
	newsletter: true,
	contacts: [{ email: "ada@example.com", label: "primary" }],
}

const countryOptions = {
	en: [
		{ value: "GB", label: "United Kingdom" },
		{ value: "US", label: "United States" },
		{ value: "NL", label: "Netherlands" },
	],
	ru: [
		{ value: "GB", label: "Великобритания" },
		{ value: "US", label: "США" },
		{ value: "NL", label: "Нидерланды" },
	],
}

const copy = {
	en: {
		title: "Interactive Fokit lab",
		kicker: "Live public package",
		summary:
			"Edit the generated form, then compare values, exposed issues, and native FormData from the same Fokit instance.",
		accountSection: "Profile",
		accountDescription: "A compact account form rendered from AutoForm.",
		name: "Name",
		nameDescription: "Required before a classic submit can succeed.",
		accountType: "Account type",
		companyName: "Company name",
		country: "Country",
		newsletter: "Receive product news",
		contacts: "Contacts",
		contactsDescription: "Array rows keep stable keys while values reorder.",
		email: "Email",
		label: "Label",
		personal: "Personal",
		company: "Company",
		addContact: "Add contact",
		moveUp: "Move up",
		moveDown: "Move down",
		remove: "Remove",
		emptyArray: "No contacts",
		save: "Save profile",
		reset: "Reset lab",
		values: "Values",
		state: "State",
		issues: "Exposed issues",
		formData: "Native FormData",
		lastSubmit: "Last submit",
		noIssues: "No exposed issues",
		noSubmit: "No submission yet",
		dirty: "Dirty",
		touched: "Touched",
		validation: "Validation",
		submits: "Submits",
		rows: "Rows",
		saved(value) {
			return `Saved ${value.name} with ${value.contactCount} ${
				value.contactCount === 1 ? "contact" : "contacts"
			}.`
		},
	},
	ru: {
		title: "Интерактивная лаборатория Fokit",
		kicker: "Живой публичный пакет",
		summary:
			"Изменяйте сгенерированную форму и сверяйте values, exposed issues и native FormData из того же Fokit instance.",
		accountSection: "Профиль",
		accountDescription: "Компактная account form, отрендеренная AutoForm.",
		name: "Имя",
		nameDescription: "Обязательно для успешной classic submit.",
		accountType: "Тип аккаунта",
		companyName: "Название компании",
		country: "Страна",
		newsletter: "Получать новости продукта",
		contacts: "Контакты",
		contactsDescription: "Array rows сохраняют stable keys при перестановке.",
		email: "Email",
		label: "Метка",
		personal: "Личный",
		company: "Компания",
		addContact: "Добавить контакт",
		moveUp: "Вверх",
		moveDown: "Вниз",
		remove: "Удалить",
		emptyArray: "Контактов нет",
		save: "Сохранить профиль",
		reset: "Сбросить лабораторию",
		values: "Values",
		state: "State",
		issues: "Exposed issues",
		formData: "Native FormData",
		lastSubmit: "Последняя отправка",
		noIssues: "Нет exposed issues",
		noSubmit: "Отправки еще не было",
		dirty: "Dirty",
		touched: "Touched",
		validation: "Validation",
		submits: "Submits",
		rows: "Rows",
		saved(value) {
			return `Сохранено: ${value.name}, контактов ${value.contactCount}.`
		},
	},
}

const LabCopyContext = createContext(copy.en)

const textControl = defineControl({
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
	}) {
		return (
			<input
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
				autoComplete={options.autoComplete}
				className="lab-input"
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => setValue(event.currentTarget.value)}
				placeholder={options.placeholder}
				readOnly={readOnly}
				ref={input.ref}
				required={required}
				type={options.type ?? "text"}
				value={value ?? ""}
			/>
		)
	},
	formData: {
		mode: "native",
		serialize(value, { name }) {
			return value === undefined ? [] : [{ name, value }]
		},
	},
})

const selectControl = defineControl({
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
	}) {
		return (
			<select
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
				aria-readonly={readOnly || undefined}
				className="lab-input"
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => {
					if (!readOnly) {
						setValue(event.currentTarget.value)
					}
				}}
				ref={input.ref}
				required={required}
				value={value}
			>
				{options.options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		)
	},
	formData: {
		mode: "native",
		serialize(value, { name }) {
			return [{ name, value }]
		},
	},
})

const checkboxControl = defineControl({
	component({ value, setValue, blur, input, meta, disabled, readOnly }) {
		return (
			<input
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
				aria-readonly={readOnly || undefined}
				checked={Boolean(value)}
				className="lab-checkbox"
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => {
					if (!readOnly) {
						setValue(event.currentTarget.checked)
					}
				}}
				ref={input.ref}
				type="checkbox"
				value="true"
			/>
		)
	},
	formData: {
		mode: "native",
		serialize(value, { name }) {
			return [{ name, value: value ? "true" : "false" }]
		},
	},
})

const kit = createFormKit({
	controls: {
		text: textControl,
		select: selectControl,
		checkbox: checkboxControl,
	},
	slots: {
		Field: FieldSlot,
		Section: SectionSlot,
		Array: ArraySlot,
		ArrayItem: ArrayItemSlot,
		ErrorMessage: ErrorMessageSlot,
	},
})

export function Lab({ locale }) {
	const t = copy[locale] ?? copy.en
	const [lastSubmit, setLastSubmit] = useState(t.noSubmit)
	const definition = useMemo(() => createDefinition(t), [t])
	const context = useMemo(
		() => ({
			countries: countryOptions[locale] ?? countryOptions.en,
		}),
		[locale],
	)

	useEffect(() => {
		setLastSubmit(t.noSubmit)
	}, [t])

	return (
		<section
			aria-labelledby="lab-title"
			className="lab-section"
			data-testid="lab"
		>
			<div className="lab-heading">
				<p>{t.kicker}</p>
				<h2 id="lab-title">{t.title}</h2>
				<span>{t.summary}</span>
			</div>
			<div className="lab-workspace">
				<div className="lab-form-panel">
					<LabCopyContext.Provider value={t}>
						<kit.AutoForm
							className="lab-form"
							context={context}
							defaultValues={defaultValues}
							definition={definition}
							id="learning-lab-form"
							key={locale}
							onSubmit={({ value }) => {
								setLastSubmit(t.saved(value))
							}}
							style={{
								"--fokit-array-item-gap": "0.85rem",
								"--fokit-column-gap": "1rem",
								"--fokit-row-gap": "0.95rem",
								"--fokit-stack-gap": "1rem",
							}}
							validation={{
								mode: "blur",
								revalidateMode: "change",
							}}
						>
							<div className="lab-actions">
								<kit.Submit className="lab-primary-button">{t.save}</kit.Submit>
								<button className="lab-secondary-button" type="reset">
									{t.reset}
								</button>
							</div>
							<LabInspector copy={t} lastSubmit={lastSubmit} />
						</kit.AutoForm>
					</LabCopyContext.Provider>
				</div>
			</div>
		</section>
	)
}

function createDefinition(t) {
	return kit.defineForm({
		schema: profileSchema,
		ui: [
			{
				kind: "section",
				id: "account",
				title: t.accountSection,
				description: t.accountDescription,
				columns: 2,
				children: [
					{
						kind: "field",
						path: "name",
						control: "text",
						label: t.name,
						description: t.nameDescription,
						required: true,
						options: {
							placeholder: "Ada Lovelace",
							autoComplete: "name",
						},
					},
					{
						kind: "field",
						path: "accountType",
						control: "select",
						label: t.accountType,
						required: true,
						options: {
							options: [
								{ value: "personal", label: t.personal },
								{ value: "company", label: t.company },
							],
						},
					},
					{
						kind: "field",
						path: "companyName",
						control: "text",
						label: t.companyName,
						visible: computed(
							["accountType"],
							({ accountType }) => accountType === "company",
						),
						valuePolicy: "unset",
						options: {
							placeholder: "Compiler Labs",
							autoComplete: "organization",
						},
					},
					{
						kind: "field",
						path: "country",
						control: "select",
						label: t.country,
						required: true,
						options: computed(["accountType"], (_values, { context }) => ({
							options: context.countries,
						})),
					},
					{
						kind: "field",
						path: "newsletter",
						control: "checkbox",
						label: t.newsletter,
					},
				],
			},
			{
				kind: "array",
				path: "contacts",
				label: t.contacts,
				description: t.contactsDescription,
				itemDefault: {
					email: "",
					label: undefined,
				},
				children: [
					{
						kind: "field",
						path: "email",
						control: "text",
						label: t.email,
						required: true,
						options: {
							type: "email",
							placeholder: "ada@example.com",
							autoComplete: "email",
						},
					},
					{
						kind: "field",
						path: "label",
						control: "text",
						label: t.label,
						valuePolicy: "unset",
						options: {
							placeholder: "primary",
						},
					},
				],
			},
		],
	})
}

function FieldSlot({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	control,
	errors,
	disabled,
	readOnly,
	required,
}) {
	return (
		<div
			{...rootProps}
			className={joinClassNames("lab-field", rootProps.className)}
		>
			{label === undefined ? null : (
				<label
					{...labelProps}
					className="lab-label"
					htmlFor={labelProps.htmlFor}
				>
					{label}
					{required ? <span aria-hidden="true"> *</span> : null}
				</label>
			)}
			{description === undefined ? null : (
				<p {...descriptionProps} className="lab-description">
					{description}
				</p>
			)}
			<div
				className="lab-control-shell"
				data-disabled={disabled || undefined}
				data-readonly={readOnly || undefined}
			>
				{control}
			</div>
			{errors}
		</div>
	)
}

function SectionSlot({ rootProps, layoutProps, title, description, children }) {
	return (
		<section
			{...rootProps}
			className={joinClassNames("lab-card-section", rootProps.className)}
		>
			<div className="lab-section-title">
				{title === undefined ? null : <h3>{title}</h3>}
				{description === undefined ? null : <p>{description}</p>}
			</div>
			<div
				{...layoutProps}
				className={joinClassNames("lab-fields-grid", layoutProps.className)}
			>
				{children}
			</div>
		</section>
	)
}

function ArraySlot({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	errors,
	invalid,
	canAdd,
	add,
	children,
}) {
	const t = useCurrentLabCopy()

	return (
		<div
			{...rootProps}
			className={joinClassNames("lab-array", rootProps.className)}
		>
			<div className="lab-array-heading">
				<div>
					{label === undefined ? null : (
						<div {...labelProps} className="lab-array-label">
							{label}
						</div>
					)}
					{description === undefined ? null : (
						<p {...descriptionProps} className="lab-description">
							{description}
						</p>
					)}
				</div>
				<button
					className="lab-secondary-button"
					disabled={!canAdd}
					onClick={add}
					type="button"
				>
					{t.addContact}
				</button>
			</div>
			{errors}
			<div className="lab-array-items" data-invalid={invalid || undefined}>
				{children ?? <p className="lab-empty">{t.emptyArray}</p>}
			</div>
		</div>
	)
}

function ArrayItemSlot({
	rootProps,
	index,
	disabled,
	readOnly,
	canMoveUp,
	canMoveDown,
	remove,
	move,
	children,
}) {
	const t = useCurrentLabCopy()
	const number = index + 1

	return (
		<div
			{...rootProps}
			className={joinClassNames("lab-array-item", rootProps.className)}
			data-lab-array-item=""
		>
			<div className="lab-array-item-fields">{children}</div>
			<div className="lab-row-actions">
				<button
					aria-label={`Move contact ${number} up`}
					className="lab-icon-button"
					disabled={disabled || readOnly || !canMoveUp}
					onClick={() => move(index - 1)}
					type="button"
				>
					{t.moveUp}
				</button>
				<button
					aria-label={`Move contact ${number} down`}
					className="lab-icon-button"
					disabled={disabled || readOnly || !canMoveDown}
					onClick={() => move(index + 1)}
					type="button"
				>
					{t.moveDown}
				</button>
				<button
					aria-label={`Remove contact ${number}`}
					className="lab-icon-button danger"
					disabled={disabled || readOnly}
					onClick={remove}
					type="button"
				>
					{t.remove}
				</button>
			</div>
		</div>
	)
}

function ErrorMessageSlot({ rootProps, issue }) {
	return (
		<p
			{...rootProps}
			className={joinClassNames("lab-error", rootProps.className)}
		>
			{issue.message}
		</p>
	)
}

function LabInspector({ copy: t, lastSubmit }) {
	const form = useFormContext()
	const snapshot = useFormState(form, (state) => state)
	const [formDataLines, setFormDataLines] = useState([])
	const issueLines = useMemo(() => formatIssues(snapshot), [snapshot])
	const rowKeys =
		snapshot.metadata.arraysByPath.contacts?.items
			.map((item) => item.key)
			.join(", ") ?? ""

	useEffect(() => {
		const element = document.getElementById("learning-lab-form")
		const nextLines =
			element instanceof HTMLFormElement
				? formatFormData(new FormData(element))
				: []

		setFormDataLines((currentLines) =>
			linesEqual(currentLines, nextLines) ? currentLines : nextLines,
		)
	})

	return (
		<section className="lab-inspector" aria-label="Lab inspector">
			<div className="lab-submit-state">
				<span>{t.lastSubmit}</span>
				<output data-testid="lab-submission">{lastSubmit}</output>
			</div>
			<div className="lab-inspector-grid">
				<InspectorPanel title={t.values}>
					<pre data-testid="lab-values">
						<code>{JSON.stringify(snapshot.values, null, 2)}</code>
					</pre>
				</InspectorPanel>
				<InspectorPanel title={t.state}>
					<dl className="lab-state-list">
						<div>
							<dt>{t.dirty}</dt>
							<dd data-testid="lab-dirty">{String(snapshot.isDirty)}</dd>
						</div>
						<div>
							<dt>{t.touched}</dt>
							<dd>{String(snapshot.isTouched)}</dd>
						</div>
						<div>
							<dt>{t.validation}</dt>
							<dd>{snapshot.validationStatus}</dd>
						</div>
						<div>
							<dt>{t.submits}</dt>
							<dd>{snapshot.submitCount}</dd>
						</div>
						<div>
							<dt>{t.rows}</dt>
							<dd>{rowKeys}</dd>
						</div>
					</dl>
				</InspectorPanel>
				<InspectorPanel title={t.issues}>
					<pre data-testid="lab-issues">
						<code>
							{issueLines.length === 0 ? t.noIssues : issueLines.join("\n")}
						</code>
					</pre>
				</InspectorPanel>
				<InspectorPanel title={t.formData}>
					<pre data-testid="lab-form-data">
						<code>{formDataLines.join("\n")}</code>
					</pre>
				</InspectorPanel>
			</div>
		</section>
	)
}

function linesEqual(left, right) {
	if (left.length !== right.length) {
		return false
	}

	return left.every((value, index) => value === right[index])
}

function InspectorPanel({ title, children }) {
	return (
		<section className="lab-inspector-panel">
			<h3>{title}</h3>
			{children}
		</section>
	)
}

function useCurrentLabCopy() {
	return useContext(LabCopyContext)
}

function formatIssues(snapshot) {
	const lines = []

	for (const issue of snapshot.displayErrors.form) {
		lines.push(`form: ${issue.message}`)
	}

	for (const [path, issues] of snapshot.displayErrors.fields) {
		for (const issue of issues) {
			lines.push(`${path}: ${issue.message}`)
		}
	}

	return lines
}

function formatFormData(formData) {
	const lines = []
	for (const [name, value] of formData.entries()) {
		lines.push(`${name}=${formatEntryValue(value)}`)
	}
	return lines.sort((left, right) => left.localeCompare(right))
}

function formatEntryValue(value) {
	if (typeof File !== "undefined" && value instanceof File) {
		return `File(${value.name})`
	}

	return String(value)
}

function joinClassNames(...values) {
	return values.filter(Boolean).join(" ")
}
