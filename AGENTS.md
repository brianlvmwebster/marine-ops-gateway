<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Service dashboard integration

The company app is served directly at /dashboard/ on the preproduction branch. Floot remains its managed backend. Never expose SERVICE_DASHBOARD_SIGNING_KEY to the browser or remove gateway access checks. The dashboard/ folder is a versioned snapshot from the service-dashboard development checkout: update it using scripts/sync-dashboard.mjs, never by hand. Preserve source hashes and the source commit in dashboard/SOURCE.json. Keep main stable. Do not resume Outlook syncing.
