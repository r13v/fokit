# fokit

Fokit is a code-first, schema-validated React form library with a React-free
core, application-owned controls and slots, generated React forms, granular
subscriptions, safe FormData parsing, an isolated React 19 Action adapter, and
optional structural CSS.

This repository contains the implemented v1 package. The existing public
`fokit@0.0.1` package on npm is a pre-implementation placeholder, not the
reviewed v1 release. Do not treat npm availability, GitHub Pages deployment, or
the final published version as verified until the release task confirms them.

## Install

After the reviewed v1 release is published:

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

- `fokit`: React kit APIs, controls, hooks, generated forms, and shared public
  types.
- `fokit/core`: React-free store, path, definition, computed UI, and value
  helpers.
- `fokit/server`: safe FormData normalization and Standard Schema validation.
- `fokit/react19`: React 19 Action components and result transport types.
- `fokit/layout.css`: optional structural layout CSS. Import it explicitly:

```ts
import "fokit/layout.css"
```

The main JavaScript entry never imports the CSS automatically.

## Start here

- [English tutorial](docs/tutorial.md)
- [Russian tutorial](docs/tutorial.ru.md)
- [Getting started](docs/getting-started.md)
- [Controls and slots](docs/controls.md)
- [Styling boundary](docs/styling.md)
- [React 19 Actions](docs/react19-actions.md)
- [Fokit specification](docs/SPEC.md)
- [Architecture decisions](docs/adr/)

Copyable examples live in `examples/` and are typechecked by
`npm run test:docs`.
