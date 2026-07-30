"use client"

import {
	type ComponentType,
	createElement,
	type ReactNode,
	useCallback,
} from "react"

import type {
	FieldPath,
	FormInput,
	FormIssue,
	GridSpan,
	ResolvedFieldNode,
	ResolvedSectionNode,
	ResolvedUiNode,
	StandardSchema,
} from "../core/index.js"
import { GeneratedArray } from "./array-field.js"
import type { ControlDefinitionRegistry } from "./control.js"
import { FieldControl } from "./control.js"
import type {
	FieldsComponent,
	FieldsProps,
	FormKitSlots,
} from "./create-form-kit.js"
import { createDomId } from "./dom-id.js"
import { useFormContext, useFormIdPrefix } from "./form-context.js"
import { useField, useFormState } from "./hooks.js"
import type { StructuralNodeName, StructuralRootProps } from "./slots.js"
import type { FormInstance } from "./use-form.js"

type FieldsRendererProps<Schema extends StandardSchema, Context> = {
	readonly form: FormInstance<Schema, Context>
	readonly controls: ControlDefinitionRegistry
	readonly slots: FormKitSlots
	readonly children?: ReactNode
}

type GeneratedNodeProps<Schema extends StandardSchema, Context> = {
	readonly form: FormInstance<Schema, Context>
	readonly controls: ControlDefinitionRegistry
	readonly slots: FormKitSlots
	readonly node: ResolvedUiNode<Context>
}

type StructuralDataProps = {
	readonly "data-fokit-path"?: string
	readonly "data-fokit-span"?: string
	readonly "data-invalid"?: ""
	readonly "data-dirty"?: ""
	readonly "data-disabled"?: ""
	readonly "data-readonly"?: ""
	readonly "data-required"?: ""
	readonly "data-touched"?: ""
	readonly "data-validating"?: ""
}

type GeneratedRootProps = StructuralRootProps & StructuralDataProps

export function createFieldsComponent(
	controls: ControlDefinitionRegistry,
	slots: FormKitSlots,
): FieldsComponent {
	function Fields({ children }: FieldsProps) {
		const form = useFormContext()

		return (
			<FieldsRenderer form={form} controls={controls} slots={slots}>
				{children}
			</FieldsRenderer>
		)
	}

	return Fields
}

export function FieldsRenderer<Schema extends StandardSchema, Context>({
	form,
	controls,
	slots,
	children,
}: FieldsRendererProps<Schema, Context>) {
	const nodes = useFormState(form, (snapshot) => snapshot.resolvedUi.ui)

	return (
		<>
			{nodes.map((node) => (
				<GeneratedNode
					controls={controls}
					form={form}
					key={node.id}
					node={node}
					slots={slots}
				/>
			))}
			{children}
		</>
	)
}

function GeneratedNode<Schema extends StandardSchema, Context>({
	form,
	controls,
	slots,
	node,
}: GeneratedNodeProps<Schema, Context>) {
	const renderNode = useCallback(
		(child: ResolvedUiNode<Context>, key: string) =>
			renderGeneratedNode(form, controls, slots, child, key),
		[controls, form, slots],
	)

	if (!node.visible) {
		return null
	}

	switch (node.kind) {
		case "field":
			return (
				<GeneratedField
					controls={controls}
					form={form}
					node={node}
					slots={slots}
				/>
			)
		case "section":
			return (
				<GeneratedSection
					controls={controls}
					form={form}
					node={node}
					slots={slots}
				/>
			)
		case "array":
			return (
				<GeneratedArray
					form={form}
					node={node}
					renderNode={renderNode}
					slots={slots}
				/>
			)
		case "render":
			return createElement(node.component as ComponentType)
		default:
			throw new TypeError("Unknown resolved UI node kind")
	}
}

function renderGeneratedNode<Schema extends StandardSchema, Context>(
	form: FormInstance<Schema, Context>,
	controls: ControlDefinitionRegistry,
	slots: FormKitSlots,
	node: ResolvedUiNode<Context>,
	key: string,
) {
	return (
		<GeneratedNode
			controls={controls}
			form={form}
			key={key}
			node={node}
			slots={slots}
		/>
	)
}

