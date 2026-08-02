"use client"

import {
	type ArrayItemSlotProps,
	type ArraySlotProps,
	type ControlProps,
	createFormKit,
	defineControl,
	type ErrorMessageSlotProps,
	type FieldSlotProps,
	type FormKitSlots,
	type SectionSlotProps,
	type SubmitSlotProps,
} from "form-please"
import {
	createNativeControls,
	type NativeDateOptions,
	type NativeFileOptions,
	type NativeNumberOptions,
	type NativeSelectOptions,
	type NativeTextareaOptions,
	type NativeTextOptions,
	type NativeTimeOptions,
} from "form-please/native-controls"
import {
	ArrowDownIcon,
	ArrowUpIcon,
	CalendarIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react"
import {
	type ChangeEvent,
	Fragment,
	type ReactElement,
	useEffect,
	useRef,
	useState,
} from "react"

import { Button } from "../button"
import { Calendar } from "../calendar"
import { Checkbox } from "../checkbox"
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
	useComboboxAnchor,
} from "../combobox"
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "../field"
import { Input } from "../input"
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "../input-otp"
import { NativeSelect, NativeSelectOption } from "../native-select"
import { Popover, PopoverContent, PopoverTrigger } from "../popover"
import { RadioGroup, RadioGroupItem } from "../radio-group"
import { Slider } from "../slider"
import { Switch } from "../switch"
import { Textarea } from "../textarea"

export type ShadcnChoiceOption = {
	readonly value: string
	readonly label: string
	readonly description?: string
	readonly disabled?: boolean
}

export type ShadcnRadioOptions = {
	readonly options: readonly ShadcnChoiceOption[]
	readonly orientation?: "horizontal" | "vertical"
}

export type ShadcnSwitchOptions = {
	readonly size?: "default" | "sm"
}

export type ShadcnSliderOptions = {
	readonly min?: number
	readonly max?: number
	readonly step?: number
	readonly largeStep?: number
	readonly minStepsBetweenValues?: number
	readonly orientation?: "horizontal" | "vertical"
	readonly locale?: Intl.LocalesArgument
	readonly format?: Intl.NumberFormatOptions
	readonly thumbCollisionBehavior?: "none" | "push" | "swap"
}

export type ShadcnComboboxOptions = {
	readonly options: readonly ShadcnChoiceOption[]
	readonly placeholder?: string
	readonly emptyText?: string
	readonly autoComplete?: string
	readonly autoHighlight?: boolean
	readonly showClear?: boolean
}

export type ShadcnDatePreset = {
	readonly value: string
	readonly label: string
}

export type ShadcnDatePickerOptions = {
	readonly placeholder?: string
	readonly min?: string
	readonly max?: string
	readonly captionLayout?:
		| "dropdown"
		| "dropdown-months"
		| "dropdown-years"
		| "label"
	readonly presets?: readonly ShadcnDatePreset[]
}

export type ShadcnDateRange = {
	readonly from?: string
	readonly to?: string
}

export type ShadcnDateRangePickerOptions = Omit<
	ShadcnDatePickerOptions,
	"presets"
> & {
	readonly numberOfMonths?: number
}

export type ShadcnInputOtpOptions = {
	readonly maxLength: number
	readonly pattern?: string
	readonly groups?: readonly number[]
	readonly separator?: boolean
	readonly autoComplete?: string
}

function ShadcnTextControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string | undefined, NativeTextOptions>): ReactElement {
	return (
		<Input
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			autoComplete={options.autoComplete}
			disabled={disabled}
			id={input.id}
			name={input.name}
			onBlur={blur}
			onChange={(event) => setValue(event.currentTarget.value)}
			placeholder={options.placeholder}
			readOnly={readOnly}
			ref={input.ref}
			required={required}
			type={options.type ?? "text"}
			value={value ?? ""}
		/>
	)
}

function ShadcnTextareaControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string | undefined, NativeTextareaOptions>): ReactElement {
	return (
		<Textarea
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			autoComplete={options.autoComplete}
			disabled={disabled}
			id={input.id}
			name={input.name}
			onBlur={blur}
			onChange={(event) => setValue(event.currentTarget.value)}
			placeholder={options.placeholder}
			readOnly={readOnly}
			ref={input.ref}
			required={required}
			rows={options.rows}
			value={value ?? ""}
		/>
	)
}

function ShadcnNumberControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<number | undefined, NativeNumberOptions>): ReactElement {
	function handleChange(event: ChangeEvent<HTMLInputElement>): void {
		if (event.currentTarget.value === "") {
			setValue(undefined)
			return
		}

		const nextValue = event.currentTarget.valueAsNumber
		if (!Number.isNaN(nextValue)) setValue(nextValue)
	}

	return (
		<Input
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			disabled={disabled}
			id={input.id}
			max={options.max}
			min={options.min}
			name={input.name}
			onBlur={blur}
			onChange={handleChange}
			placeholder={options.placeholder}
			readOnly={readOnly}
			ref={input.ref}
			required={required}
			step={options.step}
			type="number"
			value={value === undefined ? "" : String(value)}
		/>
	)
}

function ShadcnDateControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string | undefined, NativeDateOptions>): ReactElement {
	return (
		<Input
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			disabled={disabled}
			id={input.id}
			max={options.max}
			min={options.min}
			name={input.name}
			onBlur={blur}
			onChange={(event) => setValue(event.currentTarget.value || undefined)}
			readOnly={readOnly}
			ref={input.ref}
			required={required}
			type="date"
			value={value ?? ""}
		/>
	)
}

function ShadcnTimeControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string | undefined, NativeTimeOptions>): ReactElement {
	return (
		<Input
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			disabled={disabled}
			id={input.id}
			max={options.max}
			min={options.min}
			name={input.name}
			onBlur={blur}
			onChange={(event) => setValue(event.currentTarget.value || undefined)}
			readOnly={readOnly}
			ref={input.ref}
			required={required}
			step={options.step}
			type="time"
			value={value ?? ""}
		/>
	)
}

function ShadcnSelectControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string | undefined, NativeSelectOptions>): ReactElement {
	validateSelectOptions(value, options)

	return (
		<NativeSelect
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			aria-readonly={readOnly || undefined}
			className="w-full"
			disabled={disabled}
			id={input.id}
			name={input.name}
			onBlur={blur}
			onChange={(event) => {
				if (readOnly) {
					event.preventDefault()
					event.currentTarget.value = value ?? ""
					return
				}

				const nextValue = event.currentTarget.value
				setValue(
					nextValue === "" && options.emptyOption !== undefined
						? undefined
						: nextValue,
				)
			}}
			onKeyDown={(event) => {
				if (readOnly && isSelectMutationKey(event.key)) preventReadOnly(event)
			}}
			onMouseDown={(event) => {
				if (readOnly) preventReadOnly(event)
			}}
			ref={input.ref}
			required={required}
			value={value ?? ""}
		>
			{options.emptyOption === undefined ? null : (
				<NativeSelectOption disabled={options.emptyOption.disabled} value="">
					{options.emptyOption.label}
				</NativeSelectOption>
			)}
			{options.options.map((option) => (
				<NativeSelectOption
					disabled={option.disabled}
					key={option.value}
					value={option.value}
				>
					{option.label}
				</NativeSelectOption>
			))}
		</NativeSelect>
	)
}

function ShadcnCheckboxControl({
	value,
	setValue,
	blur,
	input,
	meta,
	disabled,
	readOnly,
	required,
}: ControlProps<boolean>): ReactElement {
	return (
		<Checkbox
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			aria-readonly={readOnly || undefined}
			checked={value}
			className="!size-4 self-start"
			disabled={disabled}
			id={input.id}
			inputRef={input.ref}
			name={input.name}
			onBlur={blur}
			onCheckedChange={(checked) => setValue(checked)}
			readOnly={readOnly}
			required={required}
			value="true"
		/>
	)
}

function ShadcnFileControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<File | undefined, NativeFileOptions>): ReactElement {
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const [nativeFile, setNativeFile] = useState<File | undefined>()
	const hasSubmittableNativeFile =
		nativeFile !== undefined && Object.is(value, nativeFile)

	useEffect(() => {
		if (hasSubmittableNativeFile || fileInputRef.current === null) return

		fileInputRef.current.value = ""
		if (nativeFile !== undefined) setNativeFile(undefined)
	}, [hasSubmittableNativeFile, nativeFile])

	return (
		<Input
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			aria-readonly={readOnly || undefined}
			accept={options.accept}
			disabled={disabled}
			id={input.id}
			name={hasSubmittableNativeFile ? input.name : undefined}
			onBlur={blur}
			onChange={(event) => {
				if (readOnly) {
					event.preventDefault()
					return
				}
				const nextFile = event.currentTarget.files?.item(0) ?? undefined
				setNativeFile(nextFile)
				setValue(nextFile)
			}}
			onClick={(event) => {
				if (readOnly) preventReadOnly(event)
			}}
			onDrop={(event) => {
				if (readOnly) preventReadOnly(event)
			}}
			onKeyDown={(event) => {
				if (readOnly && isActivationKey(event.key)) preventReadOnly(event)
			}}
			ref={(element) => {
				fileInputRef.current = element
				input.ref(element)
			}}
			required={required}
			type="file"
		/>
	)
}

function ShadcnRadioControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string | undefined, ShadcnRadioOptions>): ReactElement {
	validateChoiceOptions("radio", options.options)

	return (
		<RadioGroup
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			aria-labelledby={`${input.id}-label`}
			className={
				options.orientation === "horizontal"
					? "flex flex-wrap gap-4"
					: undefined
			}
			disabled={disabled}
			inputRef={input.ref}
			name={input.name}
			onBlur={blur}
			onValueChange={(nextValue) => setValue(nextValue)}
			readOnly={readOnly}
			required={required}
			value={value ?? null}
		>
			{options.options.map((option, index) => {
				const optionId = `${input.id}-${index}`
				return (
					<label
						className="flex items-start gap-2 text-sm"
						htmlFor={optionId}
						key={option.value}
					>
						<RadioGroupItem
							aria-invalid={meta.invalid || undefined}
							disabled={option.disabled}
							id={optionId}
							value={option.value}
						/>
						<span className="grid gap-0.5">
							<span>{option.label}</span>
							{option.description === undefined ? null : (
								<span className="text-muted-foreground">
									{option.description}
								</span>
							)}
						</span>
					</label>
				)
			})}
		</RadioGroup>
	)
}

function ShadcnSwitchControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<boolean, ShadcnSwitchOptions>): ReactElement {
	return (
		<Switch
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			aria-readonly={readOnly || undefined}
			checked={value}
			disabled={disabled}
			id={input.id}
			inputRef={input.ref}
			name={input.name}
			onBlur={blur}
			onCheckedChange={(checked) => setValue(checked)}
			readOnly={readOnly}
			required={required}
			size={options.size}
			uncheckedValue="false"
			value="true"
		/>
	)
}

function ShadcnSliderControl(
	props: ControlProps<number, ShadcnSliderOptions>,
): ReactElement {
	// The generated shadcn wrapper uses an array default to decide how many
	// thumbs to render, while Base UI needs a scalar value for pointer updates.
	return renderSlider(props, props.value, [props.value], (value) => {
		if (typeof value === "number") props.setValue(value)
	})
}

function ShadcnRangeSliderControl(
	props: ControlProps<readonly [number, number], ShadcnSliderOptions>,
): ReactElement {
	return renderSlider(props, props.value, undefined, (values) => {
		if (!Array.isArray(values)) return
		const from = values[0]
		const to = values[1]
		if (from !== undefined && to !== undefined) props.setValue([from, to])
	})
}

function ShadcnMultiSliderControl(
	props: ControlProps<readonly number[], ShadcnSliderOptions>,
): ReactElement {
	return renderSlider(props, props.value, undefined, (values) => {
		if (Array.isArray(values)) props.setValue(values)
	})
}

function renderSlider<Value>(
	props: ControlProps<Value, ShadcnSliderOptions>,
	value: number | readonly number[],
	defaultValue: readonly number[] | undefined,
	setValue: (value: number | readonly number[]) => void,
): ReactElement {
	const { blur, disabled, input, meta, options, readOnly, required } = props

	return (
		<Slider
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			aria-labelledby={`${input.id}-label`}
			aria-readonly={readOnly || undefined}
			aria-required={required || undefined}
			disabled={disabled}
			defaultValue={defaultValue}
			format={options.format}
			largeStep={options.largeStep}
			locale={options.locale}
			max={options.max}
			min={options.min}
			minStepsBetweenValues={options.minStepsBetweenValues}
			onBlurCapture={blur}
			onKeyDownCapture={(event) => {
				if (readOnly && isSliderMutationKey(event.key)) preventReadOnly(event)
			}}
			onPointerDownCapture={(event) => {
				if (readOnly) preventReadOnly(event)
			}}
			onValueChange={(nextValue) => {
				if (!readOnly) setValue(nextValue)
			}}
			orientation={options.orientation}
			ref={(element) => {
				input.ref(element?.querySelector("input[type=range]") ?? null)
			}}
			step={options.step}
			thumbCollisionBehavior={options.thumbCollisionBehavior}
			value={Array.isArray(value) ? [...value] : value}
		/>
	)
}

