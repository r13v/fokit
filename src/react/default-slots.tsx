"use client"

import type { ReactNode } from "react"

import type { FormKitSlots } from "./create-form-kit.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	SectionSlotProps,
	SubmitSlotProps,
} from "./slots.js"

export type DefaultSlotI18nValue<Data> =
	| string
	| ((data: Readonly<Data>) => string)

export type DefaultArrayAddI18nData = {
	readonly label?: ReactNode
}

export type DefaultArrayItemI18nData = {
	readonly index: number
	readonly position: number
}

export type DefaultSlotsI18n = {
	readonly arrayAdd: DefaultSlotI18nValue<DefaultArrayAddI18nData>
	readonly arrayRemove: DefaultSlotI18nValue<DefaultArrayItemI18nData>
	readonly arrayMoveUp: DefaultSlotI18nValue<DefaultArrayItemI18nData>
	readonly arrayMoveDown: DefaultSlotI18nValue<DefaultArrayItemI18nData>
}

const englishDefaultSlotsI18n = Object.freeze({
	arrayAdd: "Add item",
	arrayRemove: ({ position }) => `Remove item ${position}`,
	arrayMoveUp: ({ position }) => `Move item ${position} up`,
	arrayMoveDown: ({ position }) => `Move item ${position} down`,
} satisfies DefaultSlotsI18n)

export function createDefaultSlots(options?: {
	readonly i18n?: Partial<DefaultSlotsI18n>
}): FormKitSlots {
	const i18n = Object.freeze({
		arrayAdd: options?.i18n?.arrayAdd ?? englishDefaultSlotsI18n.arrayAdd,
		arrayRemove:
			options?.i18n?.arrayRemove ?? englishDefaultSlotsI18n.arrayRemove,
		arrayMoveUp:
			options?.i18n?.arrayMoveUp ?? englishDefaultSlotsI18n.arrayMoveUp,
		arrayMoveDown:
			options?.i18n?.arrayMoveDown ?? englishDefaultSlotsI18n.arrayMoveDown,
	})

	function DefaultArraySlot({
		rootProps,
		label,
		labelProps,
		description,
		descriptionProps,
		errors,
		canAdd,
		add,
		children,
	}: ArraySlotProps) {
		return (
			<div {...rootProps}>
				{label === undefined ? null : <div {...labelProps}>{label}</div>}
				{description === undefined ? null : (
					<p {...descriptionProps}>{description}</p>
				)}
				{errors}
				{children}
				<button
					data-fp-array-action="add"
					disabled={!canAdd}
					type="button"
					onClick={add}
				>
					{resolveMessage(
						i18n.arrayAdd,
						Object.freeze({
							label,
						}),
					)}
				</button>
			</div>
		)
	}

	function DefaultArrayItemSlot({
		rootProps,
		index,
		disabled,
		readOnly,
		canMoveUp,
		canMoveDown,
		remove,
		move,
		children,
	}: ArrayItemSlotProps) {
		const actionData = Object.freeze({
			index,
			position: index + 1,
		})
		const moveUpLabel = resolveMessage(i18n.arrayMoveUp, actionData)
		const moveDownLabel = resolveMessage(i18n.arrayMoveDown, actionData)
		const removeLabel = resolveMessage(i18n.arrayRemove, actionData)

		return (
			<div {...rootProps}>
				{children}
				<fieldset
					aria-label={`#${actionData.position}`}
					data-fp-array-item-actions=""
				>
					<span aria-hidden="true" data-fp-array-item-position="">
						#{actionData.position}
					</span>
					<button
						aria-label={moveUpLabel}
						data-fp-array-action="move-up"
						disabled={disabled || readOnly || !canMoveUp}
						title={moveUpLabel}
						type="button"
						onClick={() => move(index - 1)}
					>
						<span aria-hidden="true">↑</span>
					</button>
					<button
						aria-label={moveDownLabel}
						data-fp-array-action="move-down"
						disabled={disabled || readOnly || !canMoveDown}
						title={moveDownLabel}
						type="button"
						onClick={() => move(index + 1)}
					>
						<span aria-hidden="true">↓</span>
					</button>
					<button
						aria-label={removeLabel}
						data-fp-array-action="remove"
						disabled={disabled || readOnly}
						title={removeLabel}
						type="button"
						onClick={remove}
					>
						<span aria-hidden="true">❌</span>
					</button>
				</fieldset>
			</div>
		)
	}

	return Object.freeze({
		Field: DefaultFieldSlot,
		Section: DefaultSectionSlot,
		Array: DefaultArraySlot,
		ArrayItem: DefaultArrayItemSlot,
		ErrorMessage: DefaultErrorMessageSlot,
		Submit: DefaultSubmitSlot,
	})
}

function DefaultFieldSlot({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	control,
	errors,
}: FieldSlotProps) {
	return (
		<div {...rootProps}>
			{label === undefined ? null : (
				<label {...labelProps} htmlFor={labelProps.htmlFor}>
					{label}
				</label>
			)}
			{description === undefined ? null : (
				<p {...descriptionProps}>{description}</p>
			)}
			{control}
			{errors}
		</div>
	)
}

function DefaultSectionSlot({
	rootProps,
	layoutProps,
	title,
	description,
	children,
}: SectionSlotProps) {
	return (
		<section {...rootProps}>
			{title === undefined ? null : <h2>{title}</h2>}
			{description === undefined ? null : <p>{description}</p>}
			<div {...layoutProps}>{children}</div>
		</section>
	)
}

function DefaultErrorMessageSlot({ rootProps, issue }: ErrorMessageSlotProps) {
	return (
		<p {...rootProps} role="alert">
			{issue.message}
		</p>
	)
}

function DefaultSubmitSlot({ buttonProps }: SubmitSlotProps) {
	return <button {...buttonProps} />
}

function resolveMessage<Data>(
	message: DefaultSlotI18nValue<Data>,
	data: Readonly<Data>,
): string {
	return typeof message === "function" ? message(data) : message
}
