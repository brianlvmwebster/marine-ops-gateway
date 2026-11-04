# Marine Ops Gateway

A private Next.js app hosted on Vercel. Authorized users can open destination buttons; administrators can add, edit, delete, reorder, and choose text or image buttons.

## Services

- **Vercel**: Next.js 16 on Node.js 24, GitHub deployments.
- **Neon Postgres**: shared button configuration with optimistic concurrency protection.
- **Vercel Blob (private)**: uploaded PNG, JPEG, and WebP images, maximum 2 MB each.
- **Clerk**: email verification and sign-in, replacing Sites' ChatGPT authentication.

## Access

`ADMIN_EMAILS` is a comma-separated email allowlist. The configured administrator is `brian@lakeviewwebster.com`. Only verified Clerk email addresses count. Optional `VIEWER_EMAILS` entries grant read-only access; administrators always have read access. Missing or empty allowlists deny access. Pages and every API route authorize independently, including private image retrieval.

Vercel Deployment Protection remains enabled for every deployment. This is a separate outer gate from application sign-in.

Use `/sign-up` to create a Clerk account with your authorized email, then `/admin` to manage buttons. Apply each edit to the list, then select Save changes to publish the updated list. Concurrent edits return a conflict instead of overwriting newer changes.

## Local setup

1. Install Node.js 24 and run `npm ci`.
2. Link the Vercel project: `npx vercel link --project marine-ops-gateway --scope brianlakeviewwebster`.
3. Pull development settings: `npx vercel env pull .env.local --yes`.
4. Check required variables against `.env.example`. Never commit real environment files.
5. Initialize the connected database with `npm run db:migrate`.
6. Start with `npm run dev` and open the printed loopback URL.

## Validation

- `npm test`: URL/image validation, body size limits, origin protection.
- `node --env-file=.env.local scripts/verify-api.mjs`: full authenticated local API flow using a disposable Clerk development user; restores the link list and deletes the test account and upload afterward.
- `npm run typecheck`: TypeScript checks.
- `npm run build`: production Next.js build.
- `node --env-file=.env.local scripts/verify-storage.mjs`: actual Neon read/write concurrency and private Blob upload/download. Creates and removes uniquely named test fixtures.

## Deployment and production authentication

The repository is connected to the Vercel project in the `brianlakeviewwebster` scope. Production follows `main`; other branches produce previews. The project uses `npm ci`, `npm run build`, and Node.js 24.

Neon and Clerk were provisioned on their free/Hobby plans through Vercel Marketplace. The image store is private. Credentials are supplied through Vercel environment variables; the local `.vercel` link and all local runtime state are ignored.

Clerk initially provisions development keys. Before production cutover, choose a domain you own, activate Clerk's production instance for that domain through its Vercel integration, configure the required DNS records, and verify production keys are synchronized to Vercel's Production environment. Keep development keys scoped to Development/Preview. Production Clerk cannot use a `*.vercel.app` domain. Redeploy after configuration changes and verify sign-in and the admin flow.

Database migrations run explicitly before deploying code that needs them; they do not run during request handling. Apply `db/migrations/001_gateway.sql` to each target database before its first deployment. Neon preview branching is controlled by the Marketplace integration; verify branch isolation before using previews with live data.

## Sites migration

The old Sites app was exported before migration. It contained zero saved buttons and images. Its local migration backup is ignored under `outputs/sites-export`. The old deployment is retained until cutover is confirmed.

To import a nonempty export into a new, empty target database, use `node --env-file=.env.local scripts/import-sites.mjs <export-folder>`. Import refuses to overwrite an existing gateway record. Uploaded image IDs and button order are preserved. The old Sites code and deployment manifest remain recoverable in Git history.

Uploaded images remain in Blob after a button is deleted or an edit is canceled. External image URLs depend on the original image host. The app's private image route authenticates each request and does not publicly cache images.
