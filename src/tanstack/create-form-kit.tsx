// biome-ignore-all lint/suspicious/noArrayIndexKey: This runtime intentionally follows TanStack Form index identity for mutable array rows.

"use client"

import {
	type AnyFieldApi,
	type AnyFormGroupApi,
	type AnyFormState,
	type ReactFormExtendedApi,
	revalidateLogic,
	useForm as useTanStackForm,
} from "@tanstack/react-form"
import {
	type ComponentPropsWithoutRef,
	type ComponentType,
	createContext,
	createElement,
	type ReactElement,
	type ReactNode,
	useContext,
	useId,
	useMemo,
	useRef,
} from "react"

import {
	normalizeDefinition,
	normalizeGrid,
	type ResolvedNode,
	resolveDefinition,
} from "./definition.js"
import type {
	ArraySlotProps,
	ControlDefinitionRegistry,
	ControlProps,
	FieldSlotProps,
	FormInput,
	FormIssue,
	FormKitSlots,
	FormOutput,
	FormPleaseStyle,
	NormalizedDefinition,
	ReactUiContent,
	RenderNodeComponent,
	SectionSlotProps,
	StandardSchema,
	StructuralNodeName,
	StructuralRootProps,
} from "./types.js"

type NativeApi<Schema extends StandardSchema> = ReactFormExtendedApi<
	FormInput<Schema>,
	undefined,
	undefined,
	undefined,
	undefined,
	undefined,
	undefined,
	undefined,
	undefined,
	Schema,
	undefined,
	unknown
>

export type TanStackFormOptions<
	Schema extends StandardSchema,
	Context = unknown,
> = {
	readonly defaultValues: FormInput<Schema>
	readonly context?: Context
	readonly disabled?: boolean
	readonly readOnly?: boolean
	readonly formId?: string
	readonly onSubmit?: (details: {
		readonly value: FormOutput<Schema>
		readonly input: FormInput<Schema>
		readonly form: TanStackFormInstance<Schema, Context>
		readonly meta: unknown
	}) => unknown | Promise<unknown>
}

export type TanStackFormInstance<
	Schema extends StandardSchema = StandardSchema,
	Context = unknown,
> = {
	readonly api: NativeApi<Schema>
	readonly definition: NormalizedDefinition<Schema>
	readonly context: Context
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly inputRefs: Map<string, HTMLElement>
}

type NativeFormProps = Omit<
	ComponentPropsWithoutRef<"form">,
	"action" | "children" | "noValidate" | "onReset" | "onSubmit" | "style"
> & { readonly style?: FormPleaseStyle }

export type TanStackFormProps<
	Schema extends StandardSchema = StandardSchema,
	Context = unknown,
> = NativeFormProps & {
	readonly form: TanStackFormInstance<Schema, Context>
	readonly children?: ReactNode
}

export type TanStackAutoFormProps<
	Schema extends StandardSchema = StandardSchema,
	Context = unknown,
> = TanStackFormProps<Schema, Context>

export type TanStackSubscribeProps<Selected> = {
	readonly selector?: (state: AnyFormState) => Selected
	readonly children: ReactNode | ((value: Selected) => ReactNode)
}

export type TanStackFieldProps = {
	readonly name: string
	readonly mode?: "array"
	readonly children: (field: AnyFieldApi) => ReactNode
	readonly [key: string]: unknown
}

export type TanStackFormGroupProps = {
	readonly name: string
	readonly children: (group: AnyFormGroupApi) => ReactNode
	readonly [key: string]: unknown
}

type RuntimeForm = TanStackFormInstance<StandardSchema, unknown>
type RuntimeSlotOptions = Record<string, unknown>
type RuntimeSlots = FormKitSlots<
	RuntimeSlotOptions,
	RuntimeSlotOptions,
	RuntimeSlotOptions
>

type TopLevelArrayPath<Input> = {
	[Key in Extract<keyof Input, string>]: NonNullable<
		Input[Key]
	> extends readonly unknown[]
		? Key
		: never
}[Extract<keyof Input, string>]

type TopLevelFieldPath<Input> = Extract<keyof Input, string>

type DefinitionResolvable<Value, Input, Context> =
	| Value
	| ((
			values: Readonly<Input>,
			details: { readonly context: Readonly<Context> },
	  ) => Value)

type DefinitionFieldNode<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context,
	Grid extends number,
