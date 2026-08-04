import type { ReactElement } from "react"

import { markdownFallback } from "./markdown-fallback"
import {
	AtomicValuesRecipePreviewClient,
	DraftSubscriptionRecipePreviewClient,
	SavedBaselineRecipePreviewClient,
	StepValidationRecipePreviewClient,
} from "./production-recipes-demo.client"

export const SavedBaselineRecipePreview = Object.assign(
	function SavedBaselineRecipePreview(): ReactElement {
		return <SavedBaselineRecipePreviewClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The saved-baseline preview runs only in a browser. It updates the clean baseline without replacing edits made during the save operation.",
				"docs-site/src/snippets/production-recipes.tsx",
			)
		},
	},
)

export const AtomicValuesRecipePreview = Object.assign(
	function AtomicValuesRecipePreview(): ReactElement {
		return <AtomicValuesRecipePreviewClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The atomic-values preview runs only in a browser. One action updates three profile fields with the same form-state options.",
				"docs-site/src/snippets/production-recipes.tsx",
			)
		},
	},
)

export const DraftSubscriptionRecipePreview = Object.assign(
	function DraftSubscriptionRecipePreview(): ReactElement {
		return <DraftSubscriptionRecipePreviewClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The draft-subscription preview runs only in a browser. It saves a value snapshot 400 ms after the last form change.",
				"docs-site/src/snippets/production-recipes.tsx",
			)
		},
	},
)

export const StepValidationRecipePreview = Object.assign(
	function StepValidationRecipePreview(): ReactElement {
		return <StepValidationRecipePreviewClient />
	},
	{
		toMarkdown() {
			return markdownFallback(
				"The step-validation preview runs only in a browser. It validates the visible step, focuses its first invalid field, and preserves values between steps.",
				"docs-site/src/snippets/production-recipes.tsx",
			)
		},
	},
)
