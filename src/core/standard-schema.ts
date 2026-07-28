import type { StandardSchemaV1 } from "@standard-schema/spec"

export type StandardSchema<Input = unknown, Output = Input> = StandardSchemaV1<
	Input,
	Output
>

export type FormInput<Schema extends StandardSchemaV1> =
	StandardSchemaV1.InferInput<Schema>

export type FormOutput<Schema extends StandardSchemaV1> =
	StandardSchemaV1.InferOutput<Schema>