> = {
	readonly kind: "field"
	readonly id?: string
	readonly path: TopLevelFieldPath<Input>
	readonly control: Extract<keyof Controls, string>
	readonly label?: DefinitionResolvable<ReactUiContent, Input, Context>
	readonly description?: DefinitionResolvable<ReactUiContent, Input, Context>
	readonly slotOptions?: unknown
	readonly required?: DefinitionResolvable<boolean, Input, Context>
	readonly disabled?: DefinitionResolvable<boolean, Input, Context>
	readonly readOnly?: DefinitionResolvable<boolean, Input, Context>
	readonly visible?: DefinitionResolvable<boolean, Input, Context>
	readonly className?: DefinitionResolvable<string, Input, Context>
	readonly span?: DefinitionResolvable<Grid | "full", Input, Context>
	readonly valuePolicy?: "preserve"
	readonly options?: unknown
}

type DefinitionRelativeNode<
	Controls extends ControlDefinitionRegistry,
	Grid extends number,
> = {
	readonly kind: "field"
	readonly id?: string
	readonly path: string
	readonly control: Extract<keyof Controls, string>
	readonly label?: ReactUiContent
	readonly description?: ReactUiContent
	readonly slotOptions?: unknown
	readonly required?: boolean
	readonly disabled?: boolean
	readonly readOnly?: boolean
	readonly visible?: boolean
	readonly className?: string
	readonly span?: Grid | "full"
	readonly valuePolicy?: "preserve"
	readonly options?: unknown
}

type DefinitionArrayNode<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context,
	Grid extends number,
> = {
	readonly kind: "array"
	readonly id?: string
	readonly path: TopLevelArrayPath<Input>
	readonly label?: DefinitionResolvable<ReactUiContent, Input, Context>
	readonly description?: DefinitionResolvable<ReactUiContent, Input, Context>
	readonly slotOptions?: unknown
	readonly visible?: DefinitionResolvable<boolean, Input, Context>
	readonly disabled?: DefinitionResolvable<boolean, Input, Context>
	readonly readOnly?: DefinitionResolvable<boolean, Input, Context>
	readonly className?: DefinitionResolvable<string, Input, Context>
	readonly span?: DefinitionResolvable<Grid | "full", Input, Context>
	readonly itemDefault: unknown | (() => unknown)
	readonly children: readonly DefinitionRelativeNode<Controls, Grid>[]
}

type DefinitionRenderNode<Input, Context> = {
	readonly kind: "render"
	readonly id: string
	readonly component: RenderNodeComponent
	readonly visible?: DefinitionResolvable<boolean, Input, Context>
	readonly disabled?: DefinitionResolvable<boolean, Input, Context>
	readonly readOnly?: DefinitionResolvable<boolean, Input, Context>
}

type DefinitionSectionChild<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context,
	Grid extends number,
> =
	| DefinitionArrayNode<Input, Controls, Context, Grid>
	| DefinitionFieldNode<Input, Controls, Context, Grid>
	| DefinitionRenderNode<Input, Context>

type DefinitionUiNode<
	Input,
	Controls extends ControlDefinitionRegistry,
	Context,
	Grid extends number,
> =
	| DefinitionFieldNode<Input, Controls, Context, Grid>
	| {
			readonly kind: "section"
			readonly id: string
			readonly title?: DefinitionResolvable<ReactUiContent, Input, Context>
			readonly description?: DefinitionResolvable<
				ReactUiContent,
				Input,
				Context
			>
			readonly slotOptions?: unknown
			readonly visible?: DefinitionResolvable<boolean, Input, Context>
			readonly disabled?: DefinitionResolvable<boolean, Input, Context>
			readonly readOnly?: DefinitionResolvable<boolean, Input, Context>
			readonly className?: DefinitionResolvable<string, Input, Context>
			readonly columns?: DefinitionResolvable<Grid, Input, Context>
			readonly span?: DefinitionResolvable<Grid | "full", Input, Context>
			readonly children: readonly DefinitionSectionChild<
				Input,
				Controls,
				Context,
				Grid
			>[]
	  }
	| DefinitionArrayNode<Input, Controls, Context, Grid>
	| DefinitionRenderNode<Input, Context>

type DefineForm<
	Controls extends ControlDefinitionRegistry,
	Context,
	Grid extends number,
