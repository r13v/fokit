// biome-ignore-all lint/correctness/noUnusedVariables: Named regions are consumed independently by the documentation.
"use client"

import {
	type BeforeUpdateEvent,
	type CreateFormOptions,
	createDefaultSlots,
	createFormKit,
	type FormCommand,
	type FormDispatchResult,
	type FormInput,
	type FormMiddleware,
	type FormRuntimeOptions,
	type FormTransaction,
	nativeControls,
	type SubmitHandler,
	type UpdateEvent,
	type ValidationOptions,
	type ValueChange,
} from "form-please"
import {
	type ControlMetadata as CoreControlMetadata,
	type UiNode as CoreUiNode,
	normalizeDefinition as normalizeCoreDefinition,
} from "form-please/core"
import {
	type CreateDevToolsOptions,
	createDevToolsMiddleware,
} from "form-please/devtools"
import { createHistoryMiddleware, replayJournal } from "form-please/history"
import {
	createDateCodec,
	createFileCodec,
	createLocalStorageAdapter,
	createPersistenceMiddleware,
	type FormPersistenceAdapter,
	type JsonValue,
	type PersistenceCodec,
	type PersistenceMigration,
} from "form-please/persistence"
import type { FormResult } from "form-please/server"
import { z } from "zod"

const schema = z.object({
	profile: z.object({
		name: z.string(),
		nickname: z.string().optional(),
	}),
	contacts: z.array(z.object({ email: z.email() })),
})
type Input = FormInput<typeof schema>
type Context = { readonly actorId: string }

const controls = nativeControls
const slots = createDefaultSlots()
const ui = [] as const
const kit = createFormKit({ controls })
const definition = kit.defineForm(schema)({ ui })
const defaultValues = {
	profile: { name: "Ada" },
	contacts: [],
} satisfies Input
const context = { actorId: "user-1" } satisfies Context
const createOptions = {
	defaultValues,
	context,
} satisfies CreateFormOptions<typeof schema, Context>
const runtimeOptions = {
	context,
	disabled: false,
} satisfies FormRuntimeOptions<typeof schema, Context>

// [!region create-form-kit]
const defaultKit = createFormKit({ controls })
const customSlotKit = createFormKit({ controls, slots })
// [!endregion create-form-kit]

// [!region define-form]
const profileDefinition = kit.defineForm(schema)({ ui })
const contextualDefinition = kit.defineForm(schema).withContext<Context>({ ui })
const profileFragment = kit.defineForm(schema).fragment("profile", [])
// [!endregion define-form]

// [!region create-form-options]
type ProfileCreateFormOptions = {
	defaultValues: Input
	context?: Context
	disabled?: boolean
	readOnly?: boolean
	validation?: Partial<ValidationOptions>
	beforeUpdate?: (
		event: BeforeUpdateEvent<Input, Context>,
	) => false | readonly ValueChange<Input>[] | undefined
	afterUpdate?: (event: UpdateEvent<Input, Context>) => void
	onSubmit?: SubmitHandler<typeof schema, Context>
	middleware?: readonly FormMiddleware<Input, Context>[]
}
// [!endregion create-form-options]

// [!region create-form]
const form = kit.createForm(definition, createOptions)
// [!endregion create-form]

// [!region use-create-form]
function Editor() {
	const form = kit.useCreateForm(definition, { defaultValues })
	return <kit.AutoForm form={form} />
}
// [!endregion use-create-form]

// [!region runtime-options]
type ProfileRuntimeOptions = {
	context?: Context
	disabled?: boolean
	readOnly?: boolean
	validation?: Partial<ValidationOptions>
	beforeUpdate?: ProfileCreateFormOptions["beforeUpdate"]
	afterUpdate?: ProfileCreateFormOptions["afterUpdate"]
	onSubmit?: SubmitHandler<typeof schema, Context>
}
// [!endregion runtime-options]

// [!region use-bind-form]
function useProfileForm() {
	return kit.useBindForm(form, runtimeOptions)
}
// [!endregion use-bind-form]

// [!region form-components]
function ManualForm() {
	return <kit.Form form={form}>...</kit.Form>
}

