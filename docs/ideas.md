# Type improvement ideas

This file records possible type improvements found during the documentation audit.
The audit does not implement these ideas.

## Ideas

### Preserve field value unions in choice options

`NativeSelectOptions`, `MuiSelectOptions`, `MuiRadioOptions`, and autocomplete
options accept general strings. Their choices are not restricted to the value
union of the selected field. A future control contract could pass the field
value type into its options type. This would reject misspelled choice values.

### Use discriminated resolved node types

`ResolvedNode` stores node-specific properties behind an `unknown` index
signature. Renderers must cast `path`, `component`, `columns`, labels, and slot
options after switching on `kind`. A discriminated union could make the
runtime boundary explicit and remove these casts.

### Preserve the complete definition contract in form bindings

`FormBinding` retains the schema and context types but erases the control,
slot-option, and grid parameters of `FormDefinition`. Keeping the complete
definition type could help integrations that inspect a binding without using
the owning `FormKit` methods.

### Review the accepted render-node content type

`ReactUiContent` accepts only `ReactElement | string`, while slot props use the
broader `ReactNode` type. Confirm whether definition labels and descriptions
must intentionally reject numbers, fragments, and other valid React content.

### Name public callback detail objects

Several callbacks use inline detail objects, such as `UseFormOptions.onSubmit`.
Named exported detail types could improve reuse in application handlers and
make generated API documentation easier to link.