> = <Schema extends StandardSchema>(
	schema: Schema,
	source: {
		readonly ui: readonly DefinitionUiNode<
			FormInput<Schema>,
			Controls,
			Context,
			Grid
		>[]
	},
) => NormalizedDefinition<Schema>

type UseForm<Context> = <Schema extends StandardSchema>(
	definition: NormalizedDefinition<Schema>,
	options: TanStackFormOptions<Schema, Context>,
) => TanStackFormInstance<Schema, Context>

type TfNamespace = {
	readonly Field: (props: TanStackFieldProps) => ReactElement
	readonly FormGroup: (props: TanStackFormGroupProps) => ReactElement
	readonly Subscribe: <Selected>(
		props: TanStackSubscribeProps<Selected>,
	) => ReactElement
}

export interface TanStackFormKit<
	Controls extends ControlDefinitionRegistry,
	FieldOptions = never,
	SectionOptions = never,
	ArrayOptions = never,
	Context = unknown,
	Grid extends number = 1 | 2 | 3 | 4,
> {
	readonly controls: Controls
	readonly slots: FormKitSlots<FieldOptions, SectionOptions, ArrayOptions>
	readonly grid: readonly Grid[]
	readonly defineForm: DefineForm<Controls, Context, Grid>
	readonly useForm: UseForm<Context>
	readonly Form: <Schema extends StandardSchema>(
		props: TanStackFormProps<Schema, Context>,
	) => ReactElement
	readonly Fields: (props: { readonly children?: ReactNode }) => ReactElement
	readonly Submit: (
		props: Omit<ComponentPropsWithoutRef<"button">, "type">,
	) => ReactElement
	readonly AutoForm: <Schema extends StandardSchema>(
		props: TanStackAutoFormProps<Schema, Context>,
	) => ReactElement
	readonly tf: TfNamespace
	readonly forContext: <NextContext extends Context>() => TanStackFormKit<
		Controls,
		FieldOptions,
		SectionOptions,
		ArrayOptions,
		NextContext,
		Grid
	>
	readonly extend: (options: {
		readonly controls?: ControlDefinitionRegistry
		readonly slots?: Partial<RuntimeSlots>
		readonly grid?: readonly number[]
	}) => TanStackFormKit<
		ControlDefinitionRegistry,
		unknown,
		unknown,
		unknown,
		Context,
		number
	>
}

export type CreateFormKitOptions<
	Controls extends ControlDefinitionRegistry,
	FieldOptions = never,
	SectionOptions = never,
	ArrayOptions = never,
	Grid extends number = 1 | 2 | 3 | 4,
> = {
	readonly controls: Controls
	readonly slots: FormKitSlots<FieldOptions, SectionOptions, ArrayOptions>
	readonly grid?: readonly Grid[]
}

const FormContext = createContext<RuntimeForm | null>(null)
const FormIdContext = createContext<string | null>(null)

export function createFormKit<
	Controls extends ControlDefinitionRegistry,
	FieldOptions = never,
	SectionOptions = never,
	ArrayOptions = never,
	const Grid extends number = 1 | 2 | 3 | 4,
>(
	options: CreateFormKitOptions<
		Controls,
		FieldOptions,
		SectionOptions,
		ArrayOptions,
		Grid
	>,
): TanStackFormKit<
	Controls,
	FieldOptions,
	SectionOptions,
	ArrayOptions,
	unknown,
	Grid
> {
	const controls = Object.freeze({ ...options.controls }) as Controls
	const slots = Object.freeze({ ...options.slots }) as FormKitSlots<
		FieldOptions,
		SectionOptions,
		ArrayOptions
	>
	assertSlots(options.slots)
	const grid = normalizeGrid(options.grid, "createFormKit")

	return assembleKit(
		controls,
		slots as unknown as RuntimeSlots,
		grid,
	) as unknown as TanStackFormKit<
		Controls,
		FieldOptions,
		SectionOptions,
		ArrayOptions,
		unknown,
		Grid
	>
}

function assembleKit(
	controls: ControlDefinitionRegistry,
	slots: RuntimeSlots,
	grid: readonly number[],
): TanStackFormKit<
	ControlDefinitionRegistry,
	unknown,
	unknown,
	unknown,
	unknown,
	number
