export const LOCALES = ["en", "ru"]
export const DEFAULT_LOCALE = "en"
export const DEFAULT_PAGE_ID = "get-started"

export const PAGE_IDS = ["get-started", "api", "types", "advanced", "faqs"]

export const exampleFiles = {
	"form-kit": {
		label: "Form kit and definition",
		path: "examples/form-kit.tsx",
	},
	"basic-form": {
		label: "Generated and manual React form",
		path: "examples/basic-form.tsx",
	},
	"server-action": {
		label: "Server FormData parser and Action result",
		path: "examples/server-action.ts",
	},
}

export const pages = {
	en: [
		page("get-started", {
			title: "Get started",
			subtitle: "Schema-first forms without giving up your UI.",
			lead: "Fokit keeps the form store and renderer small and predictable, so you can own the UI while still getting robust validation, smart state, and great DX.",
			introNavLabel: "Quick start",
			metaGroups: [
				{
					label: "Prerequisites",
					items: ["React 18+", "TypeScript 5+", "ESM or CJS bundler"],
				},
				{
					label: "Packages",
					items: ["fokit", "zod in the examples"],
				},
			],
			sections: [
				section("quick-start", {
					navLabel: "Installation",
					title: "Installation",
					paragraphs: [
						"Fokit works with React 18+, TypeScript 5+, and your favorite ESM or CJS bundler.",
					],
					code: code("install", "Shell", "npm install fokit zod"),
				}),
				section("define-schema", {
					navLabel: "Define the schema",
					title: "Build your first form",
					paragraphs: [
						"Define a schema, create a form kit, and render it with AutoForm.",
					],
					code: code(
						"profile-schema",
						"schema.ts",
						`import { z } from "zod"

export const profileSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Enter a valid email"),
	newsletter: z.boolean(),
})

export const defaults = {
	name: "",
	email: "",
	newsletter: false,
}`,
					),
				}),
				section("create-kit", {
					navLabel: "Create your kit",
					title: "Own the controls and slots",
					paragraphs: [
						"Fokit does not ship a visual theme. Define controls once, connect their native FormData behavior, and pair them with the five structural slots your product needs.",
						"A form kit keeps that design-system wiring reusable without hiding the resulting DOM.",
					],
					bullets: [
						"Controls receive value, setters, field metadata, native input props, options, and runtime context.",
						"Slots own Field, Section, Array, ArrayItem, and ErrorMessage markup.",
						"The same kit renders generated fields and manual compositions.",
					],
					code: code(
						"create-kit",
						"form-kit.tsx",
						`import { createFormKit, defineControl } from "fokit"

const text = defineControl<string>({
	component: TextControl,
	formData: {
		mode: "native",
		serialize: (value, { name }) => [{ name, value }],
	},
})

export const kit = createFormKit({
	controls: { text },
	slots: { Field, Section, Array, ArrayItem, ErrorMessage },
})`,
					),
					exampleId: "form-kit",
				}),
				section("render-autoform", {
					navLabel: "Render AutoForm",
					title: "Render a generated form",
					paragraphs: [
						"Define the UI tree next to the schema, then let AutoForm create the store, render fields, and coordinate classic submission.",
						"You can leave the generated path at any point and use the same form instance with granular hooks.",
					],
					code: code(
						"render-autoform",
						"ProfileForm.tsx",
						`const definition = kit.defineForm({
	schema: profileSchema,
	ui: [
		{ kind: "field", path: "name", control: "text", label: "Name" },
		{ kind: "field", path: "email", control: "text", label: "Email" },
	],
})

export function ProfileForm() {
	return (
		<kit.AutoForm
			definition={definition}
			defaultValues={defaults}
			onSubmit={({ value }) => saveProfile(value)}
		/>
	)
}`,
					),
					exampleId: "basic-form",
				}),
				section("validation", {
					navLabel: "Validation",
					title: "Validation follows the schema",
					paragraphs: [
						"Choose when the schema runs and when visible errors update. Fokit protects async validation from stale results and keeps submitted output separate from editable input.",
					],
					bullets: [
						'validation.mode controls the first pass: "submit", "blur", or "change".',
						"revalidateMode controls later checks after an issue is exposed.",
						"FormInput<Schema> describes editable values; FormOutput<Schema> describes validated output.",
					],
					code: code(
						"validation-options",
						"ProfileForm.tsx",
						`const form = useForm(definition, {
	defaultValues: defaults,
	validation: {
		mode: "blur",
		revalidateMode: "change",
		asyncDebounceMs: 150,
	},
})`,
					),
				}),
				section("submit", {
					navLabel: "Submit",
					title: "Submit with native form semantics",
					paragraphs: [
						"Classic React forms capture native FormData, validate the current snapshot, focus the first exposed issue, and prevent duplicate submissions.",
						"For React 19, ActionForm keeps the server Action on the native form and synchronizes serializable FormResult values back into the same store.",
					],
					code: code(
						"classic-submit",
						"ProfileForm.tsx",
						`const form = useForm(definition, {
	defaultValues: defaults,
	onSubmit: async ({ value, formData, form }) => {
		await saveProfile(value, formData)
		form.reset({ values: value })
	},
})

return (
	<kit.Form form={form}>
		<kit.Fields />
		<kit.Submit>Save profile</kit.Submit>
	</kit.Form>
)`,
					),
				}),
			],
			showLab: true,
		}),
		page("api", {
			title: "API",
			subtitle: "The public surface, grouped by the job you are doing.",
			lead: "Start with the React kit APIs for product forms. Reach for the React-free core, server parser, or React 19 adapter only when that boundary belongs in your architecture.",
			metaGroups: [
				{
					label: "Entry points",
					items: ["fokit", "fokit/core", "fokit/server", "fokit/react19"],
				},
				{
					label: "Common path",
					items: ["createFormKit", "kit.defineForm", "kit.AutoForm"],
				},
			],
			sections: [
				section("overview", {
					navLabel: "Overview",
					title: "Choose the smallest public boundary",
					paragraphs: [
						"The main entry combines the common React workflow with re-exported core types and helpers. Subpath exports make server, Action, and framework-free code explicit.",
					],
					items: [
						apiItem(
							"fokit",
							"Controls, form kits, generated forms, hooks, classic submit, and shared public types.",
						),
						apiItem(
							"fokit/core",
							"React-free store, paths, definitions, computed UI, validation state, and immutable value helpers.",
						),
						apiItem(
							"fokit/server",
							"Safe FormData normalization, schema validation, and serializable submission issues.",
						),
						apiItem(
							"fokit/react19",
							"ActionForm and ActionSubmit for React 19 server-first submissions.",
						),
					],
				}),
				section("use-form", {
					navLabel: "useForm",
					title: "useForm",
					paragraphs: [
						"Creates one stable FormInstance from a normalized definition. Runtime options update without replacing the store.",
					],
					items: [
						apiItem(
							"defaultValues",
							"Required complete editable input. Reset returns to this baseline unless you replace it.",
						),
						apiItem(
							"context",
							"Runtime-only data for computed options and UI state. It never becomes form data.",
						),
						apiItem(
							"validation",
							"Mode, revalidation mode, and async debounce configuration.",
						),
						apiItem(
							"beforeUpdate / onUpdate",
							"Inspect or replace atomic changes before commit, then observe the committed transaction.",
						),
						apiItem(
							"onSubmit",
							"Receives validated output, editable input, native FormData, and the FormInstance.",
						),
					],
					code: code(
						"use-form",
						"Signature",
						`useForm(definition, {
	defaultValues,
	context,
	disabled,
	readOnly,
	validation,
	beforeUpdate,
	onUpdate,
	onSubmit,
})`,
					),
				}),
				section("create-form-kit", {
					navLabel: "createFormKit",
					title: "createFormKit",
					paragraphs: [
						"Binds your control registry and five structural slots into a typed kit.",
					],
					items: [
						apiItem(
							"kit.defineForm",
							"Normalizes a schema plus UI definition and validates control names.",
						),
						apiItem(
							"kit.AutoForm",
							"Creates a FormInstance and renders the full definition.",
						),
						apiItem("kit.Form", "Native form shell for an existing instance."),
						apiItem(
							"KitForm",
							"Low-level native form shell when you need to supply controls without a generated kit wrapper.",
						),
						apiItem("kit.Fields", "Renders generated fields inside kit.Form."),
						apiItem(
							"kit.Submit",
							"Submit button that follows disabled and pending form state.",
						),
					],
				}),
				section("define-control", {
					navLabel: "defineControl",
					title: "defineControl",
					paragraphs: [
						"Declares how one value type renders and how it participates in native FormData.",
					],
					items: [
						apiItem(
							"component",
							"Receives ControlProps: value, setValue, blur, input props, metadata, options, context, and resolved interaction state.",
						),
						apiItem(
							"formData.mode",
							'Use "native", "hidden", or "unavailable" to make serialization behavior explicit.',
						),
						apiItem(
							"formData.serialize",
							"Returns the name/value entries used when Fokit owns hidden serialization.",
						),
					],
				}),
				section("manual-hooks", {
					navLabel: "Hooks",
					title: "Granular React hooks",
					paragraphs: [
						"Manual controls and generated fields share the same instance. Each hook subscribes only to the selected slice.",
					],
					items: [
						apiItem("useValue", "Reads one typed field path."),
						apiItem(
							"useField",
							"Returns value, setValue, blur, focus, ref, and visible field metadata.",
						),
						apiItem(
							"useArrayField",
							"Returns stable item keys, array metadata, append, insert, remove, and move.",
						),
						apiItem(
							"useFormState",
							"Runs a selector against FormSnapshot with an optional equality function.",
						),
						apiItem(
							"useFormContext",
							"Reads the closest FormInstance inside kit.Form or FormProvider.",
						),
					],
				}),
				section("form-instance", {
					navLabel: "FormInstance",
					title: "Imperative FormInstance",
					paragraphs: [
						"The instance is an external store plus form commands. Use it for workflows that do not map cleanly to a hook.",
					],
					items: [
						apiItem(
							"getSnapshot / subscribe",
							"Read and observe immutable snapshots.",
						),
						apiItem(
							"setValue / unsetValue / batch",
							"Apply typed atomic changes through the transaction boundary.",
						),
						apiItem(
							"validate / blur / focus",
							"Run validation or manage issue exposure and focus.",
						),
						apiItem(
							"append / insert / remove / move",
							"Update array values and row metadata together.",
						),
						apiItem(
							"setIssues / clearIssues",
							"Install or remove serializable server and imperative issues.",
						),
						apiItem(
							"reset / submit",
							"Reset baselines or request native submit.",
						),
					],
				}),
				section("core", {
					navLabel: "Core",
					title: "React-free core",
					paragraphs: [
						"Use the core entry in shared packages, non-React runtimes, and focused tests.",
					],
					items: [
						apiItem(
							"createFormStore",
							"Creates the immutable store without React.",
						),
						apiItem(
							"computed / isComputed",
							"Declare explicit field dependencies for derived UI state or detect an existing computed value.",
						),
						apiItem(
							"normalizeDefinition / resolveUi",
							"Validate a definition and resolve context-aware interaction state.",
						),
						apiItem(
							"parsePath / formatPath / parseArrayIndex",
							"Convert canonical deep paths to and from segments and safely recognize array indexes.",
						),
						apiItem(
							"isSamePath / isAncestorPath / isDescendantPath / pathsOverlap",
							"Compare canonical paths without relying on string-prefix shortcuts.",
						),
						apiItem(
							"getPathValue / setPathValue / unsetPathValue / mergePathValue",
							"Read, replace, remove, or merge nested values immutably.",
						),
						apiItem(
							"cloneValue / isDirtyEqual",
							"Clone supported form values and compare them with Fokit's dirty-state semantics.",
						),
					],
				}),
				section("server", {
					navLabel: "Server",
					title: "parseFormData",
					paragraphs: [
						"Normalizes native FormData into null-prototype objects, rejects unsafe structures, then runs the Standard Schema validator.",
					],
					code: code(
						"parse-form-data",
						"action.ts",
						`import { parseFormData } from "fokit/server"

const parsed = await parseFormData(formData, profileSchema)
if (!parsed.success) {
	return parsed.reply()
}

await saveProfile(parsed.value)
return { status: "success" }`,
					),
					exampleId: "server-action",
				}),
				section("react-19", {
					navLabel: "React 19",
					title: "ActionForm and ActionSubmit",
					paragraphs: [
						"ActionForm renders the definition into a native Action form. ActionSubmit follows both React pending status and Fokit submission state.",
					],
					callout: {
						title: "Compatibility",
						text: "Import this entry only in React 19 projects. React 18 consumers can use the main fokit entry without React 19-only declarations.",
					},
				}),
			],
		}),
		page("types", {
			title: "Types",
			subtitle: "Input, output, paths, definitions, and state stay connected.",
			lead: "Fokit derives the editable and submitted value types from Standard Schema, then carries them through field paths, controls, hooks, commands, and submission.",
			metaGroups: [
				{
					label: "Foundation",
					items: ["Standard Schema", "TypeScript 5+", "Typed deep paths"],
				},
				{
					label: "Most used",
					items: ["FormInput", "FormOutput", "FormInstance"],
				},
			],
			sections: [
				section("input-output", {
					navLabel: "Input and output",
					title: "FormInput and FormOutput",
					paragraphs: [
						"Standard Schema can transform values. Fokit keeps the editable input type and validated output type separate instead of pretending they are the same.",
					],
					code: code(
						"form-input-output",
						"types.ts",
						`import type { FormInput, FormOutput } from "fokit"

type ProfileDraft = FormInput<typeof profileSchema>
type SavedProfile = FormOutput<typeof profileSchema>

const onSubmit = ({ value }: { value: SavedProfile }) => {
	// value is validated and transformed
}`,
					),
				}),
				section("definitions", {
					navLabel: "Definitions",
					title: "FormDefinition and UI nodes",
					paragraphs: [
						"A definition combines one schema, a control registry, and a readonly UI tree.",
					],
					items: [
						apiItem(
							"FieldNode",
							"A typed field path, one control discriminator, labels, options, and interaction policies.",
						),
						apiItem(
							"SectionNode",
							"Groups children and declares responsive column intent.",
						),
						apiItem(
							"ArrayNode",
							"Declares an array path, item defaults, stable row rendering, and nested relative nodes.",
						),
						apiItem(
							"NormalizedFormDefinition",
							"The validated, frozen definition returned by kit.defineForm.",
						),
					],
				}),
				section("form-instance-type", {
					navLabel: "FormInstance",
					title: "FormInstance and UseFormOptions",
					paragraphs: [
						"FormInstance carries Schema and Context generics through every selector and command.",
					],
					code: code(
						"form-instance-type",
						"types.ts",
						`import type { FormInstance, UseFormOptions } from "fokit"

type ProfileForm = FormInstance<typeof profileSchema, ProfileContext>
type ProfileOptions = UseFormOptions<typeof profileSchema, ProfileContext>`,
					),
				}),
				section("control-types", {
					navLabel: "Controls",
					title: "ControlProps and control inference",
					paragraphs: [
						"defineControl validates which value a component accepts and lets createFormKit infer control names, options, and context.",
					],
					items: [
						apiItem(
							"ControlProps<Value, Options, Context>",
							"The component contract for one registered control.",
						),
						apiItem(
							"ControlValueOf / ControlOptionsOf / ControlContextOf",
							"Extract inferred types from a control definition.",
						),
						apiItem(
							"IsValidControlValue",
							"Rejects unsupported control values at the definition boundary.",
						),
					],
				}),
				section("slot-types", {
					navLabel: "Slots",
					title: "Structural slot props",
					paragraphs: [
						"Every slot receives root props that preserve Fokit's DOM protocol and accessible relationships.",
					],
					items: [
						apiItem(
							"FieldSlotProps",
							"Label, description, control, errors, and resolved state.",
						),
						apiItem(
							"SectionSlotProps",
							"Heading content, layout props, and child nodes.",
						),
						apiItem(
							"ArraySlotProps",
							"Label, errors, add command, guards, and row children.",
						),
						apiItem(
							"ArrayItemSlotProps",
							"Stable row identity and guarded remove/move commands.",
						),
						apiItem(
							"ErrorMessageSlotProps",
							"One issue plus focusable root props.",
						),
					],
				}),
				section("state-types", {
					navLabel: "State",
					title: "FormSnapshot and issue state",
					paragraphs: [
						"Selectors receive a frozen snapshot that separates raw issues from display policy.",
					],
					items: [
						apiItem(
							"FormSnapshot",
							"Values, metadata, resolved UI, issues, display issues, validation status, and submission state.",
						),
						apiItem(
							"FormIssue / SubmissionIssue",
							"Client issue state and its serializable server transport counterpart.",
						),
						apiItem(
							"DisplayFormErrors",
							"Only the form and field issues currently exposed to the user.",
						),
						apiItem(
							"ValidationStatus",
							"unvalidated, valid, invalid, or validating.",
						),
					],
				}),
				section("path-types", {
					navLabel: "Typed paths",
					title: "FieldPath, ArrayFieldPath, and PathValue",
					paragraphs: [
						"Deep paths are typed from FormInput, while the runtime uses one canonical dotted format.",
					],
					code: code(
						"typed-paths",
						"types.ts",
						`type EmailPath = FieldPath<ProfileDraft>
// "name" | "contacts" | \`contacts.\${number}.email\` | ...

type ContactsPath = ArrayFieldPath<ProfileDraft>
// "contacts"

type EmailValue = PathValue<ProfileDraft, "contacts.0.email">
// string`,
					),
				}),
				section("server-types", {
					navLabel: "Server results",
					title: "FormResult and ParseResult",
					paragraphs: [
						"Server APIs return discriminated, serializable results that React 19 Actions can send back to the client.",
					],
					items: [
						apiItem(
							"ParseResult<Output>",
							"Success with validated output, or failure with normalized issues and reply().",
						),
						apiItem(
							"FormResult",
							"Serializable success/error transport understood by ActionForm.",
						),
						apiItem(
							"ParseFormDataOptions",
							"Safety limits for entries, path length, nesting depth, and array indexes.",
						),
					],
				}),
			],
		}),
		page("advanced", {
			title: "Advanced",
			subtitle: "Patterns for complex, accessible, server-aware forms.",
			lead: "These patterns keep product markup in your application while using Fokit's transaction, validation, and serialization boundaries deliberately.",
			metaGroups: [
				{
					label: "Use when",
					items: [
						"Flows span components",
						"UI depends on values",
						"Server owns submission",
					],
				},
				{
					label: "Principle",
					items: ["One store", "One mutation boundary", "Native form behavior"],
				},
			],
			sections: [
				section("accessibility", {
					navLabel: "Accessibility",
					title: "Accessibility is a slot responsibility",
					paragraphs: [
						"Fokit supplies stable IDs, described-by relationships, issue focus targets, required state, and native form semantics. Your controls and slots decide the final accessible markup.",
					],
					bullets: [
						"Forward input.id, input.name, input.ref, and aria-describedby.",
						"Connect labelProps and descriptionProps to the correct DOM elements.",
						"Render ErrorMessage root props so submit-time focus reaches the summary or field.",
						"Preserve disabled, readOnly, and required semantics instead of only styling them.",
					],
				}),
				section("hybrid-rendering", {
					navLabel: "Generated + manual",
					title: "Mix generated and manual composition",
					paragraphs: [
						"Use kit.Fields for the ordinary part of a form, then add bespoke controls, summaries, or commands against the same FormInstance.",
					],
					code: code(
						"hybrid-rendering",
						"ProfileEditor.tsx",
						`<kit.Form form={form}>
	<kit.Fields />
	<AccountPreview form={form} />
	<ContactToolbar form={form} />
	<kit.Submit>Save profile</kit.Submit>
</kit.Form>`,
					),
				}),
				section("computed-ui", {
					navLabel: "Computed UI",
					title: "Declare reactive dependencies",
					paragraphs: [
						"computed() receives explicit paths, so unrelated edits can reuse resolved UI state instead of rerunning every option and visibility function.",
					],
					code: code(
						"computed-ui",
						"definition.ts",
						`const companyNameField = {
	kind: "field",
	path: "companyName",
	control: "text",
	visible: computed(["kind"] as const, ({ kind }) => kind === "company"),
	valuePolicy: "unset",
}`,
					),
					callout: {
						title: "Hidden values are a product decision",
						text: 'Use valuePolicy: "preserve" to keep a hidden value, or "unset" to remove optional data through the normal transaction pipeline.',
					},
				}),
				section("arrays", {
					navLabel: "Dynamic arrays",
					title: "Stable array identity",
					paragraphs: [
						"Array commands update values, row keys, field metadata, and issues atomically. Keys stay with logical rows across insert, remove, and move.",
					],
					code: code(
						"array-hooks",
						"Contacts.tsx",
						`const contacts = useArrayField(form, "contacts")

contacts.append({ email: "", label: undefined })
contacts.move(2, 0)
contacts.remove(1)

return contacts.items.map(({ key, index }) => (
	<ContactRow key={key} index={index} />
))`,
					),
				}),
				section("server-form-data", {
					navLabel: "Safe FormData",
					title: "Treat FormData as untrusted input",
					paragraphs: [
						"parseFormData rejects prototype keys, structural collisions, sparse arrays, unknown reserved metadata, excessive depth, and oversized indexes before schema validation.",
						"Request size, multipart, file count, and file size limits still belong in your framework before parsing.",
					],
					exampleId: "server-action",
				}),
				section("react-19-actions", {
					navLabel: "React 19 Actions",
					title: "Keep Actions native",
					paragraphs: [
						"ActionForm does not wrap or replace the server Action. It observes pending state, validates compatibility, and synchronizes the returned FormResult.",
					],
					bullets: [
						"Server issues can be installed without losing client field metadata.",
						"Success can retain values, reset to the submitted result, or reset to defaults.",
						"User edits made during an in-flight Action are not overwritten by stale server results.",
					],
				}),
				section("styling", {
					navLabel: "Styling",
					title: "Use the structural layer only when it helps",
					paragraphs: [
						"fokit/layout.css owns responsive grids, spans, gaps, and structural data attributes. It deliberately does not theme colors, typography, controls, or product surfaces.",
					],
					code: code(
						"structural-css",
						"app.tsx",
						`import "fokit/layout.css"

<kit.Form
	form={form}
	style={{
		"--fokit-column-gap": "1.25rem",
		"--fokit-row-gap": "1rem",
	}}
/>`,
					),
				}),
				section("testing", {
					navLabel: "Testing",
					title: "Test the public boundary",
					paragraphs: [
						"Exercise forms through labels, native submit, and visible issues. Typecheck full examples from built exports so documentation cannot drift away from the package.",
					],
					bullets: [
						"Test store invariants without React through fokit/core.",
						"Test controls and slots through the DOM they own.",
						"Test package exports from a packed tarball in React 18, React 19, ESM, CJS, and Next.js consumers.",
					],
				}),
			],
		}),
		page("faqs", {
			title: "FAQs",
			subtitle: "The product boundaries and sharp edges, answered directly.",
			lead: "Fokit is deliberately opinionated about data, state, and native form behavior—and deliberately unopinionated about your visual system.",
			metaGroups: [
				{
					label: "Fast answers",
					items: [
						"React 18 and 19",
						"Any Standard Schema",
						"No built-in theme",
					],
				},
				{
					label: "More help",
					items: [
						{
							label: "GitHub issues",
							href: "https://github.com/r13v/fokit/issues",
						},
						{ label: "API reference", href: "#/en/api" },
						{
							label: "Copyable examples",
							href: "https://github.com/r13v/fokit/tree/main/examples",
						},
					],
				},
			],
			sections: [
				section("why-fokit", {
					navLabel: "Why Fokit?",
					title: "Why use Fokit instead of a smaller form hook?",
					paragraphs: [
						"Use Fokit when a product needs schema-owned validation, typed transformations, generated and manual rendering, stable arrays, safe server FormData, and explicit React 19 support under one consistent state model.",
						"If you only need a few uncontrolled inputs and a submit handler, the browser may already be the simpler tool.",
					],
				}),
				section("controlled", {
					navLabel: "Controlled inputs",
					title: "Are Fokit controls controlled or uncontrolled?",
					paragraphs: [
						"Custom controls read their value from the store and write through setValue, so their product state is controlled by Fokit. Native FormData behavior is still preserved through explicit control serialization.",
					],
				}),
				section("schemas", {
					navLabel: "Schemas",
					title: "Does Fokit require Zod?",
					paragraphs: [
						"No. Fokit accepts any implementation of Standard Schema. The documentation uses Zod because it is familiar and implements that contract.",
					],
				}),
				section("default-values", {
					navLabel: "Default values",
					title: "Why are complete default values required?",
					paragraphs: [
						"Complete editable input gives dirty comparison, reset, array metadata, hidden-field policies, and native serialization one deterministic baseline.",
						"Optional schema fields can still begin as undefined when that is part of FormInput.",
					],
				}),
				section("ui-libraries", {
					navLabel: "UI libraries",
					title: "Can I use an existing component library?",
					paragraphs: [
						"Yes. Wrap each input component once with defineControl, then implement slots with the library's layout and feedback components. Fokit does not require a specific DOM kit.",
					],
				}),
				section("hidden-fields", {
					navLabel: "Hidden fields",
					title: "What happens when a field becomes hidden?",
					paragraphs: [
						"Visibility and value retention are separate. valuePolicy preserves the value by default; use unset for optional values that must leave the form when hidden.",
					],
				}),
				section("reset", {
					navLabel: "Reset",
					title: "How do I reset a form?",
					paragraphs: [
						"Call form.reset() or use a native reset button inside kit.Form. Fokit prevents the browser from rolling controlled inputs back independently and resets the store instead.",
						"You can also replace the baseline when a saved server value becomes the new starting point.",
					],
				}),
				section("errors", {
					navLabel: "Server errors",
					title: "How do server errors reach fields?",
					paragraphs: [
						"Return normalized SubmissionIssue values from the server. Classic flows can call form.setIssues; React 19 ActionForm consumes FormResult directly and installs matching field or form issues.",
					],
				}),
				section("react-versions", {
					navLabel: "React versions",
					title: "How do React 18 and React 19 differ?",
					paragraphs: [
						"The main fokit entry supports classic submission in both versions. React 19 Actions live only in fokit/react19 so React 18 consumers never load or typecheck Action-only APIs.",
					],
				}),
				section("performance", {
					navLabel: "Performance",
					title: "Does every field rerender on each change?",
					paragraphs: [
						"No. The store uses external subscriptions. useValue, useField, useArrayField, and useFormState select focused slices, while computed UI declares the paths that can invalidate it.",
					],
				}),
				section("styling-faq", {
					navLabel: "Styling",
					title: "Why is there no built-in theme?",
					paragraphs: [
						"Form state should not dictate product styling. Fokit ships only optional structural CSS; colors, typography, controls, spacing tokens, and interaction polish stay in your application.",
					],
				}),
			],
		}),
	],
	ru: [
		page("get-started", {
			title: "Быстрый старт",
			subtitle: "Формы от схемы — без потери контроля над UI.",
			lead: "Fokit оставляет стор и рендерер маленькими и предсказуемыми: UI принадлежит приложению, а библиотека дает надежную валидацию, умное состояние и отличный DX.",
			introNavLabel: "Быстрый старт",
			metaGroups: [
				{
					label: "Понадобится",
					items: ["React 18+", "TypeScript 5+", "ESM- или CJS-сборщик"],
				},
				{
					label: "Пакеты",
					items: ["fokit", "zod в примерах"],
				},
			],
			sections: [
				section("quick-start", {
					navLabel: "Установка",
					title: "Установка",
					paragraphs: [
						"Fokit работает с React 18+, TypeScript 5+ и вашим ESM- или CJS-сборщиком.",
					],
					code: code("install", "Shell", "npm install fokit zod"),
				}),
				section("define-schema", {
					navLabel: "Опишите схему",
					title: "Соберите первую форму",
					paragraphs: [
						"Опишите схему, создайте form kit и отрисуйте ее через AutoForm.",
					],
					code: code(
						"profile-schema",
						"schema.ts",
						`import { z } from "zod"

export const profileSchema = z.object({
	name: z.string().min(1, "Укажите имя"),
	email: z.string().email("Укажите корректный email"),
	newsletter: z.boolean(),
})

export const defaults = {
	name: "",
	email: "",
	newsletter: false,
}`,
					),
				}),
				section("create-kit", {
					navLabel: "Создайте kit",
					title: "Владейте контролами и слотами",
					paragraphs: [
						"Fokit не приносит визуальную тему. Один раз определите контролы, подключите их FormData-поведение и добавьте пять структурных слотов вашего продукта.",
						"Form kit переиспользует эту связь с дизайн-системой, не скрывая итоговый DOM.",
					],
					bullets: [
						"Контролы получают value, setters, field metadata, native input props, options и runtime context.",
						"Слоты владеют разметкой Field, Section, Array, ArrayItem и ErrorMessage.",
						"Один kit работает и для generated fields, и для manual composition.",
					],
					code: code(
						"create-kit",
						"form-kit.tsx",
						`import { createFormKit, defineControl } from "fokit"

const text = defineControl<string>({
	component: TextControl,
	formData: {
		mode: "native",
		serialize: (value, { name }) => [{ name, value }],
	},
})

export const kit = createFormKit({
	controls: { text },
	slots: { Field, Section, Array, ArrayItem, ErrorMessage },
})`,
					),
					exampleId: "form-kit",
				}),
				section("render-autoform", {
					navLabel: "Render AutoForm",
					title: "Отрендерите generated form",
					paragraphs: [
						"Опишите UI tree рядом со схемой, затем AutoForm создаст store, отрендерит поля и свяжет classic submit.",
						"В любой момент можно перейти к ручной композиции и работать с тем же form instance через гранулярные hooks.",
					],
					code: code(
						"render-autoform",
						"ProfileForm.tsx",
						`const definition = kit.defineForm({
	schema: profileSchema,
	ui: [
		{ kind: "field", path: "name", control: "text", label: "Имя" },
		{ kind: "field", path: "email", control: "text", label: "Email" },
	],
})

export function ProfileForm() {
	return (
		<kit.AutoForm
			definition={definition}
			defaultValues={defaults}
			onSubmit={({ value }) => saveProfile(value)}
		/>
	)
}`,
					),
					exampleId: "basic-form",
				}),
				section("validation", {
					navLabel: "Валидация",
					title: "Валидация следует за схемой",
					paragraphs: [
						"Выберите момент запуска схемы и обновления видимых ошибок. Fokit защищает async validation от устаревших результатов и разделяет editable input и submitted output.",
					],
					bullets: [
						'validation.mode задает первый запуск: "submit", "blur" или "change".',
						"revalidateMode управляет повторными проверками после показа ошибки.",
						"FormInput<Schema> описывает редактируемые данные; FormOutput<Schema> — валидированный результат.",
					],
					code: code(
						"validation-options",
						"ProfileForm.tsx",
						`const form = useForm(definition, {
	defaultValues: defaults,
	validation: {
		mode: "blur",
		revalidateMode: "change",
		asyncDebounceMs: 150,
	},
})`,
					),
				}),
				section("submit", {
					navLabel: "Отправка",
					title: "Сохраняйте нативную семантику submit",
					paragraphs: [
						"Classic React form захватывает native FormData, валидирует текущий snapshot, фокусирует первую видимую ошибку и блокирует повторную отправку.",
						"В React 19 ActionForm оставляет server Action на нативной форме и синхронизирует serializable FormResult с тем же store.",
					],
					code: code(
						"classic-submit",
						"ProfileForm.tsx",
						`const form = useForm(definition, {
	defaultValues: defaults,
	onSubmit: async ({ value, formData, form }) => {
		await saveProfile(value, formData)
		form.reset({ values: value })
	},
})

return (
	<kit.Form form={form}>
		<kit.Fields />
		<kit.Submit>Сохранить профиль</kit.Submit>
	</kit.Form>
)`,
					),
				}),
			],
			showLab: true,
		}),
		page("api", {
			title: "API",
			subtitle: "Публичная поверхность — по задачам, которые вы решаете.",
			lead: "Для продуктовой формы начните с React kit API. React-free core, server parser и React 19 adapter подключайте только там, где эта граница действительно нужна архитектуре.",
			metaGroups: [
				{
					label: "Entry points",
					items: ["fokit", "fokit/core", "fokit/server", "fokit/react19"],
				},
				{
					label: "Обычный путь",
					items: ["createFormKit", "kit.defineForm", "kit.AutoForm"],
				},
			],
			sections: [
				section("overview", {
					navLabel: "Обзор",
					title: "Выберите минимальную публичную границу",
					paragraphs: [
						"Основной entry объединяет типовой React workflow с re-exported core types и helpers. Subpath exports явно отделяют server, Action и framework-free код.",
					],
					items: [
						apiItem(
							"fokit",
							"Контролы, form kits, generated forms, hooks, classic submit и общие публичные типы.",
						),
						apiItem(
							"fokit/core",
							"React-free store, paths, definitions, computed UI, validation state и immutable value helpers.",
						),
						apiItem(
							"fokit/server",
							"Безопасная нормализация FormData, schema validation и serializable submission issues.",
						),
						apiItem(
							"fokit/react19",
							"ActionForm и ActionSubmit для server-first отправки в React 19.",
						),
					],
				}),
				section("use-form", {
					navLabel: "useForm",
					title: "useForm",
					paragraphs: [
						"Создает стабильный FormInstance из normalized definition. Runtime options обновляются без замены store.",
					],
					items: [
						apiItem(
							"defaultValues",
							"Обязательный полный editable input. Reset возвращает к этой базе, пока вы ее не замените.",
						),
						apiItem(
							"context",
							"Runtime-only данные для computed options и UI state. Они никогда не попадают в form data.",
						),
						apiItem("validation", "Mode, revalidation mode и async debounce."),
						apiItem(
							"beforeUpdate / onUpdate",
							"Проверка или замена atomic changes до commit и наблюдение за готовой транзакцией.",
						),
						apiItem(
							"onSubmit",
							"Получает validated output, editable input, native FormData и FormInstance.",
						),
					],
					code: code(
						"use-form",
						"Signature",
						`useForm(definition, {
	defaultValues,
	context,
	disabled,
	readOnly,
	validation,
	beforeUpdate,
	onUpdate,
	onSubmit,
})`,
					),
				}),
				section("create-form-kit", {
					navLabel: "createFormKit",
					title: "createFormKit",
					paragraphs: [
						"Связывает registry ваших контролов и пять структурных слотов в typed kit.",
					],
					items: [
						apiItem(
							"kit.defineForm",
							"Нормализует schema + UI definition и проверяет имена контролов.",
						),
						apiItem(
							"kit.AutoForm",
							"Создает FormInstance и рендерит всю definition.",
						),
						apiItem(
							"kit.Form",
							"Native form shell для существующего instance.",
						),
						apiItem(
							"KitForm",
							"Низкоуровневый native form shell, если controls нужно передать без wrapper из generated kit.",
						),
						apiItem("kit.Fields", "Рендерит generated fields внутри kit.Form."),
						apiItem(
							"kit.Submit",
							"Submit button, связанная с disabled и pending state.",
						),
					],
				}),
				section("define-control", {
					navLabel: "defineControl",
					title: "defineControl",
					paragraphs: [
						"Описывает рендер одного value type и его участие в native FormData.",
					],
					items: [
						apiItem(
							"component",
							"Получает ControlProps: value, setValue, blur, input props, metadata, options, context и resolved state.",
						),
						apiItem(
							"formData.mode",
							'Используйте "native", "hidden" или "unavailable" для явной стратегии сериализации.',
						),
						apiItem(
							"formData.serialize",
							"Возвращает name/value entries для hidden serialization.",
						),
					],
				}),
				section("manual-hooks", {
					navLabel: "Hooks",
					title: "Гранулярные React hooks",
					paragraphs: [
						"Manual controls и generated fields работают с одним instance. Каждый hook подписывается только на выбранный slice.",
					],
					items: [
						apiItem("useValue", "Читает один typed field path."),
						apiItem(
							"useField",
							"Возвращает value, setValue, blur, focus, ref и видимую field metadata.",
						),
						apiItem(
							"useArrayField",
							"Возвращает stable item keys, array metadata, append, insert, remove и move.",
						),
						apiItem(
							"useFormState",
							"Запускает selector над FormSnapshot с optional equality function.",
						),
						apiItem(
							"useFormContext",
							"Читает ближайший FormInstance внутри kit.Form или FormProvider.",
						),
					],
				}),
				section("form-instance", {
					navLabel: "FormInstance",
					title: "Imperative FormInstance",
					paragraphs: [
						"Instance — это external store и команды формы. Он нужен для workflows, которые неудобно выражать одним hook.",
					],
					items: [
						apiItem(
							"getSnapshot / subscribe",
							"Чтение и наблюдение за immutable snapshots.",
						),
						apiItem(
							"setValue / unsetValue / batch",
							"Typed atomic changes через единый transaction boundary.",
						),
						apiItem(
							"validate / blur / focus",
							"Запуск validation и управление показом issues и focus.",
						),
						apiItem(
							"append / insert / remove / move",
							"Одновременное обновление array values и row metadata.",
						),
						apiItem(
							"setIssues / clearIssues",
							"Установка и очистка server и imperative issues.",
						),
						apiItem("reset / submit", "Сброс baseline и native submit."),
					],
				}),
				section("core", {
					navLabel: "Core",
					title: "React-free core",
					paragraphs: [
						"Используйте core entry в shared packages, non-React runtimes и focused tests.",
					],
					items: [
						apiItem("createFormStore", "Создает immutable store без React."),
						apiItem(
							"computed / isComputed",
							"Объявляет явные field dependencies для derived UI state или распознает существующее computed value.",
						),
						apiItem(
							"normalizeDefinition / resolveUi",
							"Проверяет definition и вычисляет context-aware interaction state.",
						),
						apiItem(
							"parsePath / formatPath / parseArrayIndex",
							"Преобразует canonical paths в segments и безопасно распознает array indexes.",
						),
						apiItem(
							"isSamePath / isAncestorPath / isDescendantPath / pathsOverlap",
							"Сравнивает canonical paths без ненадежных string-prefix проверок.",
						),
						apiItem(
							"getPathValue / setPathValue / unsetPathValue / mergePathValue",
							"Читает, заменяет, удаляет и объединяет nested values immutable-образом.",
						),
						apiItem(
							"cloneValue / isDirtyEqual",
							"Клонирует поддерживаемые form values и сравнивает их по dirty-state semantics Fokit.",
						),
					],
				}),
				section("server", {
					navLabel: "Server",
					title: "parseFormData",
					paragraphs: [
						"Нормализует native FormData в null-prototype objects, отклоняет unsafe structures и запускает Standard Schema validator.",
					],
					code: code(
						"parse-form-data",
						"action.ts",
						`import { parseFormData } from "fokit/server"

const parsed = await parseFormData(formData, profileSchema)
if (!parsed.success) {
	return parsed.reply()
}

await saveProfile(parsed.value)
return { status: "success" }`,
					),
					exampleId: "server-action",
				}),
				section("react-19", {
					navLabel: "React 19",
					title: "ActionForm и ActionSubmit",
					paragraphs: [
						"ActionForm рендерит definition в native Action form. ActionSubmit следует за React pending status и Fokit submission state.",
					],
					callout: {
						title: "Совместимость",
						text: "Импортируйте этот entry только в React 19. React 18 использует основной fokit entry без React 19-only declarations.",
					},
				}),
			],
		}),
		page("types", {
			title: "Типы",
			subtitle:
				"Input, output, paths, definitions и state остаются связанными.",
			lead: "Fokit выводит editable и submitted value types из Standard Schema и проводит их через field paths, controls, hooks, commands и submission.",
			metaGroups: [
				{
					label: "Основа",
					items: ["Standard Schema", "TypeScript 5+", "Typed deep paths"],
				},
				{
					label: "Чаще всего",
					items: ["FormInput", "FormOutput", "FormInstance"],
				},
			],
			sections: [
				section("input-output", {
					navLabel: "Input и output",
					title: "FormInput и FormOutput",
					paragraphs: [
						"Standard Schema может трансформировать значения. Fokit не смешивает editable input type и validated output type.",
					],
					code: code(
						"form-input-output",
						"types.ts",
						`import type { FormInput, FormOutput } from "fokit"

type ProfileDraft = FormInput<typeof profileSchema>
type SavedProfile = FormOutput<typeof profileSchema>

const onSubmit = ({ value }: { value: SavedProfile }) => {
	// value уже валидирован и трансформирован
}`,
					),
				}),
				section("definitions", {
					navLabel: "Definitions",
					title: "FormDefinition и UI nodes",
					paragraphs: [
						"Definition объединяет одну schema, control registry и readonly UI tree.",
					],
					items: [
						apiItem(
							"FieldNode",
							"Typed field path, один control discriminator, labels, options и interaction policies.",
						),
						apiItem(
							"SectionNode",
							"Группирует children и задает responsive column intent.",
						),
						apiItem(
							"ArrayNode",
							"Array path, item defaults, stable row rendering и nested relative nodes.",
						),
						apiItem(
							"NormalizedFormDefinition",
							"Проверенная frozen definition из kit.defineForm.",
						),
					],
				}),
				section("form-instance-type", {
					navLabel: "FormInstance",
					title: "FormInstance и UseFormOptions",
					paragraphs: [
						"FormInstance проводит Schema и Context generics через каждый selector и command.",
					],
					code: code(
						"form-instance-type",
						"types.ts",
						`import type { FormInstance, UseFormOptions } from "fokit"

type ProfileForm = FormInstance<typeof profileSchema, ProfileContext>
type ProfileOptions = UseFormOptions<typeof profileSchema, ProfileContext>`,
					),
				}),
				section("control-types", {
					navLabel: "Controls",
					title: "ControlProps и inference",
					paragraphs: [
						"defineControl проверяет value компонента, а createFormKit выводит control names, options и context.",
					],
					items: [
						apiItem(
							"ControlProps<Value, Options, Context>",
							"Component contract одного registered control.",
						),
						apiItem(
							"ControlValueOf / ControlOptionsOf / ControlContextOf",
							"Извлекают inferred types из control definition.",
						),
						apiItem(
							"IsValidControlValue",
							"Отклоняет неподдерживаемые control values на definition boundary.",
						),
					],
				}),
				section("slot-types", {
					navLabel: "Slots",
					title: "Structural slot props",
					paragraphs: [
						"Каждый slot получает root props, сохраняющие DOM protocol и accessible relationships Fokit.",
					],
					items: [
						apiItem(
							"FieldSlotProps",
							"Label, description, control, errors и resolved state.",
						),
						apiItem(
							"SectionSlotProps",
							"Heading content, layout props и child nodes.",
						),
						apiItem(
							"ArraySlotProps",
							"Label, errors, add command, guards и rows.",
						),
						apiItem(
							"ArrayItemSlotProps",
							"Stable row identity и guarded remove/move.",
						),
						apiItem(
							"ErrorMessageSlotProps",
							"Один issue и focusable root props.",
						),
					],
				}),
				section("state-types", {
					navLabel: "State",
					title: "FormSnapshot и issue state",
					paragraphs: [
						"Selectors получают frozen snapshot, где raw issues отделены от display policy.",
					],
					items: [
						apiItem(
							"FormSnapshot",
							"Values, metadata, resolved UI, issues, display issues, validation status и submission state.",
						),
						apiItem(
							"FormIssue / SubmissionIssue",
							"Client issue state и его serializable server transport.",
						),
						apiItem(
							"DisplayFormErrors",
							"Только form и field issues, уже показанные пользователю.",
						),
						apiItem(
							"ValidationStatus",
							"unvalidated, valid, invalid или validating.",
						),
					],
				}),
				section("path-types", {
					navLabel: "Typed paths",
					title: "FieldPath, ArrayFieldPath и PathValue",
					paragraphs: [
						"Deep paths типизируются из FormInput, а runtime использует один canonical dotted format.",
					],
					code: code(
						"typed-paths",
						"types.ts",
						`type EmailPath = FieldPath<ProfileDraft>
// "name" | "contacts" | \`contacts.\${number}.email\` | ...

type ContactsPath = ArrayFieldPath<ProfileDraft>
// "contacts"

type EmailValue = PathValue<ProfileDraft, "contacts.0.email">
// string`,
					),
				}),
				section("server-types", {
					navLabel: "Server results",
					title: "FormResult и ParseResult",
					paragraphs: [
						"Server API возвращает discriminated serializable results, которые React 19 Actions отправляет клиенту.",
					],
					items: [
						apiItem(
							"ParseResult<Output>",
							"Success с validated output или failure с normalized issues и reply().",
						),
						apiItem(
							"FormResult",
							"Serializable success/error transport для ActionForm.",
						),
						apiItem(
							"ParseFormDataOptions",
							"Safety limits для entries, path length, nesting depth и array indexes.",
						),
					],
				}),
			],
		}),
		page("advanced", {
			title: "Продвинутые сценарии",
			subtitle: "Паттерны для сложных, доступных и server-aware форм.",
			lead: "Эти паттерны оставляют product markup в приложении и осознанно используют transaction, validation и serialization boundaries Fokit.",
			metaGroups: [
				{
					label: "Когда нужно",
					items: [
						"Flow между компонентами",
						"UI зависит от values",
						"Submit принадлежит серверу",
					],
				},
				{
					label: "Принцип",
					items: [
						"Один store",
						"Один mutation boundary",
						"Native form behavior",
					],
				},
			],
			sections: [
				section("accessibility", {
					navLabel: "Accessibility",
					title: "Accessibility принадлежит слотам",
					paragraphs: [
						"Fokit дает stable IDs, described-by relationships, issue focus targets, required state и native semantics. Контролы и слоты приложения формируют финальную accessible-разметку.",
					],
					bullets: [
						"Передавайте input.id, input.name, input.ref и aria-describedby.",
						"Связывайте labelProps и descriptionProps с нужными DOM-элементами.",
						"Рендерьте ErrorMessage root props для submit-time focus.",
						"Сохраняйте disabled, readOnly и required semantics, а не только стили.",
					],
				}),
				section("hybrid-rendering", {
					navLabel: "Generated + manual",
					title: "Смешивайте generated и manual composition",
					paragraphs: [
						"kit.Fields подходит для обычной части формы, а bespoke controls, summaries и commands работают с тем же FormInstance.",
					],
					code: code(
						"hybrid-rendering",
						"ProfileEditor.tsx",
						`<kit.Form form={form}>
	<kit.Fields />
	<AccountPreview form={form} />
	<ContactToolbar form={form} />
	<kit.Submit>Сохранить профиль</kit.Submit>
</kit.Form>`,
					),
				}),
				section("computed-ui", {
					navLabel: "Computed UI",
					title: "Объявляйте reactive dependencies",
					paragraphs: [
						"computed() получает явные paths, поэтому unrelated edits переиспользуют resolved UI state.",
					],
					code: code(
						"computed-ui",
						"definition.ts",
						`const companyNameField = {
	kind: "field",
	path: "companyName",
	control: "text",
	visible: computed(["kind"] as const, ({ kind }) => kind === "company"),
	valuePolicy: "unset",
}`,
					),
					callout: {
						title: "Hidden values — продуктовое решение",
						text: 'valuePolicy: "preserve" сохраняет скрытое значение, а "unset" удаляет optional data через обычный transaction pipeline.',
					},
				}),
				section("arrays", {
					navLabel: "Dynamic arrays",
					title: "Stable array identity",
					paragraphs: [
						"Array commands атомарно обновляют values, row keys, field metadata и issues. Keys следуют за логическими строками при insert, remove и move.",
					],
					code: code(
						"array-hooks",
						"Contacts.tsx",
						`const contacts = useArrayField(form, "contacts")

contacts.append({ email: "", label: undefined })
contacts.move(2, 0)
contacts.remove(1)

return contacts.items.map(({ key, index }) => (
	<ContactRow key={key} index={index} />
))`,
					),
				}),
				section("server-form-data", {
					navLabel: "Safe FormData",
					title: "Считайте FormData недоверенным input",
					paragraphs: [
						"parseFormData отклоняет prototype keys, structural collisions, sparse arrays, unknown reserved metadata, excessive depth и oversized indexes до schema validation.",
						"Request size, multipart, file count и file size limits должны сработать во framework до парсера.",
					],
					exampleId: "server-action",
				}),
				section("react-19-actions", {
					navLabel: "React 19 Actions",
					title: "Оставляйте Actions нативными",
					paragraphs: [
						"ActionForm не оборачивает и не заменяет server Action. Он наблюдает pending state, проверяет совместимость и синхронизирует FormResult.",
					],
					bullets: [
						"Server issues устанавливаются без потери client field metadata.",
						"Success может сохранить values, reset к submitted result или reset к defaults.",
						"Правки пользователя во время in-flight Action не перезаписываются stale server result.",
					],
				}),
				section("styling", {
					navLabel: "Styling",
					title: "Подключайте structural layer только при необходимости",
					paragraphs: [
						"fokit/layout.css отвечает за responsive grids, spans, gaps и structural data attributes. Он не задает colors, typography, controls или product surfaces.",
					],
					code: code(
						"structural-css",
						"app.tsx",
						`import "fokit/layout.css"

<kit.Form
	form={form}
	style={{
		"--fokit-column-gap": "1.25rem",
		"--fokit-row-gap": "1rem",
	}}
/>`,
					),
				}),
				section("testing", {
					navLabel: "Testing",
					title: "Тестируйте публичную границу",
					paragraphs: [
						"Проверяйте формы через labels, native submit и видимые issues. Typecheck полных примеров из built exports не дает документации разойтись с пакетом.",
					],
					bullets: [
						"Проверяйте store invariants без React через fokit/core.",
						"Тестируйте controls и slots через DOM, которым они владеют.",
						"Проверяйте packed exports в React 18, React 19, ESM, CJS и Next.js consumers.",
					],
				}),
			],
		}),
		page("faqs", {
			title: "FAQ",
			subtitle:
				"Продуктовые границы и острые углы — без обходных формулировок.",
			lead: "Fokit намеренно строг к данным, state и native form behavior — и намеренно нейтрален к визуальной системе приложения.",
			metaGroups: [
				{
					label: "Коротко",
					items: [
						"React 18 и 19",
						"Любая Standard Schema",
						"Нет built-in theme",
					],
				},
				{
					label: "Помощь",
					items: [
						{
							label: "GitHub issues",
							href: "https://github.com/r13v/fokit/issues",
						},
						{ label: "API reference", href: "#/ru/api" },
						{
							label: "Copyable examples",
							href: "https://github.com/r13v/fokit/tree/main/examples",
						},
					],
				},
			],
			sections: [
				section("why-fokit", {
					navLabel: "Зачем Fokit?",
					title: "Зачем Fokit вместо маленького form hook?",
					paragraphs: [
						"Fokit нужен, когда продукту одновременно важны schema-owned validation, typed transformations, generated и manual rendering, stable arrays, safe server FormData и явная поддержка React 19.",
						"Если нужны лишь несколько uncontrolled inputs и submit handler, браузер уже может быть более простым решением.",
					],
				}),
				section("controlled", {
					navLabel: "Controlled inputs",
					title: "Контролы Fokit controlled или uncontrolled?",
					paragraphs: [
						"Custom controls читают value из store и пишут через setValue, поэтому product state контролируется Fokit. Native FormData остается доступной через явную serialization strategy.",
					],
				}),
				section("schemas", {
					navLabel: "Схемы",
					title: "Fokit требует Zod?",
					paragraphs: [
						"Нет. Подходит любая реализация Standard Schema. Документация использует Zod как знакомый пример этого контракта.",
					],
				}),
				section("default-values", {
					navLabel: "Default values",
					title: "Почему default values должны быть полными?",
					paragraphs: [
						"Полный editable input дает dirty comparison, reset, array metadata, hidden-field policies и native serialization одну детерминированную базу.",
						"Optional schema fields могут начинаться с undefined, если это часть FormInput.",
					],
				}),
				section("ui-libraries", {
					navLabel: "UI libraries",
					title: "Можно использовать готовую component library?",
					paragraphs: [
						"Да. Один раз оберните input components через defineControl, а slots соберите из layout и feedback components вашей библиотеки.",
					],
				}),
				section("hidden-fields", {
					navLabel: "Hidden fields",
					title: "Что происходит, когда поле скрывается?",
					paragraphs: [
						"Visibility и value retention разделены. По умолчанию valuePolicy сохраняет значение; unset удаляет optional value при скрытии.",
					],
				}),
				section("reset", {
					navLabel: "Reset",
					title: "Как сбросить форму?",
					paragraphs: [
						"Вызовите form.reset() или используйте native reset button внутри kit.Form. Fokit отменит независимый DOM rollback и сбросит store.",
						"После успешного сохранения можно заменить baseline серверным значением.",
					],
				}),
				section("errors", {
					navLabel: "Server errors",
					title: "Как server errors попадают в поля?",
					paragraphs: [
						"Верните normalized SubmissionIssue с сервера. Classic flow вызывает form.setIssues, а React 19 ActionForm принимает FormResult напрямую.",
					],
				}),
				section("react-versions", {
					navLabel: "Версии React",
					title: "Чем отличаются React 18 и React 19?",
					paragraphs: [
						"Основной fokit entry поддерживает classic submit в обеих версиях. React 19 Actions живут отдельно в fokit/react19.",
					],
				}),
				section("performance", {
					navLabel: "Performance",
					title: "Каждое изменение ререндерит всю форму?",
					paragraphs: [
						"Нет. Store использует external subscriptions. useValue, useField, useArrayField и useFormState выбирают небольшие slices, а computed UI объявляет invalidating paths.",
					],
				}),
				section("styling-faq", {
					navLabel: "Styling",
					title: "Почему нет встроенной темы?",
					paragraphs: [
						"Form state не должна диктовать product styling. Fokit дает только optional structural CSS; colors, typography, controls и interaction polish остаются в приложении.",
					],
				}),
			],
		}),
	],
}

export function getPage(locale, pageId) {
	const localePages = pages[isLocale(locale) ? locale : DEFAULT_LOCALE]
	return localePages.find((item) => item.id === pageId) ?? localePages[0]
}

export function getAdjacentPages(locale, pageId) {
	const localePages = pages[isLocale(locale) ? locale : DEFAULT_LOCALE]
	const index = Math.max(
		0,
		localePages.findIndex((item) => item.id === pageId),
	)

	return {
		previous: index > 0 ? localePages[index - 1] : undefined,
		next: index < localePages.length - 1 ? localePages[index + 1] : undefined,
	}
}

export function isLocale(value) {
	return LOCALES.includes(value)
}

export function isPageId(value) {
	return PAGE_IDS.includes(value)
}

function page(id, input) {
	return { id, ...input }
}

function section(id, input) {
	return {
		id,
		navLabel: input.title,
		paragraphs: [],
		bullets: [],
		items: [],
		...input,
	}
}

function code(id, label, source) {
	return { id, label, source }
}

function apiItem(name, description) {
	return { name, description }
}
