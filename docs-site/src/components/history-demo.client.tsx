"use client"

import { useEffect, useState } from "react"

import { HistoryPreview } from "../snippets/history-guide"

export function HistoryDemoClient() {
	const [isReady, setIsReady] = useState(false)
	useEffect(() => setIsReady(true), [])

	return (
		<div data-demo-client-ready={isReady} data-history-preview="managed-values">
			<HistoryPreview />
		</div>
	)
}