> {
	const definitions = new WeakSet<object>()
	const defineForm = ((schema: StandardSchema, source: unknown) => {
		const definition = normalizeDefinition(schema, source, controls, grid)
		definitions.add(definition)
		return definition
	}) as DefineForm<ControlDefinitionRegistry, unknown, number>

	const useForm = (<Schema extends StandardSchema>(
		definition: NormalizedDefinition<Schema>,
		options: TanStackFormOptions<Schema, unknown>,
	) => {
		if (!definitions.has(definition)) {
			throw new TypeError(
				"kit.useForm requires a definition from this exact TanStack form kit",
			)
		}
		const identity = useRef({
			definition,
			formId: options.formId,
		})
		if (
			identity.current.formId === options.formId &&
			identity.current.definition !== definition
		) {
			throw new TypeError(
				"kit.useForm cannot replace the definition without a new formId",
			)
		}
		if (identity.current.formId !== options.formId) {
			identity.current = { definition, formId: options.formId }
		}

		const inputRefs = useRef(new Map<string, HTMLElement>())
		const instanceRef = useRef<TanStackFormInstance<Schema, unknown> | null>(
			null,
		)
		const api = useTanStackForm({
			defaultValues: options.defaultValues,
			formId: options.formId,
			validationLogic: revalidateLogic({
				mode: "submit",
				modeAfterSubmission: "change",
			}),
			validators: {
				onDynamicAsync: definition.schema,
			},
			onSubmit: async ({ value, formApi, meta }) => {
				const result = await definition.schema["~standard"].validate(value)
				if (result.issues !== undefined) {
					focusFirstInvalid(formApi, inputRefs.current)
					return
				}
				const instance = instanceRef.current
				if (instance === null) {
					throw new Error("TanStack form instance is not mounted")
				}
				await options.onSubmit?.({
					value: result.value,
					input: value,
					form: instance,
					meta,
				})
			},
			onSubmitInvalid: ({ formApi }) => {
				queueMicrotask(() => {
					focusFirstInvalid(formApi, inputRefs.current)
				})
			},
		}) as NativeApi<Schema>

		const instance = useMemo<TanStackFormInstance<Schema, unknown>>(
			() => ({
				api,
				definition,
				context: options.context,
				disabled: options.disabled === true,
				readOnly: options.readOnly === true,
				inputRefs: inputRefs.current,
			}),
			[api, definition, options.context, options.disabled, options.readOnly],
		)
		instanceRef.current = instance
		return instance
	}) as UseForm<unknown>

	function Form<Schema extends StandardSchema>({
		form,
		children,
		id,
		...nativeProps
	}: TanStackFormProps<Schema, unknown>) {
		const generatedId = `form-please-tanstack-${useId().replaceAll(":", "")}`
		const formId = id ?? generatedId
		const runtimeForm = form as unknown as RuntimeForm

		return (
			<FormContext.Provider value={runtimeForm}>
				<FormIdContext.Provider value={formId}>
					<form
						{...nativeProps}
						data-disabled={booleanData(form.disabled)}
						data-fp-node="form"
						data-readonly={booleanData(form.readOnly)}
						id={formId}
						noValidate
						onReset={(event) => {
							event.preventDefault()
							form.api.reset()
						}}
						onSubmit={(event) => {
							event.preventDefault()
							if (!form.disabled) {
								void form.api.handleSubmit()
							}
						}}
					>
						{children}
					</form>
				</FormIdContext.Provider>
			</FormContext.Provider>
		)
	}

	function Fields({ children }: { readonly children?: ReactNode }) {
		const form = useRuntimeForm()
		const Subscribe = form.api.Subscribe
		return (
			<Subscribe selector={(state) => state.values}>
				{(values) => (
					<ResolvedFields
						controls={controls}
						form={form}
						slots={slots}
						values={values}
					>
						{children}
					</ResolvedFields>
				)}
			</Subscribe>
		)
	}

	function Submit(props: Omit<ComponentPropsWithoutRef<"button">, "type">) {
		const form = useRuntimeForm()
		const Subscribe = form.api.Subscribe
		const Slot = slots.Submit
		return (
			<Subscribe
				selector={(state) => ({
					isSubmitting: state.isSubmitting,
					isValidating: state.isValidating,
					values: state.values,
				})}
			>
				{(state) => (
					<Slot
						buttonProps={{
							...props,
							disabled:
								props.disabled === true ||
								form.disabled ||
								state.isValidating ||
								state.isSubmitting,
							type: "submit",
						}}
						isSubmitting={state.isSubmitting}
						values={state.values as Readonly<Record<string, unknown>>}
					/>
				)}
			</Subscribe>
		)
	}

	function AutoForm<Schema extends StandardSchema>(
		props: TanStackAutoFormProps<Schema, unknown>,
	) {
		const { children, form, ...formProps } = props
		return (
			<Form {...formProps} form={form}>
				<ErrorSummary slots={slots} />
				<Fields />
				{children}
			</Form>
		)
	}

	const tf = Object.freeze({
		Field(props: TanStackFieldProps) {
			const form = useRuntimeForm()
			const Field = form.api.Field as ComponentType<TanStackFieldProps>
			return <Field {...props} />
		},
		FormGroup(props: TanStackFormGroupProps) {
			const form = useRuntimeForm()
			const FormGroup = form.api
				.FormGroup as unknown as ComponentType<TanStackFormGroupProps>
			return <FormGroup {...props} />
		},
		Subscribe<Selected>(props: TanStackSubscribeProps<Selected>) {
			const form = useRuntimeForm()
			const Subscribe = form.api.Subscribe as ComponentType<
				TanStackSubscribeProps<Selected>
			>
			return <Subscribe {...props} />
		},
	})

	let kit: unknown
	const result = Object.freeze({
		controls,
		slots,
		grid,
		defineForm,
		useForm,
		Form,
		Fields,
		Submit,
		AutoForm,
		tf,
		forContext: () => kit,
		extend(extension: {
			readonly controls?: ControlDefinitionRegistry
			readonly slots?: Partial<RuntimeSlots>
			readonly grid?: readonly number[]
		}) {
			if (
				extension.controls === undefined &&
				extension.slots === undefined &&
				extension.grid === undefined
			) {
				throw new TypeError("kit.extend requires controls, slots, or grid")
			}
			for (const name of Object.keys(extension.controls ?? {})) {
				if (Object.hasOwn(controls, name)) {
					throw new TypeError(`kit.extend cannot replace control "${name}"`)
				}
			}
			const nextGrid =
				extension.grid === undefined
					? grid
					: normalizeGrid([...grid, ...extension.grid], "kit.extend")
			const nextSlots = Object.freeze({ ...slots, ...extension.slots })
			assertSlots(nextSlots)
			return assembleKit(
				Object.freeze({ ...controls, ...extension.controls }),
				nextSlots,
				nextGrid,
			)
		},
	}) as unknown as TanStackFormKit<
		ControlDefinitionRegistry,
		unknown,
		unknown,
		unknown,
		unknown,
		number
	>
	kit = result
	return result
}

