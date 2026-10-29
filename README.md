# Marine Ops Gateway

A responsive link launcher with a protected editor at `/admin`.

## Features

- Text or image buttons; optional descriptions and new-tab behavior.
- Add, edit, remove, and reorder up to 100 links.
- Shared D1 storage and optimistic concurrency checks.
- PNG/JPEG/WebP uploads up to 2 MB in R2, or external image URLs.
- ChatGPT sign-in with a server-enforced administrator email allowlist.

## Administration

Configure `ADMIN_EMAILS` as a comma-separated list of administrator email addresses through the Sites runtime environment tool, then deploy to apply it. With no allowlist configured, editing is denied. The initial hosted site is private to its owner. Site visitor sharing and administrator permissions are separate settings.

Open `/admin`, select Add destination, enter a name and HTTP(S) URL, and optionally upload or link an image. Apply to list, then Save changes. Names provide accessible labels even for image buttons. If another admin saves first, reload before editing again.

## Development

Node 22.13+ is required. Install with `npm run install:ci`, set `ADMIN_EMAILS=seedy@sites.test` in an ignored `.dev.vars`, and start `npm run dev`. Local-only simulated sign-in is `/signin-with-chatgpt?return_to=/admin`. It is excluded from production.

Build with `npm run build`. For a new local database, apply the generated migration:

```
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_bent_wendell_vaughn.sql
```

Run `node ./node_modules/typescript/bin/tsc --noEmit` for type checking and `node scripts/verify-gateway.mjs` against the local preview for API integration checks. The latter uses the simulated local admin, temporarily changes the local link list, and restores it. Do not run it against production.

## Hosting

`.openai/hosting.json` retains the provisioned Site ID and declares `DB` (D1) and `BUCKET` (R2). Publish through the Sites source workflow; it applies migrations and packages the worker and client bundle. Local preview and hosted data are separate. No example destinations are seeded into production.

Uploaded images remain stored after a button is removed or an edit is canceled. External images depend on the original host and may stop loading; upload images for durable hosting. Uploaded files are available to visitors who can access the site.
