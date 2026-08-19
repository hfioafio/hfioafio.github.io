# Contribution guidelines

Keep every change small, understandable and verifiable.

## Repository hygiene

- Use descriptive names for files, directories and functions.
- Do not create duplicate, temporary, numbered-final or catch-all files.
- Keep generated output, local logs, caches, credentials and machine-specific files out of version control.
- Reuse shared code and assets instead of copying implementations between tools.
- Keep source code under `src/` and generated output under `site/`.

## Quality

- Run `node build.mjs` before publishing a change.
- Test the affected tool in a browser and verify the produced output.
- Check relevant edge cases rather than relying only on the happy path.
- Do not remove a working feature or public URL without a migration plan.
- Update documentation when setup, architecture or behavior changes.

## Privacy and security

- Do not commit secrets, API keys, tokens, private keys, personal local paths or credentials.
- Preserve local processing for user files unless a feature explicitly requires otherwise and the behavior is documented.
- Do not weaken privacy or security checks for convenience.

## Commits

Use concise messages that describe the product or technical change. Keep unrelated changes in separate commits whenever practical.
