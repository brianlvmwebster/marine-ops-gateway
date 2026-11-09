# Lakeview pre-production and Microsoft sign-in

Target Vercel project: `brianlakeviewwebster/marine-ops-gateway`.
Branch: `preproduction`. Origin: `https://lakeview-test.marineopstech.com`.
The current production gateway at `www.marineopstech.com` keeps its existing settings.

## Microsoft Entra registration (company administrator)

1. In [Microsoft Entra admin center](https://entra.microsoft.com), select the Lakeview company directory. Open **App registrations → New registration**.
2. Name: **Lakeview Service Operations — Pre-production**. Choose **Accounts in this organizational directory only**.
3. Add a **Web** redirect URI exactly:
   `https://lakeview-test.marineopstech.com/api/auth/callback/microsoft`.
4. Copy the **Directory (tenant) ID** and **Application (client) ID**. The application requires the tenant GUID, not `common` or an email-domain suffix.
5. Under **Certificates & secrets**, create a client secret. Enter the secret **value** directly into the Vercel environment variable below. Never put it in Git, chat, or this document. Record the expiry in your organization's credential-management process.
6. Under **Token configuration**, add the optional ID-token **email** claim. `preferred_username` is supported as a fallback; the stable Microsoft account identity remains the verified `oid` claim.
7. Login requests only `openid profile email`. Outlook calendar consent is a separate integration and must not be added merely to let employees log in. MFA and Conditional Access are managed by your company tenant.
8. In **Enterprise applications**, select this application, set **Assignment required? → Yes**, then assign the staff users/group who should use it. Approve requested identity scopes according to your company's consent policy.
9. In the gateway's existing **Access** administration, approve those users and roles. The application preserves its approved-user list; a company sign-in does not grant administrator rights. Only the single tenant's validated Microsoft provider can link to an existing approved account with the same email.

## Vercel configuration

Scope the following to **Preview → preproduction branch**. Do not replace production values:

| Key | Value |
| --- | --- |
| `BETTER_AUTH_URL` | `https://lakeview-test.marineopstech.com` |
| `AUTH_MICROSOFT_ONLY` | `true` |
| `MICROSOFT_TENANT_ID` | Company directory GUID |
| `MICROSOFT_CLIENT_ID` | Registration client GUID |
| `MICROSOFT_CLIENT_SECRET` | Secret value, stored as sensitive |
| `BETTER_AUTH_SECRET` | Existing preview-only signing secret, or a separately generated secret |

The domain is attached to this project with Git branch `preproduction`. The CNAME was saved in GoDaddy on November 9, 2026. At the DNS provider for `marineopstech.com`, add **CNAME** host **lakeview-test** → **5ab72928785e20bd.vercel-dns-017.com**. Do not change the existing production gateway's DNS. Redeploy the branch after adding Microsoft credentials.

Pre-production should use a separate Neon branch/database and Blob store before testing writes or importing service jobs. The existing project currently shares database environment entries across targets; this change does not modify that database or run migrations.

## Behavior and validation

The initial `/sign-in` page displays **Sign in with Microsoft**. In Microsoft-only mode, password login and account activation are blocked on the server. Without complete registration settings, the page displays a setup message and protected resources stay inaccessible. Never enable a temporary bypass to preview staff data.

After configuration, test: approved staff can sign in; unassigned/wrong-tenant users cannot; non-approved gateway users cannot see links; ordinary users cannot use admin APIs; sign-out clears the session. Password login on the existing production domain should retain its current behavior.

This branch adds company identity to the existing gateway. The Marine Service Desk is currently a separate Floot app; its runtime services and job data have not been migrated by this authentication change. A Vercel port must replace Floot viewer authorization, Microsoft credential brokering, storage, background tasks, and database access before that dashboard runs independently on this domain.
