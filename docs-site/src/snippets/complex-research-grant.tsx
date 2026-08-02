"use client"

import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
} from "@tanstack/react-query"
import {
	type BeforeUpdateEvent,
	createFormKit,
	extendValueChanges,
	type FormInput,
	type FormOutput,
	useFormContext,
	useFormState,
	type ValueChange,
} from "form-please"
import { createDefaultSlots } from "form-please/default-slots"
import { createNativeControls } from "form-please/native-controls"
import { useState } from "react"
import { z } from "zod"

const grantSchema = z
	.object({
		applicantKind: z.enum(["person", "collective"]),
		contact: z.object({
			name: z.string().min(2, "Enter the lead applicant's name"),
			email: z.string().email("Enter a valid email"),
		}),
		jurisdiction: z.enum(["local", "international"]),
		organization: z.object({
			path: z.enum(["registered", "forming"]).optional(),
			registryId: z.string().optional(),
			name: z.string().optional(),
			registrationCountry: z.string().optional(),
		}),
		project: z.object({
			stream: z.enum(["research", "public-program", "education"]),
			title: z.string().min(5, "Use a descriptive project title"),
			abstract: z.string().min(80, "Write at least 80 characters"),
			requestedFunds: z.number().min(1_000).max(250_000),
			durationMonths: z.number().int().min(1).max(36),
		}),
		payout: z.object({
			method: z.enum(["bank", "digital-wallet"]),
			bankAccount: z.string().optional(),
			walletHandle: z.string().optional(),
		}),
		reporting: z.object({
			status: z.enum(["registered", "exempt", "pending"]),
			reference: z.string().optional(),
		}),
		confirmAccuracy: z.boolean(),
	})
	.superRefine((value, context) => {
		if (value.applicantKind === "collective") {
			if (value.organization.path === undefined) {
				context.addIssue({
					code: "custom",
					path: ["organization", "path"],
					message: "Choose how the collective is represented",
				})
			}
			if (
				value.organization.path === "registered" &&
				value.organization.registryId === undefined
			) {
				context.addIssue({
					code: "custom",
					path: ["organization", "registryId"],
					message: "Select a registry record",
				})
			}
			if (
				value.organization.path === "forming" &&
				(value.organization.name ?? "").trim().length < 2
			) {
				context.addIssue({
					code: "custom",
					path: ["organization", "name"],
					message: "Enter the collective's working name",
				})
			}
		}

		if (
			value.payout.method === "bank" &&
			(value.payout.bankAccount ?? "").trim().length < 8
		) {
			context.addIssue({
				code: "custom",
				path: ["payout", "bankAccount"],
				message: "Enter a valid settlement account",
			})
		}
		if (
			value.payout.method === "digital-wallet" &&
			(value.payout.walletHandle ?? "").trim().length < 3
		) {
			context.addIssue({
				code: "custom",
				path: ["payout", "walletHandle"],
				message: "Enter a wallet handle",
			})
		}
		if (
			value.reporting.status === "registered" &&
			(value.reporting.reference ?? "").trim().length < 4
		) {
			context.addIssue({
				code: "custom",
				path: ["reporting", "reference"],
				message: "Enter the reporting reference",
			})
		}
		if (!value.confirmAccuracy) {
			context.addIssue({
				code: "custom",
				path: ["confirmAccuracy"],
				message: "Confirm the application before sending it",
			})
		}
	})
	.transform((value) => ({
		...value,
		project: {
			...value.project,
			abstract: value.project.abstract.trim(),
		},
		reviewKey: `${value.project.stream}:${value.project.durationMonths}`,
	}))

type GrantInput = FormInput<typeof grantSchema>
type GrantOutput = FormOutput<typeof grantSchema>

type RegistryRecord = {
	readonly id: string
	readonly name: string
	readonly country: string
}

