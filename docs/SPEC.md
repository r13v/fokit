# Fokit Specification

- Status: Normative
- Supported React versions: 18 and 19
- Last updated: 2026-07-31

## Summary

Fokit is a code-first React form library that combines:

- schema-based validation;
- type-safe form state;
- declarative UI generation;
- an explicit registry of native or application-specific controls;
- accessible default structural slots that can be replaced partially or fully;
- granular subscriptions;
- client and server submission flows.

Fokit is not a compatibility layer for an existing form library and does not
include a migration API.

Fokit owns its store, mutation pipeline, validation lifecycle, and renderer
integration. It borrows proven ideas from other form libraries but is not a
wrapper around TanStack Form, React Hook Form, or another form manager.

The architecture separates three concerns:

1. A Standard Schema describes and validates form data.
2. A typed UI definition describes fields and layout.
3. A form kit maps control names to React renderers.

The form state lives in a single external store. React components subscribe to
the smallest state slice they need through `useSyncExternalStore`.

Fokit supports React 18 and React 19.
React 19 Form Actions are provided through an isolated `fokit/react19` entry
point so that the main entry point never imports React 19-only APIs. Support
for a future React major is added only after its compatibility is covered by
CI.

## Goals

- Infer form input and submission output types from Standard Schema.
- Render a complete form from a typed UI definition.
- Support custom design systems without coupling the core to a component
  library.
- Provide an unstyled, accessible structural fallback so a generated form can
  render before an application replaces every slot.
- Provide an explicit native HTML control registry for common values without
  inferring controls from the validation schema.
- Keep reusable form definitions portable across design systems and page,
  modal, and sidebar containers.
- Provide a small semantic layout contract without depending on Tailwind or
  another CSS framework.
- Offer an explicitly imported structural stylesheet without shipping a visual
  theme.
- Validate deep objects and arrays.
- Support typed deep paths such as `address.city` and `contacts.0.value`.
- Update only controls subscribed to changed state.
- Support synchronous and asynchronous Standard Schema implementations.
- Support both high-level generated forms and low-level manual composition.
- Route every value change through one transactional mutation pipeline.
- Support instance-level update interception without a middleware framework.
- Provide typed runtime context for derived UI and controls without mixing it
  into submitted form values.
- Keep imperative and reactive APIs visibly distinct.
- Preserve native HTML names, labels, ARIA relationships, focus, and
  `FormData`.
- Support classic `onSubmit` in React 18+.
- Support React 19 Actions without making them a requirement for the main
  package.
- Keep UI resolution and validation logic testable without rendering React.
- Keep server parsing safe for untrusted field names and bounded malformed
  input.

## Non-goals

Fokit does not:

- implement a compatibility or migration layer for another library;
- wrap or mirror another form state manager;
- provide its own validation language;
- infer a complete UI from Zod, JSON Schema, or another validation schema;
- accept arbitrary untrusted JSON form definitions from a server;
- provide a visual form builder;
- provide a general-purpose expression language;
- provide a general-purpose middleware, plugin, or effects pipeline;
- ship adapters for a specific UI component framework;
- ship a visual theme, control styles, typography, or a CSS reset;
- infer controls from schema metadata or automatically merge a control
  registry;
- require Tailwind or another CSS framework;
- include a wizard engine, autosave engine, or remote options loader;
- include a query adapter or own request, cache, cancellation, or retry state;
- require headless fields or render-node path declarations to authorize
  schema-typed value commands;
- support both controlled and uncontrolled public modes;
- generically reconstruct arbitrary invalid typed store values from a
  pre-hydration server submission;
- store React form state in Redux or another application-level store;
- put submit buttons or application workflow into a reusable form definition.

Remote JSON-defined forms are a separate product direction. If that becomes a
requirement, it should use JSON Schema, a serializable UI schema, and a
serializable rule AST rather than extending the code-first API with exceptions.

## Design principles

### One source of truth for validity

The Standard Schema is the source of truth for whether data is valid. Fokit
must not duplicate `minLength`, `email`, or other validators in its own schema
language.

UI properties such as `required` are HTML and presentation hints. They do not
replace the validation schema.

### Form input and output are different types

A Standard Schema may transform its input:

```ts
type FormInput<S> = StandardSchemaV1.InferInput<S>;
type FormOutput<S> = StandardSchemaV1.InferOutput<S>;
```

The store contains `FormInput<S>`. A successful submission produces
`FormOutput<S>`.

Validation must not silently replace input state with transformed output.

### One control discriminator

A field selects a renderer with one property:

```ts
control: 'select'
```

Fokit must not introduce overlapping `type` and `display` discriminators.
Value compatibility is checked between the selected path and the registered
control.

### Automatically tracked reactive dependencies

Derived UI properties use resolver functions that read the paths they depend on:

```ts
visible: ({ kind }) => kind === 'company'
```

The resolver receives a read-only proxy whose properties are canonical form
paths. Fokit records each property read and reuses the result until one of
those values or the runtime context reference changes. When a resolver takes a
different branch, the next evaluation replaces its tracked path set.

Resolver functions are synchronous and pure. The values proxy is valid only
during the resolver call. Rest destructuring, spread, and property enumeration
are rejected because they do not identify a finite dependency set. Fetching
remote data belongs to an application data layer or to a control component.

### One store mode

Fokit exposes one external-store model and one `value`/`setValue` control
contract. It does not expose separate controlled and uncontrolled modes.

Native controls may optimize their implementation internally, but that must
not change the public form or control API.

### One mutation boundary

Every value-changing command is normalized into a transaction and committed
atomically. This includes updates from controls, imperative commands, array
operations, resets, batches, and hidden-field value policies.

An instance may provide one synchronous `beforeUpdate` hook and one
`onUpdate` hook. Fokit does not expose an ordered middleware chain. The same
pipeline is used regardless of where an update originated.

### Runtime context is not form data

Applications may pass typed runtime context to a form instance. Derived UI
resolvers and controls can read it, but context is not copied into `values`,
validated by the Standard Schema, marked dirty, serialized to `FormData`, or
included in submission output.

The application replaces the context value when external data changes. Fokit
treats context as read-only input and reevaluates context-dependent UI without
making the context update a form-value transaction. If the new UI state
activates an explicit `valuePolicy`, that policy still uses the normal mutation
pipeline.

### Registry instead of embedded components

Reusable definitions refer to controls by name. React components are registered
once in a form kit. A form definition does not embed a renderer for every field.
An explicit `render` node is a React-only escape hatch for form-local content;
it is not a field and owns none of the control, accessibility, or `FormData`
contract.

### Styling-neutral core with an optional structural layer

The core owns semantic layout intent and a stable DOM attribute protocol, not a
design system. Applications own controls, typography, colors, and component
styling.

Consumers that want ready-to-use responsive structure may explicitly import
`fokit/layout.css`. This stylesheet covers only grid, gaps, and responsive
layout. It is not imported by the JavaScript entry point and is not required
for correct form behavior.

### Native form behavior remains available

Controls receive a native `name`, IDs, ARIA relationships, and a ref callback.
Controls are responsible for attaching these properties to the appropriate DOM
element or hidden input.

Fokit disables browser constraint validation on its generated native form.
Native `required` and related attributes remain useful for semantics, ARIA, and
styling, while Standard Schema remains the only validation authority.

## Package exports

Fokit ships as one npm package with subpath exports:

```ts
// React-free core
import {
  resolveUi,
} from 'fokit/core';

// React 18 and 19
import {
  createDefaultSlots,
  createFormKit,
  defineControl,
  nativeControls,
  useArrayField,
  useField,
  useForm,
  useFormState,
  useValue,
  type DefaultSlotsI18n,
  type NativeSelectOptions,
  type NativeTextOptions,
} from 'fokit';

// React 19 only
import {
  ActionForm,
  ActionSubmit,
} from 'fokit/react19';

// No React runtime dependency
import {
  parseFormData,
  type FormResult,
} from 'fokit/server';

// Optional responsive structure; never imported automatically
import 'fokit/layout.css';
```

Package metadata:

```json
{
  "type": "module",
  "license": "MIT",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      },
      "default": "./dist/index.js"
    },
    "./core": {
      "import": {
        "types": "./dist/core.d.ts",
        "default": "./dist/core.js"
      },
      "require": {
        "types": "./dist/core.d.cts",
        "default": "./dist/core.cjs"
      },
      "default": "./dist/core.js"
    },
    "./react19": {
      "import": {
        "types": "./dist/react19.d.ts",
        "default": "./dist/react19.js"
      },
      "require": {
        "types": "./dist/react19.d.cts",
        "default": "./dist/react19.cjs"
      },
      "default": "./dist/react19.js"
    },
    "./server": {
      "import": {
        "types": "./dist/server.d.ts",
        "default": "./dist/server.js"
      },
      "require": {
        "types": "./dist/server.d.cts",
        "default": "./dist/server.cjs"
      },
      "default": "./dist/server.js"
    },
    "./layout.css": "./dist/layout.css",
    "./package.json": "./package.json"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "sideEffects": [
    "**/*.css"
  ],
  "files": [
    "dist"
  ]
}
```

Fokit ships ESM and CommonJS from one explicit export map; unsupported deep
imports are intentionally closed. The ESM files are canonical, and both
formats preserve module-level `"use client"` directives. Public declarations
support TypeScript 5.4 and newer and are tested against the oldest supported
and current TypeScript releases.

The main declarations are compiled and tested against the lowest supported
React 18 types. React 19-only types must not appear in declarations reachable
from the main entry point.

Fokit has no peer dependency on Zod, Valibot, or another schema library.
Schemas satisfy the Standard Schema interface structurally; consumers do not
install an adapter for a supported Standard Schema implementation.

The `fokit/react19` requirement is documented and checked at runtime because a
single npm package cannot assign a narrower peer range to one subpath. A
separate npm package for the React 19 adapter is unnecessary unless subpath
versioning becomes difficult in practice.

The package exposes `./layout.css` as a CSS subpath. The main JavaScript and
declaration entry points have no CSS side effect.

The supported subpaths are:

- `fokit` for React hooks, components, controls, and convenience re-exports;
- `fokit/core` for `resolveUi`, path utilities, and other
  DOM-free, React-free operations;
- `fokit/react19` for React 19 Action components;
- `fokit/server` for safe `FormData` normalization and validation;
- `fokit/layout.css` for the optional structural stylesheet.

React component and hook modules contain the `"use client"` directive.
`fokit/core` and `fokit/server` never do. Before publishing, CI builds the
package, runs `npm pack`, installs the tarball into React 18, React 19, Vite,
and Next.js smoke fixtures, and verifies every public subpath.

Fokit is published under the MIT license, matching the permissive convention
used by the main open-source influences. The package name must be reserved
before the first public publish, and a matching `LICENSE` file must be present.
The packed tarball contains built artifacts and public documentation, never
local reference sources.

## Public documentation site

The public documentation site is an English-only Vocs site authored in
Markdown/MDX under `docs-site/src/pages`. Vocs owns navigation, search, syntax
highlighting, rich Twoslash output, static rendering, Markdown exports, and
dead-link checks.

The canonical public route map is locale-free:

- `/`
- `/get-started`
- `/api`
- `/types`
- `/advanced`
- `/faqs`
- `/guides/controls`
- `/guides/styling`
- `/guides/react-19-actions`
- `/guides/tutorial`

