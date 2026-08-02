import {
	type ArrayItemSlotProps,
	type ArraySlotProps,
	type ControlProps,
	cloneValue,
	createFormKit,
	defineControl,
	type ErrorMessageSlotProps,
	extendValueChanges,
	type FieldSlotProps,
	type FormInput,
	formatPath,
	getPathValue,
	isAncestorPath,
	isDescendantPath,
	isDirtyEqual,
	isSamePath,
	mergePathValue,
	normalizeDefinition,
	parseArrayIndex,
	parsePath,
	pathsOverlap,
	type RenderNodeProps,
	resolveUi,
	type SectionSlotProps,
	type StandardSchema,
	setPathValue,
	type UiNode,
	type UiResolver,
	unsetPathValue,
	useArrayField,
	useField,
	useFormContext,
	useFormState,
	useValue,
} from "form-please"
import { createFormStore } from "form-please/core"
import { createDefaultSlots } from "form-please/default-slots"
import { createMuiFormKit } from "form-please/preset-mui"
import { nativeFormKit } from "form-please/preset-native"
import type { ReactNode } from "react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

type MainExports = typeof import("form-please")
type CoreExports = typeof import("form-please/core")

const muiKit = createMuiFormKit()
if (!muiKit.controls.autocomplete || muiKit.grid.at(-1) !== 12) {
	throw new Error("Material UI preset did not initialize")
}

// @ts-expect-error React 19 Action APIs must stay isolated under form-please/react19.
type _NoActionForm = MainExports["ActionForm"]

// @ts-expect-error React 19 Action APIs must stay isolated under form-please/react19.
type _NoActionSubmit = MainExports["ActionSubmit"]

// @ts-expect-error derived UI uses plain resolver functions, not a helper export.
type _NoStandaloneComputed = MainExports["computed"]

// @ts-expect-error the React-free core no longer exposes a computed helper.
type _NoCoreComputed = CoreExports["computed"]

// @ts-expect-error plain resolver functions do not need a runtime type guard.
type _NoComputedGuard = CoreExports["isComputed"]

type ProfileInput = {
	readonly name: string
	readonly settings: {
		readonly nickname: string
	}
	readonly contacts?: readonly {
		readonly value: string
	}[]
}

type ProfileOutput = ProfileInput & {
	readonly slug: string
}

const schema: StandardSchema<ProfileInput, ProfileOutput> = {
	"~standard": {
		version: 1,
		vendor: "form-please-smoke",
		validate(value) {
			const input = value as ProfileInput
			if (input.name.trim() === "") {
				return {
					issues: [{ message: "Name is required", path: ["name"] }],
				}
			}

			return {
				value: {
					...input,
					slug: input.name.toLowerCase().replaceAll(" ", "-"),
				},
			}
		},
	},
}

const text = defineControl<string | undefined>({
	component({
		value,
		setValue,
		blur,
		input,
		meta,
	}: ControlProps<string | undefined>) {
		return (
			<input
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => setValue(event.currentTarget.value)}
				ref={input.ref}
				value={value ?? ""}
			/>
		)
	},
	formData: {
		mode: "native",
	},
})

type PublishedFieldOptions = {
	readonly tooltip?: string
}

type PublishedSectionOptions = {
	readonly tone?: "quiet" | "strong"
}

type PublishedArrayOptions = {
	readonly emptyText?: string
}

function Field({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	slotOptions,
	control,
	errors,
}: FieldSlotProps<PublishedFieldOptions>) {
	return (
		<div {...rootProps} data-tooltip={slotOptions?.tooltip}>
			{label === undefined ? null : (
				<label {...labelProps} htmlFor={labelProps.htmlFor}>
					{label}
				</label>
			)}
			{description === undefined ? null : (
				<div {...descriptionProps}>{description}</div>
			)}
			{control}
			{errors}
		</div>
	)
}

function Section({
	rootProps,
	layoutProps,
	title,
	description,
	slotOptions,
	children,
}: SectionSlotProps<PublishedSectionOptions>) {
	return (
		<section {...rootProps} data-tone={slotOptions?.tone}>
			{title === undefined ? null : <h2>{title}</h2>}
			{description}
			<div {...layoutProps}>{children}</div>
		</section>
	)
}

function ArraySlot({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	slotOptions,
	errors,
	children,
}: ArraySlotProps<PublishedArrayOptions>) {
	return (
		<div {...rootProps}>
			{label === undefined ? null : <div {...labelProps}>{label}</div>}
			{description === undefined ? null : (
				<div {...descriptionProps}>{description}</div>
			)}
			<output>{slotOptions?.emptyText}</output>
			{errors}
			{children}
		</div>
	)
}

function ArrayItem({ rootProps, children }: ArrayItemSlotProps) {
	return <div {...rootProps}>{children}</div>
}

function ErrorMessage({ rootProps, issue }: ErrorMessageSlotProps) {
	return <p {...rootProps}>{issue.message}</p>
}

