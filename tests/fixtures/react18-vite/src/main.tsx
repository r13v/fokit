import {
	type ArrayItemSlotProps,
	type ArraySlotProps,
	type ControlProps,
	cloneValue,
	computed,
	createFormKit,
	createFormStore,
	defineControl,
	type ErrorMessageSlotProps,
	type FieldSlotProps,
	type FormInput,
	formatPath,
	getPathValue,
	isAncestorPath,
	isComputed,
	isDescendantPath,
	isDirtyEqual,
	isSamePath,
	KitForm,
	mergePathValue,
	type NormalizedFormDefinition,
	normalizeDefinition,
	parseArrayIndex,
	parsePath,
	pathsOverlap,
	resolveUi,
	type SectionSlotProps,
	type StandardSchema,
	Submit,
	setPathValue,
	type UiNode,
	unsetPathValue,
	useArrayField,
	useField,
	useForm,
	useFormContext,
	useFormState,
	useValue,
} from "fokit"
import type { ReactNode } from "react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

type MainExports = typeof import("fokit")

// @ts-expect-error React 19 Action APIs must stay isolated under fokit/react19.
type _NoActionForm = MainExports["ActionForm"]

// @ts-expect-error React 19 Action APIs must stay isolated under fokit/react19.
type _NoActionSubmit = MainExports["ActionSubmit"]

type ProfileInput = {
	readonly name: string
}

type ProfileOutput = ProfileInput & {
	readonly slug: string
}

const schema: StandardSchema<ProfileInput, ProfileOutput> = {
	"~standard": {
		version: 1,
		vendor: "fokit-smoke",
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

function Field({
	rootProps,
	label,
	labelProps,
	control,
	errors,
}: FieldSlotProps) {
	return (
		<div {...rootProps}>
			{label === undefined ? null : (
				<label {...labelProps} htmlFor={labelProps.htmlFor}>
					{label}
				</label>
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
	children,
}: SectionSlotProps) {
	return (
		<section {...rootProps}>
			{title === undefined ? null : <h2>{title}</h2>}
			<div {...layoutProps}>{children}</div>
		</section>
	)
}

function ArraySlot({
	rootProps,
	label,
	labelProps,
	errors,
	children,
}: ArraySlotProps) {
	return (
		<div {...rootProps}>
			{label === undefined ? null : <div {...labelProps}>{label}</div>}
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
		Field,
		Section,
		Array: ArraySlot,
		ArrayItem,
		ErrorMessage,
	},
})

const description = computed(["name"] as const, ({ name }) =>
	typeof name === "string" && name.length > 0 ? `Editing ${name}` : "Profile",
)

const ui = [
	{
		kind: "field",
		path: "name",
		control: "text",
		label: "Name",
		required: true,
	},
] satisfies readonly UiNode<ProfileInput, typeof kit.controls>[]

const defineProfile = kit.defineForm as unknown as (definition: {
	readonly schema: typeof schema
	readonly ui: typeof ui
}) => NormalizedFormDefinition<typeof schema>

const definition = defineProfile({
	schema,
	ui,
})

const store = createFormStore({
	definition,
	defaultValues: defaultValues(),
})
store.setValue("name", "Grace Hopper")
const snapshot = store.getSnapshot()
const namePath = parsePath("name")
const updatedValues = setPathValue(snapshot.values, "name", "Grace")
const mergedValues = mergePathValue(updatedValues, "name", "Ada")

void [
	cloneValue(snapshot.values),
	formatPath(namePath),
	getPathValue(snapshot.values, "name"),
	isAncestorPath("name", "name"),
	isComputed(description),
	isDescendantPath("name", "name"),
	isDirtyEqual(defaultValues(), snapshot.values),
	isSamePath("name", ["name"]),
	mergePathValue(defaultValues(), "name", "math"),
	parseArrayIndex("12"),
	pathsOverlap("name", "name"),
	resolveUi(definition, snapshot.values, undefined),
	unsetPathValue(mergedValues, "name"),
	KitForm,
	Submit,
	normalizeDefinition,
	useArrayField,
]

function defaultValues(): FormInput<typeof schema> {
	return {
		name: "Ada Lovelace",
	}
}

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
	const form = useForm(definition, {
		defaultValues: defaultValues(),
		onSubmit({ value }) {
			void value.slug
		},
	})

	return (
		<kit.Form form={form} id="profile-form">
			<kit.Fields />
			<HookProbe />
			<kit.Submit>Save</kit.Submit>
			<Submit>Save again</Submit>
			{children}
		</kit.Form>
	)
}

createRoot(document.getElementById("root") ?? document.body).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
