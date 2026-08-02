// biome-ignore-all lint/correctness/noUnusedImports: Named regions are consumed independently by the documentation.
// biome-ignore-all lint/correctness/noUnusedVariables: Named regions are consumed independently by the documentation.
"use client"

import {
	createFormKit as createSetupKit,
	nativeControls as setupControls,
} from "form-please"
import { z } from "zod"

const setupKit = createSetupKit({ controls: setupControls })
const setupSchema = z.object({ name: z.string() })
const definition = setupKit.defineForm(setupSchema, {
	ui: [{ kind: "field", path: "name", control: "text", label: "Name" }],
})
const defaultValues = { name: "" }

// [!region composition]
import {
	createFormKit,
	FormProvider,
	nativeControls,
	useFormContext,
	useFormState,
} from "form-please"

const kit = createFormKit({ controls: nativeControls })

function DirtyStatus() {
	const form = useFormContext()
	const dirty = useFormState(form, (snapshot) => snapshot.isDirty)
	if (dirty) return <output>Unsaved changes</output>
	return <output>Saved</output>
}

function Editor() {
	const form = kit.useCreateForm(definition, { defaultValues })

	return (
		<kit.Form form={form}>
			<kit.Fields />
			<DirtyStatus />
			<kit.Submit>Save</kit.Submit>
		</kit.Form>
	)
}
// [!endregion composition]

const profileSchema = z.object({ id: z.string(), name: z.string() })
type Profile = z.infer<typeof profileSchema>
const profileKit = createSetupKit({ controls: setupControls })
const profileDefinition = profileKit.defineForm(profileSchema, { ui: [] })

// [!region edit-baseline]
function ProfileScreen({ profile }: { profile: Profile | undefined }) {
	if (profile === undefined) return <p>Loading…</p>
	return <ProfileEditor key={profile.id} profile={profile} />
}

function ProfileEditor({ profile }: { profile: Profile }) {
	const form = profileKit.useCreateForm(profileDefinition, {
		defaultValues: profile,
	})
	return <profileKit.AutoForm form={form} />
}
// [!endregion edit-baseline]

type Input = { name: string }
type Context = { actorId: string }
function record(_value: unknown) {}

// [!region middleware]
import type { FormMiddleware } from "form-please"

const audit: FormMiddleware<Input, Context> =
	(api) => (next) => (transaction) => {
		const before = api.getSnapshot()
		const result = next(transaction)
		const after = api.getSnapshot()
		record({ transaction, result, before, after })
		return result
	}
// [!endregion middleware]

const serverSchema = z.object({ name: z.string() })
const formData = new FormData()

// [!region form-data]
import { parseFormData } from "form-please/server"

const result = await parseFormData(formData, serverSchema)
// [!endregion form-data]