Production builds use the `/fokit` base path and
`https://r13v.github.io` Vocs base URL, producing public URLs under
`https://r13v.github.io/fokit`. Local development uses `/` unless a caller
provides an explicit environment override. The site must not preserve old hash
routes, locale-prefixed routes, locale switching, locale persistence, or
redirects for removed locale URLs. The retained Russian tutorial remains a
repository document and is not part of the Vocs page tree or navigation.

The deployable output is fully static and must include HTML, agent-readable
Markdown, `llms.txt`, `llms-full.txt`, `sitemap.xml`, and `robots.txt`. It must
not include API routes, server/function artifacts, worker entry points, or
dynamic Open Graph image routes.

Every displayed TypeScript or TSX code block is checked. Inline lessons use
Vocs' built-in Twoslash integration. Complete programs are included from
physical files under `docs-site/src/snippets/` and are covered by
`docs-site/tsconfig.docs.json`. Twoslash, Shiki, and the docs TypeScript
compiler are documentation-only dependencies; the published `fokit` package
does not depend on them or load a browser-side compiler.

The Interactive Fokit Lab is a Vocs client component. It uses the public
`nativeControls` registry and `createDefaultSlots({ i18n })` rather than local
control or slot implementations, and its generated Markdown fallback must be
meaningful in page Markdown and LLM artifacts.

## Core concepts

### Control

A control describes the value and options accepted by a renderer:

```tsx
import {
  defineControl,
  type ControlProps,
} from 'fokit';

type TextOptions = {
  placeholder?: string;
  autoComplete?: string;
};

function TextControl({
  value,
  setValue,
  blur,
  input,
  meta,
  options,
  disabled,
  readOnly,
  required,
}: ControlProps<string | undefined, TextOptions>) {
  return (
    <input
      ref={input.ref}
      id={input.id}
      name={input.name}
      value={value ?? ''}
      placeholder={options.placeholder}
      autoComplete={options.autoComplete}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      aria-invalid={meta.invalid || undefined}
      aria-describedby={input['aria-describedby']}
      onBlur={blur}
      onChange={(event) => setValue(event.currentTarget.value)}
    />
  );
}

export const text = defineControl<string | undefined, TextOptions>({
  component: TextControl,
  formData: {
    mode: 'native',
    serialize(value, { name }) {
      return value === undefined
        ? []
        : [{ name, value }];
    },
  },
});
```

Renderer contract:

```ts
type ControlProps<
  Value,
  Options = Record<string, never>,
  Context = unknown,
> = {
  path: string;
  value: Value;
  setValue(value: Value): void;
  blur(): void;

  input: {
    id: string;
    name: string;
    ref(element: HTMLElement | null): void;
    'aria-describedby'?: string;
  };

  meta: {
    dirty: boolean;
    touched: boolean;
    validating: boolean;
    errors: readonly FormIssue[];
    displayErrors: readonly FormIssue[];
    invalid: boolean;
  };

  options: Options;
  context: Readonly<Context>;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
};
```

`meta.errors` contains all current issues for the path.
`meta.displayErrors` applies the validation display lifecycle, and
`meta.invalid` is equivalent to `meta.displayErrors.length > 0`. Controls use
`meta.invalid` for `aria-invalid`; they must not infer accessible error state
from hidden issues.

The renderer receives `input.ref` as a normal property and attaches it to a DOM
element. Fokit does not require the renderer component itself to accept a React
`ref`. This keeps the contract compatible with both React 18 and React 19.

A control that reads application context declares the third `Context` generic
in `ControlProps` and `defineControl`. A form may select that control only when
its own context type satisfies the control's requirement. Context-agnostic
controls keep the default `unknown`.

The selected path value must be assignable to the control value type. This
allows a `string | undefined` control to render a string literal union, while
rejecting a string control for a number path. `null` and `undefined` must be
represented explicitly by the control type when they occur in the path type.
Controls declared with `any` or `unknown` values are not eligible for typed
field definitions.

Every control also declares how it participates in native `FormData`:

```ts
type FormDataEntrySpec =
  | {
      kind?: 'value';
      name: string;
      value: string;
    }
  | {
      kind: 'array';
      name: string;
    };

type ControlFormData<
  Value,
  Options = Record<string, never>,
  Context = unknown,
> =
  | {
      mode: 'native';
      serialize?(
        value: Value,
        details: {
          path: string;
          name: string;
          options: Readonly<Options>;
          context: Readonly<Context>;
        },
      ): readonly FormDataEntrySpec[];
    }
  | {
      mode: 'hidden';
      serialize(
        value: Value,
        details: {
          path: string;
          name: string;
          options: Readonly<Options>;
          context: Readonly<Context>;
        },
      ): readonly FormDataEntrySpec[];
    }
  | {
      mode: 'none';
    };
```

- `mode: 'native'` means a visible control attaches `input.name` to one or more
  successful native inputs, including radio groups and file inputs;
- `mode: 'hidden'` means the visible editor omits the name and Fokit renders
  serializer-produced hidden inputs during SSR and client rendering;
- an optional native serializer is used when a preserved field is invisible or
  disabled and therefore has no successful native input;
- `mode: 'none'` means the control is unavailable in `ActionForm`.

The serializer is synchronous and pure. It receives the same resolved options
and read-only runtime context as the renderer. Value entries produce hidden
string inputs. An array entry produces Fokit's reserved array marker so an
empty or single-item collection keeps its array shape. Parsing or coercing
value strings remains the Standard Schema's responsibility. Although
`input.name` always contains the canonical name, a `mode: 'hidden'` control
must not attach it to its visible editor.

`mode: 'hidden'` makes a control Action-compatible after hydration but does not
make a JavaScript-dependent widget interactive before hydration. Only
`mode: 'native'` can provide full progressive interaction.
`ActionForm` throws a descriptive compatibility error before dispatch in every
build when the resolved form contains a `mode: 'none'` field whose value has
not been removed, or a preserved invisible/disabled native control without a
serializer. It never silently submits an incomplete representation. Native
file controls therefore cannot preserve a hidden or disabled file value in an
Action form unless the application supplies another server-compatible
representation.

### Native controls

The main `fokit` entry exports `nativeControls`, an explicit registry of
unstyled native HTML controls:

```tsx
import { createFormKit, nativeControls } from 'fokit';

export const kit = createFormKit({
  controls: nativeControls,
});
```

The registry is not merged implicitly. Applications compose it with custom
controls when needed:

```tsx
const kit = createFormKit({
  controls: {
    ...nativeControls,
    money,
  },
});
```

The first native registry contains:

- `text`: `string | undefined`, with options
  `{ type?: NativeTextType; placeholder?: string; autoComplete?: string }`.
  `NativeTextType` is the closed union `'text' | 'email' | 'password' |
  'search' | 'tel' | 'url'`.
- `textarea`: `string | undefined`, with options
  `{ placeholder?: string; autoComplete?: string; rows?: number }`.
- `number`: `number | undefined`, with options
  `{ min?: number; max?: number; step?: number | 'any'; placeholder?: string }`.
  Empty input updates the store to `undefined`; invalid `NaN` values are not
  written.
- `date`: `string | undefined`, with options
  `{ min?: string; max?: string }`. The value is the native `YYYY-MM-DD`
  string.
- `time`: `string | undefined`, with options
  `{ min?: string; max?: string; step?: number | 'any' }`. The value is the
  native time input string. A numeric `step` is measured in seconds. Empty input
  updates the store to `undefined`.
- `select`: `string | undefined`, with options
  `{ emptyOption?: NativeSelectEmptyOption; options: readonly NativeSelectOption[] }`.
  A normal option has `{ value: string; label: string; disabled?: boolean }`.
  The optional empty option has `{ label: string; disabled?: boolean }`, renders
  with `value=""`, and maps that DOM value to `undefined`. It is required when
  the current store value is `undefined` and cannot be combined with a normal
  option whose value is `""`. Without `emptyOption`, a normal option whose value
  is `""` remains an empty string in the store.
- `checkbox`: `boolean`, with no options.
- `file`: `File | undefined`, with options `{ accept?: string }`. The input is
  uncontrolled and stores only the first selected file.

The registry and option contracts are exported as `nativeControls`,
`NativeTextType`, `NativeTextOptions`, `NativeTextareaOptions`,
`NativeSelectOptions`, `NativeSelectOption`, `NativeSelectEmptyOption`,
`NativeNumberOptions`, `NativeDateOptions`, `NativeTimeOptions`, and
`NativeFileOptions`.

All native controls preserve the supplied `input.id`, `input.name`,
`input.ref`, `input['aria-describedby']`, `meta.invalid`, `blur`, `disabled`,
`readOnly`, `required`, and supported native options. Text-like controls use
the native `readOnly` attribute. `select`, `checkbox`, and `file` expose
`aria-readonly`, remain enabled when read-only, and guard pointer, keyboard,
and change paths so the controlled value cannot mutate.

Native controls are a convenience registry, not a design system. They ship no
visual theme, do not import CSS, and do not add radio groups, checkbox groups,
multi-selects, or multiple-file controls.

### Form kit

A form kit registers controls and, optionally, structural slots for one
rendering integration:

```tsx
import { createFormKit, nativeControls } from 'fokit';

export const kit = createFormKit({
  controls: nativeControls,
});
```

`controls` remains required because controls define value compatibility and
native `FormData` behavior. Fokit never infers or silently merges controls
from the Standard Schema.

`slots` is optional and partial. Omitted slots resolve once per kit by merging
English default slots with the caller-provided overrides:

```tsx
import {
  createDefaultSlots,
  createFormKit,
  nativeControls,
} from 'fokit';

export const kit = createFormKit({
  controls: {
    ...nativeControls,
    money,
  },
  slots: {
    ...createDefaultSlots({
      i18n: {
        arrayAdd: 'Добавить',
        arrayRemove: ({ position }) =>
          `Удалить элемент ${position}`,
        arrayMoveUp: ({ position }) =>
          `Поднять элемент ${position}`,
        arrayMoveDown: ({ position }) =>
          `Опустить элемент ${position}`,
      },
    }),
    Field: CustomField,
  },
});
```

The resolved `kit.slots` object always contains all five slots. A fully custom
kit stays source-compatible by passing all five keys. An explicit invalid
JavaScript value such as `{ Field: undefined }` is rejected after merging.

A form may extend a shared kit with additional controls and partial resolved
slot replacements:

```tsx
const checkoutKit = kit.extend({
  controls: {
    money,
  },
  slots: {
    Field: CheckoutField,
  },
});
```

Extensions are immutable snapshots and may be chained. `controls` and `slots`
are individually optional, but `extend({})` is invalid. Added control names
must not collide with any inherited control; TypeScript rejects known
collisions and runtime validation covers untyped JavaScript. Slots intentionally
replace inherited resolved slots by name. A replacement `Field`, `Section`, or
`Array` slot must accept the inherited structural `slotOptions` contract and
may add optional capabilities.

Definitions retain the complete structural registry requirement of the kit
that created them. A base definition is compatible with an extended kit. An
extended definition is not compatible with its base or with a sibling whose
registry lacks any required name, even when its current UI happens to use only
inherited controls. Siblings with the same complete registry contract are
compatible; TypeScript cannot assign a fresh nominal identity to a function
call. Define portable forms through the lowest common base kit.

When a registry is intentionally widened to `ControlDefinitionRegistry`, its
known-name protection is erased. Extensions remain available and runtime
collision and unknown-control checks stay authoritative.