function ShadcnComboboxControl(
	props: ControlProps<string | undefined, ShadcnComboboxOptions>,
): ReactElement {
	const {
		value,
		setValue,
		blur,
		input,
		meta,
		options,
		disabled,
		readOnly,
		required,
	} = props
	validateChoiceOptions("combobox", options.options)
	const values = options.options.map((option) => option.value)
	const labels = new Map(
		options.options.map((option) => [option.value, option.label]),
	)

	return (
		<Combobox
			autoComplete={options.autoComplete}
			autoHighlight={options.autoHighlight}
			disabled={disabled}
			itemToStringLabel={(itemValue) => labels.get(itemValue) ?? itemValue}
			items={values}
			onValueChange={(nextValue) => setValue(nextValue ?? undefined)}
			readOnly={readOnly}
			required={required}
			value={value ?? null}
		>
			<ComboboxInput
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
				id={input.id}
				onBlur={blur}
				placeholder={options.placeholder}
				ref={input.ref}
				showClear={options.showClear}
			/>
			<ComboboxContent>
				<ComboboxEmpty>
					{options.emptyText ?? "No options found."}
				</ComboboxEmpty>
				<ComboboxList>
					{options.options.map((option) => (
						<ComboboxItem
							disabled={option.disabled}
							key={option.value}
							value={option.value}
						>
							{option.label}
						</ComboboxItem>
					))}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	)
}

function ShadcnMultiComboboxControl(
	props: ControlProps<readonly string[], ShadcnComboboxOptions>,
): ReactElement {
	const {
		value,
		setValue,
		blur,
		input,
		meta,
		options,
		disabled,
		readOnly,
		required,
	} = props
	validateChoiceOptions("multiCombobox", options.options)
	const anchor = useComboboxAnchor()
	const values = options.options.map((option) => option.value)
	const labels = new Map(
		options.options.map((option) => [option.value, option.label]),
	)

	return (
		<Combobox
			autoComplete={options.autoComplete}
			autoHighlight={options.autoHighlight}
			disabled={disabled}
			itemToStringLabel={(itemValue) => labels.get(itemValue) ?? itemValue}
			items={values}
			multiple
			onValueChange={setValue}
			readOnly={readOnly}
			required={required}
			value={[...value]}
		>
			<ComboboxChips ref={anchor}>
				<ComboboxValue>
					{(selectedValues: string[]) => (
						<>
							{selectedValues.map((selectedValue) => (
								<ComboboxChip key={selectedValue}>
									{labels.get(selectedValue) ?? selectedValue}
								</ComboboxChip>
							))}
							<ComboboxChipsInput
								aria-describedby={input["aria-describedby"]}
								aria-invalid={meta.invalid || undefined}
								id={input.id}
								onBlur={blur}
								placeholder={options.placeholder}
								ref={input.ref}
							/>
						</>
					)}
				</ComboboxValue>
			</ComboboxChips>
			<ComboboxContent anchor={anchor}>
				<ComboboxEmpty>
					{options.emptyText ?? "No options found."}
				</ComboboxEmpty>
				<ComboboxList>
					{options.options.map((option) => (
						<ComboboxItem
							disabled={option.disabled}
							key={option.value}
							value={option.value}
						>
							{option.label}
						</ComboboxItem>
					))}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	)
}

