# fokit

Fokit is a code-first, schema-validated React form library with a React-free
core, explicit control registries, accessible default slots, generated React
forms, granular subscriptions, safe FormData parsing, an isolated React 19
Action adapter, and optional structural CSS.

## Install

```sh
npm install fokit zod
npm install react react-dom
```

React is a peer dependency. Fokit supports React `^18.0.0 || ^19.0.0`; React
19 Actions live only under `fokit/react19` so React 18 consumers can use the
main package without React 19-only declarations.

Fokit accepts any Standard Schema implementation. The examples use Zod because
Zod implements the Standard Schema contract.

## Package entries

- `fokit`: React kit APIs, default slots, native controls, hooks, generated
  forms, and shared public types.
- `fokit/core`: React-free store, path, definition, computed UI, and value
  helpers.
- `fokit/server`: safe FormData normalization, Standard Schema validation,
  `FormResult`, and `SubmissionIssue`.
- `fokit/react19`: React 19 Action components.
- `fokit/layout.css`: optional structural layout CSS. Import it explicitly:

```ts
import "fokit/layout.css"
```

The main JavaScript entry never imports the CSS automatically.

## Start here

- [Get started](https://r13v.github.io/fokit/get-started)
- [API reference](https://r13v.github.io/fokit/api)
- [React 19 Actions](https://r13v.github.io/fokit/guides/react-19-actions)
- [Fokit specification](docs/SPEC.md)
- [Styling boundary ADR](docs/adr/0001-styling-and-layout-boundary.md)
- [Russian repository tutorial](docs/tutorial.ru.md)
- [Architecture decisions](docs/adr/)
- [Release process](docs/releasing.md)

Copyable examples live in `docs-site/src/snippets/form-kit.tsx`,
`docs-site/src/snippets/basic-form.tsx`, and
`docs-site/src/snippets/server-action.ts`; `npm run test:docs` typechecks
them.

## Shortest kit

```tsx
import { createFormKit, nativeControls } from "fokit"

export const kit = createFormKit({
	controls: nativeControls,
})
```

Omitted slots resolve to English, unstyled, accessible structural markup.
Controls stay explicit because their value and FormData behavior are part of
the public form contract. Add custom controls by composing a registry, and
override any slot by passing a partial `slots` object.

## Configuration

Validation defaults are `mode: "submit"`, `revalidateMode: "change"`, and
`asyncDebounceMs: 0`. Pass `validation` to `useForm` or `AutoForm` to override
them per form instance.

`parseFormData` accepts safety limits for server parsing: `maxEntries` defaults
to `1000`, `maxPathLength` to `1024`, `maxDepth` to `32`, and `maxArrayIndex` to
`10000`. Framework request, multipart, file-count, and file-size limits should
run before calling `parseFormData`.
