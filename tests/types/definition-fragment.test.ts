import type { StandardSchemaV1 } from "@standard-schema/spec"

import { createFormKit, defineControl } from "../../src/index.js"

type Input = {
	readonly kind: "person" | "company"
	readonly profile: {
		readonly first: string
		readonly last: string
	}
	readonly contacts: readonly {
		readonly value: string
	}[]
}

type Context = {
	readonly locked: boolean
}

type RichContext = Context & {
	readonly actor: string
}

declare const schema: StandardSchemaV1<Input>

const text = defineControl<string>({
	component: () => null,
	formData: { mode: "native" },
})
const kit = createFormKit({ controls: { text } })
const define = kit.defineForm(schema)
const extendedKit = kit.extend({ controls: { alternateText: text } })
const extendedDefine = extendedKit.defineForm(schema)

const profile = define.fragment("profile", [
	{
		kind: "field",
		path: "first",
		control: "text",
		label: ({ first }) => first,
	},
])

const contextualProfile = define.fragment.withContext<Context>()("profile", [
	{
		kind: "field",
		path: "last",
		control: "text",
		disabled: (_values, { context }) => context.locked,
	},
])

define({ ui: profile })
define.withContext<Context>({ ui: profile })
define.withContext<Context>({ ui: contextualProfile })
define.withContext<RichContext>({ ui: contextualProfile })
extendedDefine({ ui: profile })

const extendedProfile = extendedDefine.fragment("profile", [
	{
		kind: "field",
		path: "first",
		control: "alternateText",
	},
])

// @ts-expect-error fragments cannot require controls missing from the target kit
define({ ui: extendedProfile })

// @ts-expect-error fragments that require context cannot enter a weaker context
define.withContext<object>({ ui: contextualProfile })

// @ts-expect-error fragments require object-valued, non-array scopes
define.fragment("kind", [])

// @ts-expect-error array scopes keep their existing item-child semantics
define.fragment("contacts", [])

define.fragment("profile", [
	{
		kind: "field",
		// @ts-expect-error fragment paths are relative to the selected object
		path: "missing",
		control: "text",
	},
])

type OptionalInput = {
	readonly optionalProfile?: {
		readonly name: string
	}
	readonly nullableProfile: {
		readonly name: string
	} | null
}

declare const optionalSchema: StandardSchemaV1<OptionalInput>
const optionalDefine = kit.defineForm(optionalSchema)

// @ts-expect-error fragment scopes must be definitely present objects
optionalDefine.fragment("optionalProfile", [])

// @ts-expect-error fragment scopes must be non-null objects
optionalDefine.fragment("nullableProfile", [])

type WideInput = {
	readonly profile: {
		readonly name: string
	}
}

type NarrowInput = {
	readonly profile: {
		readonly name: "Ada"
	}
}

declare const wideSchema: StandardSchemaV1<WideInput>
declare const narrowSchema: StandardSchemaV1<NarrowInput>
const wideDefine = kit.defineForm(wideSchema)
const narrowDefine = kit.defineForm(narrowSchema)
const wideProfile = wideDefine.fragment("profile", [
	{ kind: "field", path: "name", control: "text" },
])
const narrowProfile = narrowDefine.fragment("profile", [
	{ kind: "field", path: "name", control: "text" },
])

narrowDefine({ ui: wideProfile })

// @ts-expect-error a fragment checked against a narrower input is not safe here
wideDefine({ ui: narrowProfile })