function ShadcnDatePickerControl(
	props: ControlProps<string | undefined, ShadcnDatePickerOptions>,
): ReactElement {
	const {
		value,
		setValue,
		blur,
		input,
		meta,
		options,
		disabled,
		readOnly,
		required,
	} = props
	const selected = parseIsoDate(value)

	return (
		<Popover open={readOnly ? false : undefined}>
			<PopoverTrigger
				render={
					<Button
						aria-describedby={input["aria-describedby"]}
						aria-invalid={meta.invalid || undefined}
						aria-readonly={readOnly || undefined}
						aria-required={required || undefined}
						className="w-full justify-start"
						disabled={disabled}
						id={input.id}
						onBlur={blur}
						ref={input.ref}
						type="button"
						variant="outline"
					/>
				}
			>
				<CalendarIcon />
				{selected === undefined
					? (options.placeholder ?? "Pick a date")
					: formatDisplayDate(selected)}
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto">
				<Calendar
					captionLayout={options.captionLayout}
					disabled={dateMatchers(options.min, options.max)}
					mode="single"
					onSelect={(date) => setValue(toIsoDate(date))}
					selected={selected}
				/>
				<DatePresetButtons
					disabled={disabled || readOnly}
					onSelect={setValue}
					presets={options.presets}
				/>
			</PopoverContent>
		</Popover>
	)
}

function ShadcnDateRangePickerControl(
	props: ControlProps<ShadcnDateRange, ShadcnDateRangePickerOptions>,
): ReactElement {
	const {
		value,
		setValue,
		blur,
		input,
		meta,
		options,
		disabled,
		readOnly,
		required,
	} = props
	const selected = {
		from: parseIsoDate(value.from),
		to: parseIsoDate(value.to),
	}

	return (
		<Popover open={readOnly ? false : undefined}>
			<PopoverTrigger
				render={
					<Button
						aria-describedby={input["aria-describedby"]}
						aria-invalid={meta.invalid || undefined}
						aria-readonly={readOnly || undefined}
						aria-required={required || undefined}
						className="w-full justify-start"
						disabled={disabled}
						id={input.id}
						onBlur={blur}
						ref={input.ref}
						type="button"
						variant="outline"
					/>
				}
			>
				<CalendarIcon />
				{formatDisplayRange(selected, options.placeholder)}
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto">
				<Calendar
					captionLayout={options.captionLayout}
					disabled={dateMatchers(options.min, options.max)}
					mode="range"
					numberOfMonths={options.numberOfMonths ?? 2}
					onSelect={(range) =>
						setValue({
							from: toIsoDate(range?.from),
							to: toIsoDate(range?.to),
						})
					}
					selected={selected}
				/>
			</PopoverContent>
		</Popover>
	)
}

function DatePresetButtons({
	presets,
	disabled,
	onSelect,
}: {
	readonly presets?: readonly ShadcnDatePreset[]
	readonly disabled: boolean
	onSelect(value: string): void
}): ReactElement | null {
	if (presets === undefined || presets.length === 0) return null

	return (
		<div className="flex flex-wrap gap-2 border-t pt-2">
			{presets.map((preset) => (
				<Button
					disabled={disabled}
					key={preset.value}
					onClick={() => onSelect(preset.value)}
					size="sm"
					type="button"
					variant="ghost"
				>
					{preset.label}
				</Button>
			))}
		</div>
	)
}

function ShadcnInputOtpControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string, ShadcnInputOtpOptions>): ReactElement {
	const groups = resolveOtpGroups(options)
	let slotIndex = 0

	return (
		<InputOTP
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			autoComplete={options.autoComplete}
			disabled={disabled}
			id={input.id}
			maxLength={options.maxLength}
			name={input.name}
			onBlur={blur}
			onChange={setValue}
			pattern={options.pattern}
			readOnly={readOnly}
			ref={input.ref}
			required={required}
			value={value}
		>
			{groups.map((groupLength, groupIndex) => {
				const groupStart = slotIndex
				const slots = Array.from({ length: groupLength }, () => slotIndex++)
				return (
					<Fragment key={`${groupStart}:${groupLength}`}>
						{groupIndex === 0 || options.separator === false ? null : (
							<InputOTPSeparator />
						)}
						<InputOTPGroup>
							{slots.map((index) => (
								<InputOTPSlot
									aria-invalid={meta.invalid || undefined}
									index={index}
									key={index}
								/>
							))}
						</InputOTPGroup>
					</Fragment>
				)
			})}
		</InputOTP>
	)
}

const nativeControls = createNativeControls()

