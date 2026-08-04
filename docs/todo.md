# Source documentation checklist

This checklist tracks the documentation audit for library source files.
Tests, styles, and generated files are outside this audit.

## Core

- [x] `src/control-definition.ts`
- [x] `src/create-form-kit.tsx`
- [x] `src/definition.ts`
- [x] `src/form-value.ts`
- [x] `src/index.ts`
- [x] `src/resource.ts`
- [x] `src/standard-schema-resolver.ts`
- [x] `src/types.ts`

## Default and native presets

- [x] `src/default-slots/default-slots.tsx`
- [x] `src/default-slots/index.ts`
- [x] `src/native-controls/native-controls.tsx`
- [x] `src/native-controls/index.ts`
- [x] `src/preset-native/index.ts`

## Material UI preset

- [x] `src/preset-mui/controls.tsx`
- [x] `src/preset-mui/index.ts`
- [x] `src/preset-mui/slots.tsx`
- [x] `src/preset-mui/types.ts`
- [x] `src/preset-mui/utils.ts`

## Verification

- [x] Every type and type field has a concise description.
- [x] Classes, functions, components, constants, and other declarations have useful descriptions.
- [x] Examples and links exist where they clarify non-obvious use.
- [x] Type improvement ideas are recorded in `docs/ideas.md` without implementation.
- [x] `npm run check` passes.
- [x] `npm run knip` passes.
- [x] `$final-check` finds no missing work.
