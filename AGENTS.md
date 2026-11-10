<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Service dashboard integration

The user authorized migrating the gateway from Vercel into the existing Floot Marine Service Desk project, production lakeviewwebster.marineopstech.net with service at /dashboard/. The Floot source is authoritative in service-dashboard development. This repository development branch backs it up in floot/ via scripts/sync-floot.mjs; never hand-edit that mirror. Commit/push both development branches and check their source builds after changes. Publish verified releases on Floot. The prior Next.js implementation and preproduction branch remain for rollback; do not redeploy them routinely. Keep main stable, preserve native Microsoft/whitelist checks, and do not resume Outlook syncing.
