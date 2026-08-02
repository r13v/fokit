import type { StandardSchemaV1 } from "@standard-schema/spec"

import type {
	ArrayFieldPath,
	ArrayItemValue,
	FieldPath,
	FormInput,
	FormOutput,
	PathValue,
} from "../../src/core/index.js"

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false

type Expect<Condition extends true> = Condition

type IsWidenedString<Value extends string> = string extends Value ? true : false

type ExampleInput = {
	kind: "person" | "company"
	name: string
	address?: {
		city?: string
		postalCode: string
	}
	contacts: readonly {
		type: "email" | "phone"
		value: string
		channels: readonly {
			enabled: boolean
		}[]
	}[]
	groups: {
		members: readonly {
			id: string
		}[]
	}[]
	tags: string[]
}

type ExampleOutput = {
	kind: "person" | "company"
	displayName: string
	contactCount: number
}

type ExampleSchema = StandardSchemaV1<ExampleInput, ExampleOutput>

type _formInput = Expect<Equal<FormInput<ExampleSchema>, ExampleInput>>
type _formOutput = Expect<Equal<FormOutput<ExampleSchema>, ExampleOutput>>

const scalarPath = "kind" satisfies FieldPath<ExampleInput>
const optionalPath = "address.city" satisfies FieldPath<ExampleInput>
const arrayItemPath = "contacts.0.value" satisfies FieldPath<ExampleInput>
const multiDigitArrayItemPath =
	"contacts.10.value" satisfies FieldPath<ExampleInput>
const relativeArrayItemPath = "channels.0.enabled" satisfies FieldPath<
	ExampleInput["contacts"][number]
>
const arrayPath = "contacts" satisfies ArrayFieldPath<ExampleInput>
const nestedArrayPath =
	"groups.0.members" satisfies ArrayFieldPath<ExampleInput>
const primitiveArrayItemPath = "tags.0" satisfies FieldPath<ExampleInput>

type _fieldPathsStayLiteral = Expect<
	Equal<IsWidenedString<FieldPath<ExampleInput>>, false>
>
type _arrayPathsStayLiteral = Expect<
	Equal<IsWidenedString<ArrayFieldPath<ExampleInput>>, false>
>
type _literalUnionValue = Expect<
	Equal<PathValue<ExampleInput, typeof scalarPath>, "person" | "company">
>
type _optionalValue = Expect<
	Equal<PathValue<ExampleInput, typeof optionalPath>, string | undefined>
>
type _arrayItemValue = Expect<
	Equal<PathValue<ExampleInput, typeof arrayItemPath>, string>
>
type _multiDigitArrayItemValue = Expect<
	Equal<PathValue<ExampleInput, typeof multiDigitArrayItemPath>, string>
>
type _relativeArrayItemValue = Expect<
	Equal<
		PathValue<ExampleInput["contacts"][number], typeof relativeArrayItemPath>,
		boolean
	>
>
type _arrayValue = Expect<
	Equal<PathValue<ExampleInput, typeof arrayPath>, ExampleInput["contacts"]>
>
type _nestedArrayValue = Expect<
	Equal<
		PathValue<ExampleInput, typeof nestedArrayPath>,
		ExampleInput["groups"][number]["members"]
	>
>
type _arrayPrimitiveItemValue = Expect<
	Equal<PathValue<ExampleInput, typeof primitiveArrayItemPath>, string>
>
type _arrayItem = Expect<
	Equal<
		ArrayItemValue<ExampleInput, "contacts">,
		ExampleInput["contacts"][number]
	>
>

// @ts-expect-error array item paths must name an array field
type _invalidArrayItemPath = ArrayItemValue<ExampleInput, "name">

// @ts-expect-error bracket syntax is never a canonical path
const _bracketPath: FieldPath<ExampleInput> = "contacts[0].value"

// @ts-expect-error signed indexes are not canonical paths
const _signedIndexPath: FieldPath<ExampleInput> = "contacts.-1.value"

// @ts-expect-error explicit plus indexes are not canonical paths
const _plusIndexPath: FieldPath<ExampleInput> = "contacts.+1.value"

// @ts-expect-error leading-zero indexes are not canonical paths
const _leadingZeroIndexPath: FieldPath<ExampleInput> = "contacts.01.value"

// @ts-expect-error alphabetic index suffixes are not canonical paths
const _alphabeticIndexPath: FieldPath<ExampleInput> = "contacts.1abc.value"

// @ts-expect-error scientific notation is not a canonical array index
const _scientificIndexPath: FieldPath<ExampleInput> = "contacts.1e3.value"

// @ts-expect-error object keys containing dots cannot be addressed
const _dottedKeyPath: FieldPath<{ "address.city": string }> = "address.city"

// @ts-expect-error numeric object keys are outside the path grammar
const _numericObjectKeyPath: FieldPath<{ 0: string }> = "0"

// @ts-expect-error reserved metadata is not user form data
const _reservedPath: FieldPath<{ __fp: string }> = "__fp"

// @ts-expect-error array paths are distinct from scalar/object field paths
const _nonArrayPath: ArrayFieldPath<ExampleInput> = "address.city"
