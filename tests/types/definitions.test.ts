import type { StandardSchemaV1 } from "@standard-schema/spec"

import {
	type ArrayItemSlotProps,
	type ArraySlotProps,
	createFormKit,
	defineControl,
	type ErrorMessageSlotProps,
	type FieldSlotProps,
	type SectionSlotProps,
} from "../../src/index.js"

type ExampleInput = {
	requiredName: string
	optionalName?: string
	unionWithUndefined: string | undefined
	nested?: {
		child: string
	}
}

type ExampleSchema = StandardSchemaV1<ExampleInput>

declare const schema: ExampleSchema

const Field = (_props: FieldSlotProps) => null
const Section = (_props: SectionSlotProps) => null
const ArraySlotComponent = (_props: ArraySlotProps) => null
const ArrayItem = (_props: ArrayItemSlotProps) => null
const ErrorMessage = (_props: ErrorMessageSlotProps) => null

const text = defineControl<string | undefined>({
	component(_props) {
		return null
	},
	formData: {
		mode: "native",
	},
})

const optionalObject = defineControl<ExampleInput["nested"]>({
	component(_props) {
		return null
	},
	formData: {
		mode: "none",
	},
})

const kit = createFormKit({
	controls: {
		optionalObject,
		text,
	},
	slots: {
		Field,
		Section,
		Array: ArraySlotComponent,
		ArrayItem,
		ErrorMessage,
	},
})

const omittedSlotsKit = createFormKit({
	controls: {
		optionalObject,
		text,
	},
})

const partialSlotsKit = createFormKit({
	controls: {
		optionalObject,
		text,
	},
	slots: {
		Field,
	},
})

kit.defineForm(schema)({
	ui: [
		{
			kind: "field",
			path: "optionalName",
			control: "text",
			valuePolicy: "unset",
		},
		{
			kind: "field",
			path: "unionWithUndefined",
			control: "text",
			valuePolicy: "unset",
		},
		{
			kind: "field",
			path: "nested",
			control: "optionalObject",
			valuePolicy: "unset",
		},
		{
			kind: "field",
			path: "requiredName",
			control: "text",
			valuePolicy: "preserve",
		},
	],
})

omittedSlotsKit.defineForm(schema)({
	ui: [
		{
			kind: "field",
			path: "optionalName",
			control: "text",
			valuePolicy: "unset",
		},
	],
})

partialSlotsKit.defineForm(schema)({
	ui: [
		{
			kind: "field",
			path: "nested",
			control: "optionalObject",
			valuePolicy: "unset",
		},
	],
})

kit.defineForm(schema)({
	ui: [
		{
			kind: "field",
			path: "nested.child",
			control: "text",
			// @ts-expect-error required children under optional parents cannot use valuePolicy unset
			valuePolicy: "unset",
		},
	],
})

kit.defineForm(schema)({
	ui: [
		{
			kind: "field",
			path: "requiredName",
			control: "text",
			// @ts-expect-error required paths cannot use valuePolicy unset
			valuePolicy: "unset",
		},
	],
})