function ResolvedFields({
	form,
	controls,
	slots,
	values,
	children,
}: {
	readonly form: RuntimeForm
	readonly controls: ControlDefinitionRegistry
	readonly slots: RuntimeSlots
	readonly values: unknown
	readonly children?: ReactNode
}) {
	const resolved = useMemo(
		() =>
			resolveDefinition(
				form.definition,
				values as FormInput<StandardSchema>,
				form.context,
				{ disabled: form.disabled, readOnly: form.readOnly },
			),
		[form, values],
	)
	return (
		<>
			{resolved.ui.map((node) => (
				<GeneratedNode
					controls={controls}
					form={form}
					key={node.id}
					node={node}
					slots={slots}
				/>
			))}
			{children}
		</>
	)
}

function GeneratedNode({
	form,
	controls,
	slots,
	node,
}: {
	readonly form: RuntimeForm
	readonly controls: ControlDefinitionRegistry
	readonly slots: RuntimeSlots
	readonly node: ResolvedNode
}): ReactNode {
	if (!node.visible) {
		return null
	}
	switch (node.kind) {
		case "field":
			return (
				<GeneratedField
					controls={controls}
					form={form}
					node={node}
					slots={slots}
				/>
			)
		case "section": {
			const Slot = slots.Section as ComponentType<SectionSlotProps<unknown>>
			return (
				<Slot
					description={node.description as ReactNode}
					layoutProps={{
						"data-fp-layout": "grid",
						"data-fp-columns": node.columns as number,
					}}
					rootProps={structuralProps("section", node)}
					slotOptions={node.slotOptions as RuntimeSlotOptions | undefined}
					title={node.title as ReactNode}
				>
					{node.children?.map((child) => (
						<GeneratedNode
							controls={controls}
							form={form}
							key={child.id}
							node={child}
							slots={slots}
						/>
					))}
				</Slot>
			)
		}
		case "array":
			return (
				<GeneratedArray
					controls={controls}
					form={form}
					node={node}
					slots={slots}
				/>
			)
		case "render":
			return createElement(node.component as RenderNodeComponent, {
				disabled: node.disabled,
				readOnly: node.readOnly,
			})
	}
}

