"use client"

import type { ReactNode } from "react"

import type { FormKitSlots } from "./create-form-kit.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	SectionSlotProps,
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
		...englishDefaultSlotsI18n,
		...options?.i18n,
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
				<button disabled={!canAdd} type="button" onClick={add}>
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

		return (
			<div {...rootProps}>
				{children}
				<button
					disabled={disabled || readOnly || !canMoveUp}
					type="button"
					onClick={() => move(index - 1)}
				>
					{resolveMessage(i18n.arrayMoveUp, actionData)}
				</button>
				<button
					disabled={disabled || readOnly || !canMoveDown}
					type="button"
					onClick={() => move(index + 1)}
				>
					{resolveMessage(i18n.arrayMoveDown, actionData)}
				</button>
				<button disabled={disabled || readOnly} type="button" onClick={remove}>
					{resolveMessage(i18n.arrayRemove, actionData)}
				</button>
			</div>
		)
	}

	return Object.freeze({
		Field: DefaultFieldSlot,
		Section: DefaultSectionSlot,
		Array: DefaultArraySlot,
		ArrayItem: DefaultArrayItemSlot,
		ErrorMessage: DefaultErrorMessageSlot,
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
	return <p {...rootProps}>{issue.message}</p>
}

function resolveMessage<Data>(
	message: DefaultSlotI18nValue<Data>,
	data: Readonly<Data>,
): string {
	return typeof message === "function" ? message(data) : message
}
