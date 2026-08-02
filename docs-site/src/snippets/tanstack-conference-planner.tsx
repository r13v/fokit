"use client"

import { createDefaultSlots } from "form-please/default-slots"
import { createNativeControls } from "form-please/native-controls"
import {
	createFormKit,
	type FormInput,
	type FormOutput,
} from "form-please/tanstack"
import { useState } from "react"
import { z } from "zod"

const conferenceSchema = z
	.object({
		title: z.string().min(5, "Enter a specific session title"),
		format: z.enum(["in-person", "hybrid", "remote"]),
		room: z.string().optional(),
		streamUrl: z.string().optional(),
		expectedAttendees: z.number().int().min(1).max(2_000),
		speakers: z
			.array(
				z.object({
					name: z.string().min(2, "Enter the speaker name"),
					email: z.string().email("Enter a valid email address"),
					role: z.enum(["host", "speaker", "moderator"]),
				}),
			)
			.min(1, "Add at least one speaker"),
		reviewerNote: z.string(),
	})
	.superRefine((value, context) => {
		if (value.format !== "remote" && !value.room?.trim()) {
			context.addIssue({
				code: "custom",
				path: ["room"],
				message: "Enter a room for an on-site session",
			})
		}
		if (value.format !== "in-person") {
			const parsedUrl = z.url().safeParse(value.streamUrl)
			if (!parsedUrl.success) {
				context.addIssue({
					code: "custom",
					path: ["streamUrl"],
					message: "Enter a valid stream URL",
				})
			}
		}
	})
	.transform((value) => ({
		...value,
		slug: value.title
			.trim()
			.toLowerCase()
			.replaceAll(/[^a-z0-9]+/g, "-")
			.replaceAll(/^-|-$/g, ""),
		speakerCount: value.speakers.length,
	}))

type ConferenceInput = FormInput<typeof conferenceSchema>
type ConferenceOutput = FormOutput<typeof conferenceSchema>

const kit = createFormKit({
	controls: createNativeControls(),
	slots: createDefaultSlots(),
})

const definition = kit.defineForm(conferenceSchema, {
	ui: [
		{
			kind: "section",
			id: "session",
			title: "Session plan",
			description: "Set the public details and delivery format.",
			columns: 2,
			children: [
				{
					kind: "field",
					path: "title",
					control: "text",
					label: "Session title",
					span: "full",
					required: true,
				},
				{
					kind: "field",
					path: "format",
					control: "select",
					label: "Format",
					options: {
						options: [
							{ value: "in-person", label: "In person" },
							{ value: "hybrid", label: "Hybrid" },
							{ value: "remote", label: "Remote" },
						],
					},
				},
				{
					kind: "field",
					path: "expectedAttendees",
					control: "number",
					label: "Expected attendees",
					options: { min: 1, max: 2_000, step: 1 },
				},
				{
					kind: "field",
					path: "room",
					control: "text",
					label: "Room",
					visible: (values) => values.format !== "remote",
				},
				{
					kind: "field",
					path: "streamUrl",
					control: "text",
					label: "Stream URL",
					visible: (values) => values.format !== "in-person",
					options: { type: "url", placeholder: "https://stream.example.test" },
				},
			],
		},
		{
			kind: "array",
			path: "speakers",
			label: "Speakers",
			description: "Add, remove, or reorder the people on the session.",
			itemDefault: { name: "", email: "", role: "speaker" },
			children: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: "Speaker name",
					required: true,
				},
				{
					kind: "field",
					path: "email",
					control: "text",
					label: "Speaker email",
					options: { type: "email" },
					required: true,
				},
				{
					kind: "field",
					path: "role",
					control: "select",
					label: "Role",
					options: {
						options: [
							{ value: "host", label: "Host" },
							{ value: "speaker", label: "Speaker" },
							{ value: "moderator", label: "Moderator" },
						],
					},
				},
			],
		},
	],
})

const draft = {
	title: "Design systems that survive product growth",
	format: "hybrid",
	room: "Forum 3",
	streamUrl: "https://stream.example.test/design-systems",
	expectedAttendees: 180,
	speakers: [
		{ name: "Ada Morgan", email: "ada@example.test", role: "host" },
		{ name: "Grace Park", email: "grace@example.test", role: "speaker" },
	],
	reviewerNote: "Confirm the recording release before publication.",
} satisfies ConferenceInput

export function TanStackConferencePlannerExample() {
	const [result, setResult] = useState<ConferenceOutput>()
	const form = kit.useForm(definition, {
		defaultValues: draft,
		onSubmit: async ({ value }) => {
			await new Promise((resolve) => window.setTimeout(resolve, 350))
			setResult(value)
		},
	})

	return (
		<section
			aria-label="TanStack conference planner example"
			className="form-please-complex"
		>
			<p className="form-please-complex__kicker">TanStack Form runtime</p>
			<p className="form-please-complex__summary">
				The definition controls the generated fields. TanStack Form owns the
				live state, validation cycle, and array operations.
			</p>

			<kit.AutoForm className="form-please-complex__form" form={form}>
				<kit.tf.Field name="reviewerNote">
					{(field) => (
						<label className="form-please-complex__embedded">
							Reviewer note from kit.tf.Field
							<textarea
								onBlur={field.handleBlur}
								onChange={(event) =>
									field.handleChange(event.currentTarget.value)
								}
								rows={3}
								value={String(field.state.value ?? "")}
							/>
						</label>
					)}
				</kit.tf.Field>

				<kit.tf.Subscribe
					selector={(state) => ({
						attempts: state.submissionAttempts,
						dirty: state.isDirty,
						format: state.values.format,
						speakers: state.values.speakers.length,
					})}
				>
					{(state) => (
						<aside
							aria-label="TanStack form state"
							className="form-please-complex__preview"
						>
							<strong>Live TanStack state</strong>
							<span>
								{state.format} · {state.speakers} speakers · attempts{" "}
								{state.attempts}· <DirtyStatus dirty={state.dirty} />
							</span>
						</aside>
					)}
				</kit.tf.Subscribe>

				<div className="form-please-complex__actions">
					<kit.Submit className="form-please-complex__primary">
						Publish session
					</kit.Submit>
					<SubmissionResult result={result} />
				</div>
			</kit.AutoForm>
		</section>
	)
}

function DirtyStatus({ dirty }: { readonly dirty: boolean }) {
	if (dirty) {
		return <>edited</>
	}

	return <>unchanged</>
}

function SubmissionResult({
	result,
}: {
	readonly result: ConferenceOutput | undefined
}) {
	if (result === undefined) {
		return <span>No parsed output yet.</span>
	}

	return (
		<span role="status">
			Published {result.slug} with {result.speakerCount} speakers.
		</span>
	)
}
