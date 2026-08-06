"use client"

import { NuqsAdapter } from "nuqs/adapters/react"
import { useEffect, useState } from "react"

import { PersistencePreview } from "../snippets/persistence-basics"

export function PersistenceDemoClient() {
	const [isReady, setIsReady] = useState(false)
	useEffect(() => setIsReady(true), [])

	return (
		<NuqsAdapter>
			<div
				data-demo-client-ready={isReady}
				data-persistence-preview="query-string"
			>
				<PersistencePreview />
			</div>
		</NuqsAdapter>
	)
}