function GeneratedField({
	form,
	controls,
	slots,
	node,
}: {
	readonly form: RuntimeForm
	readonly controls: ControlDefinitionRegistry
	readonly slots: RuntimeSlots
	readonly node: ResolvedNode
}) {
	const path = String(node.path)
	const inputId = createDomId(useFormId(), path)
	const descriptionId =
		node.description === undefined ? undefined : `${inputId}-description`
	const FieldApi = form.api.Field as ComponentType<TanStackFieldProps>
	const Subscribe = form.api.Subscribe
	const Slot = slots.Field as ComponentType<FieldSlotProps<unknown>>

	return (
		<Subscribe selector={(state) => state.submissionAttempts}>
			{(attempts) => (
				<FieldApi name={path}>
					{(field) => {
						const errors = normalizeErrors(
							field.state.meta.errors,
							path,
							form.api.state.values,
						)
						const touched = field.state.meta.isTouched
						const displayErrors = touched || attempts > 0 ? errors : []
						const errorIds = displayErrors.map(
							(_issue, index) => `${inputId}-error-${index}`,
						)
						const control = controls[String(node.control)]
						if (
							control === undefined ||
							typeof control.component !== "function"
						) {
							throw new TypeError(`Unknown control "${String(node.control)}"`)
						}
						const Control = control.component as ComponentType<
							ControlProps<unknown, unknown, unknown>
						>
						return (
							<Slot
								control={
									<Control
										context={form.context}
										disabled={node.disabled}
										input={{
											id: inputId,
											name: path,
											ref(element) {
												if (element === null) {
													form.inputRefs.delete(path)
												} else {
													form.inputRefs.set(path, element)
												}
											},
											...(joinIds([descriptionId, ...errorIds]) === undefined
												? {}
												: {
														"aria-describedby": joinIds([
															descriptionId,
															...errorIds,
														]),
													}),
										}}
										meta={{
											dirty: field.state.meta.isDirty,
											touched,
											validating: field.state.meta.isValidating,
											errors,
											displayErrors,
											invalid: displayErrors.length > 0,
										}}
										options={(node.options ?? {}) as unknown}
										path={path}
										readOnly={node.readOnly}
										required={node.required === true}
										value={field.state.value}
										blur={field.handleBlur}
										setValue={(value) => field.handleChange(value)}
									/>
								}
								description={node.description as ReactNode}
								descriptionProps={
									descriptionId === undefined ? {} : { id: descriptionId }
								}
								disabled={node.disabled}
								errors={renderErrors(displayErrors, errorIds, slots, path)}
								label={node.label as ReactNode}
								labelProps={{ htmlFor: inputId, id: `${inputId}-label` }}
								readOnly={node.readOnly}
								required={node.required === true}
								rootProps={structuralProps("field", {
									...node,
									path,
									invalid: displayErrors.length > 0,
									dirty: field.state.meta.isDirty,
									touched,
									validating: field.state.meta.isValidating,
								})}
								slotOptions={node.slotOptions as RuntimeSlotOptions | undefined}
							/>
						)
					}}
				</FieldApi>
			)}
		</Subscribe>
	)
}

