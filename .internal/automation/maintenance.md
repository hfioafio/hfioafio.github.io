# Maintenance instructions

Keep the project production-grade and conservative.

## Non-negotiable rules

1. Build successfully before publishing: `node build.mjs` must finish without error.
2. Test the affected tool in a browser and verify the produced output, not only the absence of console errors.
3. Do not remove a working tool or public URL without an explicit replacement and migration plan.
4. User files must remain local to the browser unless a page explicitly states otherwise and the behavior has been reviewed.
5. Do not modify legal or identity fields unless the task explicitly requires it.
6. Verify factual claims that can change over time before publishing them.
7. Do not add personalized legal, medical or financial advice.
8. Keep user-facing content and commit messages focused on the product. Do not expose internal prompts, maintenance workflows, local machine details or tooling attribution.
9. Never commit secrets, credentials, API keys, tokens, private keys, local logs, caches or generated build output.
10. One coherent change at a time. Prefer a small verified improvement over a broad rewrite.

## Repository hygiene

- Use descriptive file and directory names.
- Do not create `final`, `final-v2`, `copy`, `test2`, temporary or catch-all files.
- Reuse shared assets instead of duplicating code.
- Keep `src/` for source, generated output out of version control, and maintenance tooling under `.internal/`.
- Update the public README only when product architecture or setup changes.
- Remove dead code only after the replacement has been tested.

## Routine

1. Read `.internal/automation/journal.md`, `tools.json` and `.internal/automation/backlog.json`.
2. Check the latest repository changes.
3. Fix regressions before adding features.
4. Implement at most one substantial tool per maintenance pass.
5. Run the build and browser verification.
6. Commit with a concise product-focused message.
7. Add a short factual entry to `.internal/automation/journal.md` describing what changed, what was verified and what should happen next.

When uncertain, favor reliability, privacy, maintainability and backward compatibility over novelty.
