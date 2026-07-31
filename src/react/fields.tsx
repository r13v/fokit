"use client"

import {
	type ComponentType,
	createElement,
	type ReactNode,
	useCallback,
} from "react"

import type {
	AnyUiPresentation,
	FieldPath,
	FormInput,
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
	RuntimeFormKitSlots,
} from "./create-form-kit.js"
import { createDomId } from "./dom-id.js"
import { useFormContext, useFormIdPrefix } from "./form-context.js"
import { createIssueKey } from "./form-errors.js"
import { useField, useFormState } from "./hooks.js"
import {
	createErrorMessageRootProps,
	createStructuralRootProps,
} from "./structural-props.js"
import type { AnyFormInstance } from "./use-form.js"

type FieldsRendererProps<Schema extends StandardSchema, Context> = {
	readonly form: AnyFormInstance<Schema, Context>
	readonly controls: ControlDefinitionRegistry
	readonly slots: RuntimeFormKitSlots
	readonly children?: ReactNode
}

type GeneratedNodeProps<Schema extends StandardSchema, Context> = {
	readonly form: AnyFormInstance<Schema, Context>
	readonly controls: ControlDefinitionRegistry
	readonly slots: RuntimeFormKitSlots
	readonly node: ResolvedUiNode<Context, unknown, AnyUiPresentation>
}

export function createFieldsComponent(
	controls: ControlDefinitionRegistry,
	slots: RuntimeFormKitSlots,
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
		(child: ResolvedUiNode<Context, unknown, AnyUiPresentation>, key: string) =>
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
	form: AnyFormInstance<Schema, Context>,
	controls: ControlDefinitionRegistry,
	slots: RuntimeFormKitSlots,
	node: ResolvedUiNode<Context, unknown, AnyUiPresentation>,
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
	readonly node: ResolvedSectionNode<Context, unknown, AnyUiPresentation>
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
			description={node.description as ReactNode}
			layoutProps={{
				"data-fokit-layout": "grid",
				"data-fokit-columns": node.columns,
			}}
			rootProps={rootProps}
			slotOptions={node.slotOptions}
			title={node.title as ReactNode}
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
	readonly node: ResolvedFieldNode<Context, AnyUiPresentation>
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
			description={node.description as ReactNode}
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
			label={node.label as ReactNode}
			labelProps={{
				htmlFor: inputId,
				id: `${inputId}-label`,
			}}
			readOnly={node.readOnly}
			required={node.required}
			slotOptions={node.slotOptions}
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
