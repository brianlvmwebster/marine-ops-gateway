# Production cutover

App: `brianlakeviewwebster/marine-ops-gateway` on Vercel.
Domain: `www.marineopstech.com`.

The app manages its own whitelist and User/Admin roles using email/password login. No Clerk account, Clerk DNS records, or third-party user-management dashboard is needed.

In the GoDaddy zone `marineopstech.com`, update only the app's record:

| Type | Name | Target |
| --- | --- | --- |
| CNAME | www | 5ab72928785e20bd.vercel-dns-017.com |

Preserve the existing `layouts`, `service`, mail, and other records. GoDaddy's identity verification may be required to save the change. DNS and HTTPS were verified on 2026-11-04; the custom domain serves the published app.

The initial administrator `brian@lakeviewwebster.com` chooses their own password using a one-time setup link. Subsequent accounts are added on `/admin/users` by an administrator. Password setup/reset links are copied and shared manually; the app does not send email.

Provisioned app services: Neon Postgres (Free), private Vercel Blob for images, and Next.js hosting. The earlier Clerk integration has been disconnected from the app project. Its development test accounts were deleted; no real app users were migrated from Clerk.

The old Sites deployment remains available until the new login and domain cutover are confirmed.