const registry: readonly RegistryRecord[] = [
	{ id: "arc-104", name: "Open Field Assembly", country: "CA" },
	{ id: "arc-208", name: "Night School Cooperative", country: "DE" },
	{ id: "arc-319", name: "Public Signal Workshop", country: "NZ" },
]

const defaultValues = {
	applicantKind: "person",
	contact: { name: "Mina Park", email: "mina@example.test" },
	jurisdiction: "local",
	organization: {
		path: undefined,
		registryId: undefined,
		name: undefined,
		registrationCountry: undefined,
	},
	project: {
		stream: "research",
		title: "A public atlas of overlooked urban sounds",
		abstract:
			"We will record, annotate, and publish an accessible field archive with neighborhood listening sessions and an open teaching kit.",
		requestedFunds: 42_000,
		durationMonths: 9,
	},
	payout: {
		method: "bank",
		bankAccount: "SETTLE-482910",
		walletHandle: undefined,
	},
	reporting: { status: "pending", reference: undefined },
	confirmAccuracy: false,
} satisfies GrantInput

const kit = createFormKit({
	controls: createNativeControls(),
	slots: createDefaultSlots(),
})

function OrganizationFinder() {
	const form = useFormContext<typeof grantSchema>()
	const selectedId = useFormState(
		form,
		(snapshot) => snapshot.values.organization.registryId,
	)
	const [search, setSearch] = useState("")
	const records = useQuery({
		queryKey: ["grant-registry", search],
		queryFn: () =>
			fakeRequest(
				registry.filter((record) =>
					record.name.toLowerCase().includes(search.trim().toLowerCase()),
				),
			),
		staleTime: 30_000,
	})
	return (
		<section
			className="form-please-complex__embedded"
			aria-label="Registry search"
		>
			<label>
				Search the independent registry
				<input
					onChange={(event) => setSearch(event.currentTarget.value)}
					placeholder="Try Open or School"
					type="search"
					value={search}
				/>
			</label>
			<div className="form-please-complex__choice-list">
				{records.isPending && <span>Checking records…</span>}
				{records.data?.map((record) => (
					<button
						aria-pressed={selectedId === record.id}
						key={record.id}
						onClick={() => {
							form.setValue("organization.registryId", record.id)
							form.setValue("organization.name", record.name)
							form.setValue("organization.registrationCountry", record.country)
						}}
						type="button"
					>
						{record.name} · {record.country}
					</button>
				))}
			</div>
		</section>
	)
}

function GrantPreview() {
	const form = useFormContext<typeof grantSchema>()
	const summary = useFormState(form, (snapshot) => ({
		title: snapshot.values.project.title,
		funds: snapshot.values.project.requestedFunds,
		months: snapshot.values.project.durationMonths,
		applicantKind: snapshot.values.applicantKind,
	}))
	let applicantLabel = "Individual"
	if (summary.applicantKind === "collective") applicantLabel = "Collective"

	return (
		<aside
			className="form-please-complex__preview"
			aria-label="Application preview"
		>
			<strong>{summary.title || "Untitled application"}</strong>
			<span>
				{applicantLabel}
				{" · "}${summary.funds.toLocaleString()} · {summary.months} months
			</span>
		</aside>
	)
}

