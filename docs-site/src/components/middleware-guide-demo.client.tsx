"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"

import {
	CancellationMiddlewarePreview,
	ComplexMiddlewareEditingPreview,
	DerivedTotalMiddlewarePreview,
} from "../snippets/middleware-guide"

export function DerivedTotalMiddlewarePreviewClient() {
	return (
		<MiddlewarePreviewClientReady name="derived-total">
			<DerivedTotalMiddlewarePreview />
		</MiddlewarePreviewClientReady>
	)
}

export function CancellationMiddlewarePreviewClient() {
	return (
		<MiddlewarePreviewClientReady name="cancellation">
			<CancellationMiddlewarePreview />
		</MiddlewarePreviewClientReady>
	)
}

export function ComplexMiddlewareEditingPreviewClient() {
	return (
		<MiddlewarePreviewClientReady name="complex-editing">
			<ComplexMiddlewareEditingPreview />
		</MiddlewarePreviewClientReady>
	)
}

function MiddlewarePreviewClientReady({
	children,
	name,
}: {
	readonly children: ReactNode
	readonly name: string
}) {
	const [isReady, setIsReady] = useState(false)
	useEffect(() => setIsReady(true), [])

	return (
		<div data-demo-client-ready={isReady} data-middleware-preview={name}>
			{children}
		</div>
	)
}