const controls = Object.freeze({
	text: defineControl<string | undefined, NativeTextOptions>({
		component: ShadcnTextControl,
		formData: nativeControls.text.formData,
	}),
	textarea: defineControl<string | undefined, NativeTextareaOptions>({
		component: ShadcnTextareaControl,
		formData: nativeControls.textarea.formData,
	}),
	select: defineControl<string | undefined, NativeSelectOptions>({
		component: ShadcnSelectControl,
		formData: nativeControls.select.formData,
	}),
	checkbox: defineControl<boolean>({
		component: ShadcnCheckboxControl,
		formData: nativeControls.checkbox.formData,
	}),
	number: defineControl<number | undefined, NativeNumberOptions>({
		component: ShadcnNumberControl,
		formData: nativeControls.number.formData,
	}),
	date: defineControl<string | undefined, NativeDateOptions>({
		component: ShadcnDateControl,
		formData: nativeControls.date.formData,
	}),
	time: defineControl<string | undefined, NativeTimeOptions>({
		component: ShadcnTimeControl,
		formData: nativeControls.time.formData,
	}),
	file: defineControl<File | undefined, NativeFileOptions>({
		component: ShadcnFileControl,
		formData: nativeControls.file.formData,
	}),
	radio: defineControl<string | undefined, ShadcnRadioOptions>({
		component: ShadcnRadioControl,
		formData: nativeControls.select.formData,
	}),
	switch: defineControl<boolean, ShadcnSwitchOptions>({
		component: ShadcnSwitchControl,
		formData: {
			mode: "native",
			serialize(value, details) {
				return [{ name: details.name, value: String(value) }]
			},
		},
	}),
	slider: defineControl<number, ShadcnSliderOptions>({
		component: ShadcnSliderControl,
		formData: {
			mode: "hidden",
			serialize(value, details) {
				return [{ name: details.name, value: String(value) }]
			},
		},
	}),
	rangeSlider: defineControl<readonly [number, number], ShadcnSliderOptions>({
		component: ShadcnRangeSliderControl,
		formData: {
			mode: "hidden",
			serialize: serializeNumberArray,
		},
	}),
	multiSlider: defineControl<readonly number[], ShadcnSliderOptions>({
		component: ShadcnMultiSliderControl,
		formData: {
			mode: "hidden",
			serialize: serializeNumberArray,
		},
	}),
	combobox: defineControl<string | undefined, ShadcnComboboxOptions>({
		component: ShadcnComboboxControl,
		formData: {
			mode: "hidden",
			serialize(value, details) {
				return value === undefined ? [] : [{ name: details.name, value }]
			},
		},
	}),
	multiCombobox: defineControl<readonly string[], ShadcnComboboxOptions>({
		component: ShadcnMultiComboboxControl,
		formData: {
			mode: "hidden",
			serialize: serializeStringArray,
		},
	}),
	datePicker: defineControl<string | undefined, ShadcnDatePickerOptions>({
		component: ShadcnDatePickerControl,
		formData: {
			mode: "hidden",
			serialize(value, details) {
				return value === undefined ? [] : [{ name: details.name, value }]
			},
		},
	}),
	dateRangePicker: defineControl<ShadcnDateRange, ShadcnDateRangePickerOptions>(
		{
			component: ShadcnDateRangePickerControl,
			formData: {
				mode: "hidden",
				serialize(value, details) {
					return [
						...(value.from === undefined
							? []
							: [{ name: `${details.name}.from`, value: value.from }]),
						...(value.to === undefined
							? []
							: [{ name: `${details.name}.to`, value: value.to }]),
					]
				},
			},
		},
	),
	inputOtp: defineControl<string, ShadcnInputOtpOptions>({
		component: ShadcnInputOtpControl,
		formData: nativeControls.text.formData,
	}),
})

const slots = Object.freeze({
	Field: ShadcnFieldSlot,
	Section: ShadcnSectionSlot,
	Array: ShadcnArraySlot,
	ArrayItem: ShadcnArrayItemSlot,
	ErrorMessage: ShadcnErrorMessageSlot,
	Submit: ShadcnSubmitSlot,
}) satisfies FormKitSlots

export const shadcnFormKit = createFormKit({ controls, slots })

