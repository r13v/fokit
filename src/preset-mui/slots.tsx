"use client"

import type { ButtonProps, FormLabelProps, GridProps } from "@mui/material"
import {
	Box,
	Button,
	FormHelperText,
	FormLabel,
	Grid,
	Paper,
	Stack,
	Typography,
} from "@mui/material"
import type { ReactElement } from "react"

import type { FormKitSlots } from "../react/create-form-kit.js"
import type {
	ArrayItemSlotProps,
	ArraySlotProps,
	ErrorMessageSlotProps,
	FieldSlotProps,
	SectionSlotProps,
	StructuralRootProps,
	SubmitSlotProps,
} from "../react/slots.js"
import type {
	MuiArraySlotOptions,
	MuiFieldSlotOptions,
	MuiFormKitI18n,
	MuiSectionSlotOptions,
} from "./types.js"
import { mergeSx } from "./utils.js"

export function createMuiSlots(
	i18n: MuiFormKitI18n,
): FormKitSlots<
	MuiFieldSlotOptions,
	MuiSectionSlotOptions,
	MuiArraySlotOptions
> {
	function MuiArraySlot({
		rootProps,
		label,
		labelProps,
		description,
		descriptionProps,
		slotOptions,
		errors,
		canAdd,
		add,
		children,
	}: ArraySlotProps<MuiArraySlotOptions>): ReactElement {
		const { color: _labelColor, ...muiLabelProps } = labelProps
		return (
			<Grid
				{...rootProps}
				{...gridItemProps(rootProps)}
				sx={mergeSx(gridItemSx(rootProps), slotOptions?.sx)}
			>
				<Stack spacing={1.5}>
					{label === undefined ? null : (
						<FormLabel
							{...(muiLabelProps as FormLabelProps<"div">)}
							component="div"
						>
							{label}
						</FormLabel>
					)}
					{description === undefined ? null : (
						<FormHelperText {...descriptionProps}>{description}</FormHelperText>
					)}
					{errors}
					<Grid container columns={1} spacing={2} sx={slotOptions?.itemsSx}>
						{children}
					</Grid>
					<Box>
						<Button
							data-fp-array-action="add"
							disabled={!canAdd}
							type="button"
							variant="outlined"
							onClick={add}
						>
							{i18n.addItem}
						</Button>
					</Box>
				</Stack>
			</Grid>
		)
	}

	function MuiArrayItemSlot({
		rootProps,
		index,
		disabled,
		readOnly,
		canMoveUp,
		canMoveDown,
		remove,
		move,
		children,
	}: ArrayItemSlotProps): ReactElement {
		const position = index + 1
		return (
			<Grid {...rootProps} size={1}>
				<Paper variant="outlined">
					<Stack spacing={1.5} sx={{ p: 2 }}>
						{children}
						<Stack
							aria-label={`#${position}`}
							data-fp-array-item-actions=""
							direction="row"
							spacing={1}
						>
							<Typography
								aria-hidden="true"
								data-fp-array-item-position=""
								sx={{ alignSelf: "center" }}
								variant="body2"
							>
								#{position}
							</Typography>
							<Button
								aria-label={i18n.moveItemUp(position)}
								data-fp-array-action="move-up"
								disabled={disabled || readOnly || !canMoveUp}
								size="small"
								title={i18n.moveItemUp(position)}
								type="button"
								onClick={() => move(index - 1)}
							>
								<span aria-hidden="true">↑</span>
							</Button>
							<Button
								aria-label={i18n.moveItemDown(position)}
								data-fp-array-action="move-down"
								disabled={disabled || readOnly || !canMoveDown}
								size="small"
								title={i18n.moveItemDown(position)}
								type="button"
								onClick={() => move(index + 1)}
							>
								<span aria-hidden="true">↓</span>
							</Button>
							<Button
								aria-label={i18n.removeItem(position)}
								color="error"
								data-fp-array-action="remove"
								disabled={disabled || readOnly}
								size="small"
								title={i18n.removeItem(position)}
								type="button"
								onClick={remove}
							>
								<span aria-hidden="true">×</span>
							</Button>
						</Stack>
					</Stack>
				</Paper>
			</Grid>
		)
	}

	return Object.freeze({
		Field: MuiFieldSlot,
		Section: MuiSectionSlot,
		Array: MuiArraySlot,
		ArrayItem: MuiArrayItemSlot,
		ErrorMessage: MuiErrorMessageSlot,
		Submit: MuiSubmitSlot,
	})
}

