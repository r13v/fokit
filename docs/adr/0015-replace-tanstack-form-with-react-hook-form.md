# ADR 0015: Replace TanStack Form with React Hook Form

- Status: Accepted
- Date: 2026-08-04
- Amended by: [ADR 0016](0016-coordinate-managed-value-updates-before-react-hook-form.md)
- Supersedes: [ADR 0014](0014-add-experimental-tanstack-form-runtime.md)

## Context

Form, Please currently delegates editable form state to TanStack Form, but its
public API does not interoperate with the React Hook Form component, hook,
DevTools, and resolver ecosystem. Maintaining both runtimes or placing a
compatibility facade over either one would create two competing form models.

## Decision

Replace TanStack Form directly with React Hook Form. Do not retain a TanStack
entry point, compatibility adapter, or second form store. Support
`react-hook-form` `^7.55.0` with React 18 and 19; expose the unchanged typed
`UseFormReturn` as `form.api`, and provide it through `FormProvider`.

The definition's Standard Schema remains the only form-level validator. A
small Form, Please resolver preserves every issue, including issues without a
path, and returns transformed output after one parse. The Form, Please submit
wrapper retains `onSubmit({ value, input, form })` by capturing the editable
input before invoking raw RHF `handleSubmit`; direct `form.api.handleSubmit`
keeps ordinary RHF behavior and does not invoke the wrapper.

Schema input paths use RHF dot notation such as `speakers.0.name`. Form inputs
must be objects. Generated controls keep `ControlProps` and bind through
`useController`; generated arrays use `useFieldArray`, object items, and RHF's
stable row IDs. Definitions and complete synchronous default values remain
fixed for the hook lifetime, and hidden fields preserve their values.

`kit.useForm` exposes only Form, Please context and interaction options plus
the safe RHF validation schedule options `mode`, `reValidateMode`, and
`delayError`. Resolver ownership, all-issue collection, unregistration, and
focus policy remain runtime invariants. Public `FormBinding` contains only
`api`, `definition`, and `context`; form-wide disabled and read-only state stays
internal and continues to reach generated controls and slots.

## Considered Options

- Keeping TanStack Form would preserve the current runtime but would not meet
  the goal of native RHF ecosystem compatibility.
- Shipping both runtimes or emulating the previous API would preserve more
  compatibility but would create duplicate state, validation, and lifecycle
  models.
- Supporting every RHF 7 release would admit versions that do not declare
  React 18 compatibility and versions that cannot type transformed resolver
  output separately from editable input.
- Using the published Standard Schema resolver would reduce local code but
  would discard schema-level issues without a path.
- Passing through arbitrary RHF resolvers and all `UseFormProps` would make the
  definition schema and hidden-value behavior optional rather than invariant.

## Consequences

- The replacement is intentionally breaking: TanStack components, bracket
  paths, primitive-root forms, flat generated arrays, partial or asynchronous
  defaults, and direct no-argument `handleSubmit()` are not supported.
- Disabled generated values remain in the schema input, which deliberately
  differs from RHF's native disabled-value omission.
- RHF focuses invalid registered fields in registration order; Form, Please
  focuses the error summary only when RHF cannot focus a field.
- Compatibility is verified at both boundaries: React 18 with RHF 7.55, and
  React 19 with the latest RHF 7 release.
