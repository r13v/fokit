import { type FormResult, parseFormData } from "form-please/server"
import { z } from "zod"

const profileActionSchema = z
	.object({
		name: z.string().trim().min(1, "Name is required"),
		accountType: z.enum(["personal", "company"]),
		companyName: z.string().optional(),
		newsletter: z.preprocess(
			(value) => value === "on" || value === "true",
			z.boolean(),
		),
		contacts: z
			.array(
				z.object({
					email: z.string().email("Enter a valid email"),
					label: z.string().optional(),
				}),
			)
			.default([]),
	})
	.transform((value) => ({
		...value,
		contactCount: value.contacts.length,
	}))

type SavedProfile = z.output<typeof profileActionSchema>

export async function saveProfileAction(
	_previousResult: FormResult | undefined,
	formData: FormData,
): Promise<FormResult> {
	const result = await parseFormData(formData, profileActionSchema)

	if (!result.success) {
		return result.reply()
	}

	if (result.value.name.toLowerCase() === "root") {
		return {
			status: "error",
			issues: [
				{
					source: "server",
					path: "name",
					code: "reserved",
					message: "Choose another name",
				},
			],
		}
	}

	await saveProfile(result.value)
	return { status: "success", reset: "submitted" }
}

async function saveProfile(profile: SavedProfile): Promise<void> {
	void profile.contactCount
}