const grantDefinition = kit.defineForm(grantSchema, {
	ui: [
		{
			kind: "section",
			id: "applicant",
			title: "Applicant",
			description: "Choose the legal path before entering dependent details.",
			columns: 2,
			children: [
				{
					kind: "field",
					path: "applicantKind",
					control: "select",
					label: "Applying as",
					options: {
						options: [
							{ value: "person", label: "An individual" },
							{ value: "collective", label: "A collective" },
						],
					},
				},
				{
					kind: "field",
					path: "jurisdiction",
					control: "select",
					label: "Administrative scope",
					options: {
						options: [
							{ value: "local", label: "Domestic" },
							{ value: "international", label: "Cross-border" },
						],
					},
				},
				{
					kind: "field",
					path: "contact.name",
					control: "text",
					label: "Lead applicant",
					required: true,
				},
				{
					kind: "field",
					path: "contact.email",
					control: "text",
					label: "Contact email",
					options: { type: "email" },
					required: true,
				},
			],
		},
		{
			kind: "section",
			id: "collective",
			title: "Collective identity",
			visible: ({ applicantKind }) => applicantKind === "collective",
			columns: 2,
			children: [
				{
					kind: "field",
					path: "organization.path",
					control: "select",
					label: "Representation",
					options: {
						emptyOption: { label: "Choose a path", disabled: true },
						options: [
							{ value: "registered", label: "Registered collective" },
							{ value: "forming", label: "Collective in formation" },
						],
					},
				},
				{
					kind: "render",
					id: "organization-finder",
					component: OrganizationFinder,
					visible: ({ "organization.path": path }) => path === "registered",
				},
				{
					kind: "field",
					path: "organization.registryId",
					control: "text",
					label: "Registry record ID",
					visible: ({ "organization.path": path }) => path === "registered",
					readOnly: true,
					valuePolicy: "unset",
				},
				{
					kind: "field",
					path: "organization.name",
					control: "text",
					label: ({ "organization.path": path }) => {
						if (path === "registered") return "Registered name"
						return "Working name"
					},
					visible: ({ "organization.path": path }) => path !== undefined,
					readOnly: ({ "organization.path": path }) => path === "registered",
					valuePolicy: "unset",
				},
				{
					kind: "field",
					path: "organization.registrationCountry",
					control: "text",
					label: "Registration country",
					visible: ({ "organization.path": path }) => path !== undefined,
					readOnly: ({ "organization.path": path }) => path === "registered",
					valuePolicy: "unset",
				},
			],
		},
		{
			kind: "section",
			id: "project",
			title: "Proposed work",
			columns: 2,
			children: [
				{
					kind: "field",
					path: "project.stream",
					control: "select",
					label: "Funding stream",
					options: {
						options: [
							{ value: "research", label: "Independent research" },
							{ value: "public-program", label: "Public program" },
							{ value: "education", label: "Open education" },
						],
					},
				},
				{
					kind: "field",
					path: "project.title",
					control: "text",
					label: "Project title",
					required: true,
				},
				{
					kind: "field",
					path: "project.abstract",
					control: "textarea",
					label: "Abstract",
					description:
						"At least 80 characters; this becomes the public summary.",
					span: "full",
					required: true,
					options: { rows: 5 },
				},
				{
					kind: "field",
					path: "project.requestedFunds",
					control: "number",
					label: "Requested funds",
					options: { min: 1_000, max: 250_000, step: 500 },
				},
				{
					kind: "field",
					path: "project.durationMonths",
					control: "number",
					label: "Duration in months",
					options: { min: 1, max: 36, step: 1 },
				},
			],
		},
		{
			kind: "render",
			id: "grant-preview",
			component: GrantPreview,
		},
		{
			kind: "section",
			id: "settlement",
			title: "Settlement and reporting",
			columns: 2,
			children: [
				{
					kind: "field",
					path: "payout.method",
					control: "select",
					label: "Disbursement route",
					options: {
						options: [
							{ value: "bank", label: "Settlement account" },
							{ value: "digital-wallet", label: "Digital wallet" },
						],
					},
				},
				{
					kind: "field",
					path: "payout.bankAccount",
					control: "text",
					label: "Settlement account",
					visible: ({ "payout.method": method }) => method === "bank",
					valuePolicy: "unset",
				},
				{
					kind: "field",
					path: "payout.walletHandle",
					control: "text",
					label: "Wallet handle",
					visible: ({ "payout.method": method }) => method === "digital-wallet",
					valuePolicy: "unset",
				},
				{
					kind: "field",
					path: "reporting.status",
					control: "select",
					label: "Reporting status",
					options: {
						options: [
							{ value: "registered", label: "Registered" },
							{ value: "exempt", label: "Exempt" },
							{ value: "pending", label: "Pending" },
						],
					},
				},
				{
					kind: "field",
					path: "reporting.reference",
					control: "text",
					label: "Reporting reference",
					visible: ({ "reporting.status": status }) => status === "registered",
					valuePolicy: "unset",
				},
				{
					kind: "field",
					path: "confirmAccuracy",
					control: "checkbox",
					label: "I confirm that the application is accurate",
					span: "full",
				},
			],
		},
	],
})

