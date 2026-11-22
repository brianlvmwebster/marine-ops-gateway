# Standalone hosting assessment — November 22, 2026

The owner has requested a complete exit from Floot. GitHub is the editing source and revision history; Floot remains the existing production runtime only until a verified replacement is cut over. This assessment does not authorize deleting the live project or its data. Outlook synchronization stays paused.

## Recommendation

Use Google Cloud Run for a containerized Node/Hono API and the built React frontend, Cloud SQL for PostgreSQL, Cloud Storage for private uploads, Secret Manager, and Cloud Scheduler invoking Cloud Run Jobs. This fits the owner's preference for Google PostgreSQL and keeps application/data operations in one cloud. Use a dedicated service identity with minimal permissions. Co-locate the app and database in an appropriate Google region; the earlier AWS region is not a Google region selection.

Build once in GitHub Actions, publish a container to Artifact Registry, and deploy an immutable image to staging. Keep development as the integration branch; production promotion and main changes require the owner's request. Use separate staging data, storage and Microsoft callback configuration, with imports and calendar writes disabled there. Add health checks, structured logs, error alerts, database backups/recovery tests and a documented rollback procedure before cutover.

Cloud Run has native Cloud SQL connectivity and scheduled-job support. It is more configuration work than Render, but avoids an unnecessary cross-cloud database connection. Hosting does not remove the application migration work below. Obtain a region/sizing/availability estimate before provisioning: database capacity, backups, storage, networking, load balancing/domain setup, logging and AI are separate costs; no monthly quote has been established.

| Alternative | Fit and tradeoff |
| --- | --- |
| Render with Render Postgres | Simpler web-service and cron deployment from GitHub. Good alternative if Google Cloud SQL is no longer a preference. Full preview environments require a Pro workspace or higher. Render plus Cloud SQL would add cross-cloud networking. |
| Google Cloud Run + Cloud SQL | Recommended for this project: container portability, Google database integration, scheduled jobs, service identities and centralized cloud operations. Requires more initial IAM/network/deployment configuration. |

## Replacement inventory

| Current dependency / evidence | Required standalone replacement and acceptance condition |
| --- | --- |
| `@floot/microsoft-login`, `@floot/viewer`; auth endpoints, `nativeGatewayAccess`, `serviceViewer` | Register an application in the company Microsoft Entra tenant; implement authorization-code login with state/PKCE/nonce validation and server-side sessions. Preserve tenant + object ID identity, enabled-member checks, separate gateway/service admin roles, session revocation and Origin checks. Never replace authorization with a permissive stub. Test unauthorized, wrong-tenant and disabled-member access. |
| `@floot/microsoft-integrations`; `graphCalendar`, connect callbacks | Own Microsoft Graph consent and encrypted durable token cache with refresh/revocation handling. Floot holds refresh tokens; they cannot be recovered from the database dump. Reconnection will be required. Preserve account/calendar selection and reconnect UX. Keep sync paused through imports, job saves, cron and webhooks. |
| `FLOOT_DATABASE_URL`; `helpers/db.tsx`, `helpers/schema.tsx` | Use a server-only database configuration and a supported Cloud SQL connection. Retain Kysely and identifier overrides. Restore the full schema/data privately; schema.tsx is generated types, not a complete migration. Preserve job IDs/numbers, sequences, source histories, versions, roles and Microsoft identity mappings. Review ownership/grants/extensions in a staging restore. |
| Floot database metadata, read-only check | PostgreSQL 18.7, approximately 14 MiB, 25 public application tables, only plpgsql extension observed. Cloud SQL supports major version 18; verify the available minor version and restore compatibility. These observations are not a database backup. |
| `@floot/storage`; gateway images and mapping endpoints | Private Cloud Storage bucket, authenticated access checks, short-lived signed URLs, upload validation and immutable keys. Transfer private bytes separately from Git; reconcile DB keys and object hashes. Public design/catalog assets are source assets, not the private upload archive. |
| `@floot/ai`; `MapToolDetectBoatCenters`, mapping/analyze | Direct provider integration with server-side credentials, validated structured output, image-size limits, timeout/retry behavior and usage limits. Select and verify an available model; Floot model aliases and credits are not portable credentials. Preserve sharp image preprocessing and review/correction flow. |
| `@floot/apps`; gateway/scheduler_launch | Replace the brokered `dock-crew-scheduler` call with authenticated service-to-service communication and one-use expiring launch tickets, or migrate both apps to shared company auth. The separate scheduler is outside this source snapshot; retaining it on Floot would prevent a complete exit. |
| `static/__dev/scheduled-jobs.json` | Port checkSheetImports every 15 minutes and the guarded renewCalendar daily at 08:00 America/New_York. Use persistent locking/idempotency and failure reporting; only one production importer runs during cutover. Do not enable Outlook as a side effect. |
| `server.ts`, `App.tsx`, generated routing | Reconcile all current endpoint/page routes with the exported server; route registration is not automatic outside Floot. Replace fixed port 3333 with the host PORT, add health checks and graceful shutdown, and remove static/__dev serving. The current server serves ./static, exposing development notes if deployed unchanged. |
| `@floot/examples`, Jasmine-style helpers/*.spec.tsx | Preserve examples as source but exclude them from production; replace the example harness if needed. Establish a local/CI test harness and service mocks. Existing CI only builds the frontend and does not prove backend independence. |
| Floot URLs and managed settings | Replace callback/origin restrictions in calendar activation, legacy dispatch and destination settings. Port domain/TLS/security headers explicitly. Review embedded DockBuilder/layout integrations and external launch destinations. Archive the old Vercel implementation as historical source, not the new default runtime. |

## Migration gates

1. Source snapshot and public assets in GitHub, with clean frontend CI. Preserve standalone wrappers, configuration and dependency lockfile.
2. Standalone container starts with no production `@floot/*` imports. All API routes are registered and private/dev paths are denied. Automated authentication/authorization and database tests pass.
3. Restore database and private objects into staging. Validate counts, identities, constraints, sequences and representative job/import/map/layout flows. Do not commit dumps, real member data, tokens or secrets.
4. Verify Microsoft login, member revocation, job create/edit/print, conflict handling, Google Places, uploads, AI review and scheduler handoff end to end. Exercise token refresh without enabling calendar writes.
5. Agree a maintenance window; pause old writes/imports, take final private backups, migrate final changes, switch domain and enable exactly one importer. Database rollback after accepting new writes requires reconciliation, not merely changing DNS.
6. Retire Floot only after the owner accepts the new runtime, private asset/data backups are verified, the separate scheduler dependency is replaced, and the rollback window ends.

## Sources checked

- [Cloud Run continuous deployment](https://docs.cloud.google.com/run/docs/continuous-deployment)
- [Cloud Run to PostgreSQL](https://docs.cloud.google.com/sql/docs/postgres/connect-run)
- [Scheduled Cloud Run Jobs](https://docs.cloud.google.com/run/docs/execute/jobs-on-schedule)
- [Cloud Run secrets](https://docs.cloud.google.com/run/docs/configuring/services/secrets)
- [Cloud SQL PostgreSQL versions](https://docs.cloud.google.com/sql/docs/postgres/db-versions)
- [Render web services](https://render.com/docs/web-services), [cron jobs](https://render.com/docs/cronjobs), [preview environments](https://render.com/docs/preview-environments)
- Connected Floot project source and resource documentation inspected read-only. No live data export or production change was performed.
