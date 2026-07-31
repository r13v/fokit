## 2026-07-31 12:45 — GPT-5

Updating site copy → one multi-file patch failed because its test context was
out of date. Read the current test lines before applying mixed content and test
changes.

## 2026-07-31 12:51 — GPT-5

Waiting for the local page → the browser rejected the documented `networkidle`
load state. Use a DOM snapshot or a targeted page check after navigation.

## 2026-07-31 12:51 — GPT-5

Previewing the verified Vocs build → the final production build loaded one
client chunk from GitHub Pages, and the preview logged `/favicon.ico` outside
the base path. Rebuild with a local `BASE_URL` before visual checks; the favicon
warning appears to be a Vocs base-path preview issue.
