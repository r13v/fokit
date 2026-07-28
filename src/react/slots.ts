"use client"

import type {
	CSSProperties,
	HTMLAttributes,
	LabelHTMLAttributes,
	ReactNode,
} from "react"

import type { FormIssue, GridColumns } from "../core/index.js"

export type StructuralNodeName =
	| "array"
	| "array-item"
	| "error-message"
	| "field"
	| "section"

export type FokitNodeName = "form" | StructuralNodeName

export type FokitCssVariable =
	| "--fokit-array-item-gap"
	| "--fokit-column-gap"
	| "--fokit-row-gap"
	| "--fokit-stack-gap"

export type FokitStyle = CSSProperties &
	Partial<Record<FokitCssVariable, string>>

export type StructuralRootProps = Omit<HTMLAttributes<HTMLElement>, "style"> & {
	readonly "data-fokit-node": StructuralNodeName
	ref?(element: HTMLElement | null): void
	readonly style?: FokitStyle
}

export type SectionSlotProps = {
	readonly rootProps: StructuralRootProps
	readonly layoutProps: HTMLAttributes<HTMLElement> & {
		readonly "data-fokit-layout": "grid"
		readonly "data-fokit-columns": GridColumns
	}
	readonly title?: ReactNode
	readonly description?: ReactNode
	readonly children: ReactNode
}

export type FieldSlotProps = {
	readonly rootProps: StructuralRootProps
	readonly label?: ReactNode
	readonly labelProps: LabelHTMLAttributes<HTMLLabelElement>
	readonly description?: ReactNode
	readonly descriptionProps: HTMLAttributes<HTMLElement>
	readonly control: ReactNode
	readonly errors: readonly ReactNode[]
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly required: boolean
}

export type ArraySlotProps = {
	readonly rootProps: StructuralRootProps
	readonly label?: ReactNode
	readonly labelProps: HTMLAttributes<HTMLElement>
	readonly description?: ReactNode
	readonly descriptionProps: HTMLAttributes<HTMLElement>
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
