# Floot production gateway

Production gateway target: https://lakeviewwebster.marineopstech.net. Its root is the destination launcher; /dashboard/ is Marine Service Desk; /dashboard/jobs/:id/print provides job sheets and checklists. Gateway and dashboard share a company Microsoft session and the existing Floot PostgreSQL database. No iframe, Vercel function, external database credential or Vercel Blob is needed in the new production path.

Microsoft sign-in uses Floot's brokered Microsoft login and managed sessions. The oauth_accounts constraint restricts Microsoft identities to the configured company tenant. Each session request also requires a matching enabled native_gateway_members row; the server resolves its role and stable service identity. Explicit member mappings preserve personal cards and the owner's Service Admin role. Gateway Admin and Service Admin are separate. Password registration, password login and password-reset endpoints are disabled. No passwords or old sessions are copied.

Five original destination IDs/order, two approved members and five private thumbnails were migrated. Thumbnail bytes use direct presigned temporary uploads; the backend checks signatures/size, then copies verified bytes to immutable private filenames. Database rows hold references only. Read endpoints require access before returning short-lived private URLs. Destination/member writes use versions; member updates prevent concurrent last-admin removal and revoke disabled users' sessions. Mutations require the exact same Origin.

Jobs, import baselines/history/conflicts, 15-minute Sheet import, Maps key and calendar brokering remain in the existing Floot project. Outlook sync stays paused. Jobs were not copied or rewritten.

## Source and release workflow

service-dashboard development is the authoritative combined Floot application source. marine-ops-gateway development holds a synchronized floot/ source backup and manifest; the previous Next.js/Vercel implementation remains available for rollback. Keep both main branches stable unless promotion is requested. Never commit credentials, sessions, membership rows, job records or private thumbnail bytes.

Implement and verify changes on Floot, synchronize source/styles/schema/dependencies/tests/notes, commit/push development, check CI, refresh the gateway repository's Floot backup, and publish verified Floot changes when release is requested. Routine production updates no longer redeploy Vercel. The older signed dispatcher remains compatible with the retained Vercel preproduction gateway and is not needed by the new native gateway.

Provision Floot auth and Microsoft login before migration 004; Floot creates its managed auth/session tables. Source member/destination data are migrated privately, not committed as SQL fixtures. Obtain DNS targets and certificate-renewal records from this project's Floot Custom domain settings; never invent them.
