# Standalone Google staging

Project: `marine-ops`. Region: `us-east1`. Service: `marine-ops-staging`.

This is an isolated test deployment, not a Floot cutover. It uses a new Cloud SQL PostgreSQL 18 database (`marine_ops_staging`) on `marine-ops-staging-db`, seeded with synthetic Lakeview users and a clearly marked sample job. The Customers module now contains the authorized Lakeview Lightspeed customer export (8,851 named records); the 388 unnamed records are excluded. Service jobs and sign-in identities remain synthetic. No Microsoft credentials or production database connections are copied. See docs/CUSTOMERS.md.

## Access

Open https://marine-ops-staging-7esxar6tqa-ue.a.run.app/login directly in a browser. The owner explicitly authorized public web access with application password protection on November 22, 2026. Cloud Run permits public invocation; application authentication and company/tool authorization still protect data. A local proxy or Google CLI login is no longer needed to use staging. STAGING_PROXY_ORIGIN is unset in the deployed service, so the former loopback origin is not accepted for mutations. Retrieve the password from the `marine-ops-staging-login` secret in Google Secret Manager; do not paste it into chat, commit it or use a production password. The login represents **Lakeview Test Owner**, a synthetic company owner, platform operator and Service Admin. A separate synthetic member exists for membership testing. This test login does not exercise Microsoft SSO or invitation flows.

The application uses HTTPS-only, HttpOnly cookies and persisted sessions expiring after eight hours. Password attempts are rate limited in PostgreSQL across instances. POSTs require the configured public origin. Set `PUBLIC_ORIGIN` to the exact Cloud Run URL because TLS terminates at Google's proxy. Login, session and database secrets are separately generated and stored in Secret Manager. Secret versions are pinned on deployments.

## Isolation and limits

`staging/server.ts` exposes an explicit endpoint allowlist for companies, memberships, tool access, customers, customer units, jobs, assignments, dashboard preferences and read-only integration status. All other API routes are denied. Microsoft/Floot auth, Graph, sheet imports, AI, email, scheduler handoff, cron, webhooks and legacy gateway dispatch are unavailable. Mapping & Storage is live at `/mapping` with four migrated maps, 298 locations, private image uploads, typed columns and spreadsheet templates. `/maps` redirects to `/mapping`. Migrations 015/016 and the data import were applied November 25. See docs/MAPPING_MIGRATION.md. Dock Crew Scheduler is live at `/dockscheduler` with local appointment creation, editing, photos, signatures and live updates. Migration 017 and the verified operational-data import were applied November 25; 139 stored jobs (137 active) and three schedules were preserved. Outlook sync and address lookup remain disconnected. See docs/DOCK_SCHEDULER.md. There is a visible STAGING banner.

Database constraints prevent enabling calendar sync and sheet imports. Code also blocks outbound calendar operations and imports. Startup requires APP_ENV=staging, GOOGLE_CLOUD_PROJECT=marine-ops, a database named marine_ops_staging and no FLOOT_DATABASE_URL. The runtime has only Cloud SQL client access and access to the three staging secrets. Database network access uses the authenticated Cloud SQL connector; no authorized public networks are configured.

Cloud Run is limited to two instances, with zero minimum instances; Cloud SQL uses a small zonal shared-core instance and 10 GiB SSD with daily backups. This is for functional testing, not availability/load testing. Cloud SQL continues to incur charges when Cloud Run scales to zero. Monitor project billing before expanding capacity.

## Build and migration

The container is built from `Dockerfile.staging` with `staging/cloudbuild.yaml`, using a dedicated image-builder identity and a private source bucket. Images go to the marine-ops-staging Artifact Registry repository. Deploy immutable image digests, with the dedicated marine-ops-staging runtime identity.

Apply the synthetic baseline and migrations with an explicitly invoked Cloud Run Job running `node --import tsx staging/migrate.ts`, using the same image, database connector and secrets as the service. Do not run this against an imported production database. It is intentionally a subset schema for supported staging routes, not a production migration specification.

`node --test tests/staging.test.mjs tests/platform.test.mjs` verifies startup without installed Floot packages, denied integration routes, anonymous access, CSRF and policy checks. The full database permission tests run in GitHub CI. After deployment, verify login, member/tool access, job create/edit/workflow/print, revoked access and logout over HTTPS. Never enable the blocked integrations just to clear a staging error.

Dock Builder now supports shared quote storage, customer search/contact autofill, saved-quote search and reopening. See docs/DOCK_QUOTES.md. Its authenticated assets and the scheduler document can be framed only by this same origin; the rest of staging retains frame denial.

The read-only integration API at `/api/v1` provides customer and parts search/lookup using company-scoped app credentials. See [integration API](INTEGRATION_API.md) for fields, access rules and key administration.

Production remains on Floot. `main`, production DNS, production data and Outlook sync are unchanged. A production-ready login, full schema/data migration and integrations remain separate work.
