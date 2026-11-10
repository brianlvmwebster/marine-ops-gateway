# Migration from Floot

## Completed by this source transfer

- Imported the generated source export, including frontend, backend handlers, styles, existing specs, and platform notes.
- Included the service emblem and lake photograph at their original `/_cdn/static/` paths.
- Added npm scripts and a dependency lockfile. Corrected Zod and Recharts versions to match the live project's dependency metadata.
- Kept real credentials and customer records out of Git.
- Preserved the live app, gateway routing, Google Sheet configuration, and paused Outlook synchronization.

## Required before changing hosting

1. **Authentication:** Replace `@floot/viewer` with company Microsoft Entra authentication and server-side access enforcement for every protected endpoint. Gateway sign-in alone does not authorize a separate app origin. Do not remove `requireViewer()` calls to make the export run.
2. **Database:** Use Floot's database download to obtain a private PostgreSQL dump and restore it into the destination. Schema types in `helpers/schema.tsx` are not database migrations. Preserve job IDs/numbers, source baselines/conflicts, calendar eligibility, versions, and sequence values. Compare counts and representative records before cutover. Store dumps outside this repository.
3. **Microsoft integration:** Replace `@floot/microsoft-integrations` with the app's own Entra OAuth flow, secure token storage/refresh, and account/calendar selection. Floot's connection-code flow cannot be used on another host. Do not commit OAuth tokens. The `FLOOT_MICROSOFT_*` placeholders do not make these private packages available.
4. **Calendar pause:** Preserve `calendar_sync_settings.enabled = false` and imported jobs' calendar eligibility during migration. Verify that saves, imports, scheduled tasks, and webhooks cannot write to Outlook while paused. Do not create subscriptions or resume sync during a source transfer.
5. **Google Maps:** Configure the server-only Google Places API key in the new hosting environment and verify autocomplete and selection. No key is included in this export.
6. **Imports and cron:** Port `static/__dev/scheduled-jobs.json` into the destination scheduler. Preserve the 15-minute import interval, Import now control, and conflict rules. Avoid running two independent import schedulers during cutover.
7. **Hosting:** Adapt the generated Hono server to the chosen host, configure environment variables, protect API routes, and avoid serving `static/__dev/`. Test the full job/create/edit/print/import/calendar flow before changing the gateway's `/apps/service-management` destination.

## Verification scope

A frontend build verifies the React application and bundled assets. It does not verify standalone authentication, database access, Google Maps credentials, Microsoft OAuth, or cron. Those require the migration work above and end-to-end testing against the new environment.

## Export provenance

- Source project: Marine Service Desk, Floot project `1552d0fb-863c-4274-8bcc-08496609ca66` (Primary account).
- Source archive: `Marine Service Desk.zip`, downloaded November 9, 2026.
- Archive SHA-256: `6d489d6411f9357f46401d07896d8b4aa25dc09169986bd0fc0caf1b76d0e564`.
- Destination: `brianlvmwebster/service-dashboard`, private repository.
- Source and static branding assets are transferred. No live data export or hosting cutover is part of this commit.
