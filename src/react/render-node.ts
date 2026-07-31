"use client"

import type { ComponentType } from "react"

export type RenderNodeProps = {
	readonly disabled: boolean
	readonly readOnly: boolean
}

export type RenderNodeComponent = ComponentType<RenderNodeProps>
