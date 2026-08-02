"use client"

import type { StandardSchema } from "../core/index.js"
import type { ControlDefinitionRegistry } from "./control.js"
import type {
	AutoFormComponent,
	AutoFormProps,
	RuntimeFormKitSlots,
} from "./create-form-kit.js"
import { ErrorSummary } from "./error-summary.js"
import { FieldsRenderer } from "./fields.js"
import { KitForm } from "./form.js"
import {
	assertFormKitOwnership,
	type FormKitDescriptor,
} from "./form-instance.js"
import { type FormRuntimeOptions, useFormBinding } from "./use-form.js"

export function createAutoFormComponent<
	Controls extends ControlDefinitionRegistry,
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions,
	KitContext = unknown,
>(
	controls: Controls,
	slots: RuntimeFormKitSlots,
	descriptor: FormKitDescriptor,
): AutoFormComponent<
	Controls,
	FieldSlotOptions,
	SectionSlotOptions,
	ArraySlotOptions,
	KitContext
> {
	function AutoForm<
		Schema extends StandardSchema,
		Context extends KitContext = KitContext,
	>({
		form,
		context,
		disabled,
		readOnly,
		validation,
		beforeUpdate,
		afterUpdate,
		onSubmit,
		children,
		...formProps
	}: AutoFormProps<
		Schema,
		Context,
		Controls,
		FieldSlotOptions,
		SectionSlotOptions,
		ArraySlotOptions
	>) {
		assertFormKitOwnership(form as never, descriptor, "kit.AutoForm")
		useFormBinding(form, {
			context,
			disabled,
			readOnly,
			validation,
			beforeUpdate,
			afterUpdate,
			onSubmit,
		} as FormRuntimeOptions<Schema, Context>)

		return (
			<KitForm {...formProps} controls={controls} form={form}>
				<ErrorSummary form={form} slots={slots} />
				<FieldsRenderer form={form} controls={controls} slots={slots} />
				{children}
			</KitForm>
		)
	}

	return AutoForm
}
