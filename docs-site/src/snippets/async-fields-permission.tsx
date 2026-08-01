// biome-ignore-all lint/correctness/noUnusedVariables: Named regions are consumed independently by the documentation.
"use client"

import {
	createFormKit,
	matchResource,
	nativeControls,
	type ResourceState,
} from "form-please"
import { z } from "zod"

const schema = z.object({ name: z.string() })
const kit = createFormKit({ controls: nativeControls })
const definition = kit.defineForm(schema)({ ui: [] })
const form = kit.createForm(definition, { defaultValues: { name: "" } })
declare const permission: ResourceState<{ readonly canEdit: boolean }>

// [!region form]
function PermissionForm() {
	const disabled = matchResource(permission, {
		pending: () => true,
		success: ({ value }) => !value.canEdit,
		error: () => true,
	})

	return <kit.AutoForm form={form} disabled={disabled} />
}
// [!endregion form]
