import type {
	FormDocumentEvent,
	FormEvent,
	FormRuntimeEvent,
} from "./form-events.js"

type WithoutSequence<Event> = Event extends unknown
	? Omit<Event, "sequence">
	: never

export type DocumentTransaction<Input> = WithoutSequence<
	Extract<FormDocumentEvent<Input>, { readonly type: "document/committed" }>
>

export type RestoreTransaction<Input> = WithoutSequence<
	Extract<FormDocumentEvent<Input>, { readonly type: "document/restored" }>
>

export type RuntimeTransaction<Context, Input = unknown> = WithoutSequence<
	FormRuntimeEvent<Context, Input>
>

export type FormTransaction<Input, Context> =
	| DocumentTransaction<Input>
	| RestoreTransaction<Input>
	| RuntimeTransaction<Context, Input>

export type FormDispatchResult<Input, Context> =
	| {
			readonly status: "committed"
			readonly event: FormEvent<Input, Context>
	  }
	| { readonly status: "cancelled" }

export type FormTransactionDispatch<Input, Context> = (
	transaction: FormTransaction<Input, Context>,
) => FormDispatchResult<Input, Context>