function ShadcnFieldSlot({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	control,
	errors,
	disabled,
	readOnly,
	required,
}: FieldSlotProps): ReactElement {
	return (
		<Field
			{...rootProps}
			className={joinClassNames("gap-2", rootProps.className)}
			data-disabled={disabled ? "true" : undefined}
			data-invalid={
				rootProps["aria-invalid"] === true ||
				rootProps["aria-invalid"] === "true"
					? "true"
					: undefined
			}
			data-readonly={readOnly ? "true" : undefined}
			data-required={required ? "true" : undefined}
		>
			{label === undefined ? null : (
				<FieldLabel
					{...labelProps}
					id={
						labelProps.htmlFor === undefined
							? undefined
							: `${labelProps.htmlFor}-label`
					}
				>
					{label}
				</FieldLabel>
			)}
			{description === undefined ? null : (
				<FieldDescription {...descriptionProps}>{description}</FieldDescription>
			)}
			{control}
			{errors}
		</Field>
	)
}

function ShadcnSectionSlot({
	rootProps,
	layoutProps,
	title,
	description,
	children,
}: SectionSlotProps): ReactElement {
	return (
		<section
			{...rootProps}
			className={joinClassNames(
				"grid gap-4 rounded-xl border bg-background p-4",
				rootProps.className,
			)}
		>
			{title === undefined ? null : (
				<h2 className="text-base font-medium">{title}</h2>
			)}
			{description === undefined ? null : (
				<FieldDescription>{description}</FieldDescription>
			)}
			<FieldGroup
				{...layoutProps}
				className={joinClassNames(
					"grid grid-cols-1 gap-4 md:data-[fp-columns=2]:grid-cols-2 md:data-[fp-columns=3]:grid-cols-3 md:data-[fp-columns=4]:grid-cols-4",
					layoutProps.className,
				)}
			>
				{children}
			</FieldGroup>
		</section>
	)
}

function ShadcnArraySlot({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	errors,
	invalid,
	canAdd,
	add,
	children,
}: ArraySlotProps): ReactElement {
	return (
		<FieldSet
			{...rootProps}
			className={joinClassNames(
				"rounded-xl border bg-background p-4",
				rootProps.className,
			)}
			data-invalid={invalid ? "true" : undefined}
		>
			{label === undefined ? null : (
				<FieldLegend {...labelProps}>{label}</FieldLegend>
			)}
			{description === undefined ? null : (
				<FieldDescription {...descriptionProps}>{description}</FieldDescription>
			)}
			{errors}
			<FieldGroup>{children}</FieldGroup>
			<Button
				className="w-fit"
				data-fp-array-action="add"
				disabled={!canAdd}
				onClick={add}
				type="button"
				variant="outline"
			>
				<PlusIcon /> Add item
			</Button>
		</FieldSet>
	)
}

function ShadcnArrayItemSlot({
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
		<div
			{...rootProps}
			className={joinClassNames(
				"grid gap-4 rounded-lg border bg-muted/30 p-3",
				rootProps.className,
			)}
		>
			{children}
			<fieldset
				aria-label={`Item ${position}`}
				className="flex items-center gap-2"
				data-fp-array-item-actions=""
			>
				<span className="mr-auto text-sm text-muted-foreground">
					#{position}
				</span>
				<Button
					aria-label={`Move item ${position} up`}
					data-fp-array-action="move-up"
					disabled={disabled || readOnly || !canMoveUp}
					onClick={() => move(index - 1)}
					size="icon-sm"
					title={`Move item ${position} up`}
					type="button"
					variant="ghost"
				>
					<ArrowUpIcon />
				</Button>
				<Button
					aria-label={`Move item ${position} down`}
					data-fp-array-action="move-down"
					disabled={disabled || readOnly || !canMoveDown}
					onClick={() => move(index + 1)}
					size="icon-sm"
					title={`Move item ${position} down`}
					type="button"
					variant="ghost"
				>
					<ArrowDownIcon />
				</Button>
				<Button
					aria-label={`Remove item ${position}`}
					data-fp-array-action="remove"
					disabled={disabled || readOnly}
					onClick={remove}
					size="icon-sm"
					title={`Remove item ${position}`}
					type="button"
					variant="ghost"
				>
					<Trash2Icon />
				</Button>
			</fieldset>
		</div>
	)
}

function ShadcnErrorMessageSlot({
	rootProps,
	issue,
}: ErrorMessageSlotProps): ReactElement {
	return (
		<FieldError {...rootProps} className={rootProps.className}>
			{issue.message}
		</FieldError>
	)
}

function ShadcnSubmitSlot({ buttonProps }: SubmitSlotProps): ReactElement {
	return <Button {...buttonProps} />
}