function GeneratedForm() {
	return <kit.AutoForm form={form} />
}
// [!endregion form-components]

function receiveValue(_value: unknown) {}
function receiveValidation(_value: unknown) {}
function receiveDirtyState(_dirty: boolean, _previous: boolean) {}

// [!region form-instance]
async function useFormInstance() {
	form.getSnapshot()
	form.getValues()
	form.getValue("profile.name")
	form.setValue("profile.name", "Grace")
	form.setValues({ profile: { nickname: "Amazing Grace" } })
	form.unsetValue("profile.nickname")
	form.append("contacts")
	form.append("contacts", { email: "grace@example.com" })
	form.insert("contacts", 0)
	form.insert("contacts", 0, { email: "ada@example.com" })
	form.remove("contacts", 0)
	form.move("contacts", 0, 1)
	form.batch(() => form.setValue("profile.name", "Katherine"))
	form.reset()
	form.reset(defaultValues)
	form.touch("profile.name")
	form.blur("profile.name")
	form.setErrors([
		{ source: "manual", path: "profile.name", message: "Check this name" },
	])
	form.clearErrors()
	form.clearErrors("profile.name")
	receiveValidation(await form.validate())
	receiveValidation(await form.validate("profile.name"))
	receiveValidation(await form.validatePaths(["profile.name"]))
	form.focus("profile.name")
	form.focusFirstError()
	form.focusFirstError(["profile.name"])
	form.replaceContext(context)
	form.replaceOptions({ disabled: true })
	const unsubscribe = form.subscribe(
		(snapshot) => snapshot.isDirty,
		receiveDirtyState,
		{ equalityFn: Object.is },
	)
	receiveValue(unsubscribe)
	await form.submit()
}
// [!endregion form-instance]

// [!region commands]
type ProfileCommand = FormCommand<Input, Context>

const commands: readonly ProfileCommand[] = [
	{ type: "value/set", path: "profile.name", value: "Ada" },
	{
		type: "array/append",
		path: "contacts",
		value: { email: "ada@example.com" },
	},
	{ type: "validation/run", path: "profile.name" },
	{ type: "runtime/replaceContext", context },
]
// [!endregion commands]

// [!region transactions]
type ProfileTransaction = FormTransaction<Input, Context>
type ProfileDispatchResult = FormDispatchResult<Input, Context>
// [!endregion transactions]

// [!region middleware]
const middleware: FormMiddleware<Input, Context> =
	(api) => (next) => (transaction) => {
		const before = api.getSnapshot()
		const result = next(transaction)
		const after = api.getSnapshot()
		receiveValue({ before, result, after })
		return result
	}
// [!endregion middleware]

// [!region history]
const historyFeature = createHistoryMiddleware()
const retainedHistoryFeature = createHistoryMiddleware({
	limit: 50,
	groupWindow: 750,
})
const historyForm = kit.createForm(definition, {
	defaultValues,
	middleware: [historyFeature],
})
const history = historyFeature.handle(historyForm)
// [!endregion history]

// [!region history-operations]
async function useHistory(uploaded: unknown) {
	const snapshot = history.getSnapshot()
	const unsubscribe = history.subscribe(() =>
		receiveValue(history.getSnapshot()),
	)
	const undoResult = history.undo()
	const redoResult = history.redo()
	const seekResult = history.seek(0)
	history.clear()
	const journal = history.export()
	const importResult = await history.import(uploaded)
	const document = replayJournal(journal, journal.cursor)
	unsubscribe()
	receiveValue({
		snapshot,
		undoResult,
		redoResult,
		seekResult,
		importResult,
		document,
	})
}
// [!endregion history-operations]

// [!region replay]
const journal = history.export()
const firstSegment = journal.segments[0]
const checkpoint = replayJournal(journal, firstSegment.checkpoint.cursor)
const firstGroup = replayJournal(journal, firstSegment.groups[0].cursor)
// [!endregion replay]

const adapter: FormPersistenceAdapter = {
	async load() {
		return undefined
	},
	async save() {},
	async remove() {},
}

