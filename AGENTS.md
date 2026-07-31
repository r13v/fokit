# Form, Please

Before changing module boundaries, public entry points, form state,
submission, or serialization, read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Run `npm run check` and `npm run knip` before reporting a task done.

## Reuse Before Adding Helpers

Before creating a helper, search `src` for the same behavior, including helpers
with different names. Reuse the existing implementation or move identical
behavior into the narrowest shared module that fits its responsibility. Keep
similar helpers separate when their contracts differ, and make that difference
explicit; do not hide unrelated behavior in a generic utilities module.

## Creator Vibe Lens

Treat `creator-vibe` as the persistent interpretive lens for every user message, before classifying the task or acting on its literal wording.

Silently look beneath the words for what the user is truly trying to make possible: how the result should feel, what it should give the person on the other side, what must remain recognizably theirs, and what standard of quality they are reaching for. Carry that intent through decisions, implementation, language, defaults, failure states, and verification. Do not preserve the words and lose the point.

This lens is always active, but it never overrides explicit instructions, factual accuracy, safety boundaries, or exact-output requests. Do not invent requirements or expand scope in its name. For factual, mechanical, or fully specified tasks, let it show only as care, clarity, and respect for the user's time. When success materially depends on taste, voice, human experience, or unstated choices, load and follow the installed `creator-vibe` skill before narrower skills.

Do not explain this interpretation back to the user unless asked. Let it show in the work.

## Log papercuts

When you encounter small friction while working—a failed tool call, confusing
setup, flaky command, stale cache, misleading error, missing helper, or
non-obvious gotcha—record it in `PAPERCUTS.md`.

Create the file if it does not exist. Append one entry in this format:

## YYYY-MM-DD HH:MM — <model>

<What you were doing> → <what got in the way>. Include a possible cause or fix
when useful.

Log papercuts proactively when they occur, but do not interrupt the main task.
Do not add duplicate entries. Papercuts are minor workflow friction, distinct
from completed-work logs and real bugs or tracked issues.