The default slots are an accessibility baseline, not a design-system wrapper
or visual theme. They render semantic unstyled HTML, preserve every supplied
slot prop, and do not import `fokit/layout.css`. Consumers that want the
optional responsive structure still import the CSS subpath explicitly.

Default array-item actions keep their localized strings as accessible names
and titles while showing compact `↑`, `↓`, and `❌` glyphs. The actions are
grouped into one row-level container so product styles can place them together
instead of treating them as sibling form fields.

Controls render only the interactive value editor. Structural slots have
separate responsibilities:

- `Field` renders a field label, description, control, and issue area;
- `Section` renders a structural group and its children;
- `Array` renders the collection frame and add action;
- `ArrayItem` renders one stable row and its remove/reorder actions;
- `ErrorMessage` renders one normalized issue.

This boundary lets a design system customize array rows without replacing the
array state logic or embedding React components in every definition.

`createDefaultSlots()` accepts optional i18n overrides for the array actions:

```ts
type DefaultSlotI18nValue<Data> =
  | string
  | ((data: Readonly<Data>) => string);

type DefaultArrayAddI18nData = {
  readonly label?: React.ReactNode;
};

type DefaultArrayItemI18nData = {
  readonly index: number;
  readonly position: number;
};

type DefaultSlotsI18n = {
  readonly arrayAdd:
    DefaultSlotI18nValue<DefaultArrayAddI18nData>;
  readonly arrayRemove:
    DefaultSlotI18nValue<DefaultArrayItemI18nData>;
  readonly arrayMoveUp:
    DefaultSlotI18nValue<DefaultArrayItemI18nData>;
  readonly arrayMoveDown:
    DefaultSlotI18nValue<DefaultArrayItemI18nData>;
};
```

Each i18n value is either a string or a synchronous function returning a
string. `arrayAdd` receives the array label as `ReactNode | undefined`.
`arrayRemove`, `arrayMoveUp`, and `arrayMoveDown` receive zero-based `index`
and one-based `position`. Partial i18n objects fall back to English for omitted
keys. Each factory call creates isolated components and does not mutate the
English defaults or the caller's overrides.

The public default-slot contract is exported as `createDefaultSlots`,
`DefaultSlotI18nValue`, `DefaultSlotsI18n`, `DefaultArrayAddI18nData`, and
`DefaultArrayItemI18nData`.

The shared structural contracts are:

```ts
type ReactUiContent = string | React.ReactElement;

type StructuralNodeName =
  | 'field'
  | 'section'
  | 'array'
  | 'array-item'
  | 'error-message';

type FokitNodeName = 'form' | StructuralNodeName;

type FokitCssVariable =
  | '--fokit-column-gap'
  | '--fokit-row-gap'
  | '--fokit-stack-gap'
  | '--fokit-array-item-gap';

type FokitStyle = React.CSSProperties &
  Partial<Record<FokitCssVariable, string>>;

type StructuralRootProps =
  Omit<React.HTMLAttributes<HTMLElement>, 'style'> & {
    'data-fokit-node': StructuralNodeName;
    ref?(element: HTMLElement | null): void;
    style?: FokitStyle;
  };

type SectionSlotProps<SlotOptions = never> = {
  rootProps: StructuralRootProps;
  layoutProps: React.HTMLAttributes<HTMLElement> & {
    'data-fokit-layout': 'grid';
    'data-fokit-columns': GridColumns;
  };
  title?: React.ReactNode;
  description?: React.ReactNode;
  slotOptions?: Readonly<SlotOptions>;
  children: React.ReactNode;
};

type FieldSlotProps<SlotOptions = never> = {
  rootProps: StructuralRootProps;
  label?: React.ReactNode;
  labelProps: React.LabelHTMLAttributes<HTMLLabelElement>;
  description?: React.ReactNode;
  descriptionProps: React.HTMLAttributes<HTMLElement>;
  slotOptions?: Readonly<SlotOptions>;
  control: React.ReactNode;
  errors: readonly React.ReactNode[];
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
};

type ArraySlotProps<SlotOptions = never> = {
  rootProps: StructuralRootProps;
  label?: React.ReactNode;
  labelProps: React.HTMLAttributes<HTMLElement>;
  description?: React.ReactNode;
  descriptionProps: React.HTMLAttributes<HTMLElement>;
  slotOptions?: Readonly<SlotOptions>;
  errors: readonly React.ReactNode[];
  invalid: boolean;
  canAdd: boolean;
  add(): void;
  children: React.ReactNode;
};

type ErrorMessageSlotProps = {
  rootProps: StructuralRootProps;
  issue: FormIssue;
};
```

Every structural slot receives mandatory `rootProps`. The slot must spread
them onto exactly one DOM root and preserve `rootProps.className` when adding
its own classes. Fokit does not add a wrapper around a custom slot, so a
`Fragment` cannot implement this contract.

`createFormKit` infers the independent `Field`, `Section`, and `Array`
`slotOptions` types from the registered slots. A matching `slotOptions`
property is then available on that node family in definitions. It is
resolvable and is unrelated to field control `options`.

`Section` additionally receives `layoutProps` for the element containing its
children:

```tsx
function Section({
  rootProps,
  layoutProps,
  title,
  children,
}: SectionSlotProps) {
  return (
    <section {...rootProps}>
      {title && <h2>{title}</h2>}
      <div {...layoutProps}>{children}</div>
    </section>
  );
}
```

The section root is the container-query boundary and the layout element is its
grid descendant. The application slot creates these elements; Fokit does not
insert hidden structural wrappers.

The array-item slot contract is:

```ts
type ArrayItemSlotProps = {
  rootProps: StructuralRootProps;
  index: number;
  disabled: boolean;
  readOnly: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  remove(): void;
  move(toIndex: number): void;
  children: React.ReactNode;
};
```

Fokit owns the React key and stable row identity; the slot owns presentation
and decides which supplied actions to render. Mutation callbacks are guarded
by the effective disabled/read-only state so a custom slot cannot bypass it.

`Field` and `Array` receive only already-displayable rendered errors. They do
not decide the validation lifecycle. Array errors are issues owned by the
array path itself, not duplicates of child-field issues. Label, description,
and error props contain the deterministic IDs and ARIA relationships that the
slots must preserve.

`AutoForm` renders an error summary before generated fields using the same
`ErrorMessage` slot. The summary contains displayable form-level issues and
displayable path issues that have no visible owning field or array node.
Fokit supplies a focus ref and `tabIndex={-1}` to summary errors. Submit focuses
the first matching summary issue as a fallback target. Manual composition can
select and place those issues elsewhere.

`Array.add()` creates a fresh item from the node's `itemDefault`. The callback
is a guarded no-op when `canAdd` is false. Fokit renders each row through
`ArrayItem`, owns its key, and passes the resulting rows as `Array.children`.

The five slot prop types are public and are declaration-tested. Adding optional
props is non-breaking; removing or changing an existing prop follows semantic
versioning.

The returned kit provides:

```ts
kit.defineForm(schema)({ ui });
kit.defineForm(schema).withContext<Context>({ ui });
kit.defineForm(schema).fragment(objectPath, nodes);
kit.defineForm(schema).fragment.withContext<Context>()(objectPath, nodes);
kit.extend({ controls?, slots? });

kit.Form;
kit.AutoForm;
kit.Fields;
kit.Submit;
```

`createFormKit` creates a root registry and `kit.extend` adds form-local
controls without a mutable builder or second renderer registration step.

`kit.Submit` is an unstyled native `<button type="submit">`. It accepts native
button props except `type`, passes through `className`, `style`, `aria-*`, and
`data-*`, and combines a consumer-supplied `disabled` value with the form's
effective submit-disabled state. It never allows a prop to force-enable a
disabled or submitting form. Applications may instead render their own
design-system `<Button type="submit">`; Fokit's form handler still enforces
disabled and concurrent-submit guards.

### Form definition

A definition combines a Standard Schema with a typed UI tree:

```tsx
import { z } from 'zod';

type AccountContext = {
  canEditCompanyName: boolean;
};

const accountSchema = z.object({
  name: z.string().min(1, 'Enter a name'),
  email: z.email('Enter a valid email'),
  kind: z.enum(['person', 'company']),
  companyName: z.string().optional(),
  contacts: z.array(
    z.object({
      value: z.string(),
    }),
  ),
});

export const accountForm = kit
  .defineForm(accountSchema)
  .withContext<AccountContext>({
    ui: [
      {
        kind: 'section',
        id: 'account',
        title: 'Account',
        columns: 2,
        children: [
          {
            kind: 'field',
            path: 'name',
            control: 'text',
            label: 'Name',
            options: {
              autoComplete: 'name',
            },
          },
          {
            kind: 'field',
            path: 'email',
            control: 'text',
            label: 'Email',
            options: {
              autoComplete: 'email',
            },
          },
          {
            kind: 'field',
            path: 'kind',
            control: 'select',
            label: 'Customer type',
            options: {
              options: [
                { value: 'person', label: 'Person' },
                { value: 'company', label: 'Company' },
              ],
            },
          },
          {
            kind: 'field',
            path: 'companyName',
            control: 'text',
            label: 'Company name',
            visible: ({ kind }) => kind === 'company',
            disabled: (_, { context }) => !context.canEditCompanyName,
            valuePolicy: 'unset',
          },
        ],
      },
      {
        kind: 'array',
        path: 'contacts',
        itemDefault: {
          value: '',
        },
        children: [
          {
            kind: 'field',
            path: 'value',
            control: 'text',
            label: 'Contact',
          },
        ],
      },
    ],
  });
```

Static and derived UI both use `kit.defineForm(schema)({ ui })`. Resolver
functions assigned to resolvable properties are contextually typed from the
schema input, so TypeScript autocompletes destructured paths and infers values
without imports or explicit type arguments. `withContext<Context>` binds
runtime context in the same step.

Default values are complete instance state and do not belong to a reusable
definition. A create page and an edit page can reuse the same definition with
different default values. “Complete” follows `FormInput<S>`: properties that
are optional in the schema input may still be absent.

`defineForm` validates runtime invariants once and throws a descriptive error
in every build for duplicate paths/IDs, invalid path or ID grammar, unknown
controls, invalid layout ranges, and unsupported `valuePolicy` values.
Production does not silently repair an invalid definition.

#### Definition fragments

The schema-bound `defineForm` function exposes `fragment(scope, nodes)` for a
definitely present, non-null, non-array object-valued schema path. Field and
array paths inside the fragment are relative to that scope. Resolver value
reads are relative as well and are tracked against their final absolute paths.
Sections keep the same scope, while array children retain the existing
item-relative array semantics. Optional or nullable object scopes continue to
use absolute definition nodes so their controls and resolvers retain the
ancestor's `undefined` or `null` possibility.

The returned schema-bound authoring nodes may be used directly as the root
`ui` value or spread into the root `ui` array. A fragment that needs structural
grouping contains a section. `fragment.withContext<Context>()` binds the same
runtime context requirement as a context-aware definition. A context-free
fragment may be used by a context-aware definition, and a fragment with a
context requirement may be used when the definition context satisfies that
requirement.

Fragments are erased before normalization. The normalized definition contains
only the four ordinary node kinds, absolute field and array paths, and the
existing indexes. There is no normalized fragment node and no separate
array-item fragment contract. Explicit section and render IDs inside fragments
remain global to the complete definition and must be unique across scopes.

### UI node types

Fokit's React UI tree contains four node kinds:

