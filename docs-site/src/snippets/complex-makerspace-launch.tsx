"use client"

import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
} from "@tanstack/react-query"
import {
	createFormKit,
	type FormBinding,
	type FormInput,
	type FormOutput,
} from "form-please"
import { createDefaultSlots } from "form-please/default-slots"
import { createNativeControls } from "form-please/native-controls"
import { useState } from "react"
import { z } from "zod"

const launchSchema = z
	.object({
		stage: z.enum(["identity", "location", "capacity", "publishing"]),
		identity: z.object({
			name: z.string().min(4, "Use a distinctive public name"),
			campusId: z.string().min(1, "Choose a campus"),
			description: z.string().min(60, "Write at least 60 characters"),
		}),
		location: z.object({
			regionId: z.string().min(1, "Choose a region"),
			postalCode: z.string().min(3, "Enter a postal code"),
			address: z.string().min(6, "Enter a complete address"),
			latitude: z.number().min(-90).max(90),
			longitude: z.number().min(-180).max(180),
		}),
		media: z.object({
			cover: z
				.custom<File | undefined>(
					(value) =>
						value === undefined ||
						(typeof File !== "undefined" && value instanceof File),
					"Choose an image file",
				)
				.optional(),
			gallery: z.array(
				z.object({
					assetUrl: z.string().url("Enter a valid media URL"),
					caption: z.string().min(2, "Add a caption"),
				}),
			),
		}),
		capacityBands: z
			.array(
				z.object({
					label: z.string().min(2, "Name the capacity band"),
					people: z.number().int().min(1).max(500),
					hourlyRate: z.number().min(0),
				}),
			)
			.min(1, "Add at least one capacity band"),
		amenities: z.object({
			stepFree: z.boolean(),
			ventilation: z.boolean(),
			toolLibrary: z.boolean(),
			quietZone: z.boolean(),
		}),
		accessInstructions: z
			.string()
			.min(20, "Explain how members enter the space"),
		promotions: z.object({
			launch: z.object({
				enabled: z.boolean(),
				percent: z.number().min(1).max(90).optional(),
			}),
			student: z.object({
				enabled: z.boolean(),
				percent: z.number().min(1).max(90).optional(),
			}),
			community: z.object({
				enabled: z.boolean(),
				percent: z.number().min(1).max(90).optional(),
			}),
			offPeak: z.object({
				enabled: z.boolean(),
				percent: z.number().min(1).max(90).optional(),
			}),
		}),
	})
	.superRefine((value, context) => {
		for (const [name, promotion] of Object.entries(value.promotions)) {
			if (promotion.enabled && promotion.percent === undefined) {
				context.addIssue({
					code: "custom",
					path: ["promotions", name, "percent"],
					message: "Set the active reduction",
				})
			}
		}

		const sorted = [...value.capacityBands].sort(
			(left, right) => left.people - right.people,
		)
		for (let index = 1; index < sorted.length; index += 1) {
			const previous = sorted[index - 1]
			const current = sorted[index]
			if (
				previous !== undefined &&
				current !== undefined &&
				current.hourlyRate < previous.hourlyRate
			) {
				context.addIssue({
					code: "custom",
					path: ["capacityBands"],
					message: "Larger capacity bands cannot cost less than smaller bands",
				})
				break
			}
		}
	})
	.transform((value) => ({
		...value,
		activePromotionCount: Object.values(value.promotions).filter(
			(promotion) => promotion.enabled,
		).length,
	}))

type LaunchInput = FormInput<typeof launchSchema>
type LaunchOutput = FormOutput<typeof launchSchema>

type LaunchContext = {
	readonly campuses: readonly {
		readonly value: string
		readonly label: string
	}[]
	readonly regions: readonly {
		readonly value: string
		readonly label: string
	}[]
}

