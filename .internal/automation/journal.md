# Maintenance journal

## 2026-08-19

**State.** The public repository is being reorganized so the product code remains the focus and maintenance tooling stays out of the main project surface.

**Verified.** The project builds as a static site from `src/`, `tools.json`, `config.json` and `build.mjs`. Existing public support/privacy pages for other projects must not be removed until their replacement repositories and URLs are ready.

**Rules.** Keep user-facing documentation free of internal workflow details. Do not publish local machine paths, credentials, account identifiers, prompts or maintenance logs. Treat privacy and local processing claims as product requirements that must be verified before publication.

**Next.** Continue feature work only after the repository split is complete or after confirming a change cannot break existing public URLs.