function GeneratedArray({
	form,
	controls,
	slots,
	node,
}: {
	readonly form: RuntimeForm
	readonly controls: ControlDefinitionRegistry
	readonly slots: RuntimeSlots
	readonly node: ResolvedNode
}) {
	const path = String(node.path)
	const arrayId = createDomId(useFormId(), path)
	const FieldApi = form.api.Field as ComponentType<TanStackFieldProps>
	const Subscribe = form.api.Subscribe
	const Slot = slots.Array as ComponentType<ArraySlotProps<unknown>>
	const Item = slots.ArrayItem
	return (
		<Subscribe selector={(state) => state.submissionAttempts}>
			{(attempts) => (
				<FieldApi mode="array" name={path}>
					{(field) => {
						const values = Array.isArray(field.state.value)
							? field.state.value
							: []
						const errors = normalizeErrors(
							field.state.meta.errors,
							path,
							form.api.state.values,
						)
						const displayErrors =
							field.state.meta.isTouched || attempts > 0 ? errors : []
						const errorIds = displayErrors.map(
							(_issue, index) => `${arrayId}-error-${index}`,
						)
						const canAdd = !node.disabled && !node.readOnly
						return (
							<Slot
								add={() => {
									if (canAdd) {
										field.pushValue(cloneItemDefault(node.itemDefault))
									}
								}}
								canAdd={canAdd}
								description={node.description as ReactNode}
								descriptionProps={{ id: `${arrayId}-description` }}
								errors={renderErrors(displayErrors, errorIds, slots, path)}
								invalid={displayErrors.length > 0}
								label={node.label as ReactNode}
								labelProps={{ id: `${arrayId}-label` }}
								rootProps={structuralProps("array", {
									...node,
									id: arrayId,
									path,
									invalid: displayErrors.length > 0,
									dirty: field.state.meta.isDirty,
									touched: field.state.meta.isTouched,
									validating: field.state.meta.isValidating,
								})}
								slotOptions={node.slotOptions as RuntimeSlotOptions | undefined}
							>
								{values.map((_value, index) => {
									return (
										<Item
											canMoveDown={canAdd && index < values.length - 1}
											canMoveUp={canAdd && index > 0}
											disabled={node.disabled}
											index={index}
											key={index}
											move={(toIndex) => {
												if (
													canAdd &&
													Number.isSafeInteger(toIndex) &&
													toIndex >= 0 &&
													toIndex < values.length
												) {
													field.moveValue(index, toIndex)
												}
											}}
											readOnly={node.readOnly}
											remove={() => {
												if (canAdd) {
													field.removeValue(index)
												}
											}}
											rootProps={structuralProps("array-item", {
												path: `${path}[${index}]`,
												disabled: node.disabled,
												readOnly: node.readOnly,
											})}
										>
											{node.itemChildren?.[index]?.map((child) => (
												<GeneratedNode
													controls={controls}
													form={form}
													key={child.id}
													node={child}
													slots={slots}
												/>
											))}
										</Item>
									)
								})}
							</Slot>
						)
					}}
				</FieldApi>
			)}
		</Subscribe>
	)
}

function ErrorSummary({ slots }: { readonly slots: RuntimeSlots }) {
	const form = useRuntimeForm()
	const formId = useFormId()
	const Subscribe = form.api.Subscribe
	const Slot = slots.ErrorMessage
	return (
		<Subscribe
			selector={(state) => ({
				errors: state.errors,
				submissionAttempts: state.submissionAttempts,
				values: state.values,
			})}
		>
			{(state) => {
				if (state.submissionAttempts === 0) {
					return null
				}
				const summaryIssues = normalizeErrors(
					state.errors,
					undefined,
					state.values,
				).filter(
					(issue) =>
						issue.path === undefined || !form.inputRefs.has(issue.path),
				)
				return summaryIssues.map((issue, index) => (
					<Slot
						issue={issue}
						key={`${issue.path ?? "form"}:${issue.message}`}
						rootProps={errorProps(
							`${formId}-summary-error-${index}`,
							issue.path,
						)}
					/>
				))
			}}
		</Subscribe>
	)
}

function normalizeErrors(
	errors: unknown,
	fallbackPath?: string,
	values?: unknown,
): FormIssue[] {
	const issues: FormIssue[] = []
	const visit = (value: unknown, inheritedPath?: string): void => {
		if (Array.isArray(value)) {
			for (const item of value) {
				visit(item, inheritedPath)
			}
			return
		}
		if (value === null || typeof value !== "object") {
			return
		}
		if ("message" in value && typeof value.message === "string") {
			const path = standardPath(
				"path" in value ? value.path : undefined,
				values,
			)
			issues.push(
				Object.freeze({
					source: "schema",
					message: value.message,
					...((path ?? inheritedPath ?? fallbackPath) === undefined
						? {}
						: { path: path ?? inheritedPath ?? fallbackPath }),
				}),
			)
			return
		}
		for (const [key, child] of Object.entries(value)) {
			visit(child, key === "form" || key === "fields" ? inheritedPath : key)
		}
	}
	visit(errors, fallbackPath)
	return issues.filter(
		(issue, index) =>
			issues.findIndex(
				(candidate) =>
					candidate.path === issue.path && candidate.message === issue.message,
			) === index,
	)
}

