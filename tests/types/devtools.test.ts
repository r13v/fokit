import type { StandardSchemaV1 } from "@standard-schema/spec"
import type * as CorePublic from "../../src/core/index.js"
import { createDefaultSlots } from "../../src/default-slots/index.js"
import {
	type CreateDevToolsOptions,
	createDevToolsMiddleware,
	type DevToolsFeature,
	type DevToolsFormState,
	type DevToolsHandle,
	type DevToolsRevisionToken,
	type LogicalRowIdentity,
} from "../../src/devtools/index.js"
import type * as RootPublic from "../../src/index.js"
import { createFormKit, type FormMiddleware } from "../../src/index.js"

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false
type Expect<Condition extends true> = Condition

type Input = { name: string; items: { value: string }[] }
type Context = { locale: string }
type Schema = StandardSchemaV1<Input>

declare const schema: Schema
const kit = createFormKit({ controls: {}, slots: createDefaultSlots() })
const definition = kit.forContext<Context>().defineForm(schema, { ui: [] })
const options = {
	name: "Checkout",
	latency: 0,
	maxAge: 20,
	trace: true,
	traceLimit: 10,
	serialize: { options: { undefined: true } },
	actionSanitizer: (action, id) => ({ action, id }),
	stateSanitizer: (state, index) => ({ state, index }),
	actionsAllowlist: ["document/.*"],
	actionsDenylist: "validation/.*",
	predicate: (_state, _action) => true,
	autoPause: false,
	onError: (_error) => {},
} satisfies CreateDevToolsOptions
const feature: DevToolsFeature = createDevToolsMiddleware(options)
const middleware: FormMiddleware<Input, Context> = feature
const form = kit.createForm(definition, {
	defaultValues: { name: "Ada", items: [] },
	context: { locale: "en" },
	middleware: [feature],
})
const handle: DevToolsHandle = feature.handle(form)
const sameHandle: DevToolsHandle = feature.handle(form)

declare const state: DevToolsFormState<Input>
const name: string = state.values.name
const revision: DevToolsRevisionToken = state.$formPlease.revision
const rowIdentity: LogicalRowIdentity = state.rowIdentity
const key: string | undefined = state.rowIdentity.arrays[0]?.keys[0]

type _noRootDevTools = Expect<
	Equal<
		"createDevToolsMiddleware" extends keyof typeof RootPublic ? true : false,
		false
	>
>
type _noCoreDevTools = Expect<
	Equal<
		"createDevToolsMiddleware" extends keyof typeof CorePublic ? true : false,
		false
	>
>

// @ts-expect-error the feature owns the connection features contract
createDevToolsMiddleware({ features: { jump: true } })
// @ts-expect-error arbitrary action creators are unsupported
createDevToolsMiddleware({ actionCreators: {} })
// @ts-expect-error enhancer-only lock configuration is unsupported
createDevToolsMiddleware({ shouldStartLocked: true })
// @ts-expect-error revision tokens are opaque
const forgedRevision: DevToolsRevisionToken = "form-please:1"
// @ts-expect-error the form does not own a DevTools handle
form.devTools

handle.disconnect()
sameHandle.disconnect()
void middleware
void name
void revision
void rowIdentity
void key
void forgedRevision
