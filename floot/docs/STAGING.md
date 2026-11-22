# Standalone Google staging

Project: `marine-ops`. Region: `us-east1`. Service: `marine-ops-staging`.

This is an isolated test deployment, not a Floot cutover. It uses a new Cloud SQL PostgreSQL 18 database (`marine_ops_staging`) on `marine-ops-staging-db`, seeded with synthetic Lakeview users and a clearly marked sample job. No customer records, Microsoft credentials or production database connections are copied.

## Access

The Cloud Run service remains IAM-private. Start `gcloud run services proxy marine-ops-staging --project=marine-ops --region=us-east1 --port=18089`, then open `http://127.0.0.1:18089/login` on that computer. Only the project owner's authenticated CLI is currently granted service invocation. The app additionally accepts that exact loopback origin when STAGING_PROXY_ORIGIN is configured; it does not trust arbitrary forwarding headers. Retrieve the password from the `marine-ops-staging-login` secret in Google Secret Manager; do not paste it into chat, commit it or use a production password. The login represents **Lakeview Test Owner**, a synthetic company owner, platform operator and Service Admin. A separate synthetic member exists for membership testing. This test login does not exercise Microsoft SSO or invitation flows.

The application uses HTTPS-only, HttpOnly cookies and persisted sessions expiring after eight hours. Password attempts are rate limited in PostgreSQL across instances. POSTs require the configured public origin. Set `PUBLIC_ORIGIN` to the exact Cloud Run URL because TLS terminates at Google's proxy. Login, session and database secrets are separately generated and stored in Secret Manager. Secret versions are pinned on deployments.

## Isolation and limits

`staging/server.ts` exposes an explicit endpoint allowlist for companies, memberships, tool access, jobs, assignments, dashboard preferences and read-only integration status. All other API routes are denied. Microsoft/Floot auth, Graph, imports, maps/AI, uploads, email, scheduler handoff, cron, webhooks and legacy gateway dispatch are unavailable. No scheduler jobs are created. There is a visible STAGING banner.

Database constraints prevent enabling calendar sync and sheet imports. Code also blocks outbound calendar operations and imports. Startup requires APP_ENV=staging, GOOGLE_CLOUD_PROJECT=marine-ops, a database named marine_ops_staging and no FLOOT_DATABASE_URL. The runtime has only Cloud SQL client access and access to the three staging secrets. Database network access uses the authenticated Cloud SQL connector; no authorized public networks are configured.

Cloud Run is limited to two instances, with zero minimum instances; Cloud SQL uses a small zonal shared-core instance and 10 GiB SSD with daily backups. This is for functional testing, not availability/load testing. Cloud SQL continues to incur charges when Cloud Run scales to zero. Monitor project billing before expanding capacity.

## Build and migration

The container is built from `Dockerfile.staging` with `staging/cloudbuild.yaml`, using a dedicated image-builder identity and a private source bucket. Images go to the marine-ops-staging Artifact Registry repository. Deploy immutable image digests, with the dedicated marine-ops-staging runtime identity.

Apply the synthetic baseline and migrations with an explicitly invoked Cloud Run Job running `node --import tsx staging/migrate.ts`, using the same image, database connector and secrets as the service. Do not run this against an imported production database. It is intentionally a subset schema for supported staging routes, not a production migration specification.

`node --test tests/staging.test.mjs tests/platform.test.mjs` verifies startup without installed Floot packages, denied integration routes, anonymous access, CSRF and policy checks. The full database permission tests run in GitHub CI. After deployment, verify login, member/tool access, job create/edit/workflow/print, revoked access and logout over HTTPS. Never enable the blocked integrations just to clear a staging error.

Production remains on Floot. `main`, production DNS, production data and Outlook sync are unchanged. A production-ready login, full schema/data migration and integrations remain separate work.
