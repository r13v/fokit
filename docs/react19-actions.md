# React 19 Actions

Classic Fokit submission works in React 18 and React 19 through `kit.Form`,
`kit.AutoForm`, and `onSubmit`. React 19 server-first Actions are isolated in
`fokit/react19`.

```tsx
import { ActionForm, ActionSubmit } from "fokit/react19"
```

Do not import `ActionForm` or `ActionSubmit` from `fokit`; the main entry keeps
React 19-only APIs out of React 18 declarations.

## Client form

```tsx
<ActionForm
	action={saveProfileAction}
	defaultValues={defaultValues}
	definition={profileDefinition}
	kit={kit}
	result={state}
>
	<ActionSubmit>Save profile</ActionSubmit>
</ActionForm>
```

`ActionForm` keeps the supplied Action directly on the native form. It reflects
React pending state into Fokit, renders fields and hidden serializer inputs,
and applies returned `FormResult` objects after hydration.

`ActionSubmit` is an unstyled native submit button. It combines React
`useFormStatus` pending state with Fokit's disabled and submitting state.

## Server Action

Use `parseFormData` on the server:

```ts
import { parseFormData, type FormResult } from "fokit/server"

export async function saveProfileAction(
	formData: FormData,
): Promise<FormResult> {
	const result = await parseFormData(formData, profileActionSchema)

	if (!result.success) {
		return result.reply()
	}

	return { status: "success", reset: "submitted" }
}
```

See `examples/server-action.ts` for a complete typed example.

## Result transport

Action results are serializable:

```ts
type FormResult =
	| { status: "success"; reset?: "defaults" | "submitted" }
	| { status: "error"; issues: readonly SubmissionIssue[] }
```

Schema and server issues can target canonical dot paths. Form-level issues omit
`path`.

## Compatibility failures

`ActionForm` throws before dispatch when an active value cannot be represented
in native FormData:

- the field uses a `mode: "none"` control;
- a native control is invisible or disabled and has no serializer;
- the current React runtime does not expose React 19 Action support.

Classic `onSubmit` and React 19 `action` are separate modes. Use classic
submission when client-side validation and a client callback are authoritative.
Use Actions when server parsing and server validation own the submit boundary.
