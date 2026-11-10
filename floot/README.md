# Lakeview Marine Service Dashboard

Source repository for Lakeview Marine's service queue, scheduling, intake forms, and printable job sheets/checklists. Imported from the owner's Floot project on November 9, 2026.

Production gateway target: `https://lakeviewwebster.marineopstech.net`, with service at `/dashboard/`. Both run on Floot with company Microsoft login. See [production architecture](docs/GATEWAY.md). The prior Vercel frontend remains a rollback path.

## Included features

- Quick status changes: Scheduled → Onsite → In progress → Done, plus status selection. Done awaits Service Admin review; Completed records have pickup-contact and Lightspeed closing confirmations.
- Personal dashboard card library: tomorrow, upcoming jobs, road pickups, deliveries and customer trailers, with saved counts and ordering.
- Service Admin review tabs with prominent customer contact details and manual completion confirmations.
- A shared directory of individuals and groups, with group membership and quick assignment from queue rows, calendar cards and job details.

- Service queue sorting (service date ascending by default), search, status/priority filters, and pagination.
- Weekly calendar with individually hidden weekdays, Pickup/Dropoff category colors and filters, Road Pickup address/body-of-water details, and trailer type on cards.
- Job editing, Google Places address selection, compact printable checklists, and job sheets.
- Google Sheet import with submission-ID matching, source history, and conflict handling.
- Outlook account/calendar selection and two-way synchronization code. **Calendar synchronization remains paused.**

## Transfer status

Floot remains the application platform; GitHub provides source backup, consistency, and revision history. Ongoing Floot work uses the `development` branch. `main` is the stable baseline, updated only when requested. For changes handled by the assistant, the workflow includes verification, syncing affected files/assets into this repository, a descriptive commit, a push to `development`, and checking CI before completion. See [the workflow](static/__dev/notes/github-sync-workflow.md) and [agent instructions](AGENTS.md). Independent edits directly in Floot are not automatically synchronized.

This repository contains the application source and two branding assets. The existing app continues to run on Floot. Creating this repository does not move its live database, secrets, Microsoft connections, scheduled jobs, hosting, or gateway destination.

The frontend can be built independently. The exported backend still imports Floot's private `@floot/viewer` and `@floot/microsoft-integrations` services; it is **not ready for a standalone production deployment**. Preserve the viewer authorization checks while replacing those services. See [migration requirements](docs/MIGRATION.md).

## Frontend development

Use Node.js 22 or later:

```sh
npm ci --legacy-peer-deps
npm run dev
```

The development command serves the frontend. It does not provide the database-backed API, so job loading requires the backend migration described below. No job data or preview access token is embedded in the client.

```sh
npm run build
npm run preview
```

The build copies the logo and lake background from `public/_cdn/`, preserving their existing URLs. `--legacy-peer-deps` is needed for the Floot export's React/Helmet peer dependency declarations.

GitHub Actions checks the frontend build on Linux for pushes and pull requests. The initial local Windows build was blocked by Application Control's policy for the native Rollup module; no Windows protections were changed.

## Backend configuration

The export includes `server.ts` (Hono) and endpoint handlers in `endpoints/`. After implementing the platform replacements and restoring a database, `npm start` runs this server on port 3333.

Hosting environment variables take priority. For local configuration, copy `env.example.json` to `env.json` and supply your own credentials. The actual `env.json`, environment files, database backups, dependencies, and build output are ignored by Git. Never commit secrets or customer records.

Floot's original export instructions are preserved in [docs/FLOOT_EXPORT.md](docs/FLOOT_EXPORT.md). Internal development notes and scheduled-job definitions are retained in `static/__dev/` as source references; do not publish that directory as public content.
