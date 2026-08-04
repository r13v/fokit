"use client"

import {
	AtomicValuesRecipe,
	DraftSubscriptionRecipe,
	SavedBaselineRecipe,
	StepValidationRecipe,
} from "../snippets/production-recipes"

export function SavedBaselineRecipePreviewClient() {
	return <SavedBaselineRecipe />
}

export function AtomicValuesRecipePreviewClient() {
	return <AtomicValuesRecipe />
}

export function DraftSubscriptionRecipePreviewClient() {
	return <DraftSubscriptionRecipe />
}

export function StepValidationRecipePreviewClient() {
	return <StepValidationRecipe />
}