```ts
type UiNode = FieldNode | SectionNode | ArrayNode | RenderNode;

type GridColumns = 1 | 2 | 3 | 4;
type GridSpan = 1 | 2 | 3 | 4 | 'full';
```

A render node places arbitrary React content without pretending it is a field:

```tsx
{
  kind: 'render',
  id: 'price-preview',
  component: PricePreview,
  visible: ({ kind }) => kind === 'company',
}
```

Render nodes accept `visible`, `disabled`, and `readOnly` resolvers. An
invisible node is not mounted. A mounted component receives effective
`{ disabled, readOnly }` props after form and parent state are inherited and
may use public hooks inside `kit.Form` for values. The component owns applying
those flags to its arbitrary DOM and commands.

Fokit otherwise owns only node identity, ordering, and mounting. It does not
provide a path, field copy, issues, layout, accessibility, command ownership,
or `FormData` behavior. Render nodes may appear at the root or inside sections,
but not in `array.children`. `ActionForm` renders them and ignores them during
control compatibility checks. Because the definition embeds a component
reference, that definition is React-only and is not serializable across a
React Server Components boundary.

The React-free core transports the render component as an opaque typed payload.
It never imports or invokes React.

All definition, imperative, issue, subscription, and `FormData` paths use the
same canonical dot grammar: `address.city` and `contacts.0.value`. Bracket
syntax is not accepted. Empty segments, property names containing dots,
numeric object keys, prototype-mutating segments (`__proto__`, `prototype`,
`constructor`), and the reserved top-level `__fokit` segment are invalid.
Array indexes use `0` or a non-zero decimal without a leading zero;
negative, signed, decimal-point, and zero-padded indexes are non-canonical.
Every runtime path entry point applies the same checks.

#### Field node

```ts
type FieldNode = {
  kind: 'field';
  id?: string;
  path: FieldPath<FormInput>;
  control: keyof Controls;

  label?: Resolvable<ReactUiContent>;
  description?: Resolvable<ReactUiContent>;
  slotOptions?: Resolvable<FieldSlotOptions>;
  required?: Resolvable<boolean>;
  disabled?: Resolvable<boolean>;
  readOnly?: Resolvable<boolean>;
  visible?: Resolvable<boolean>;

  valuePolicy?: 'preserve' | 'unset';
  className?: string;
  span?: GridSpan;
  options?: Resolvable<ControlOptions>;
};
```

Defaults:

- `visible`: `true`;
- `disabled`: `false`;
- `readOnly`: `false`;
- `required`: `false`;
- `valuePolicy`: `'preserve'`.

`required` configures presentation, native attributes, and ARIA. Generated
forms set `noValidate`, so the Standard Schema remains authoritative.

The path value must be assignable to the selected control value as described
by the control compatibility rule. A `string | undefined` control may be used
for a string literal union. A date control is rejected for a number path.

`valuePolicy: 'unset'` is allowed only when the path can contain `undefined` or
is an optional object property. Hiding a required input path cannot make the
store violate its declared `FormInput` type.

#### Section node

```ts
type SectionNode = {
  kind: 'section';
  id: string;
  title?: Resolvable<ReactUiContent>;
  description?: Resolvable<ReactUiContent>;
  slotOptions?: Resolvable<SectionSlotOptions>;
  visible?: Resolvable<boolean>;
  disabled?: Resolvable<boolean>;
  readOnly?: Resolvable<boolean>;
  className?: string;
  columns?: GridColumns;
  span?: GridSpan;
  children: readonly UiNode[];
};
```

Sections are structural and do not add a value path.

#### Array node

```ts
type ArrayNode = {
  kind: 'array';
  id?: string;
  path: ArrayFieldPath<FormInput>;
  label?: Resolvable<ReactUiContent>;
  description?: Resolvable<ReactUiContent>;
  slotOptions?: Resolvable<ArraySlotOptions>;
  visible?: Resolvable<boolean>;
  disabled?: Resolvable<boolean>;
  readOnly?: Resolvable<boolean>;
  className?: string;
  span?: GridSpan;
  itemDefault: ArrayItem | (() => ArrayItem);
  children: readonly RelativeUiNode[];
};
```

Child paths are relative to the array item.

The `ReactUiContent` type applies to definitions created by a React form kit.
The `fokit/core` definition default remains `string`, so core does not import
React. Core treats presentation content and structural slot options as opaque:
it preserves their identity and does not traverse or freeze their internals.
Consumers treat these values as immutable after normalization; mutating an
opaque object does not notify the form store.

Array row identity is internal form metadata. Fokit must not require consumers
to add synthetic keys to submitted data.

`itemDefault` is a complete array item. A function is called for every append;
an object value is structurally cloned so rows never share mutable container
state.

A generated UI definition may contain a form path only once. Radio groups,
checkbox groups, and other multi-element widgets are one control for one node,
not repeated field nodes. Manual composition may subscribe to the same path in
multiple places, but only one mounted editor should write it.

Explicit node IDs must be unique within a definition. Field and array nodes
without an ID derive stable identity from their unique canonical path; sections
require an explicit ID because they have no data path.
Explicit node IDs are non-empty and contain no ASCII whitespace so they remain
valid deterministic DOM ID segments.

Arbitrary content nodes are not supported. Workflow content belongs in
`AutoForm` children, and layout-specific content can be composed manually
around `kit.Fields`.

### Resolved interaction state

Visibility and interaction state are inherited through the UI tree. For each
node, Fokit resolves:

```ts
effectiveVisible =
  parentVisible && resolve(node.visible, true);

effectiveDisabled =
  formDisabled || parentDisabled || resolve(node.disabled, false);

effectiveReadOnly =
  formReadOnly || parentReadOnly || resolve(node.readOnly, false);
```

`disabled` and `readOnly` are independent flags. `disabled` means unavailable:
native controls use disabled behavior, and form-level `disabled` stops
submission before submit-time validation. `readOnly` means present but locked:
controls remain enabled, named, and focusable, mutation is guarded, and form
submission remains available. If both flags are true, native disabled behavior
takes precedence. Fields receive the effective flags, sections pass them to
descendants, arrays apply them to add, remove, and reorder actions, and render
components receive them as props.

Both states retain values in the store, schema validation, and submission
output. `disabled` is an interaction policy, not an implicit data-omission
policy. Because native disabled inputs are not successful controls,
Action-compatible native controls use their serializer to emit the retained
value as hidden entries. Applications that must remove a value make it
invisible with `valuePolicy: 'unset'` or use an explicit transaction rather
than relying on DOM omission.

A hidden parent makes its entire subtree effectively hidden. Field
`valuePolicy` is evaluated against effective visibility, so hiding a section
has the same retention semantics as hiding each affected field directly.
`required` is not inherited.

Invisible nodes do not render their structural slot or visual control. In
`ActionForm`, preserved fields under an invisible field, section, or array
subtree still emit serializer-produced hidden inputs, and arrays emit their
shape marker, so stored values participate in native submission. Fields
removed by `valuePolicy: 'unset'` emit nothing. Fokit never hides the visual
control with CSS.

## Styling and layout

### Layout intent

The UI definition stores only portable layout intent:

- `columns` selects `1`, `2`, `3`, or `4` requested columns for a section;
- `span` selects `1`, `2`, `3`, `4`, or `'full'` tracks within its parent
  section;
- `className` is a static escape hatch on form, field, section, and array
  roots.

A section defaults to one requested column. A field defaults to a span of `1`.
A nested section or array defaults to `'full'`. A numeric span larger than the
parent section's requested columns is an invalid definition. A span on a
top-level node has no parent grid and is ignored.

`span` is relative to the immediate parent section, not to the page. The
optional stylesheet clamps a numeric span to the effective responsive column
count, while `'full'` always occupies the full current row.

Layout values are intentionally finite so they can be validated, typed, and
mapped to static CSS selectors. Form definitions do not contain Tailwind class
fragments, viewport breakpoints, or arbitrary CSS values.

### DOM styling protocol

Fokit exposes styling hooks on the native form and on structural slot roots:
`Field`, `Section`, the section layout element, `Array`, `ArrayItem`, and
`ErrorMessage`. Controls receive their typed control props and decide which
attributes belong on the actual input or composite widget.

Identity and layout attributes are namespaced:

- `data-fokit-node` identifies a form or structural node;
- `data-fokit-path` exposes the normalized field or array path when applicable;
- `data-fokit-span` exposes resolved layout span;
- `data-fokit-layout="grid"` identifies a section layout element;
- `data-fokit-columns` exposes the requested section column count.

Boolean UI state uses familiar unprefixed attributes and is present only when
true:

- `data-invalid`;
- `data-dirty`;
- `data-disabled`;
- `data-readonly`;
- `data-required`;
- `data-touched`;
- `data-validating`.

`data-invalid` means that an error is currently intended to be displayed under
the validation lifecycle. A hidden issue in the store does not set it. The form
root also exposes:

```text
data-validation-status="unvalidated | valid | invalid"
```

These attributes are public styling and testing API and follow semantic
versioning. Fokit does not copy them blindly onto controls because a control
may use Radix, React Aria, MUI, or another library with its own DOM and state
attribute conventions.

`className` is additive. Fokit includes the definition-level class in
`rootProps.className`; a slot that has its own classes concatenates them and
must not discard either set. Fokit does not depend on `clsx`,
`tailwind-merge`, or any framework-specific conflict resolver.

### Optional structural stylesheet

Consumers opt in explicitly:

```ts
import 'fokit/layout.css';
```

The file provides only structural behavior:

- one-column base layout;
- responsive section grids;
- field, section, array, and array-item spacing;
- numeric and full-row spans.

It does not provide colors, typography, borders, focus styles, control styles,
or a reset.

Responsiveness uses container queries rather than viewport media queries, so
the same definition adapts independently inside a page, modal, or sidebar:

- below `40rem`: one effective column;
- from `40rem` through `63.999rem`: up to two requested columns;
- from `64rem`: up to four requested columns.

The base one-column layout remains usable in browsers without container-query
support. The stylesheet progressively enhances it through `@container`; Fokit
does not use `ResizeObserver` or JavaScript layout measurement.

The stylesheet is declared in `@layer fokit` and uses low-specificity
`:where(...)` selectors. Applications can override it with normal author CSS.
Its public structural variables are:

```text
--fokit-column-gap
--fokit-row-gap
--fokit-stack-gap
--fokit-array-item-gap
```

Applications may set these variables on a form or any containing element.
Breakpoint values are stylesheet policy, not part of `FormDefinition`; an
application that needs different thresholds may replace or override the
structural stylesheet.

### UI resolver functions

Static and derived configuration share the same public shape:

```ts
type Resolvable<T, Input, Context> =
  | T
  | UiResolver<T, Input, Context>;
```

Form paths, their values, runtime context, and the resolver result are inferred
inside a form definition. The resolver receives a read-only path-value proxy
plus the form's read-only runtime context:

```ts
import type { NativeSelectOption } from 'fokit';

type AddressContext = {
  citiesByCountry: Readonly<
    Record<string, readonly NativeSelectOption[]>
  >;
};

const addressForm = kit
  .defineForm(addressSchema)
  .withContext<AddressContext>({
    ui: [
      {
        kind: 'field',
        path: 'city',
        control: 'select',
        options: ({ country }, { context }) => ({
          options: context.citiesByCountry[country] ?? [],
        }),
      },
    ],
  });
```

