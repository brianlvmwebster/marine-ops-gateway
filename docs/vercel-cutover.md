# Vercel cutover: www.marineopstech.com

Vercel project: `brianlakeviewwebster/marine-ops-gateway`.

The app now uses Next.js, Clerk, Neon, and private Vercel Blob. The GitHub migration branch is `migrate-to-vercel`, with PR #1. The initial old-site export contained no saved buttons or images. The previous Sites deployment remains available until the new domain and sign-in are verified.

## DNS

The authoritative nameservers are `ns09.domaincontrol.com` and `ns10.domaincontrol.com` (GoDaddy). Add the following CNAME records in the `marineopstech.com` DNS zone. Names below are relative to that zone. Update the existing `www` CNAME; preserve unrelated records and email settings.

| Name | Target |
| --- | --- |
| www | 5ab72928785e20bd.vercel-dns-017.com |
| clerk.www | frontend-api.clerk.services |
| accounts.www | accounts.clerk.services |
| clkmail.www | mail.na2fedfyg0oj.clerk.services |
| clk._domainkey.www | dkim1.na2fedfyg0oj.clerk.services |
| clk2._domainkey.www | dkim2.na2fedfyg0oj.clerk.services |

These values were returned by this Vercel project and its Clerk production domain on 2026-11-04. The `www` names within Clerk's records are intentional: authentication is configured for `www.marineopstech.com`.

## Checks before cutover

- Verify the domain in Vercel and all five authentication CNAMEs in Clerk.
- Wait for both Vercel and Clerk TLS certificates to be ready.
- Clerk Marketplace configuration now names `www.marineopstech.com`; production credentials are managed by the integration. Production must be redeployed after that configuration change.
- Verify the app's production sign-up/sign-in with `brian@lakeviewwebster.com` and confirm the admin page loads.
- Verify a saved destination and uploaded image persist after reloading.
- Vercel Deployment Protection is enabled; app email allowlists enforce a second, independent access boundary.

## Provisioned resources

- Neon: `marine-ops-gateway-db` (Free plan).
- Clerk: `marine-ops-gateway-auth` (Hobby plan).
- Production/development private Blob: `marine-ops-gateway-images`.
- Preview private Blob: `marine-ops-gateway-preview-images`.

No keys or tokens belong in this file. Pull development settings using the Vercel CLI. Use the integration dashboards to manage production secrets.
