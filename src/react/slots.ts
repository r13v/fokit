"use client"

import type {
	ComponentPropsWithoutRef,
	CSSProperties,
	HTMLAttributes,
	LabelHTMLAttributes,
	ReactElement,
	ReactNode,
} from "react"

import type { FormIssue, GridColumns, UiPresentation } from "../core/index.js"

export type StructuralNodeName =
	| "array"
	| "array-item"
	| "error-message"
	| "field"
	| "section"

export type FormPleaseNodeName = "form" | StructuralNodeName

export type FormPleaseCssVariable =
	| "--fp-array-item-gap"
	| "--fp-column-gap"
	| "--fp-row-gap"
	| "--fp-stack-gap"

export type FormPleaseStyle = CSSProperties &
	Partial<Record<FormPleaseCssVariable, string>>

export type ReactUiContent = string | ReactElement
declare const reactUiPresentationSlotKeys: unique symbol
type SlotOptionKeys<Options> = [Options] extends [never]
	? never
	: unknown extends Options
		? PropertyKey
		: [keyof Options] extends [never]
			? PropertyKey
			: keyof Options

export type ReactUiPresentation<
	FieldSlotOptions = never,
	SectionSlotOptions = never,
	ArraySlotOptions = never,
> = UiPresentation<
	ReactUiContent,
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions
> & {
	readonly [reactUiPresentationSlotKeys]?: readonly [
		SlotOptionKeys<FieldSlotOptions>,
		SlotOptionKeys<SectionSlotOptions>,
		SlotOptionKeys<ArraySlotOptions>,
	]
}

export type StructuralRootProps = Omit<HTMLAttributes<HTMLElement>, "style"> & {
	readonly "data-fp-node": StructuralNodeName
	ref?(element: HTMLElement | null): void
	readonly style?: FormPleaseStyle
}

export type SectionSlotProps<SlotOptions = never> = {
	readonly rootProps: StructuralRootProps
	readonly layoutProps: HTMLAttributes<HTMLElement> & {
		readonly "data-fp-layout": "grid"
		readonly "data-fp-columns": GridColumns
	}
	readonly title?: ReactNode
	readonly description?: ReactNode
	readonly slotOptions?: Readonly<SlotOptions>
	readonly children: ReactNode
}

export type FieldSlotProps<SlotOptions = never> = {
	readonly rootProps: StructuralRootProps
	readonly label?: ReactNode
	readonly labelProps: LabelHTMLAttributes<HTMLLabelElement>
	readonly description?: ReactNode
	readonly descriptionProps: HTMLAttributes<HTMLElement>
	readonly slotOptions?: Readonly<SlotOptions>
	readonly control: ReactNode
	readonly errors: readonly ReactNode[]
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly required: boolean
}

export type ArraySlotProps<SlotOptions = never> = {
	readonly rootProps: StructuralRootProps
	readonly label?: ReactNode
	readonly labelProps: HTMLAttributes<HTMLElement>
	readonly description?: ReactNode
	readonly descriptionProps: HTMLAttributes<HTMLElement>
	readonly slotOptions?: Readonly<SlotOptions>
	readonly errors: readonly ReactNode[]
	readonly invalid: boolean
	readonly canAdd: boolean
	add(): void
	readonly children: ReactNode
}

export type ArrayItemSlotProps = {
	readonly rootProps: StructuralRootProps
	readonly index: number
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly canMoveUp: boolean
	readonly canMoveDown: boolean
	remove(): void
	move(toIndex: number): void
	readonly children: ReactNode
}

export type ErrorMessageSlotProps = {
	readonly rootProps: StructuralRootProps
	readonly issue: FormIssue
}

type SubmitButtonProps = Omit<
	ComponentPropsWithoutRef<"button">,
	"disabled" | "type"
> & {
	readonly disabled: boolean
	readonly type: "submit"
}

export type SubmitSlotProps = {
	readonly buttonProps: SubmitButtonProps
	readonly values: Readonly<Record<string, unknown>>
	readonly isSubmitting: boolean
}
