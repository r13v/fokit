"use client"

import { memo, type ReactNode, useCallback, useRef } from "react"

import type {
	ArrayFieldPath,
	ArrayItemMetadata,
	FormInput,
	FormIssue,
	GridSpan,
	PathSegments,
	ResolvedArrayNode,
	ResolvedUiNode,
	StandardSchema,
} from "../core/index.js"
import type { FormKitSlots } from "./create-form-kit.js"
import { createDomId } from "./dom-id.js"
import { useFormIdPrefix } from "./form-context.js"
import { useArrayField, useFormState } from "./hooks.js"
import type { StructuralNodeName, StructuralRootProps } from "./slots.js"
import type { FormInstance } from "./use-form.js"

type GeneratedArrayProps<Schema extends StandardSchema, Context> = {
	readonly form: FormInstance<Schema, Context>
	readonly slots: FormKitSlots
	readonly node: ResolvedArrayNode<Context>
	renderNode(node: ResolvedUiNode<Context>, key: string): ReactNode
}

type GeneratedArrayItemProps<Schema extends StandardSchema, Context> = {
	readonly form: FormInstance<Schema, Context>
	readonly slots: FormKitSlots
	readonly node: ResolvedArrayNode<Context>
	readonly item: ArrayItemMetadata
	readonly itemCount: number
	readonly itemCountRef: { readonly current: number }
	readonly children: readonly ResolvedUiNode<Context>[]
	renderNode(node: ResolvedUiNode<Context>, key: string): ReactNode
}