This is the dynamic options use case: `options` is a normal resolvable property,
not a second options API. Remote data is loaded by the application and supplied
through context. A function assigned directly to a resolvable property is
always a resolver; callbacks that are themselves control options belong inside
an options object.

Resolver functions:

- are synchronous;
- must be pure;
- cannot call form commands;
- track every canonical path read through the resolver's first argument;
- are recalculated only when a tracked value or the runtime context reference
  changes;
- replace their tracked paths after each recalculation, so conditional
  dependencies follow the active branch;
- reject rest destructuring, spread, and enumeration of the values proxy;
- can be evaluated by `resolveUi` outside React.

An asynchronous option list should be loaded by application code and passed to
the form or resolved by a control-specific data integration. It is not a
UI resolver.

## Form state

The store distinguishes input values, derived state, field metadata, and
submission state.

Public state:

```ts
type FormState<Input> = {
  values: Input;
  errors: {
    form: readonly FormIssue[];
    fields: ReadonlyMap<string, readonly FormIssue[]>;
  };

  isDirty: boolean;
  isTouched: boolean;
  isValidating: boolean;
  isSubmitting: boolean;

  validationStatus: 'unvalidated' | 'valid' | 'invalid';
  submitCount: number;
};
```

Fokit does not expose `canSubmit`. Consumers can derive application
policy from state, while `kit.Submit` does not become inaccessible merely
because the last validation result is invalid. Before the first validation,
validity is `unvalidated`, not implicitly `valid`.

`validationStatus` describes whether the current values have a complete
Standard Schema result. Manual or server issues affect displayed invalid state
but do not rewrite the schema result. The form root sets `data-invalid` when it
has at least one displayable issue of any source.

Every committed value change immediately makes `validationStatus`
`'unvalidated'` until the latest scheduled schema validation completes.
Existing displayable issues may remain visible during that interval.

### Default values, dirty, touched, and reset

`defaultValues` is a complete `FormInput<S>` baseline. Requiring a complete
baseline keeps every registered controlled field defined from the first render
and makes dirty tracking deterministic. Applications load asynchronous data
before creating the form or call `reset(loadedValues)` when it arrives.
`defaultValues` is read when the form instance is created; changing that
option's reference does not implicitly reset user edits.
Fokit snapshots arrays and plain objects at those boundaries; consumers must
not mutate values obtained from the form or retained non-plain objects in
place.

Dirty state is derived by comparing current input values with the baseline:

- primitives use `Object.is`;
- arrays and plain objects use recursive structural comparison;
- non-plain objects such as `File` use identity, while `Date` compares its
  timestamp.

Form values must be acyclic. Cyclic objects are outside the path, cloning,
dirty-checking, and `FormData` model.

A field is touched after its `blur()` command. `isDirty` and `isTouched` are
the aggregate of field metadata.

`reset()` restores the current baseline. `reset(nextValues)` replaces both the
values and baseline with a complete `FormInput<S>`. A successful reset clears
dirty, touched, schema/server/manual issues, validation status, submit count,
submission metadata, and internal error-exposure state. If a reset value
transaction is cancelled by `beforeUpdate`, none of the reset metadata is
applied.

If `beforeUpdate` replaces reset changes, the actual committed values become
the new baseline so a successful reset never begins dirty.

### Error model

```ts
type FormIssue = {
  path?: string;
  code?: string;
  message: string;
  source: 'schema' | 'server' | 'manual';
};

type SubmissionIssue = Omit<FormIssue, 'source'> & {
  source: 'schema' | 'server';
};
```

Standard Schema issue paths are normalized to Fokit field paths. An issue
without a path is a form-level issue. A schema issue path that cannot be
represented by Fokit's canonical grammar is retained as a form-level issue
rather than discarded or used for object traversal.

Default display policy:

- blur exposes issues owned by the blurred path;
- change validation exposes issues whose paths overlap the changed path;
- `validate(path)` exposes issues that overlap that path, while `validate()`
  exposes all issues;
- `validatePaths(paths)` exposes issues that overlap any path in the supplied
  subset;
- a submit attempt exposes all issues;
- `setErrors` is an explicit presentation command and immediately exposes the
  supplied manual or server issues.

“Overlap” means an ancestor, exact match, or descendant path. An issue may
therefore appear when a child edit invalidates its owning array or object, but
an unrelated cross-field issue remains hidden until its own path is exposed or
the whole form is submitted. Visibility is determined by the triggering
interaction, not merely by issue source.

For every path Fokit derives `displayErrors` from raw field errors and the
display policy. A field, control, and `data-invalid` all consume this same
derived list. An invisible field or array has no rendered local issue area;
once one of its issues is exposed, `AutoForm` places that issue in the form
error summary until a visible owner can render it.

A Standard Schema validation replaces all previous `source: 'schema'` issues
atomically. A value change clears server issues whose path overlaps the changed
path as an ancestor, exact match, or descendant; a form-level server issue
clears on any value change. Manual issues persist until `clearErrors` or reset.
Applications therefore use
`source: 'manual'` for durable application state and `source: 'server'` for a
rejected submission that should become stale after editing.

`form.setErrors(issues)` accepts only manual and server issues and replaces the
current issues of those supplied sources atomically. `clearErrors(path?)`
removes manual and server issues globally or at the selected path subtree.
It also removes exposure introduced solely by those imperative issues, without
undoing exposure caused by touch, validation, or submit. Schema issues are
owned exclusively by validation and reset; imperative APIs cannot forge or
selectively clear them.

### Validation lifecycle

```ts
type ValidationOptions = {
  mode: 'submit' | 'blur' | 'change';
  revalidateMode: 'submit' | 'blur' | 'change';
  asyncDebounceMs?: number;
};

type ValidationResult<Output> =
  | {
      success: true;
      value: Output;
    }
  | {
      success: false;
      issues: readonly FormIssue[];
    };
```

Defaults:

```ts
const defaultValidation = {
  mode: 'submit',
  revalidateMode: 'change',
  asyncDebounceMs: 0,
} satisfies ValidationOptions;
```

Validation options are form-instance behavior accepted by `useForm` and
`AutoForm`, not reusable-definition data. An instance may override any default.
There is no field-specific debounce API.

Rules:

- every trigger evaluates the complete Standard Schema; trigger paths affect
  scheduling and display, not schema slicing;
- `mode` controls the first validation of an unvalidated field or form;
- `revalidateMode` controls subsequent validation after an error or validation
  result exists;
- submit always validates the full form;
- `validate(path)` still runs the complete Standard Schema so cross-field
  refinements remain correct, updates all raw schema issues, and returns only
  issues whose path overlaps the selected path;
- `validatePaths(paths)` requires one or more typed schema paths, runs the
  complete Standard Schema once, updates all raw schema issues, returns only
  issues overlapping any selected path, and exposes that subset without hiding
  issues exposed by earlier interactions;
- a pathless form-level issue never overlaps a non-empty path subset; a
  stage-specific or object-specific refinement must return a canonical owning
  path when it should block that subset;
- `validate()` returns `ValidationResult<FormOutput<S>>`, while
  `validate(path)` and `validatePaths(paths)` return
  `Promise<readonly FormIssue[]>`;
- imperative validation does not mark fields touched or increment submit count;
- asynchronous validation exposes `isValidating`;
- change-triggered asynchronous validation uses `asyncDebounceMs`;
- blur, imperative, and submit validation are never debounced;
- stale asynchronous results must be discarded;
- successful full-form validation returns output data but does not replace
  input state.

Starting newer non-submit validation aborts the previous non-submit attempt
when possible and always ignores its stale result. The public guarantee is
latest-result-wins even when the schema does not observe an abort signal.
Submit cancels any scheduled debounce and starts its own immediate full
validation against the input snapshot captured for that attempt. A later edit
does not change that submit result or callback payload, but the result updates
current schema issues and `validationStatus` only if the store still matches
the validated snapshot.

`isValidating` becomes true only while schema validation is executing, not
while a change debounce is waiting. Because every schema validation is
form-wide, field and array `meta.validating` mirror the form-level flag rather
than implying that only one field validator is running.

An unexpected schema exception is not a validation issue. Imperative and
submit validation reject their promise after restoring pending state;
automatically scheduled change/blur validation reports the exception to the
host as an uncaught application error. In both cases Fokit atomically retains
the previous issue set and leaves the current values `unvalidated`.

## Value transactions

All value mutations use the same synchronous transaction boundary:

```ts
type ValueChange<Input> =
  | {
      type: 'set';
      path: FieldPath<Input>;
      value: unknown;
    }
  | {
      type: 'unset';
      path: FieldPath<Input>;
    };

type UpdateSource =
  | 'control'
  | 'imperative'
  | 'array'
  | 'reset'
  | 'valuePolicy';

type BeforeUpdateEvent<Input, Context> = {
  currentValues: Readonly<Input>;
  nextValues: Readonly<Input>;
  changes: readonly ValueChange<Input>[];
  source: UpdateSource;
  context: Readonly<Context>;
};

type UpdateEvent<Input, Context> = {
  previousValues: Readonly<Input>;
  values: Readonly<Input>;
  changes: readonly ValueChange<Input>[];
  source: UpdateSource;
  context: Readonly<Context>;
};

type UpdateHooks<Input, Context> = {
  beforeUpdate?(
    event: BeforeUpdateEvent<Input, Context>,
  ): false | readonly ValueChange<Input>[] | void;

  onUpdate?(event: UpdateEvent<Input, Context>): void;
};
```

The actual `set` variant preserves the relationship between `path` and
`value`; the simplified type above keeps the lifecycle example readable.
`unset` is typed only for optional paths.

`extendValueChanges(event, additions)` keeps that input-aware correlation. It
returns a frozen array containing the incoming proposal followed by additions,
or `undefined` when additions is empty so a hook can accept the original
proposal without rebuilding it.

`setValues(partial)` accepts a typed deep partial patch. Plain objects merge
recursively; arrays and non-plain objects replace as complete values. Commands
inside a batch and replacement changes returned by `beforeUpdate` are applied
in list order, so the last write to an overlapping path wins.

Array append, insert, remove, and move commands are normalized into one
`source: 'array'` transaction while preserving Fokit's internal row keys.
Invalid paths, non-array targets, and out-of-range indexes throw before a
transaction begins and do not invoke update hooks.

Value commands and replacement changes accept canonical schema paths whether
or not a UI node registers them. UI registration still owns generated
rendering, field metadata, and `FormData` serialization. Array structure
commands still require a normalized array node because they depend on
`itemDefault` and stable row metadata.

The pipeline is:

1. Normalize the initiating command or batch into proposed changes.
2. Apply them to a draft and expand required internal changes, such as a hidden
   field's `valuePolicy`, until the proposed UI/value state is stable.
3. Call `beforeUpdate` once with that complete proposal and its `nextValues`.
4. Cancel when it returns `false`, keep the proposal when it returns nothing,
   or normalize its returned changes as the replacement proposal.
5. Apply a replacement to a fresh draft and expand the same required internal
   changes without recursively invoking the hook.
6. Commit values and value-derived metadata atomically.
7. Notify subscribers and call `onUpdate` once with all effective changes.
8. Start validation according to the configured lifecycle.

The hooks are form-instance options, not reusable-definition effects. They are
synchronous, receive read-only snapshots, and cannot mutate the store
directly. A replacement returned from `beforeUpdate` is final for that hook
invocation; it does not recursively run the hook. An imperative command
started later from `onUpdate` creates a new transaction. A nested value command
during `beforeUpdate` is rejected; the hook must return replacement changes
instead.

