# Repository split plan

The long-term rule is **one product per repository**. This repository should ultimately contain Outilo only.

## Current temporary exceptions

### `static-tab-suspender/`
Legacy public support/privacy site for Tab Suspender.

### `static-tabsuspender-v2/`
Current public Tab Suspender site. The GitHub Pages workflow copies it to `/tabsuspender/` and the legacy version to `/tab-suspender/`.

**Do not remove either directory until:**

1. a dedicated Tab Suspender repository exists;
2. the current site has been moved and deployed from that repository;
3. Chrome/Firefox store listing URLs for homepage, support and privacy have been checked and updated if necessary;
4. redirects or compatibility URLs have been verified in production.

### `5euros/`
Standalone CV Express experiment. It is unrelated to Outilo and should move to its own repository or be archived. It is not part of the normal Outilo build workflow.

## Target repositories

- `outilo` — Outilo source and deployment only.
- `tab-suspender` — extension source plus its public docs/site.
- `cv-express` — only if the experiment is kept; otherwise archive/remove it.
- `retail-territory-map` — private repository for any real business-data version of the map; public demo data only if a public showcase is desired.
- `hfioafio` — public profile README repository matching the GitHub username.

## Migration rule

Never delete the old copy first. Use this order:

1. create destination repository;
2. copy source without changing behavior;
3. verify build and deployment;
4. update external URLs and integrations;
5. verify production;
6. remove the old copy;
7. update READMEs and workflows.

Do not mix unrelated products again after the split.
