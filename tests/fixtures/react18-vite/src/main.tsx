import {
	type ArrayItemSlotProps,
	type ArraySlotProps,
	type ControlProps,
	cloneValue,
	createForm,
	createFormKit,
	createFormStore,
	defineControl,
	type ErrorMessageSlotProps,
	type FieldSlotProps,
	type FormInput,
	formatPath,
	getPathValue,
	isAncestorPath,
	isDescendantPath,
	isDirtyEqual,
	isSamePath,
	KitForm,
	mergePathValue,
	type NormalizedFormDefinition,
	nativeControls,
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
	type UiResolver,
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
type CoreExports = typeof import("fokit/core")

// @ts-expect-error React 19 Action APIs must stay isolated under fokit/react19.
type _NoActionForm = MainExports["ActionForm"]

// @ts-expect-error React 19 Action APIs must stay isolated under fokit/react19.
type _NoActionSubmit = MainExports["ActionSubmit"]

// @ts-expect-error derived UI uses plain resolver functions, not a helper export.
type _NoStandaloneComputed = MainExports["computed"]

// @ts-expect-error the React-free core no longer exposes a computed helper.
type _NoCoreComputed = CoreExports["computed"]

// @ts-expect-error plain resolver functions do not need a runtime type guard.
type _NoComputedGuard = CoreExports["isComputed"]

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

const nativeKit = createFormKit({
	controls: nativeControls,
})

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

const defineProfile = kit.defineForm as unknown as (
	profileSchema: typeof schema,
	definition: {
		readonly ui: typeof ui
	},
) => NormalizedFormDefinition<typeof schema>

const definition = defineProfile(schema, {
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

const externalForm = createForm(definition, {
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
	const form = useForm(externalForm, {
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
