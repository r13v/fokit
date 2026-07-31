## 2026-07-31 14:46 — GPT-5

Checking the generated Vocs navigation links → assumed `BASE_PATH=/fokit`
would create a `dist/public/fokit` directory, but Vocs keeps generated files at
`dist/public`. Inspect `dist/public` directly or rely on the build-output tests.

## 2026-07-31 14:50 — GPT-5

Initializing the `fokit` skill → `init_skill.py` created `SKILL.md` and then
failed because the UI `short_description` was below an undocumented 25-character
minimum. Validate interface field lengths before creating files, or make the
initializer fail before writing a partial skill.

## 2026-07-31 14:51 — GPT-5

Validating `skills/fokit` with the bundled `quick_validate.py` → the script
failed because its `yaml` dependency was not installed for `python3`. Document
the dependency or make the validator bootstrap/run in an isolated environment.
