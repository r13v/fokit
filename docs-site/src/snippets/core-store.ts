import {
	type ControlMetadata,
	createFormStore,
	type FormInput,
	normalizeDefinition,
} from "form-please/core"
import { z } from "zod"

const schema = z.object({ name: z.string().min(1, "Enter a name") })
type Input = FormInput<typeof schema>
type Context = { readonly locked: boolean }
type Controls = {
	readonly text: ControlMetadata<string, Record<string, never>, Context>
}

const controls = {
	text: { formData: { mode: "native" } },
} satisfies Controls

const definition = normalizeDefinition<typeof schema, Controls, Context>({
	schema,
	controls,
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			label: "Name",
			disabled: (_values, { context }) => context.locked,
		},
	],
})

const defaultValues = { name: "Ada" } satisfies Input
const context: Context = { locked: false }
const store = createFormStore({
	definition,
	defaultValues,
	context,
})

const unsubscribe = store.subscribe(
	(snapshot) => snapshot.values.name,
	(name, previousName) => {
		console.log({ name, previousName })
	},
)

store.setValue("name", "Grace")
store.replaceContext({ locked: true })

const snapshot = store.getSnapshot()
console.log({
	name: snapshot.values.name,
	isDirty: snapshot.isDirty,
	isDisabled: snapshot.resolvedUi.fieldsByPath.name?.disabled,
})

const validation = await store.validate()
console.log(validation)

unsubscribe()
