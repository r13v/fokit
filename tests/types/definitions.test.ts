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
	contacts: { label?: string }[]
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

kit.defineForm(schema, {
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

kit.defineForm(schema, {
	ui: [
		{
			kind: "section",
			id: "dynamic-layout",
			className: ({ requiredName }) =>
				requiredName.length > 0 ? "complete" : "incomplete",
			columns: ({ requiredName }) => (requiredName.length > 0 ? 2 : 1),
			span: ({ requiredName }) => (requiredName.length > 0 ? 2 : 1),
			children: [
				{
					kind: "field",
					path: "requiredName",
					control: "text",
					className: ({ optionalName }) => optionalName ?? "empty",
					span: ({ requiredName }) => (requiredName.length > 0 ? 2 : 1),
				},
			],
		},
		{
			kind: "array",
			path: "contacts",
			className: ({ contacts }) =>
				contacts.length > 0 ? "has-contacts" : "empty",
			span: ({ contacts }) => (contacts.length > 0 ? "full" : 1),
			itemDefault: { label: "" },
			children: [
				{
					kind: "field",
					path: "label",
					control: "text",
				},
			],
		},
	],
})

kit.defineForm(schema, {
	ui: [
		{
			kind: "section",
			id: "invalid-resolvers",
			// @ts-expect-error className resolvers must return strings
			className: () => 1,
			// @ts-expect-error columns resolvers must return a supported column count
			columns: () => 5,
			// @ts-expect-error span resolvers must return a supported span
			span: () => "wide",
			children: [],
		},
	],
})

omittedSlotsKit.defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "optionalName",
			control: "text",
			valuePolicy: "unset",
		},
	],
})

partialSlotsKit.defineForm(schema, {
	ui: [
		{
			kind: "field",
			path: "nested",
			control: "optionalObject",
			valuePolicy: "unset",
		},
	],
})

kit.defineForm(schema, {
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

kit.defineForm(schema, {
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
