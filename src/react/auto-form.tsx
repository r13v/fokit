"use client"

import type { StandardSchema } from "../core/index.js"
import type { ControlDefinitionRegistry } from "./control.js"
import type {
	AutoFormComponent,
	AutoFormProps,
	FormKitSlots,
} from "./create-form-kit.js"
import { ErrorSummary } from "./error-summary.js"
import { FieldsRenderer } from "./fields.js"
import { KitForm } from "./form.js"
import { useForm } from "./use-form.js"

export function createAutoFormComponent(
	controls: ControlDefinitionRegistry,
	slots: FormKitSlots,
): AutoFormComponent {
	function AutoForm<Schema extends StandardSchema, Context = unknown>({
		definition,
		defaultValues,
		context,
		disabled,
		readOnly,
		validation,
		beforeUpdate,
		onUpdate,
		onSubmit,
		children,
		...formProps
	}: AutoFormProps<Schema, Context>) {
		const form = useForm(definition, {
			defaultValues,
			context,
			disabled,
			readOnly,
			validation,
			beforeUpdate,
			onUpdate,
			onSubmit,
		})

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