Replacement changes pass the same path, command, and `valuePolicy` checks as
ordinary commands before commit. If `beforeUpdate` throws, the transaction is
aborted and the exception propagates. If `onUpdate` throws, the already
committed transaction is not rolled back and the exception propagates.

Error-only and metadata-only commands do not call these hooks. A no-op or
cancelled value transaction neither notifies value subscribers nor calls
`onUpdate`. `form.batch` produces one transaction, one `beforeUpdate` call, and
one `onUpdate` call. Nested batches join the outer batch; an exception before
commit aborts the whole batch. Initial construction from `defaultValues` is not
an update and does not call either hook.

A reset whose values already equal its target may still clear metadata without
calling update hooks. Any reset that changes values follows the normal
transaction pipeline before applying reset metadata.

## Rendering API

### Generated form

The shortest usage renders the definition automatically:

```tsx
<kit.AutoForm
  definition={accountForm}
  className="account-form"
  context={accountContext}
  validation={{
    mode: 'submit',
    revalidateMode: 'change',
  }}
  defaultValues={{
    name: '',
    email: '',
    kind: 'person',
    companyName: '',
    contacts: [],
  }}
  onSubmit={async ({ value }) => {
    await saveAccount(value);
  }}
>
  <kit.Submit>Save</kit.Submit>
</kit.AutoForm>
```

`value` is the successful Standard Schema output.

The children render after the generated UI and are intended for workflow
content such as submit, cancel, or navigation buttons. Submit configuration is
not stored in the reusable definition.

`kit.Form` and `kit.AutoForm` accept safe native form props directly:

```ts
type NativeFormProps = Omit<
  React.ComponentPropsWithoutRef<'form'>,
  | 'action'
  | 'children'
  | 'noValidate'
  | 'onReset'
  | 'onSubmit'
  | 'style'
> & {
  style?: FokitStyle;
};
```

This includes `id`, `className`, `style`, `autoComplete`, `aria-*`, and custom
`data-*` attributes. Fokit-owned event handlers, `noValidate`,
`data-fokit-*`, `data-validation-status`, and documented state attributes
cannot be replaced. `style` may set the public Fokit CSS variables for one
form. Reactive styling should use public state data attributes rather than a
resolver-based class-name API.

After hydration, Fokit intercepts a native reset event, prevents a DOM-only
reset, and calls `form.reset()` so a `<button type="reset">` keeps the
controlled store and rendered controls synchronized. Before hydration, the
browser's normal reset behavior restores the server-rendered defaults.

When `id` is omitted, Fokit derives deterministic form and field IDs from
React `useId`. Supplying an explicit form `id` makes it the ID prefix.

### Manual composition

Advanced consumers can create a form instance:

```tsx
function AccountEditor() {
  const form = useForm(accountForm, {
    defaultValues,
    context: accountContext,
    beforeUpdate: beforeAccountUpdate,
    onUpdate: handleAccountUpdate,
    onSubmit: async ({ value }) => {
      await saveAccount(value);
    },
  });

  return (
    <kit.Form form={form}>
      <kit.Fields />
      <AccountPreview form={form} />
      <kit.Submit>Save</kit.Submit>
    </kit.Form>
  );
}
```

`kit.Form` provides context and renders the native `<form>`. `kit.Fields`
renders the UI definition stored in the form instance.
`kit.Form` and `kit.Fields` in one composition must come from the same kit.
Their React context pairing is a runtime constraint that TypeScript cannot
detect across independently referenced kit components.

Consumers may omit `kit.Fields` and build a completely manual form using the
same instance and hooks.

`context`, `disabled`, `readOnly`, `validation`, `beforeUpdate`, and `onUpdate`
are instance-level options accepted by both `useForm` and `kit.AutoForm`.
Replacing the context reference updates context-dependent controls and
derived UI without itself marking the form dirty or calling the value-update
hooks. Any resulting hidden-field `valuePolicy` is a separate value change and
follows the documented transaction pipeline. Applications should keep the
context reference stable when its contents have not changed.

The definition, schema, and initial `defaultValues` are fixed for the lifetime
of a form instance. Applications call `reset(nextValues)` for new record data
or mount a new keyed instance for a different definition/schema. Other
instance options and callbacks use their latest committed React values without
recreating the store or capturing stale render closures.

Applications that need instance ownership outside React create the complete
classic instance explicitly:

```tsx
const accountFormInstance = createForm(accountForm, {
  defaultValues,
  context: initialAccountContext,
});

function AccountEditor({ context, disabled }) {
  const form = useForm(accountFormInstance, {
    context,
    disabled,
    onSubmit: async ({ value }) => {
      await saveAccount(value);
    },
  });

  return (
    <kit.Form form={form}>
      <kit.Fields />
      <kit.Submit>Save</kit.Submit>
    </kit.Form>
  );
}
```

`createForm` belongs to the main React entry point and returns the same
`FormInstance` type as the creation overload of `useForm`. The React-free core
continues to expose `createFormStore`.

`useForm(existingForm, runtimeOptions)` returns the exact supplied object.
It applies context and runtime options together after commit. The instance
keeps its definition and baseline values. On unmount, it restores the latest
external context and runtime options and drops React-owned callbacks. One
instance may have only one active `useForm` binding; a concurrent binding is a
runtime error. React Strict Mode setup-cleanup replay is not a concurrent
binding.

`replaceContext(context)` replaces context without changing runtime options.
`replaceOptions(options)` fully replaces disabled, read-only, validation,
transaction-hook, and classic-submit behavior without changing context.
Omitted options return to defaults. An imperative replacement while React is
bound applies immediately; the next committed binding update reapplies the
declarative runtime options. Server applications create external instances per
request and do not share mutable form instances between requests.

The external store returns cached immutable snapshots. `useSyncExternalStore`
receives a `getServerSnapshot` based on the same initial `defaultValues` and
resolved UI as the first client render. Consumers must supply semantically
equivalent `defaultValues` and context on server and client. Store creation,
derived UI resolution, and deterministic ID generation do not call lifecycle
hooks during render or React Strict Mode replay.

## Reactive API

Reactive hooks accept the form instance explicitly. This preserves its generic
types instead of recovering an untyped instance from context:

```tsx
const email = useField(form, 'email');
const kind = useValue(form, 'kind');

const isDirty = useFormState(
  form,
  (state) => state.isDirty,
);
```

Field result:

```ts
type FieldBinding<Value> = {
  value: Value;
  setValue(value: Value): void;
  blur(): void;
  focus(): void;

  meta: {
    dirty: boolean;
    touched: boolean;
    validating: boolean;
    errors: readonly FormIssue[];
    displayErrors: readonly FormIssue[];
    invalid: boolean;
  };
};
```

Array fields use a dedicated binding:

```ts
type ArrayBinding<Item> = {
  items: readonly {
    key: string;
    index: number;
  }[];

  meta: {
    dirty: boolean;
    touched: boolean;
    validating: boolean;
    errors: readonly FormIssue[];
    displayErrors: readonly FormIssue[];
    invalid: boolean;
  };

  append(value: Item): void;
  insert(index: number, value: Item): void;
  remove(index: number): void;
  move(from: number, to: number): void;
};

const contacts = useArrayField(form, 'contacts');
```

`items` exposes stable render keys without adding them to form data. Item
values remain path subscriptions such as
`useField(form, \`contacts.${index}.value\`)`, avoiding whole-array rerenders
for one field edit.

On insert and move, touched, dirty, exposure, manual-issue, and still-displayed
schema-issue metadata follow the stable row key and are reindexed to its new
path. Server issues overlapping the changed array clear under the normal stale
server-error rule. Removing a row removes its metadata. A new row starts
untouched and derives dirty state against the array baseline. Array binding
errors are issues owned directly by the array path; child-field issues remain
on their child bindings. Array `dirty` covers its value subtree, and array
`touched` is true when any descendant has been blurred.

`useValue` subscribes only to the selected path. `useFormState` subscribes only
to the selector result. Selector equality defaults to `Object.is`; callers
selecting an object or array should return a stable reference or provide an
explicit equality function:

```ts
type FormStateSelectorOptions<Selected> = {
  equalityFn?: (previous: Selected, next: Selected) => boolean;
};
```

This options object is the optional third argument to `useFormState`.

## Imperative API

The form instance is stable and explicitly non-reactive:

```ts
form.getValues();
form.getValue('email');

form.setValue('email', value);
form.setValues(partial);
form.unsetValue('companyName');

form.append('contacts', { value: '' });
form.insert('contacts', 0, { value: '' });
form.remove('contacts', 0);
form.move('contacts', 0, 1);

form.setErrors(issues);
form.clearErrors();
form.clearErrors('email');

await form.validate();
await form.validate('email');
await form.validatePaths(['profile', 'contacts']);
await form.submit();

form.reset();
form.reset(nextDefaultValues);
form.focus('email');
form.focusFirstError(['profile', 'contacts']);

form.batch(() => {
  form.setValue('kind', 'person');
  form.unsetValue('companyName');
});

const unsubscribe = form.subscribe(
  selector,
  listener,
  { equalityFn },
);
```

Reading through this API does not subscribe a React component. Components that
need reactive values use `useField`, `useValue`, or `useFormState`.

Fokit does not provide a hook named `useFormApi` that returns a non-reactive
snapshot.

`focusFirstError(paths?)` searches displayed issues in schema order. It focuses
the first mounted, visible, enabled, editable field in the optional overlapping
path subset, then a mounted summary target. It returns whether focus moved. An
omitted subset includes form-level issues; an explicitly empty subset returns
`false`.

Imperative subscriptions use the same selector equality semantics and notify
after a committed transaction. Calling the returned function unsubscribes.

For a classic `kit.Form` or `kit.AutoForm` instance, `form.submit()` uses the
same lifecycle as a native submit and delegates through the attached form's
`requestSubmit()` so native controls and array markers are included in
`FormData`. It returns the lifecycle's `Promise<void>`: invalid or disabled
submission resolves without calling `onSubmit`, while a callback exception
rejects. It rejects with a descriptive error when no form is attached rather
than inventing `FormData` from the store. `form.focus(path)` and field
`focus()` are guarded no-ops when the path has no mounted, visible, enabled,
editable focus target.

## Hidden fields

Visibility and value retention are separate:

```ts
const companyNameUi = {
  visible: companyVisible,
  valuePolicy: 'unset',
};
```

When a field transitions from visible to hidden:

- `'preserve'` retains its value and excludes only its UI;
- `'unset'` removes its value once.

An automatic unset is folded into the current value transaction when
visibility changed because of that transaction. If a context change alone
hides the field, Fokit starts one `valuePolicy` transaction.

The validation schema decides whether a hidden value is allowed or required.
Fokit does not silently exclude hidden fields from schema validation.

This avoids making UI state an implicit validation rule.

## React 18 submission

The base package uses `onSubmit`:

```tsx
<kit.AutoForm
  definition={accountForm}
  context={accountContext}
  defaultValues={defaultValues}
  onSubmit={async ({ value, input, form }) => {
    await saveAccount(value);
    form.reset(input);
  }}
/>
```

Submit context:

```ts
type SubmitContext<Input, Output> = {
  value: Output;
  input: Input;
  form: FormInstance<Input, Output>;
  formData: FormData;
};
```

`onSubmit` and React 19 `action` are different modes and cannot be supplied
together.