export function ResearchGrantExample() {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: { queries: { retry: false } },
			}),
	)

	return (
		<QueryClientProvider client={queryClient}>
			<ResearchGrantForm />
		</QueryClientProvider>
	)
}

function ResearchGrantForm() {
	const [receipt, setReceipt] = useState("No application sent yet.")
	const form = kit.useCreateForm(grantDefinition, { defaultValues })
	const preview = useMutation({
		mutationFn: (value: GrantOutput) =>
			fakeRequest({ revision: value.reviewKey, accepted: true }, 420),
	})
	const send = useMutation({
		mutationFn: (value: GrantOutput) =>
			fakeRequest({ id: `grant-${value.project.durationMonths}-2048` }, 520),
	})
	let status = receipt
	if (send.isPending) status = "Sending application…"
	if (preview.isPending) status = "Building preview…"

	return (
		<section
			aria-label="Research grant application example"
			className="form-please-complex"
		>
			<p className="form-please-complex__kicker">Branching application</p>
			<p className="form-please-complex__summary">
				Applicant identity, registry lookup, settlement route, reporting rules,
				and a two-request submission all share one typed form state.
			</p>
			<kit.AutoForm
				beforeUpdate={preserveGrantInvariants}
				className="form-please-complex__form"
				form={form}
				onSubmit={async ({ value, form }) => {
					try {
						form.clearErrors()
						await preview.mutateAsync(value)
						const result = await send.mutateAsync(value)
						setReceipt(`Application ${result.id} passed preview and was sent.`)
					} catch {
						form.setErrors([
							{
								source: "server",
								message:
									"The review service is unavailable. Your values are intact.",
							},
						])
					}
				}}
				validation={{ mode: "blur", revalidateMode: "change" }}
			>
				<div className="form-please-complex__actions">
					<kit.Submit className="form-please-complex__primary">
						Preview and send
					</kit.Submit>
					<span aria-live="polite">{status}</span>
				</div>
			</kit.AutoForm>
		</section>
	)
}

function preserveGrantInvariants(
	event: BeforeUpdateEvent<GrantInput, unknown>,
): readonly ValueChange<GrantInput>[] | undefined {
	const additions: ValueChange<GrantInput>[] = []

	if (event.currentValues.applicantKind !== event.nextValues.applicantKind) {
		additions.push(
			{ type: "unset", path: "organization.path" },
			{ type: "unset", path: "organization.registryId" },
			{ type: "unset", path: "organization.name" },
			{ type: "unset", path: "organization.registrationCountry" },
		)
	}

	if (
		event.currentValues.organization.path !== event.nextValues.organization.path
	) {
		additions.push(
			{ type: "unset", path: "organization.registryId" },
			{ type: "unset", path: "organization.name" },
			{ type: "unset", path: "organization.registrationCountry" },
		)
	}

	if (event.currentValues.payout.method !== event.nextValues.payout.method) {
		if (event.nextValues.payout.method === "bank") {
			additions.push({ type: "unset", path: "payout.walletHandle" })
		} else {
			additions.push({ type: "unset", path: "payout.bankAccount" })
		}
	}

	return extendValueChanges(event, additions)
}

function fakeRequest<Value>(value: Value, delay = 280): Promise<Value> {
	return new Promise((resolve) =>
		window.setTimeout(() => resolve(value), delay),
	)
}
