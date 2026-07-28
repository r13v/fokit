# Releasing Fokit

Fokit publishes only from a reviewed, stable GitHub Release. The npm trusted
publisher is configured for `r13v/fokit` and the exact workflow file
`.github/workflows/publish.yml`; do not add an npm token or publish from a
branch push.

## Maintainer flow

1. Choose the next stable semantic version newer than 0.0.1 because that
   package version is already published and cannot be reused.
2. Update `package.json` and `package-lock.json` together. A safe pattern is
   `npm pkg set version=<version>` followed by
   `npm install --package-lock-only --ignore-scripts`.
3. Run the local release checks:

   ```sh
   npm ci
   npm ci --prefix docs-site
   npx playwright install chromium
   FOKIT_RELEASE_TAG=v<version> node scripts/verify-release.mjs
   npm run verify
   npm run site:verify
   npm pack --dry-run
   git diff --check
   ```

4. Merge the reviewed release PR to `main` only after CI passes.
5. Confirm GitHub Pages deploys the tested docs artifact at
   `https://r13v.github.io/fokit/`.
6. Create a stable GitHub Release tagged exactly `v<version>`. Keep release
   notes and the final version choice as explicit maintainer decisions.
7. Wait for `publish.yml`. It validates the tag, repository metadata, lockfile
   version, npm registry availability, full package suite, docs suite, and dry
   run before `npm publish --access public`.
8. Verify npm shows the selected version with repository
   `https://github.com/r13v/fokit`, homepage `https://r13v.github.io/fokit/`,
   MIT license, and provenance.

## Guardrails

- Prereleases, `0.0.0`, mismatched `v<package version>` tags, mismatched
  lockfile versions, repository mismatches, and already-published npm versions
  fail before the expensive verification suite runs.
- Only npm's package-version-not-found response is treated as available. npm
  authentication failures, outages, timeouts, package-not-found responses, and
  malformed responses fail closed.
- Do not configure `NPM_TOKEN`, `NODE_AUTH_TOKEN`, an npm secret, a GitHub
  Environment, or `--provenance` unless the npm trusted-publisher
  configuration is changed to match. Trusted publishing supplies provenance for
  this public package.