const defaultValues = {
	stage: "identity",
	identity: {
		name: "Copperline Commons",
		campusId: "river-yard",
		description:
			"A shared fabrication floor for neighborhood prototypes, repair circles, material experiments, and open skill exchanges.",
	},
	location: {
		regionId: "north-bank",
		postalCode: "N4 7PX",
		address: "48 Foundry Lane",
		latitude: 51.542,
		longitude: -0.102,
	},
	media: {
		cover: undefined,
		gallery: [
			{
				assetUrl: "https://example.test/media/workbench.jpg",
				caption: "Shared assembly workbench",
			},
		],
	},
	capacityBands: [
		{ label: "Bench session", people: 8, hourlyRate: 45 },
		{ label: "Open floor", people: 24, hourlyRate: 110 },
	],
	amenities: {
		stepFree: true,
		ventilation: true,
		toolLibrary: true,
		quietZone: false,
	},
	accessInstructions:
		"Use the east courtyard entrance and check in at the tool desk before entering the floor.",
	promotions: {
		launch: { enabled: true, percent: 20 },
		student: { enabled: false, percent: undefined },
		community: { enabled: true, percent: 15 },
		offPeak: { enabled: false, percent: undefined },
	},
} satisfies LaunchInput

const kit = createFormKit({
	controls: createNativeControls(),
	slots: createDefaultSlots(),
})
const contextualKit = kit.forContext<LaunchContext>()
const stages = ["identity", "location", "capacity", "publishing"] as const
const stageLabels = {
	identity: "Identity",
	location: "Location",
	capacity: "Capacity & media",
	publishing: "Publishing",
} satisfies Record<(typeof stages)[number], string>
const stageNames = {
	identity: "Identity",
	location: "Location",
	capacity: "Capacity & media",
	publishing: "Publishing",
} satisfies Record<(typeof stages)[number], string>
type LaunchForm = FormBinding<typeof launchSchema, LaunchContext>

function WizardNavigation({ form }: { readonly form: LaunchForm }) {
	return (
		<form.api.Subscribe selector={(state) => state.values.stage}>
			{(stage) => {
				const index = stages.indexOf(stage)
				const nextStage = stages[index + 1] ?? stage
				let primaryAction = (
					<kit.Submit className="form-please-complex__primary">
						Publish makerspace
					</kit.Submit>
				)
				if (index < stages.length - 1) {
					primaryAction = (
						<button
							className="form-please-complex__primary"
							onClick={() => form.api.setFieldValue("stage", nextStage)}
							type="button"
						>
							Continue to {stageNames[nextStage]}
						</button>
					)
				}
				return (
					<nav
						aria-label="Launch stages"
						className="form-please-complex__wizard"
					>
						<ol>
							{stages.map((item) => {
								let ariaCurrent: "step" | undefined
								let color: string | undefined

								if (item === stage) {
									ariaCurrent = "step"
									color = "var(--fp-docs-rust)"
								}

								return (
									<li aria-current={ariaCurrent} key={item}>
										<button
											style={{ color }}
											onClick={() => form.api.setFieldValue("stage", item)}
											type="button"
										>
											{stageLabels[item]}
										</button>
									</li>
								)
							})}
						</ol>
						<div className="form-please-complex__actions">
							<button
								disabled={index === 0}
								onClick={() =>
									form.api.setFieldValue("stage", stages[index - 1] ?? stage)
								}
								type="button"
							>
								Back
							</button>
							{primaryAction}
						</div>
					</nav>
				)
			}}
		</form.api.Subscribe>
	)
}

function AddressLookup({
	form,
	postalCode,
}: {
	readonly form: LaunchForm
	readonly postalCode: string
}) {
	const lookup = useQuery({
		queryKey: ["address-lookup", postalCode],
		queryFn: () => {
			let address = "12 Workshop Crescent"
			if (postalCode.toUpperCase().startsWith("N")) {
				address = "48 Foundry Lane"
			}
			return fakeRequest(
				{
					address,
					latitude: 51.542,
					longitude: -0.102,
				},
				320,
			)
		},
		enabled: postalCode.trim().length >= 3,
	})
	let status = "Address suggestion ready"
	if (lookup.isFetching) status = "Resolving postal code…"

	return (
		<div className="form-please-complex__embedded">
			<span>{status}</span>
			<button
				disabled={lookup.data === undefined}
				onClick={() => {
					if (lookup.data === undefined) return
					form.api.setFieldValue("location.address", lookup.data.address)
					form.api.setFieldValue("location.latitude", lookup.data.latitude)
					form.api.setFieldValue("location.longitude", lookup.data.longitude)
				}}
				type="button"
			>
				Apply resolved address
			</button>
		</div>
	)
}

