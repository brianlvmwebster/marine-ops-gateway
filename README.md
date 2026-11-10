# Marine Ops Gateway

The production gateway is migrating to Floot at `https://lakeviewwebster.marineopstech.net`. Native source and its manifest are in `floot/` on the development branch; see [the production workflow](docs/FLOOT-PRODUCTION.md). The Next.js/Vercel implementation below remains available for rollback.

Lakeview's pre-production Microsoft sign-in configuration and administrator setup steps are documented in [docs/lakeview-preproduction.md](docs/lakeview-preproduction.md). The `preproduction` branch supports single-tenant Microsoft Entra sign-in; production keeps the existing password configuration unless its environment is explicitly changed.

A private link launcher with an app-owned email whitelist and two roles:

- **User**: log in and view destination links and images.
- **Admin**: edit the links and images, manage whitelisted emails and roles.

Accounts, password hashes, sessions, and roles live in the app's Neon Postgres database. Better Auth is a local code library for password hashing and session cookies; there is no external identity or user-management service. Vercel hosts Next.js, and private Vercel Blob stores button images.

## Administration

Sign in using your email and password. Administrators see Manage links and Access in the navigation. The initial administrator is `brian@lakeviewwebster.com`.

On **Access** (`/admin/users`), add an email and select User or Admin. Copy the one-time password setup link and share it privately with that person. The link expires after 24 hours and works once. There is no public registration or automatic email sending. An email address alone never grants access.

For a forgotten password, generate a fresh Reset password link from the same Access page. It lets the account owner choose their own password and signs out existing sessions. Disabling an account also immediately revokes sessions. Role changes apply on the next request. The last enabled administrator cannot be disabled or demoted.

On **Manage links**, apply edits to the list and select Save changes. The app supports up to 100 buttons, text or image appearance, optional descriptions, reordering, and new-tab behavior. Concurrent updates return a conflict instead of overwriting newer edits.

## Local setup

1. Install Node.js 24 and run `npm ci`.
2. Link the Vercel project: `npx vercel link --project marine-ops-gateway --scope brianlakeviewwebster`.
3. Pull development settings: `npx vercel env pull .env.local --yes`.
4. Verify keys against `.env.example`; never commit actual environment files.
5. Run `npm run db:migrate` to initialize the gateway, whitelist, and library-owned authentication tables.
6. For an initial administrator only, run `node --env-file=.env.local scripts/bootstrap-admin.mjs your-email@example.com http://localhost:5173`. A one-time setup link is written to ignored `outputs/admin-setup.txt`. It does not choose or print a password and will not change an existing non-admin's role.
7. Run `npm run dev`, then use the setup link to choose a password and sign in.

## Validation

- `npm test`: URL and image validation, bounded request bodies, origin checks.
- `npm run typecheck`: TypeScript checks.
- `npm run build`: production Next.js build.
- `node --env-file=.env.local scripts/verify-storage.mjs`: actual Neon concurrency and private Blob round trips.
- `node --env-file=.env.local scripts/verify-api.mjs`: temporary user/admin accounts test setup links, login, read-only users, admin edits/uploads, role changes, disable, password reset, logout, and rate limits. Fixtures are restored/removed afterward. Run locally, not against the live site.

## Hosting

The Vercel project is `brianlakeviewwebster/marine-ops-gateway`, connected to the private GitHub repository. Next.js 16 runs on Node.js 24. Production follows `main`; branch deployments are previews.

Required environment keys are `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, and `BETTER_AUTH_SECRET`. Production and non-production use separate signing secrets. Set `BETTER_AUTH_URL` to the production origin; previews infer their exact Vercel deployment origin. `AUTH_EXTRA_ORIGINS` can list exact additional origins when necessary. No wildcard trusted origins are needed.

Schema migrations run explicitly before deploying code that needs them. The app does not create tables during requests. App pages and APIs enforce login and roles independently, including private images. Access to the login page does not expose the saved links.

The old Sites export contained zero buttons/images. Its ignored backup remains under `outputs/sites-export`; the old source is recoverable from Git history. Imported image IDs and button order are preserved by `scripts/import-sites.mjs`.

## Domain

Production is intended for `www.marineopstech.com`. Only one app DNS CNAME is needed: `www` → `5ab72928785e20bd.vercel-dns-017.com` in the `marineopstech.com` GoDaddy zone. Clerk-specific DNS records are unnecessary.

Uploaded images remain stored when a button is deleted or an edit canceled. External image URLs depend on the original image host.