function GeneratedSection<Schema extends StandardSchema, Context>({
	form,
	controls,
	slots,
	node,
}: GeneratedNodeProps<Schema, Context> & {
	readonly node: ResolvedSectionNode<Context>
}) {
	const idPrefix = useFormIdPrefix()
	const Section = slots.Section
	const rootProps = createStructuralRootProps("section", {
		id: createDomId(idPrefix, node.id),
		className: node.className,
		span: node.span,
		disabled: node.disabled,
		readOnly: node.readOnly,
	})

	return (
		<Section
			description={node.description}
			layoutProps={{
				"data-fokit-layout": "grid",
				"data-fokit-columns": node.columns,
			}}
			rootProps={rootProps}
			title={node.title}
		>
			{node.children.map((child) => (
				<GeneratedNode
					controls={controls}
					form={form}
					key={child.id}
					node={child}
					slots={slots}
				/>
			))}
		</Section>
	)
}

function GeneratedField<Schema extends StandardSchema, Context>({
	form,
	controls,
	slots,
	node,
}: GeneratedNodeProps<Schema, Context> & {
	readonly node: ResolvedFieldNode<Context>
}) {
	const idPrefix = useFormIdPrefix()
	const path = node.path as FieldPath<FormInput<Schema>>
	const field = useField(form, path)
	const inputId = createDomId(idPrefix, node.path)
	const descriptionId =
		node.description === undefined ? undefined : `${inputId}-description`
	const errorIds = field.meta.displayErrors.map(
		(_issue, index) => `${inputId}-error-${index}`,
	)
	const Field = slots.Field

	return (
		<Field
			control={
				<FieldControl
					controls={controls}
					describedBy={errorIds}
					descriptionId={descriptionId}
					form={form}
					id={inputId}
					path={path}
					resolved={node}
				/>
			}
			description={node.description}
			descriptionProps={
				descriptionId === undefined ? {} : { id: descriptionId }
			}
			disabled={node.disabled}
			errors={field.meta.displayErrors.map((issue, index) => {
				const ErrorMessage = slots.ErrorMessage

				return (
					<ErrorMessage
						issue={issue}
						key={createIssueKey(issue, index)}
						rootProps={createErrorMessageRootProps({
							id: errorIds[index] as string,
							path: node.path,
						})}
					/>
				)
			})}
			label={node.label}
			labelProps={{
				htmlFor: inputId,
				id: `${inputId}-label`,
			}}
			readOnly={node.readOnly}
			required={node.required}
			rootProps={createStructuralRootProps("field", {
				path: node.path,
				className: node.className,
				span: node.span,
				invalid: field.meta.invalid,
				dirty: field.meta.dirty,
				disabled: node.disabled,
				readOnly: node.readOnly,
				required: node.required,
				touched: field.meta.touched,
				validating: field.meta.validating,
			})}
		/>
	)
}

export function createErrorMessageRootProps({
	id,
	path,
	tabIndex,
	ref,
}: {
	readonly id: string
	readonly path?: string
	readonly tabIndex?: -1
	readonly ref?: (element: HTMLElement | null) => void
}): StructuralRootProps {
	const props: GeneratedRootProps = {
		"data-fokit-node": "error-message",
		...(path === undefined ? {} : { "data-fokit-path": path }),
		id,
		...(tabIndex === undefined ? {} : { tabIndex }),
		...(ref === undefined ? {} : { ref }),
	}

	return props
}

function createStructuralRootProps(
	nodeName: StructuralNodeName,
	options: {
		readonly id?: string
		readonly path?: string
		readonly className?: string
		readonly span?: GridSpan
		readonly invalid?: boolean
		readonly dirty?: boolean
		readonly disabled?: boolean
		readonly readOnly?: boolean
		readonly required?: boolean
		readonly touched?: boolean
		readonly validating?: boolean
	},
): StructuralRootProps {
	const props: GeneratedRootProps = {
		"data-fokit-node": nodeName,
		...(options.id === undefined ? {} : { id: options.id }),
		...(options.path === undefined ? {} : { "data-fokit-path": options.path }),
		...(options.span === undefined
			? {}
			: { "data-fokit-span": String(options.span) }),
		...(options.className === undefined
			? {}
			: { className: options.className }),
		"data-invalid": booleanData(options.invalid === true),
		"data-dirty": booleanData(options.dirty === true),
		"data-disabled": booleanData(options.disabled === true),
		"data-readonly": booleanData(options.readOnly === true),
		"data-required": booleanData(options.required === true),
		"data-touched": booleanData(options.touched === true),
		"data-validating": booleanData(options.validating === true),
	}

	return props
}

function createIssueKey(issue: FormIssue, index: number): string {
	return `${issue.source}:${issue.path ?? "form"}:${issue.message}:${index}`
}

function booleanData(value: boolean): "" | undefined {
	return value ? "" : undefined
}