const launchDefinition = contextualKit.defineForm(launchSchema, {
	ui: [
		{
			kind: "section",
			id: "identity",
			title: "Makerspace identity",
			visible: ({ stage }) => stage === "identity",
			columns: 2,
			children: [
				{
					kind: "field",
					path: "identity.name",
					control: "text",
					label: "Public name",
					required: true,
				},
				{
					kind: "field",
					path: "identity.campusId",
					control: "select",
					label: "Campus",
					options: (_values, { context }) => ({ options: context.campuses }),
				},
				{
					kind: "field",
					path: "identity.description",
					control: "textarea",
					label: "Public description",
					description: "Explain the work this place makes possible.",
					span: "full",
					options: { rows: 5 },
				},
			],
		},
		{
			kind: "section",
			id: "location",
			title: "Location",
			visible: ({ stage }) => stage === "location",
			columns: 2,
			children: [
				{
					kind: "field",
					path: "location.regionId",
					control: "select",
					label: "Region",
					options: (_values, { context }) => ({ options: context.regions }),
				},
				{
					kind: "field",
					path: "location.postalCode",
					control: "text",
					label: "Postal code",
				},
				{
					kind: "field",
					path: "location.address",
					control: "text",
					label: "Street address",
					span: "full",
				},
				{
					kind: "field",
					path: "location.latitude",
					control: "number",
					label: "Latitude",
					options: { min: -90, max: 90, step: 0.001 },
				},
				{
					kind: "field",
					path: "location.longitude",
					control: "number",
					label: "Longitude",
					options: { min: -180, max: 180, step: 0.001 },
				},
			],
		},
		{
			kind: "section",
			id: "capacity",
			title: "Capacity, media, and amenities",
			visible: ({ stage }) => stage === "capacity",
			children: [
				{
					kind: "array",
					path: "capacityBands",
					label: "Capacity bands",
					itemDefault: { label: "", people: 1, hourlyRate: 0 },
					children: [
						{
							kind: "field",
							path: "label",
							control: "text",
							label: "Band name",
						},
						{
							kind: "field",
							path: "people",
							control: "number",
							label: "People",
							options: { min: 1, max: 500, step: 1 },
						},
						{
							kind: "field",
							path: "hourlyRate",
							control: "number",
							label: "Hourly rate",
							options: { min: 0, step: 5 },
						},
					],
				},
				{
					kind: "field",
					path: "media.cover",
					control: "file",
					label: "Cover image",
					options: { accept: "image/*" },
				},
				{
					kind: "array",
					path: "media.gallery",
					label: "Gallery",
					description: "Reorder references without losing row state.",
					itemDefault: { assetUrl: "", caption: "" },
					children: [
						{
							kind: "field",
							path: "assetUrl",
							control: "text",
							label: "Media URL",
						},
						{
							kind: "field",
							path: "caption",
							control: "text",
							label: "Caption",
						},
					],
				},
				{
					kind: "section",
					id: "amenities",
					title: "Amenities",
					columns: 2,
					children: [
						{
							kind: "field",
							path: "amenities.stepFree",
							control: "checkbox",
							label: "Step-free",
						},
						{
							kind: "field",
							path: "amenities.ventilation",
							control: "checkbox",
							label: "Extract ventilation",
						},
						{
							kind: "field",
							path: "amenities.toolLibrary",
							control: "checkbox",
							label: "Tool library",
						},
						{
							kind: "field",
							path: "amenities.quietZone",
							control: "checkbox",
							label: "Quiet zone",
						},
					],
				},
			],
		},
		{
			kind: "section",
			id: "publishing",
			title: "Publishing rules",
			visible: ({ stage }) => stage === "publishing",
			children: [
				{
					kind: "field",
					path: "accessInstructions",
					control: "textarea",
					label: "Access instructions",
					options: { rows: 4 },
				},
				promotionSection("launch", "Launch offer"),
				promotionSection("student", "Student access"),
				promotionSection("community", "Community partner"),
				promotionSection("offPeak", "Off-peak hours"),
			],
		},
	],
})

