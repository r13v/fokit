import type { StandardSchemaV1 } from "@standard-schema/spec"

import type { FormStore } from "../../src/core/index.js"

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false

type Expect<Condition extends true> = Condition

type ExampleInput = {
	kind: "person" | "company"
	profile: {
		first: string
		last: string
		middle?: string
	}
	companyName?: string
	contacts: readonly {
		value: string
		note?: string
	}[]
	flags?: {
		newsletter: boolean
	}
}

type ExampleSchema = StandardSchemaV1<ExampleInput>

declare const form: FormStore<ExampleSchema>

form.setValue("kind", "person")
form.setValue("profile.first", "Grace")
form.setValue("profile", {
	first: "Grace",
	last: "Hopper",
})
form.setValue("contacts.0.value", "grace@example.test")
form.setValue("contacts", [{ value: "grace@example.test", note: "work" }])
form.setValue("companyName", undefined)

// @ts-expect-error value must match the selected path
form.setValue("kind", "enterprise")

// @ts-expect-error nested path values stay typed
form.setValue("contacts.0.value", 42)

// @ts-expect-error unknown paths are rejected
form.setValue("profile.nickname", "Amazing")

form.setValues({
	profile: {
		first: "Grace",
	},
	contacts: [{ value: "grace@example.test" }],
	flags: {
		newsletter: true,
	},
})

// @ts-expect-error deep partial values are still typed
form.setValues({ flags: { newsletter: "yes" } })

// @ts-expect-error arrays are replaced as complete values, not patched by index
form.setValues({ contacts: { 0: { value: "grace@example.test" } } })

form.unsetValue("companyName")
form.unsetValue("profile.middle")
form.unsetValue("contacts.0.note")
form.unsetValue("flags")

// @ts-expect-error required paths cannot be unset through the typed command API
form.unsetValue("kind")

// @ts-expect-error required nested paths cannot be unset even under arrays
form.unsetValue("contacts.0.value")

// @ts-expect-error a required child is not optional just because its parent is
form.unsetValue("flags.newsletter")

form.batch(() => {
	form.setValue("kind", "company")
	form.unsetValue("companyName")
})

type _valuesStayReadonly = Expect<
	Equal<ReturnType<typeof form.getValues>, ExampleInput>
>
