Read AGENTS.md.

Project map:
- `src/core` owns the React-free form definition, store, path, transaction,
  validation, array, and resolved-UI logic.
- `src/react` owns React 18-compatible rendering, controls, slots, hooks,
  native FormData parity, and classic submit behavior.
- `src/react19` owns the isolated React 19 Action adapter. Do not import it from
  the main package.
- `src/server` owns FormData normalization, safe path parsing, Standard Schema
  validation, and `FormResult` transport types.
- `docs-site` is the Vite-powered interactive documentation site published to
  GitHub Pages.

Conventions:
- Keep the core and server entries free of React runtime imports.
- Keep `fokit/react19` declarations unreachable from the main package so React
  18 consumers can install the package.
- Application controls own visible inputs. Fokit owns store state, submission
  wiring, hidden serializer entries, array markers, and structural data
  attributes.
- Use `parseFormData` for server Action boundaries instead of
  `Object.fromEntries`.

Verification:
- Run `npm run check` and `npm run knip` before reporting work done.
- `npm run verify` is the full package gate. `npm run site:verify` covers the
  docs-site build and browser suite.