// [!region persistence]
const persistenceFeature = createPersistenceMiddleware({
	adapter,
	key: "profile-draft",
	version: 1,
})
const persistentForm = kit.createForm(definition, {
	defaultValues,
	middleware: [persistenceFeature],
})
const persistence = persistenceFeature.handle(persistentForm)
// [!endregion persistence]

// [!region persistence-operations]
async function usePersistence() {
	const restoreResult = await persistence.restore()
	persistence.start()
	await persistence.flush()
	await persistence.clear()
	const snapshot = persistence.getSnapshot()
	const unsubscribe = persistence.subscribe(() =>
		receiveValue(persistence.getSnapshot()),
	)
	unsubscribe()
	receiveValue({ restoreResult, snapshot })
}
// [!endregion persistence-operations]

// [!region persistence-adapter]
const memoryAdapter: FormPersistenceAdapter = {
	async load(_key) {
		return undefined
	},
	async save(_key, _value) {},
	async remove(_key) {},
}

const localStorageAdapter = createLocalStorageAdapter(() => window.localStorage)
// [!endregion persistence-adapter]

// [!region persistence-codecs]
const codecs = [
	createDateCodec(),
	createFileCodec({ tag: "file", maxSize: 10 * 1024 * 1024 }),
] satisfies readonly PersistenceCodec[]

const migrate: PersistenceMigration = (payload, fromVersion, toVersion) => {
	if (fromVersion <= toVersion) return payload
	throw new Error("Cannot migrate a draft backwards")
}

const exampleJson: JsonValue = { version: 1 }
// [!endregion persistence-codecs]

// [!region devtools]
const devToolsFeature = createDevToolsMiddleware()
const namedDevToolsFeature = createDevToolsMiddleware({
	name: "Profile editor",
})
const devToolsForm = kit.createForm(definition, {
	defaultValues,
	middleware: [devToolsFeature],
})
const devTools = devToolsFeature.handle(devToolsForm)
devTools.disconnect()
// [!endregion devtools]

// [!region devtools-options]
const devToolsOptions = {
	name: "Profile editor",
	latency: 250,
	maxAge: 50,
	trace: (action) => action.type,
	traceLimit: 25,
	serialize: true,
	actionSanitizer: (action) => action,
	stateSanitizer: (state) => state,
	actionsAllowlist: ["document/committed"],
	predicate: () => true,
	autoPause: true,
	onError: (error) => console.error(error),
} satisfies CreateDevToolsOptions
// [!endregion devtools-options]

// [!region default-slots]
const defaultSlots = createDefaultSlots()
const localizedSlots = createDefaultSlots({
	i18n: { arrayAdd: "Add another item" },
})
// [!endregion default-slots]

const action = async (_formData: FormData) => {}
const result: FormResult | undefined = undefined

// [!region react-19]
import { ActionForm, ActionSubmit } from "form-please/react19"

function ProfileActionForm() {
	return (
		<ActionForm form={form} action={action} result={result}>
			<ActionSubmit>Save</ActionSubmit>
		</ActionForm>
	)
}
// [!endregion react-19]

const coreSchema = z.object({ name: z.string() })
type CoreInput = FormInput<typeof coreSchema>
type CoreControls = {
	readonly text: CoreControlMetadata<string | undefined>
}
const coreControls = {
	text: { formData: { mode: "native" } },
} satisfies CoreControls
const coreDefinition = normalizeCoreDefinition<typeof coreSchema, CoreControls>(
	{
		schema: coreSchema,
		controls: coreControls,
		ui: [
			{ kind: "field", path: "name", control: "text", label: "Name" },
		] satisfies readonly CoreUiNode<CoreInput, CoreControls>[],
	},
)
const coreDefaultValues = { name: "Ada" }
const coreContext = { source: "documentation" }
const coreRuntimeOptions = { disabled: false }

// [!region core]
import { createFormStore } from "form-please/core"

const store = createFormStore({
	definition: coreDefinition,
	defaultValues: coreDefaultValues,
	context: coreContext,
	...coreRuntimeOptions,
})
// [!endregion core]