function MuiFieldSlot({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	slotOptions,
	control,
	errors,
	disabled,
	required,
}: FieldSlotProps<MuiFieldSlotOptions>): ReactElement {
	const invalid = errors.length > 0
	const { color: _labelColor, ...muiLabelProps } = labelProps
	return (
		<Grid
			{...rootProps}
			{...gridItemProps(rootProps)}
			sx={mergeSx(gridItemSx(rootProps), slotOptions?.sx)}
		>
			<Stack spacing={1}>
				{label === undefined ? null : (
					<FormLabel
						{...(muiLabelProps as FormLabelProps<"label">)}
						component="label"
						disabled={disabled}
						error={invalid}
						id={
							labelProps.htmlFor === undefined
								? undefined
								: `${labelProps.htmlFor}-label`
						}
						required={required}
					>
						{label}
					</FormLabel>
				)}
				{description === undefined ? null : (
					<FormHelperText {...descriptionProps}>{description}</FormHelperText>
				)}
				{control}
				{errors}
			</Stack>
		</Grid>
	)
}

function MuiSectionSlot({
	rootProps,
	layoutProps,
	title,
	description,
	slotOptions,
	children,
}: SectionSlotProps<MuiSectionSlotOptions>): ReactElement {
	const columns = Number(layoutProps["data-fp-columns"])
	return (
		<Grid
			{...rootProps}
			{...gridItemProps(rootProps)}
			component="section"
			sx={mergeSx(gridItemSx(rootProps), slotOptions?.sx)}
		>
			<Stack spacing={2}>
				{title === undefined ? null : (
					<Typography component="h2" variant="h5">
						{title}
					</Typography>
				)}
				{description === undefined ? null : (
					<Typography color="text.secondary" variant="body2">
						{description}
					</Typography>
				)}
				<Grid
					{...layoutProps}
					columns={{ xs: 1, sm: columns }}
					container
					spacing={2}
					sx={slotOptions?.layoutSx}
				>
					{children}
				</Grid>
			</Stack>
		</Grid>
	)
}

function MuiErrorMessageSlot({
	rootProps,
	issue,
}: ErrorMessageSlotProps): ReactElement {
	return (
		<FormHelperText {...rootProps} error role="alert">
			{issue.message}
		</FormHelperText>
	)
}

function MuiSubmitSlot({ buttonProps }: SubmitSlotProps): ReactElement {
	const { children, ...props } = buttonProps
	return (
		<Button {...(props as ButtonProps)} type="submit" variant="contained">
			{children}
		</Button>
	)
}

function gridItemProps(
	rootProps: StructuralRootProps,
): Pick<GridProps, "size"> {
	const span = structuralSpan(rootProps)
	if (span === undefined || span === "full") return {}
	const numericSpan = Number(span)
	return Number.isInteger(numericSpan) && numericSpan > 0
		? { size: { xs: 1, sm: numericSpan } }
		: {}
}

function gridItemSx(rootProps: StructuralRootProps) {
	return structuralSpan(rootProps) === "full"
		? { flexBasis: "100%", maxWidth: "100%", width: "100%" }
		: undefined
}

function structuralSpan(rootProps: StructuralRootProps): string | undefined {
	return (rootProps as StructuralRootProps & { "data-fp-span"?: string })[
		"data-fp-span"
	]
}
