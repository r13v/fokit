# Design QA — Fokit documentation post-audit pass

## Target and implementation

- Source visual truth:
  `/Users/user/.codex/generated_images/019faa32-e18b-7f82-ab44-4d4b98306662/call_frBIjjivSyx8yAuBooTOrJa6.png`
- Source pixels: 1487 × 1058, normalized to 1440 × 1024 at DPR 1.
- Normalized source:
  `/Users/user/Projects/fokit/docs-site/qa/reference-desktop-normalized-post-audit.png`
- Browser-rendered implementation:
  `http://127.0.0.1:4173/#/en/get-started`
- Final desktop capture:
  `/Users/user/Projects/fokit/docs-site/qa/implementation-desktop-post-audit.png`
- Combined full-view comparison:
  `/Users/user/Projects/fokit/docs-site/qa/comparison-desktop-post-audit.png`
- Desktop viewport and implementation pixels: 1440 × 1024 at DPR 1.
- State: English Get started route, top of page.

Additional focused evidence:

- API deep link and sticky rails, 1280 × 900:
  `/Users/user/Projects/fokit/docs-site/qa/implementation-api-deeplink-post-audit.png`
- Route-change heading focus, 1280 × 900:
  `/Users/user/Projects/fokit/docs-site/qa/implementation-heading-focus-post-audit.png`
- Open mobile navigation dialog, 390 × 860:
  `/Users/user/Projects/fokit/docs-site/qa/implementation-mobile-drawer-post-audit.png`
- Live-lab validation error, 1280 × 900:
  `/Users/user/Projects/fokit/docs-site/qa/implementation-lab-error-post-audit.png`

## Findings

No actionable P0, P1, or P2 findings remain in the checked states.

The implementation deliberately differs from the generated source in three
content details:

- `FAQs` follows the live React Hook Form reference rather than the generated
  source's singular `FAQ`.
- TypeScript 5+ follows the current Fokit package requirement rather than the
  generated source's 4.9+ copy.
- The code samples use current public Fokit APIs and executable repository
  examples rather than illustrative `createForm` pseudocode.

These differences improve correctness without changing the selected visual
direction.

## Required fidelity surfaces

| Surface | Evidence | Result |
| --- | --- | --- |
| Fonts and typography | Newsreader remains the display face; UI and code faces, title scale, line height, wrapping, and optical weights match the normalized source. The route-focus outline now wraps only the heading text. | Pass |
| Spacing and layout rhythm | Header, metadata rail, main column, compact install block, section rhythm, and 1440 px table of contents align with the combined comparison. At 1280 px the table of contents stays fully inside the viewport. | Pass |
| Colors and tokens | Warm paper, forest ink, muted green, rust accents, and hairline surfaces remain faithful. Interactive control boundaries now exceed the 3:1 non-text contrast target without changing the overall tone. | Pass |
| Image and icon fidelity | The design contains no illustrative raster assets. Phosphor supplies the book, GitHub, menu, close, copy, and pagination icons consistently; no CSS or handcrafted SVG substitutes were introduced. | Pass |
| Copy and content | Five requested documentation surfaces remain in EN/RU parity. All root runtime exports are discoverable, support items are real links, and inline TypeScript/TSX snippets are syntax-checked. | Pass |
| States and behavior | Sticky navigation, shareable section routes, Back/Forward, locale-preserving deep links, drawer focus trap/return, live validation, reduced-motion behavior, copy feedback, and 320/390 px overflow were exercised. | Pass |
| Accessibility | The drawer is a labelled modal dialog with one accessible close action, inert background, Escape handling, focus containment, and focus restoration. Validation errors use `role="alert"`; page-route focus remains visible without spanning the full column. | Pass |

## Focused comparison notes

- The full desktop view was compared side by side in
  `comparison-desktop-post-audit.png`; no composition, type, color, spacing, or
  hierarchy regression was introduced by the fixes.
- The generated source does not depict the mobile drawer, deep-linked API state,
  route-focus state, or validation error. Those focused captures were evaluated
  against the audit findings and interaction requirements rather than treated as
  pixel-fidelity comparisons to a nonexistent source state.

## Comparison history

1. The original design-QA loop aligned the desktop grid, right rail, title
   scale, install block, code surfaces, and 390 px mobile layout.
2. The product audit found P1/P2 issues in sticky positioning, section
   shareability, mobile modal semantics, heading focus geometry, support links,
   and the live-lab error state.
3. The first post-audit implementation fixed those issues and added automated
   coverage.
4. A 1280 px focused capture exposed an additional P2: the translated right rail
   extended beyond the viewport. The rail translation is now restricted to
   1400 px and above; the 1280 px capture and regression assertion confirm it
   stays visible.
5. Direct loading of the lazy `live-lab` section exposed another P2: the target
   could be absent or move while fonts and the split chunk loaded. Routing now
   aligns the section after insertion and layout settlement; the active section
   index follows dynamically mounted content.
6. The final captures confirm the earlier findings are resolved with no new
   P0/P1/P2 visual regressions.

## Browser and runtime evidence

- Desktop, 1280 px, 390 px, and 320 px states have no horizontal overflow.
- API deep links keep the header at `top: 0`, the section rail at `top: 112`,
  and the rail inside the viewport.
- The mobile drawer exposes one accessible “Close navigation” action, focuses it
  on open, traps focus, and marks the rest of the page inert.
- The empty Name field shows “Enter your name,” exposes “Name is required” as an
  alert, and uses a single combined invalid/focus boundary.
- Browser console inspection found no errors or warnings.
- `npm run check`, `npm run knip`, and `npm run site:verify` pass.

## Follow-up polish

- P3: a real favicon and social preview image can be added when a canonical brand
  asset exists.
- P3: VoiceOver/NVDA and Safari/Firefox smoke passes remain useful release
  checks; they are not substitutes for the semantic and automated coverage
  completed here.

## Final result

final result: passed