Native submit calls `preventDefault()` and follows one lifecycle:

1. If the form is disabled, stop without validation or a callback.
2. Synchronously capture the input snapshot and native `FormData`, including
   the submitter, before submission state can alter rendered controls.
3. Increment `submitCount`, set `isSubmitting`, and validate the captured input
   with the complete Standard Schema.
4. If invalid, do not call `onSubmit`. When the captured input is still
   current, expose all submit issues and focus the first visible, enabled,
   editable invalid field, or the first summary error when no such field
   exists; otherwise do not install stale issues.
5. If valid, call `onSubmit` once with schema output, the captured input
   snapshot, the form instance, and captured `FormData`.
6. Clear `isSubmitting` in `finally`.

Concurrent submits share the same in-flight promise and do not start another
validation or callback. A thrown `onSubmit` error is rethrown after submission
state is restored; Fokit does not convert unexpected exceptions into field
issues. Success never resets automatically.

`kit.Submit` is disabled while the form is disabled or submitting, but not
merely because the last validation result is invalid. This keeps correction
and resubmission accessible.

## React 19 Actions

React 19 integration is isolated:

```tsx
import { useActionState } from 'react';
import {
  ActionForm,
  ActionSubmit,
} from 'fokit/react19';
import type { FormResult } from 'fokit/server';

const [result, action] = useActionState(
  saveAccountAction,
  null as FormResult | null,
);

<ActionForm
  kit={kit}
  definition={accountForm}
  context={accountContext}
  defaultValues={defaultValues}
  action={action}
  result={result}
>
  <ActionSubmit>Save</ActionSubmit>
</ActionForm>
```

`ActionSubmit` combines `useFormStatus` with Fokit's disabled and submitting
state. `ActionForm` reflects pending Action state into the Fokit instance. The
base `kit.Submit` uses only Fokit submission state and does not import
`useFormStatus`. `ActionSubmit` has the same unstyled native-button prop
contract as `kit.Submit`.

`ActionForm` keeps the supplied Action directly on the native form. It does not
wrap, prevent, asynchronously prevalidate, or replay a valid Action
submission. This preserves React's Action transition, submitter semantics,
`useFormStatus`, and progressive enhancement without creating a race between a
controlled store snapshot and later `FormData`.

The authoritative submit validation therefore runs through `parseFormData` on
the server with the same Standard Schema. Client `change` and `blur`
validation modes still provide early feedback, but `mode: 'submit'` is
server-first in `ActionForm`. After hydration, the submit event records the
attempt and captures the current typed input snapshot for reset handling; it
prevents dispatch only when the form is disabled or an Action is already
pending. Before hydration or without JavaScript, the browser submits directly.
When an error result arrives, `ActionForm` exposes it and focuses the first
visible, enabled, editable invalid field, or the first summary error when no
such field exists.

The server result is deliberately small and serializable:

```ts
type FormResult =
  | {
      status: 'success';
      reset?: 'defaults' | 'submitted';
    }
  | {
      status: 'error';
      issues: readonly SubmissionIssue[];
    };
```

The adapter synchronizes returned issues with the Fokit store. Success retains
controlled values by default. `reset: 'defaults'` restores the existing
baseline, which suits a create form. `reset: 'submitted'` makes the captured
submitted values the new baseline, which marks a saved edit form clean. Edits
made while the Action was pending remain current and are dirty relative to
that submitted baseline. Returning different canonical saved values is
application state synchronization and is handled through `form.reset(values)`
or a new form instance, not through `FormResult`.

Applying an error result records a submit attempt when there is no matching
hydrated client attempt, so returned server and schema issues are immediately
displayable after a pre-hydration submission without double-incrementing
`submitCount` for a hydrated one.

After hydration, controlled values remain in the store across an error result.
If values changed while the Action was pending, returned schema issues are
discarded and current schema validation is scheduled. Returned server issues
are filtered through the normal stale-error rule using every path changed
since that submission; a form-level server issue is stale after any such
change. This is equivalent to applying the result at submission time and then
replaying the later edits.

In a fully pre-hydration/no-JavaScript round trip, Fokit does not echo an
unvalidated raw payload into the typed store. Applications that require this
for a particular form map serializable action state back to valid
`defaultValues`; Fokit does not add a second raw-value store to solve it
generically. For the same reason, `reset: 'submitted'` is applied only when
ActionForm captured a typed submission snapshot; otherwise it is a no-op and
the application supplies new `defaultValues` explicitly.

An Action exception propagates to React's nearest error boundary. Fokit does
not synthesize an issue for an unexpected server failure. React's automatic
reset of uncontrolled form elements does not change the Fokit store because
Fokit exposes one controlled store mode.

## Server API

The server helper normalizes `FormData` and validates it:

```ts
'use server';

import {
  parseFormData,
  type FormResult,
} from 'fokit/server';

export async function saveAccountAction(
  previousResult: FormResult | null,
  formData: FormData,
) {
  const result = await parseFormData(
    formData,
    accountSchema,
  );

  if (!result.success) {
    return result.reply();
  }

  await saveAccount(result.value);

  return {
    status: 'success',
  } satisfies FormResult;
}
```

Result:

```ts
type ParseResult<Output> =
  | {
      success: true;
      value: Output;
    }
  | {
      success: false;
      issues: readonly SubmissionIssue[];
      reply(
        additionalIssues?: readonly SubmissionIssue[],
      ): FormResult;
    };

type ParseFormDataOptions = {
  maxEntries?: number;   // default 1_000
  maxPathLength?: number; // default 1_024
  maxDepth?: number;     // default 32
  maxArrayIndex?: number; // default 10_000
};

declare function parseFormData<S extends StandardSchemaV1>(
  formData: FormData,
  schema: S,
  options?: ParseFormDataOptions,
): Promise<ParseResult<FormOutput<S>>>;
```

`parseFormData` uses one canonical, web-compatible encoding:

- dot paths create objects: `address.city`;
- decimal path segments create arrays: `contacts.0.value`;
- repeated identical value names create an array in entry order;
- an `ArrayNode` and an array-aware control emit a reserved marker so zero,
  one, or many entries at that path consistently normalize as an array;
- an unchecked checkbox contributes no value; a checked checkbox contributes
  its native value, commonly `"on"` unless the control specifies another;
- numbers, dates, booleans, empty strings, and JSON-looking text remain strings;
- `File` values remain `File` values;
- primitive coercion and business validation belong to Standard Schema.

The exact array marker is a repeated reserved entry whose name is
`__fokit.array` and whose value is the canonical array path:

```html
<input type="hidden" name="__fokit.array" value="contacts">
```

An array marker declares shape but never supplies a data value. Multiple array
paths produce multiple entries with the same reserved name. Unknown
`__fokit.*` entries, malformed marker paths, and duplicate markers for the
same array path are normalization errors rather than ignored input.

Property names containing dots, empty segments, leading numeric segments,
numeric object keys, and non-canonical array indexes are unsupported. A
generated field path therefore has exactly one unambiguous representation.
Mixing scalar and nested use of the same prefix, mixing repeated and explicitly
indexed forms of one collection, or submitting sparse/non-contiguous indexes
is a normalization error rather than a guessed structure.

Fokit reserves the `__fokit` top-level path namespace for structural markers.
Reserved metadata is removed before schema validation and is never included in
the parsed value. `SubmitContext.formData` is the protocol-level native
`FormData` and may contain these markers; applications forwarding it to a
server should use `parseFormData` rather than `Object.fromEntries`.

### Safe normalization

`FormData` names are untrusted server input. Normalization:

- rejects `__proto__`, `prototype`, and `constructor` path segments;
- creates intermediate records without inheriting from `Object.prototype`;
- rejects duplicate structural collisions;
- applies configurable limits with safe defaults for entry count, path length,
  nesting depth, and maximum array index;
- returns a form-level issue instead of partially parsing malformed input.

Normalization failures use `source: 'server'` and a stable
`code: 'invalid_form_data'`. Schema failures retain `source: 'schema'`.

Framework request-body, multipart-part, file-count, and file-size limits must
run before `request.formData()` or before calling `parseFormData`; Fokit cannot
recover memory already consumed by the framework. Standard Schema still
validates application-level file rules.

`fokit/server` does not import React or any control component.

## FormData and control responsibilities

Every control must preserve form submission semantics.

A native text control applies the supplied `name` to its input. A composite
control uses its `formData` serializer so Fokit renders hidden inputs on the
server and client. `ArrayNode` always emits an array marker, including when it
has no rows.

File controls remain native. Browsers cannot prefill a file input, so its
initial value must be empty/optional and a selected `File` exists only for the
current browser session. Reset clears the native file input through its ref.

The shipped `nativeControls` intentionally preserve browser protocols:

- visible `text`, `textarea`, `number`, `date`, `time`, and `select` fields
  submit strings;
- an empty visible optional text-like field submits `""`, while a preserved
  hidden or disabled `undefined` value emits no serializer entry;
- `number` stores `number | undefined` but native `FormData` still contains a
  string such as `"42"`;
- `date` stores the native `YYYY-MM-DD` string and submits that same string;
- `time` stores the native time input string and submits that same string;
- `select` stores an empty option as `undefined`, while its visible native
  element submits `""`; server schemas must normalize that value when the enum
  is optional;
- a checked native checkbox submits `"true"`, and an unchecked visible
  checkbox is absent from `FormData`;
- hidden or disabled preserved checkbox values serialize as `"true"` or
  `"false"` so schema coercion can distinguish both states;
- a visible file control submits the selected `File`; there is no serializer
  for hidden or disabled file preservation, because browsers do not expose a
  portable hidden-file representation.

Server schemas therefore remain responsible for coercing strings to numbers,
dates, booleans, optional strings or enums, and application-specific file
rules. Fokit does not decode native control entries from the React registry on
the server.

A native control may intentionally follow browser absence semantics, such as
an unchecked checkbox. Its schema must accept or coerce the resulting
normalized representation. A control with `formData.mode: 'none'` works in
classic client `onSubmit` mode but is rejected by `ActionForm`.

The React 18 submit pipeline validates the controlled store, while the server
helper validates normalized native `FormData`. A control advertised as
Action-compatible must test both routes to the same `FormOutput` for its
documented values.

## Pure utilities

UI resolution remains usable without React:

```ts
const resolved = resolveUi(
  accountForm,
  values,
  accountContext,
);
```

`resolveUi` calculates:

- visibility;
- disabled and read-only state;
- labels and descriptions;
- control options;
- structural layout.

It does not mutate values or run effects.
The context argument is read-only and is not added to the resolved form data.

Schema validation is also exposed as a pure operation through the form
definition or an internal shared validator used by browser and server flows.

## Extensibility boundaries

### Supported

- custom controls;
- shipped native controls plus custom registry composition;
- default, custom, or partially overridden field, section, array, array-item,
  and error slots;
- native and serialized control `FormData` behavior;
- reactive and imperative append, insert, remove, and move operations;
- static root classes and public state/layout data attributes;
- safe native form-prop passthrough;
- optional responsive structure through `fokit/layout.css`;
- static and derived control options;
- typed runtime context for derived UI and controls;
- inherited visibility, disabled, and read-only state;
- one instance-level `beforeUpdate` and `onUpdate` pair;
- manual composition around generated fields;
- manual field and form errors;
- subscriptions and batching.

### Outside product scope