function promotionSection(
	name: "launch" | "student" | "community" | "offPeak",
	title: string,
) {
	return {
		kind: "section" as const,
		id: `promotion-${name}`,
		title,
		columns: 2 as const,
		children: [
			{
				kind: "field" as const,
				path: `promotions.${name}.enabled` as const,
				control: "checkbox" as const,
				label: "Enabled",
			},
			{
				kind: "field" as const,
				path: `promotions.${name}.percent` as const,
				control: "number" as const,
				label: "Reduction percent",
				visible: ({
					[`promotions.${name}.enabled`]: enabled,
				}: Record<string, unknown>) => Boolean(enabled),
				options: { min: 1, max: 90, step: 1 },
			},
		],
	}
}

export function MakerspaceLaunchExample() {
	const [queryClient] = useState(
		() => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
	)
	return (
		<QueryClientProvider client={queryClient}>
			<MakerspaceLaunchForm />
		</QueryClientProvider>
	)
}

function MakerspaceLaunchForm() {
	const campuses = useQuery({
		queryKey: ["maker-campuses"],
		queryFn: () =>
			fakeRequest(
				[
					{ value: "river-yard", label: "River Yard" },
					{ value: "civic-annex", label: "Civic Annex" },
				],
				330,
			),
	})
	const regions = useQuery({
		queryKey: ["maker-regions"],
		queryFn: () =>
			fakeRequest(
				[
					{ value: "north-bank", label: "North Bank" },
					{ value: "old-market", label: "Old Market" },
				],
				470,
			),
	})
	const savePlace = useMutation({
		mutationFn: (value: LaunchOutput) =>
			fakeRequest({ id: value.identity.name.length + 900 }, 360),
	})
	const saveMedia = useMutation({
		mutationFn: (value: LaunchOutput) =>
			fakeRequest({ count: value.media.gallery.length }, 340),
	})
	const publish = useMutation({
		mutationFn: (value: LaunchOutput) =>
			fakeRequest({ offers: value.activePromotionCount }, 420),
	})
	const [notice, setNotice] = useState("Complete the four stages to publish.")
	const form = contextualKit.useForm(launchDefinition, {
		defaultValues,
		context: {
			campuses: campuses.data ?? [],
			regions: regions.data ?? [],
		},
		async onSubmit({ value }) {
			try {
				const place = await savePlace.mutateAsync(value)
				const media = await saveMedia.mutateAsync(value)
				const release = await publish.mutateAsync(value)
				setNotice(
					`Space ${place.id} published with ${media.count} gallery item(s) and ${release.offers} offer(s).`,
				)
			} catch {
				setNotice("Publishing paused. The wizard kept every value.")
			}
		},
	})

	if (campuses.isPending || regions.isPending) {
		return (
			<section className="form-please-complex">
				Loading launch references…
			</section>
		)
	}
	if (campuses.isError || regions.isError) {
		return (
			<section className="form-please-complex">
				Could not open the launch wizard.
			</section>
		)
	}
	let status = notice
	if (savePlace.isPending || saveMedia.isPending || publish.isPending) {
		status = "Saving location, media, and release…"
	}

	return (
		<section
			aria-label="Makerspace launch wizard example"
			className="form-please-complex"
		>
			<p className="form-please-complex__kicker">Four-stage launch wizard</p>
			<p className="form-please-complex__summary">
				A form-owned stage controls conditional sections while address lookup,
				media rows, pricing bands, four offers, and three writes retain one
				state.
			</p>
			<kit.Form className="form-please-complex__form" form={form}>
				<form.api.Subscribe selector={(state) => state.values}>
					{(values) => {
						let locationDetails = null
						if (values.stage === "location") {
							locationDetails = (
								<>
									<AddressLookup
										form={form}
										postalCode={values.location.postalCode}
									/>
									<aside
										aria-label="Coordinate preview"
										className="form-please-complex__preview"
									>
										<strong>{values.location.address}</strong>
										<span>
											{values.location.latitude.toFixed(3)},{" "}
											{values.location.longitude.toFixed(3)} ·{" "}
											{values.location.postalCode}
										</span>
									</aside>
								</>
							)
						}
						return (
							<>
								<WizardNavigation form={form} />
								{locationDetails}
							</>
						)
					}}
				</form.api.Subscribe>

				<kit.Fields />
			</kit.Form>

			<output className="form-please-complex__network" aria-live="polite">
				{status}
			</output>
		</section>
	)
}

function fakeRequest<Value>(value: Value, delay: number): Promise<Value> {
	return new Promise((resolve) =>
		window.setTimeout(() => resolve(value), delay),
	)
}