function serializeNumberArray(
	value: readonly number[],
	details: { readonly name: string },
) {
	return [
		{ kind: "array" as const, name: details.name },
		...value.map((item) => ({ name: details.name, value: String(item) })),
	]
}

function serializeStringArray(
	value: readonly string[],
	details: { readonly name: string },
) {
	return [
		{ kind: "array" as const, name: details.name },
		...value.map((item) => ({ name: details.name, value: item })),
	]
}

function validateSelectOptions(
	value: string | undefined,
	options: NativeSelectOptions,
): void {
	if (!Array.isArray(options.options)) {
		throw new TypeError("shadcnFormKit select requires options.options")
	}
	if (
		options.emptyOption !== undefined &&
		options.options.some((option) => option.value === "")
	) {
		throw new TypeError(
			'shadcnFormKit select cannot combine options.emptyOption with an option whose value is ""',
		)
	}
	if (value === undefined && options.emptyOption === undefined) {
		throw new TypeError(
			"shadcnFormKit select requires options.emptyOption to represent undefined",
		)
	}
}

function validateChoiceOptions(
	control: string,
	options: readonly ShadcnChoiceOption[],
): void {
	if (!Array.isArray(options) || options.length === 0) {
		throw new TypeError(`shadcnFormKit ${control} requires options.options`)
	}
	const values = new Set<string>()
	for (const option of options) {
		if (values.has(option.value)) {
			throw new TypeError(
				`shadcnFormKit ${control} requires unique option values`,
			)
		}
		values.add(option.value)
	}
}

function resolveOtpGroups(options: ShadcnInputOtpOptions): readonly number[] {
	if (!Number.isInteger(options.maxLength) || options.maxLength < 1) {
		throw new TypeError("shadcnFormKit inputOtp requires a positive maxLength")
	}
	const groups = options.groups ?? [options.maxLength]
	if (
		groups.length === 0 ||
		groups.some((group) => !Number.isInteger(group) || group < 1) ||
		groups.reduce((total, group) => total + group, 0) !== options.maxLength
	) {
		throw new TypeError(
			"shadcnFormKit inputOtp groups must be positive integers that sum to maxLength",
		)
	}
	return groups
}

function parseIsoDate(value: string | undefined): Date | undefined {
	if (value === undefined) return undefined
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
	if (match === null) return undefined
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	const date = new Date(year, month - 1, day)
	return date.getFullYear() === year &&
		date.getMonth() === month - 1 &&
		date.getDate() === day
		? date
		: undefined
}

function toIsoDate(date: Date | undefined): string | undefined {
	if (date === undefined) return undefined
	const year = String(date.getFullYear()).padStart(4, "0")
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

function formatDisplayDate(date: Date): string {
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
		date,
	)
}

function formatDisplayRange(
	value: { readonly from?: Date; readonly to?: Date },
	placeholder: string | undefined,
): string {
	if (value.from === undefined) return placeholder ?? "Pick a date range"
	if (value.to === undefined) return `${formatDisplayDate(value.from)} – …`
	return `${formatDisplayDate(value.from)} – ${formatDisplayDate(value.to)}`
}

function dateMatchers(min: string | undefined, max: string | undefined) {
	const before = parseIsoDate(min)
	const after = parseIsoDate(max)
	return [
		...(before === undefined ? [] : [{ before }]),
		...(after === undefined ? [] : [{ after }]),
	]
}

function joinClassNames(
	...classNames: readonly (string | undefined)[]
): string | undefined {
	const value = classNames.filter(Boolean).join(" ")
	return value || undefined
}

function preventReadOnly(event: {
	preventDefault(): void
	stopPropagation(): void
}): void {
	event.preventDefault()
	event.stopPropagation()
}

function isActivationKey(key: string): boolean {
	return key === " " || key === "Enter"
}

function isSelectMutationKey(key: string): boolean {
	return (
		isActivationKey(key) ||
		key === "ArrowDown" ||
		key === "ArrowUp" ||
		key === "End" ||
		key === "Home" ||
		key === "PageDown" ||
		key === "PageUp"
	)
}

function isSliderMutationKey(key: string): boolean {
	return (
		key === "ArrowDown" ||
		key === "ArrowLeft" ||
		key === "ArrowRight" ||
		key === "ArrowUp" ||
		key === "End" ||
		key === "Home" ||
		key === "PageDown" ||
		key === "PageUp"
	)
}
