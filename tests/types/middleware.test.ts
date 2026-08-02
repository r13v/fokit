import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { FormStore } from "../../src/core/index.js"
import type {
	FormCommand,
	FormInstance,
	FormMiddleware,
	FormTransaction,
} from "../../src/index.js"

type Input = {
	name: string
	age: number
	note?: string
	items: { value: string }[]
}

type Context = {
	readonly locale: string
}

type Schema = StandardSchemaV1<Input>

const middleware: FormMiddleware<Input, Context> =
	(api) => (next) => (transaction) => {
		const locale: string = api.getSnapshot().context.locale
		void locale
		api.dispatch({ type: "value/set", path: "name", value: "Grace" })
		api.dispatch({ type: "value/unset", path: "note" })
		api.dispatch({ type: "array/append", path: "items", value: { value: "x" } })
		api.dispatch({ type: "validation/runPaths", paths: ["name", "age"] })

		// @ts-expect-error commands reject paths outside the schema input
		api.dispatch({ type: "value/set", path: "missing", value: "x" })
		// @ts-expect-error array commands require an array field path
		api.dispatch({ type: "array/remove", path: "name", index: 0 })
		// @ts-expect-error command values must belong to the input value domain
		api.dispatch({ type: "value/set", path: "name", value: true })

		return next(transaction)
	}

const command: FormCommand<Input, Context> = {
	type: "runtime/replaceContext",
	context: { locale: "fr" },
}
void command
void middleware

declare const transaction: FormTransaction<Input, Context>
if (transaction.type === "document/committed") {
	// @ts-expect-error transactions are immutable middleware candidates
	transaction.source = "reset"
}

declare const wrongContextMiddleware: FormMiddleware<
	Input,
	{ readonly tenantId: number }
>
// @ts-expect-error middleware context requirements must match the form context
const incompatibleContext: FormMiddleware<Input, Context> =
	wrongContextMiddleware
void incompatibleContext

declare const wrongInputMiddleware: FormMiddleware<
	{ readonly enabled: boolean },
	Context
>
// @ts-expect-error middleware input requirements must match the form input
const incompatibleInput: FormMiddleware<Input, Context> = wrongInputMiddleware
void incompatibleInput

declare const store: FormStore<Schema, Context>
// @ts-expect-error stores do not expose raw event dispatch
store.dispatch({ type: "document/committed" })

declare const form: FormInstance<Schema, Context>
// @ts-expect-error React form instances do not expose raw event dispatch
form.dispatch({ type: "document/committed" })