- arbitrary content nodes in the UI tree;
- reusable typed field groups;
- wizard/page nodes;
- async option loaders;
- cross-field effects in definitions;
- persistence and autosave;
- JSON Schema UI inference;
- devtools;
- React Native.

Cross-field mutation is available through the single instance-level
`beforeUpdate` hook. Fokit deliberately does not provide a middleware chain or
store executable effects in reusable definitions.

## Rejected alternatives

### A single executable schema

One object containing fields, validators, layout, components, hooks, and submit
buttons is compact for small forms but creates a second validation ecosystem
and prevents clean separation of reusable UI from application workflow.

### A pure headless form manager

A JSX-only API is flexible but gives Fokit little differentiation from React
Hook Form or TanStack Form and loses automatic generation, which is a primary
goal.

### A wrapper around another form manager

Wrapping TanStack Form or another headless manager would save some initial
store work, but Fokit's guarantees would then depend on a different mutation
and rendering lifecycle. Transaction interception, inherited UI state,
hidden-value policy, and structural slot behavior would either leak the
wrapped API or require a parallel state model.

Fokit therefore owns the small form core it needs. It may adopt proven
algorithms and terminology, but another form manager is not a runtime
dependency or public escape hatch.

### A general middleware chain

Multiple ordered interceptors add priority, reentrancy, async, and error
semantics before Fokit has use cases that require them. One synchronous
`beforeUpdate` transformation and one post-commit `onUpdate` observer cover
the target scenarios with one deterministic order.

### Builder classes

Builder classes add runtime ceremony, complicate generic inference, and often
require explicit type extraction helpers. Plain typed factory functions are
sufficient for controls and definitions.

### Controlled and uncontrolled public modes

Two modes double the behavioral and testing matrix for resets, field arrays,
custom controls, subscriptions, and React Actions. Granular external-store
subscriptions provide the required performance without exposing two models.

### React 19 as the base requirement

The store and rendering model do not require React 19. Keeping React 19 Actions
in a subpath allows the main package to support React 18 without weakening the
core API.

### Tailwind classes in form definitions

Raw framework layout classes couple reusable definitions to one build pipeline,
break portability across design systems, and require Tailwind source detection
to see every generated class. Definitions therefore store finite semantic
`columns` and `span` values. Applications may still use Tailwind inside their
registered slots or through the additive `className` escape hatch.

### A mandatory built-in theme

A default visual theme would make the shortest demo attractive but would
compete with the application's design system and expand Fokit's compatibility
surface. Fokit's default slots deliberately stop at unstyled semantic markup
and accessible action labels. The optional stylesheet remains structural only
and is never imported automatically.

### No stylesheet at all

A strictly headless renderer maximizes neutrality but makes every consumer
reimplement the same responsive grid and spacing rules. An optional,
low-specificity structural stylesheet provides that small convenience without
making it part of core behavior.

## Testing requirements

Before the API is considered stable, the implementation must prove:

- schema input and output inference with type tests;
- rejection of an incompatible control for a field path;
- rejection of `any`/`unknown` control values and duplicate generated paths;
- complete `defaultValues` and optional-path `unset` constraints in type tests;
- deep object and nested array path inference;
- relative array item paths;
- stable array row identity through hook, slot, and imperative append, insert,
  remove, and move operations;
- one-field updates do not rerender unrelated controls;
- UI resolvers rerun only for tracked value reads;
- conditional UI resolvers replace their tracked paths when their active
  branch changes;
- resolver value proxies reject enumeration and cannot escape the synchronous
  resolver call;
- replacing runtime context reruns derived UI without changing values or
  dirty state when no `valuePolicy` change is produced;
- a context-aware control is rejected when the form context does not satisfy
  its declared requirement;
- `beforeUpdate` can accept, cancel, or replace an atomic batch;
- `beforeUpdate` observes required `valuePolicy` changes, thrown pre-update
  hooks abort, and thrown post-update hooks do not roll back a commit;
- `onUpdate` fires exactly once with previous and committed value snapshots;
- control, imperative, reset, batch, and value-policy updates share the same
  transaction semantics;
- inherited visibility, disabled, and read-only state follows the documented
  precedence;
- the `ArrayItem` slot preserves row identity and receives working
  remove/reorder actions;
- stale async validation results cannot overwrite newer results;
- change, blur, imperative, and submit triggers expose exactly the documented
  issue paths, including array-level and invisible-owner summary errors;
- reset baseline, deep-patch, touched, dirty, and per-source issue-clearing
  semantics;
- hidden `unset` fields do not cause update loops;
- server issues map to the same paths as client issues;
- classic submit validation, exception, focus, and concurrent-submit behavior;
- native reset and imperative mounted-submit behavior keep the DOM and store
  synchronized;
- React 19 server-first submit, hydrated and pre-hydration attempts, Action
  result, both reset modes, pending edits, exception, and codec behavior
  through the isolated entry point;
- SSR hydration with deterministic IDs, a stable `getServerSnapshot`, cached
  immutable snapshots, and React Strict Mode;
- focus of the first invalid field;
- label, description, and error ARIA relationships;
- `noValidate` on generated forms and `meta.invalid` parity with rendered
  errors;
- default slots preserve all structural props, render compact array action
  glyphs with accessible English labels and titles, accept string/function i18n
  overrides, and allow partial slot overrides without changing omitted slots;
- `createFormKit({ controls: nativeControls })` renders a working generated
  form while leaving controls explicit;
- native control types, options, read-only behavior, and hidden/disabled
  serializer behavior match their documented contracts;
- native `FormData` parity for control-contract fixtures, empty arrays, absent
  checkboxes, repeated values, dates, times, numbers, selects, and files;
- exact `__fokit.array` marker behavior and rejection of malformed or unknown
  reserved metadata;
- serializer hidden inputs are present in SSR output and normalize to the same
  schema output as classic submit;
- serializers receive resolved options and runtime context, while hidden-mode
  editors do not duplicate their canonical native name;
- invisible preserved fields serialize without rendering their visual slot,
  while invisible unset fields submit no value;
- disabled and read-only values have store/FormData parity;
- `ActionForm` rejects an active incompatible control in production and
  development rather than dispatching incomplete `FormData`;
- malformed or hostile paths cannot pollute prototypes, allocate sparse arrays,
  bypass structural limits, or produce partial parsed data;
- structural slots preserve mandatory `rootProps` and definition classes;
- the DOM protocol exposes only applicable state attributes and removes false
  boolean attributes;
- `data-invalid` follows displayed-error policy rather than raw stored issues;
- numeric spans and full-row spans work at each container-query tier;
- the no-container-query fallback remains a usable one-column layout;
- importing the main entry point does not import CSS;
- explicit `layout.css` imports survive package tree shaking.

CI must include at least:

- the minimum supported React 18 version;
- the current React 19 version;
- TypeScript declaration tests;
- a DOM environment for renderer integration tests;
- DOM-free tests for store, validation, paths, safe parsing, and UI resolution;
- fuzz/property tests for path parsing and value transactions;
- packed-tarball smoke projects for Vite, Next.js Server/Client Components,
  ESM import, CommonJS require, `fokit/core`, `fokit/server`, and every package
  export;
- package checks with `publint` and Are the Types Wrong;
- documentation-site verification that runs source-content tests, docs
  TypeScript checks, the Vocs static build, Markdown audit, generated-output
  assertions, and documentation E2E coverage.

## Resolved product decisions

The product has no unresolved public-API questions in this specification:

1. Native encoding uses canonical dot paths, repeated value names, explicit
   array markers, browser checkbox absence semantics, preserved `File` values,
   and Standard Schema coercion.
2. `defaultValues` is a complete `FormInput<S>` baseline.
3. Validation mode and `asyncDebounceMs` are instance-level, with no per-field
   debounce API.
4. A path value must be assignable to a non-`any`, non-`unknown` control value
   type, including its nullable members.
5. Generated definitions reject duplicate field paths; composite widgets own
   their multiple native elements.
6. React definitions may use explicit render nodes with resolver-driven
   interaction state; they remain outside field, accessibility, and
   serialization ownership.
7. React 19 uses a serializable `FormResult` with explicit defaults/submitted
   reset modes.
8. Every control declares native, serialized, or unavailable `FormData`
   behavior.
9. Controls remain explicit, while omitted or partial slots resolve from
   English unstyled defaults.
10. The shipped native controls cover text, textarea, select, checkbox,
    number, date, time, and single-file values only.
11. Object-scoped definition fragments are erased before normalization; array
    items keep the existing relative-child contract.
12. Schema paths are commandable and selectively validatable without UI
    registration; array commands and Action serialization keep their explicit
    node requirements.
13. Async fields remain an application data-layer recipe, and loaded baselines
    remain explicit mount, key, or reset patterns.

Implementation discoveries may refine private algorithms, but changing these
contracts requires an explicit specification update rather than an implicit
code-level choice.

## Source provenance

The implementation may reproduce documented behavior and independently apply
general algorithms from the listed influences. Source code from the local
reference implementation or another project is copied only when ownership or a
compatible license is confirmed. In the absence of that confirmation, Fokit
uses an independent implementation.

## Influences

The specification borrows individual ideas, not APIs, from:

- [Standard Schema](https://standardschema.dev/) for library-agnostic input,
  output, validation, issues, and async results;
- [React Hook Form](https://github.com/react-hook-form/react-hook-form) for
  native field registration, deep paths, focused subscriptions, array
  operations, and baseline-based reset semantics;
- [TanStack Form](https://tanstack.com/form/latest/docs/framework/react/guides/validation)
  for an external typed store, selector subscriptions, and Standard Schema
  validation, without wrapping its runtime;
- [TanStack Form API](https://tanstack.com/form/latest/docs/reference/classes/FormApi)
  for complete default values, array commands, and reset values becoming the
  new baseline;
- [TanStack dynamic validation](https://tanstack.com/form/latest/docs/framework/react/guides/dynamic-validation)
  for form-level asynchronous validation debouncing;
- [TanStack Table column sizing](https://tanstack.com/table/latest/docs/guide/column-sizing)
  for keeping headless sizing state semantic and mapping it to CSS variables
  at the rendering boundary;
- [Conform](https://conform.guide/validation) for `FormData`, server validation,
  and progressive enhancement;
- [Conform submission parsing](https://conform.guide/api/react/future/parseSubmission)
  for explicit nested-name conventions and pre-parse request limits;
- [Conform form metadata](https://conform.guide/api/react/useForm) for
  `noValidate` by default and explicit server-result synchronization;
- [JSON Forms](https://jsonforms.io/docs/architecture/) for separating data
  schema, UI schema, and renderer registry;
- [react-jsonschema-form](https://rjsf-team.github.io/react-jsonschema-form/docs/)
  and [uniforms](https://uniforms.tools/docs/api-reference/forms/) for the
  generated `AutoForm` layer;
- [Autoform customization](https://autoform.vantezzen.io/docs/tanstack/customization)
  for control registries and replaceable structural wrappers;
- [Radix styling](https://www.radix-ui.com/primitives/docs/guides/styling)
  and [React Aria styling](https://react-aria.adobe.com/styling) for unstyled
  components, additive classes, and state data attributes;
- [CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries)
  for container-relative responsive layout;
- the referenced AutoForm implementation for derived field configuration,
  dynamic options, hidden-value policies, and update lifecycle hooks;
- [React form Actions](https://react.dev/reference/react-dom/components/form)
  for the optional React 19 integration;
- [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
  for React-compatible external-store subscriptions.
