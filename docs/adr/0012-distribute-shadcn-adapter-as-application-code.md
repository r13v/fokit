# ADR 0012: Distribute the shadcn adapter as application code

- Status: Accepted
- Date: 2026-08-02

Shadcn components are open code owned and commonly modified by each
application, while Form, Please keeps visual components and styling inside
application-owned form kits. The first-party shadcn integration is therefore a
GitHub registry item named `shadcn-form-kit`, which installs an editable local
Shadcn form-kit adapter instead of adding an npm preset or public adapter
factory to the Form, Please package.

The installed adapter targets the official Base UI component contract, imports
the application's local shadcn components, and exports a ready
`shadcnFormKit`. It preserves the native kit's control names, value and option
contracts, and submission semantics, while providing all structural slots.
Applications that change a local component contract adapt the installed source
at that ownership boundary.

## Considered Options

- Bundling shadcn components in `form-please/preset-shadcn` would offer a short
  import but make Form, Please own a visual component fork and compete with
  application customization.
- A package-level `createShadcnFormKit` factory would avoid bundling components
  but duplicate `createFormKit` and turn mutable local component signatures
  into a long-lived public compatibility surface.
- A documentation-only recipe would preserve ownership but provide no
  installable, versioned adoption path.

## Consequences

- Registry source is tracked and tested in this repository, then copied into
  the consuming application where it becomes application-owned code.
- The registry dependency does not duplicate the package version. Release
  automation remains the only owner of the exact Form, Please version. Users
  can append a matching Git release tag to the registry reference when an
  installation must be reproducible.
- Additional shadcn bases require separately validated adapters rather than an
  implicit claim that one adapter supports incompatible component contracts.