type StructuralDataProps = {
	readonly "aria-describedby"?: string
	readonly "aria-labelledby"?: string
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

const emptyItems = Object.freeze([]) as readonly ArrayItemMetadata[]

export function GeneratedArray<Schema extends StandardSchema, Context>({
	form,
	slots,
	node,
	renderNode,
}: GeneratedArrayProps<Schema, Context>) {
	const idPrefix = useFormIdPrefix()
	const path = node.path as ArrayFieldPath<FormInput<Schema>>
	const array = useArrayField(form, path)
	const items = useFormState(
		form,
		(snapshot) =>
			snapshot.metadata.arraysByPath[node.path]?.items ?? emptyItems,
		{
			equalityFn: arrayItemsEqual,
		},
	)
	const itemCountRef = useRef(items.length)
	itemCountRef.current = items.length
	const arrayId = createDomId(idPrefix, node.path)
	const labelId = node.label === undefined ? undefined : `${arrayId}-label`
	const descriptionId =
		node.description === undefined ? undefined : `${arrayId}-description`
	const errorIds = array.meta.displayErrors.map(
		(_issue, index) => `${arrayId}-error-${index}`,
	)
	const ArraySlotComponent = slots.Array
	const canAdd = !node.disabled && !node.readOnly
	const add = useCallback(() => {
		if (!canAdd) {
			return
		}

		form.append(path)
	}, [canAdd, form, path])

	return (
		<ArraySlotComponent
			add={add}
			canAdd={canAdd}
			description={node.description}
			descriptionProps={
				descriptionId === undefined ? {} : { id: descriptionId }
			}
			errors={array.meta.displayErrors.map((issue, index) => {
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
			invalid={array.meta.invalid}
			label={node.label}
			labelProps={labelId === undefined ? {} : { id: labelId }}
			rootProps={createStructuralRootProps("array", {
				id: arrayId,
				path: node.path,
				className: node.className,
				span: node.span,
				invalid: array.meta.invalid,
				dirty: array.meta.dirty,
				disabled: node.disabled,
				readOnly: node.readOnly,
				touched: array.meta.touched,
				validating: array.meta.validating,
				labelledBy: labelId,
				describedBy: joinIds([descriptionId, ...errorIds]),
			})}
		>
			{items.map((item) => (
				<GeneratedArrayItem
					form={form}
					item={item}
					itemCount={items.length}
					itemCountRef={itemCountRef}
					key={item.key}
					node={node}
					renderNode={renderNode}
					slots={slots}
				>
					{node.itemChildren[item.index] ?? []}
				</GeneratedArrayItem>
			))}
		</ArraySlotComponent>
	)
}

const GeneratedArrayItem = memo(function GeneratedArrayItem<
	Schema extends StandardSchema,
	Context,
>({
	form,
	slots,
	node,
	item,
	itemCount,
	itemCountRef,
	children,
	renderNode,
}: GeneratedArrayItemProps<Schema, Context>) {
	const path = node.path as ArrayFieldPath<FormInput<Schema>>
	const itemPath = `${node.path}.${item.index}`
	const ArrayItem = slots.ArrayItem
	const canMutate = !node.disabled && !node.readOnly
	const canMoveUp = canMutate && item.index > 0
	const canMoveDown = canMutate && item.index < itemCount - 1
	const remove = useCallback(() => {
		if (!canMutate) {
			return
		}

		form.remove(path, item.index)
	}, [canMutate, form, item.index, path])
	const move = useCallback(
		(toIndex: number) => {
			if (
				!canMutate ||
				!Number.isSafeInteger(toIndex) ||
				toIndex < 0 ||
				toIndex >= itemCountRef.current
			) {
				return
			}

			form.move(path, item.index, toIndex)
		},
		[canMutate, form, item.index, itemCountRef, path],
	)

	return (
		<ArrayItem
			canMoveDown={canMoveDown}
			canMoveUp={canMoveUp}
			disabled={node.disabled}
			index={item.index}
			move={move}
			readOnly={node.readOnly}
			remove={remove}
			rootProps={createStructuralRootProps("array-item", {
				path: itemPath,
				dirty: item.dirty,
				disabled: node.disabled,
				readOnly: node.readOnly,
				touched: item.touched,
				validating: item.validating,
			})}
		>
			{children.map((child) => renderNode(child, `${item.key}:${child.id}`))}
		</ArrayItem>
	)
}, areArrayItemPropsEqual) as <Schema extends StandardSchema, Context>(
	props: GeneratedArrayItemProps<Schema, Context>,
) => ReactNode

function createErrorMessageRootProps({
	id,
	path,
}: {
	readonly id: string
	readonly path?: string
}): StructuralRootProps {
	const props: GeneratedRootProps = {
		"data-fokit-node": "error-message",
		...(path === undefined ? {} : { "data-fokit-path": path }),
		id,
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
		readonly labelledBy?: string
		readonly describedBy?: string
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
		...(options.labelledBy === undefined
			? {}
			: { "aria-labelledby": options.labelledBy }),
		...(options.describedBy === undefined
			? {}
			: { "aria-describedby": options.describedBy }),
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

function joinIds(ids: readonly (string | undefined)[]): string | undefined {
	const joined = ids.filter((id) => id !== undefined && id.length > 0).join(" ")
	return joined.length === 0 ? undefined : joined
}

function booleanData(value: boolean): "" | undefined {
	return value ? "" : undefined
}

function areArrayItemPropsEqual(
	previous: GeneratedArrayItemProps<StandardSchema, unknown>,
	next: GeneratedArrayItemProps<StandardSchema, unknown>,
): boolean {
	return (
		previous.form === next.form &&
		previous.slots === next.slots &&
		previous.renderNode === next.renderNode &&
		canMoveUp(previous) === canMoveUp(next) &&
		canMoveDown(previous) === canMoveDown(next) &&
		arrayItemEqual(previous.item, next.item) &&
		resolvedArrayShellEqual(previous.node, next.node) &&
		resolvedNodesEqual(previous.children, next.children)
	)
}

function canMoveUp(
	props: GeneratedArrayItemProps<StandardSchema, unknown>,
): boolean {
	return !props.node.disabled && !props.node.readOnly && props.item.index > 0
}

function canMoveDown(
	props: GeneratedArrayItemProps<StandardSchema, unknown>,
): boolean {
	return (
		!props.node.disabled &&
		!props.node.readOnly &&
		props.item.index < props.itemCount - 1
	)
}

function arrayItemsEqual(
	previous: readonly ArrayItemMetadata[],
	next: readonly ArrayItemMetadata[],
): boolean {
	return (
		previous.length === next.length &&
		previous.every((item, index) => {
			const nextItem = next[index]
			return nextItem !== undefined && arrayItemEqual(item, nextItem)
		})
	)
}

function arrayItemEqual(
	previous: ArrayItemMetadata,
	next: ArrayItemMetadata,
): boolean {
	return (
		previous.key === next.key &&
		previous.index === next.index &&
		previous.dirty === next.dirty &&
		previous.touched === next.touched &&
		previous.validating === next.validating
	)
}

function resolvedArrayShellEqual<Context>(
	previous: ResolvedArrayNode<Context>,
	next: ResolvedArrayNode<Context>,
): boolean {
	return (
		previous.id === next.id &&
		previous.parentId === next.parentId &&
		previous.scopePath === next.scopePath &&
		previous.className === next.className &&
		previous.span === next.span &&
		previous.visible === next.visible &&
		previous.disabled === next.disabled &&
		previous.readOnly === next.readOnly &&
		Object.is(previous.context, next.context) &&
		previous.path === next.path &&
		pathSegmentsEqual(previous.pathSegments, next.pathSegments) &&
		previous.label === next.label &&
		previous.description === next.description &&
		Object.is(previous.itemDefault, next.itemDefault)
	)
}

function resolvedNodesEqual<Context>(
	previous: readonly ResolvedUiNode<Context>[],
	next: readonly ResolvedUiNode<Context>[],
): boolean {
	return (
		previous.length === next.length &&
		previous.every((node, index) => {
			const nextNode = next[index]
			return nextNode !== undefined && resolvedNodeEqual(node, nextNode)
		})
	)
}

function resolvedNodeEqual<Context>(
	previous: ResolvedUiNode<Context>,
	next: ResolvedUiNode<Context>,
): boolean {
	if (
		previous.kind !== next.kind ||
		previous.id !== next.id ||
		previous.parentId !== next.parentId ||
		previous.scopePath !== next.scopePath ||
		previous.className !== next.className ||
		previous.span !== next.span ||
		previous.visible !== next.visible ||
		previous.disabled !== next.disabled ||
		previous.readOnly !== next.readOnly ||
		!Object.is(previous.context, next.context)
	) {
		return false
	}

	switch (previous.kind) {
		case "field":
			return (
				next.kind === "field" &&
				previous.path === next.path &&
				pathSegmentsEqual(previous.pathSegments, next.pathSegments) &&
				previous.control === next.control &&
				previous.label === next.label &&
				previous.description === next.description &&
				previous.required === next.required &&
				previous.valuePolicy === next.valuePolicy &&
				Object.is(previous.options, next.options)
			)
		case "section":
			return (
				next.kind === "section" &&
				previous.title === next.title &&
				previous.description === next.description &&
				previous.columns === next.columns &&
				resolvedNodesEqual(previous.children, next.children)
			)
		case "array":
			return next.kind === "array" && resolvedArrayShellEqual(previous, next)
		case "render":
			return (
				next.kind === "render" && Object.is(previous.component, next.component)
			)
		default:
			return false
	}
}

function pathSegmentsEqual(
	previous: PathSegments,
	next: PathSegments,
): boolean {
	return (
		previous.length === next.length &&
		previous.every((segment, index) => segment === next[index])
	)
}
