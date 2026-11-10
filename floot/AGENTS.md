# Dashboard development workflow

## Platform and repository roles

Floot project `1552d0fb-863c-4274-8bcc-08496609ca66` (Primary account) remains the Marine Service Desk backend and editing source. The user superseded the Vercel deployment and authorized migrating the gateway into this Floot project, with production at `https://lakeviewwebster.marineopstech.net` and the service app at `/dashboard/`. This repository is the authoritative dashboard source and revision history. Preserve the Floot database, imports and Microsoft brokering; do not migrate those services unless requested. See docs/GATEWAY.md.

## Required completion steps

For every requested dashboard change, implement and verify the Floot change, then sync all affected source, styles, tests, notes and assets into this checkout. Include renames and deletions. Read both current versions first and preserve concurrent edits. Preserve repository-only configuration and reconcile generated dependency changes rather than blindly overwriting package.json or the lockfile.

Use the `development` GitHub branch for ongoing changes to this Floot project. Keep `main` as the stable baseline; promote changes to `main` only when the user requests it.

Review the diff, commit the coherent change with a descriptive message, and push to `development` before reporting completion. The user explicitly authorized routine commits and pushes as part of this change workflow. Check remote commit state and applicable CI results; resolve failures introduced by the change. When useful, link the pushed commit in the final response.

Also refresh the `marine-ops-gateway` repository's `floot/` source backup and manifest on its `development` branch. Production runs on Floot; publish verified changes there when release is requested. Do not routinely redeploy the retained Vercel implementation. Keep both main branches stable.

Do not force-push or overwrite unrelated work. If branch protection or remote changes prevent a safe push, use a suitable branch/PR and report the concrete remaining issue. Never claim synchronization succeeded when it did not.

## Data and credentials

Never commit real environment values, env.json, database dumps, customer/job records, OAuth tokens, preview access tokens, node_modules or generated build output. Keep Outlook calendar synchronization paused unless explicitly instructed otherwise.

## Verification boundaries

Floot hosts authentication, the database, Microsoft integration and scheduled jobs. GitHub CI verifies the exported frontend build; it does not verify the standalone backend. Local Windows Application Control may block native Rollup; leave protections in place and use the repository's Linux CI check.

See `static/__dev/notes/github-sync-workflow.md` for the matching Floot-side workflow. This agreement covers assistant-handled changes; it does not establish automatic background synchronization for independent edits in Floot.