function standardPath(value: unknown, values: unknown): string | undefined {
	if (!Array.isArray(value) || value.length === 0) {
		return undefined
	}
	let current = values
	let result = ""
	for (const pathSegment of value) {
		const segment =
			pathSegment !== null &&
			typeof pathSegment === "object" &&
			"key" in pathSegment
				? pathSegment.key
				: pathSegment
		const segmentAsNumber = Number(segment)
		if (Array.isArray(current) && !Number.isNaN(segmentAsNumber)) {
			result += `[${segmentAsNumber}]`
		} else {
			result += result.length === 0 ? String(segment) : `.${String(segment)}`
		}
		current =
			current !== null && typeof current === "object"
				? (current as Record<PropertyKey, unknown>)[segment as PropertyKey]
				: undefined
	}
	return result
}

function renderErrors(
	issues: readonly FormIssue[],
	ids: readonly string[],
	slots: RuntimeSlots,
	path: string,
): readonly ReactNode[] {
	const Slot = slots.ErrorMessage
	return issues.map((issue, index) => (
		<Slot
			issue={issue}
			key={`${path}:${issue.message}`}
			rootProps={errorProps(ids[index] ?? `${path}-error-${index}`, path)}
		/>
	))
}

function focusFirstInvalid(
	formApi: {
		getFieldMeta(path: string): { readonly errors: unknown } | undefined
		readonly state: { readonly values: unknown }
	},
	inputRefs: ReadonlyMap<string, HTMLElement>,
): void {
	for (const [path, input] of inputRefs) {
		if (
			normalizeErrors(
				formApi.getFieldMeta(path)?.errors,
				path,
				formApi.state.values,
			).length > 0
		) {
			input.focus()
			return
		}
	}
}

function cloneItemDefault(value: unknown): unknown {
	const candidate = typeof value === "function" ? value() : value
	return structuredClone(candidate)
}

function useRuntimeForm(): RuntimeForm {
	const form = useContext(FormContext)
	if (form === null) {
		throw new Error("TanStack form context is missing")
	}
	return form
}

function useFormId(): string {
	const id = useContext(FormIdContext)
	if (id === null) {
		throw new Error("TanStack form id context is missing")
	}
	return id
}

function createDomId(prefix: string, value: string): string {
	return `${prefix}-${encodeURIComponent(value).replaceAll(".", "%2E")}`
}

function structuralProps(
	kind: StructuralNodeName,
	value: Readonly<Record<string, unknown>>,
): StructuralRootProps {
	const props = {
		"data-fp-node": kind,
		...(typeof value.id === "string" ? { id: value.id } : {}),
		...(typeof value.path === "string" ? { "data-fp-path": value.path } : {}),
		...(typeof value.className === "string"
			? { className: value.className }
			: {}),
		...(value.span === undefined ? {} : { "data-fp-span": String(value.span) }),
		"data-invalid": booleanData(value.invalid === true),
		"data-dirty": booleanData(value.dirty === true),
		"data-disabled": booleanData(value.disabled === true),
		"data-readonly": booleanData(value.readOnly === true),
		"data-required": booleanData(value.required === true),
		"data-touched": booleanData(value.touched === true),
		"data-validating": booleanData(value.validating === true),
	}
	return props as StructuralRootProps
}

function errorProps(id: string, path?: string): StructuralRootProps {
	return {
		"data-fp-node": "error-message",
		...(path === undefined ? {} : { "data-fp-path": path }),
		id,
	}
}

function booleanData(value: boolean): "" | undefined {
	return value ? "" : undefined
}

function joinIds(values: readonly (string | undefined)[]): string | undefined {
	const joined = values.filter((value) => value !== undefined).join(" ")
	return joined.length === 0 ? undefined : joined
}

function assertSlots(slots: Readonly<Record<string, unknown>>): void {
	for (const key of [
		"Field",
		"Section",
		"Array",
		"ArrayItem",
		"ErrorMessage",
		"Submit",
	] as const) {
		if (slots[key] === undefined) {
			throw new TypeError(`createFormKit requires a ${key} slot`)
		}
	}
}