const kit = createFormKit({
	controls: {
		text,
	},
	slots: {
		...createDefaultSlots(),
		Field,
		Section,
		Array: ArraySlot,
		ArrayItem,
		ErrorMessage,
	},
})

const extendedKit = kit.extend({
	controls: {
		localText: text,
	},
})

function LocalPreview({ disabled, readOnly }: RenderNodeProps) {
	const form = useFormContext<typeof schema>()
	const name = useValue(form, "name")
	return (
		<output aria-disabled={disabled || undefined} data-read-only={readOnly}>
			{name}
		</output>
	)
}

const extendedDefinition = extendedKit.defineForm(schema, {
	ui: [
		{
			kind: "render",
			id: "local-preview",
			component: LocalPreview,
		},
		{
			kind: "field",
			path: "name",
			control: "localText",
		},
	],
})

function ExtendedFormProbe() {
	const form = extendedKit.useCreateForm(extendedDefinition, {
		defaultValues: {
			name: "Ada Lovelace",
			settings: { nickname: "Ada" },
		},
	})
	return <extendedKit.AutoForm form={form} />
}

const nativeKit = nativeFormKit

const description: UiResolver<string, ProfileInput> = ({ name }) =>
	name.length > 0 ? `Editing ${name}` : "Profile"

const ui = [
	{
		kind: "field",
		path: "name",
		control: "text",
		label: "Name",
		description,
		required: true,
	},
] satisfies readonly UiNode<ProfileInput, typeof kit.controls>[]

const definition = kit.defineForm(schema, {
	ui: [
		...ui,
		{
			kind: "field",
			path: "settings.nickname",
			control: "text",
			label: "Nickname",
		},
	],
})
const richDefinition = kit.defineForm(schema, {
	ui: [
		{
			kind: "section",
			id: "profile",
			title: (
				<>
					Profile <small>published package</small>
				</>
			),
			description: <a href="/profile-help">Profile help</a>,
			slotOptions: {
				tone: "quiet",
			},
			children: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: <strong>Name</strong>,
					description: <a href="/naming-policy">Naming policy</a>,
					slotOptions: ({ name }) => ({
						tooltip: `Editing ${name}`,
					}),
				},
			],
		},
		{
			kind: "array",
			path: "contacts",
			label: <strong>Contacts</strong>,
			description: <a href="/contacts-help">Contact help</a>,
			slotOptions: {
				emptyText: "No contacts",
			},
			itemDefault: {
				value: "",
			},
			children: [
				{
					kind: "field",
					path: "value",
					control: "text",
				},
			],
		},
	],
})

const store = createFormStore({
	definition,
	defaultValues: defaultValues(),
	beforeUpdate: (event) =>
		extendValueChanges(event, [
			{
				type: "set",
				path: "settings.nickname",
				value: event.nextValues.name,
			},
		]),
})
store.setValue("name", "Grace Hopper")
void store.validatePaths(["settings"])
store.focusFirstError(["settings.nickname"])
const snapshot = store.getSnapshot()
const namePath = parsePath("name")
const updatedValues = setPathValue(snapshot.values, "name", "Grace")
const mergedValues = mergePathValue(updatedValues, "name", "Ada")

void [
	cloneValue(snapshot.values),
	formatPath(namePath),
	getPathValue(snapshot.values, "name"),
	isAncestorPath("name", "name"),
	description,
	isDescendantPath("name", "name"),
	isDirtyEqual(defaultValues(), snapshot.values),
	isSamePath("name", ["name"]),
	mergePathValue(defaultValues(), "name", "math"),
	parseArrayIndex("12"),
	pathsOverlap("name", "name"),
	resolveUi(definition, snapshot.values, undefined),
	unsetPathValue(mergedValues, "name"),
	nativeKit.slots.Field,
	normalizeDefinition,
	useArrayField,
	ExtendedFormProbe,
	RichFormProbe,
]

function defaultValues(): FormInput<typeof schema> {
	return {
		name: "Ada Lovelace",
		settings: { nickname: "Ada" },
		contacts: [],
	}
}

function RichFormProbe() {
	const form = kit.useCreateForm(richDefinition, {
		defaultValues: defaultValues(),
	})
	return <kit.AutoForm form={form} />
}

const externalForm = kit.createForm(definition, {
	defaultValues: defaultValues(),
})

function HookProbe() {
	const form = useFormContext<typeof schema>()
	const name = useValue(form, "name")
	const field = useField(form, "name")
	const dirty = useFormState(form, (state) => state.isDirty)

	return (
		<p>
			{name}:{field.value}:{String(dirty)}
		</p>
	)
}

function App({ children }: { readonly children?: ReactNode }) {
	const form = kit.useBindForm(externalForm, {
		onSubmit({ value }) {
			void value.slug
		},
	})

	return (
		<kit.Form form={form} id="profile-form">
			<kit.Fields />
			<HookProbe />
			<kit.Submit>Save</kit.Submit>
			{children}
		</kit.Form>
	)
}

createRoot(document.getElementById("root") ?? document.body).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
