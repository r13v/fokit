"use client"

import {
	type BeforeUpdateEvent,
	createFormKit,
	extendValueChanges,
	type FormInput,
	nativeControls,
	type UpdateEvent,
} from "fokit"
import { useState } from "react"
import { z } from "zod"

const scheduleSchema = z
	.object({
		title: z.string().min(1, "Enter a title"),
		startsOn: z.iso.date(),
		endsOn: z.iso.date(),
	})
	.refine((value) => value.endsOn >= value.startsOn, {
		path: ["endsOn"],
		message: "The end date cannot be before the start date",
	})

type ScheduleInput = FormInput<typeof scheduleSchema>

const kit = createFormKit({ controls: nativeControls })
const scheduleDefinition = kit.defineForm(scheduleSchema)({
	ui: [
		{
			kind: "field",
			path: "title",
			control: "text",
			label: "Title",
		},
		{
			kind: "field",
			path: "startsOn",
			control: "date",
			label: "Start date",
		},
		{
			kind: "field",
			path: "endsOn",
			control: "date",
			label: "End date",
		},
	],
})

// [!region invariant]
function preserveDateRange(event: BeforeUpdateEvent<ScheduleInput, unknown>) {
	// Alternative 1: Accept the complete proposal.
	// return undefined

	// Alternative 2: Cancel the complete transaction.
	// return false

	// Alternative 3: Replace the complete proposal.
	// The original changes are discarded.
	// return [
	// 	{
	// 		type: "set",
	// 		path: "startsOn",
	// 		value: event.nextValues.startsOn,
	// 	},
	// 	{
	// 		type: "set",
	// 		path: "endsOn",
	// 		value: event.nextValues.startsOn,
	// 	},
	// ]

	if (event.nextValues.endsOn >= event.nextValues.startsOn) {
		return undefined
	}

	// This branch keeps the original changes and adds one dependent change.
	return extendValueChanges(event, [
		{
			type: "set",
			path: "endsOn",
			value: event.nextValues.startsOn,
		},
	])
}
// [!endregion invariant]

// [!region observer]
function describeUpdate(event: UpdateEvent<ScheduleInput, unknown>): string {
	const paths = event.changes.map((change) => change.path).join(", ")
	return `Committed ${event.source} update: ${paths}`
}
// [!endregion observer]

const defaultValues = {
	title: "Product launch",
	startsOn: "2027-03-10",
	endsOn: "2027-03-21",
} satisfies ScheduleInput

// [!region form]
export function ScheduleEditor() {
	const [lastUpdate, setLastUpdate] = useState("No update committed.")

	return (
		<kit.AutoForm
			beforeUpdate={preserveDateRange}
			defaultValues={defaultValues}
			definition={scheduleDefinition}
			afterUpdate={(event) => setLastUpdate(describeUpdate(event))}
		>
			<output aria-live="polite">{lastUpdate}</output>
		</kit.AutoForm>
	)
}
// [!endregion form]
