# Company and tool foundation

Implemented on the standalone development branch. Not deployed to Floot or applied to its live database. This does not complete the Floot exit; authentication, integrations, storage and scheduled jobs still need their separate migration work in FLOOT_EXIT.md.

Lakeview is the first company; Service Desk is the first enabled tool. `/platform` provides the company selector, tools, member management and operator controls. The gateway links to it as Company.

## Access model

| Role | Scope |
| --- | --- |
| Platform operator | Create companies, manage memberships, enable/disable available tools |
| Company owner | Manage members and administrators, including other owners |
| Company administrator | Manage members and administrators, but cannot modify or grant owner status |
| Company member | View their company and use its enabled tools |

Operators are explicitly bootstrapped; existing gateway administrators do not automatically become operators. Operators need an active company membership to use a tool. Existing Service Admin permissions remain separate. Members can use all enabled tools for their company in this first version; per-member tool assignments and billing are future work.

Every tool request must pass active company, active membership, enabled entitlement, availability and rollout checks on the server. The existing Service Desk `requireViewer` path additionally resolves the legacy service identity to its linked registered user. It fails closed if migration or mapping is missing. Client controls do not grant access. Mutation requests require the same Origin, strict JSON schemas and bounded request bodies.

Service Desk remains restricted to Lakeview: its existing jobs/imports/calendar tables are not partitioned by company. Do not clear `platform_tools.rollout_company_id` until all tool data and alternate access paths are tenant-isolated and tested. Other companies may be created and assigned members now, but cannot enable Service Desk. Company suspension is modeled and enforced; a company-status editing UI is not included yet.

Membership and entitlement mutations have optimistic versions. Company row locks serialize membership edits so concurrent changes cannot remove the last active owner. Successful mutations and operator bootstraps write an audit record in the same transaction. Disabling a member or tool affects subsequent authorization checks; in-flight requests are not retroactively cancelled.

## Standalone staging setup

1. Restore the authorized database export into an isolated staging PostgreSQL database, including users and `native_gateway_members` (migration 004). Do not point these scripts at the live Floot database.
2. Set `DATABASE_URL` through the environment/secret manager. Run `node scripts/platform-migrate.mjs` with Node 24. This applies migration 007; it is not run at application startup.
3. Migration seeds Lakeview and Service Desk and imports only existing linked gateway identities. Enabled gateway admins become company owners; other linked users become members. Disabled identities become suspended members. Re-running does not overwrite existing grants or revocations. Inspect the imported owner roster before cutover. Unlinked accounts are not imported.
4. Identify the intended platform operator's existing numeric user ID through the trusted administrative database connection. Run `node scripts/platform-operator.mjs <user-id>`. No browser route can grant this privilege.
5. Start the standalone server with the existing session configuration, sign in and open `/platform`. The current sign-in still depends on the authentication migration work. Assign an active owner to each newly created company. Members must already have a registered user; this release does not send invitations or create identities.
6. Verify Lakeview membership and Service Desk access with real staging identities, then suspension and entitlement revocation. Test Microsoft integrations and imports separately before any production cutover. Outlook synchronization remains paused.

`DATABASE_URL` is preferred; the existing Floot URL fallback supports transitional imports only. No production configuration or records are stored here. Billing integration will eventually update the same entitlements via verified, idempotent billing events; current grants are manual and do not charge customers.

## Verification

`node --test tests/platform*.test.mjs` runs policy/HTTP tests. With `TEST_DATABASE_URL` pointing to a disposable test database it also creates an isolated schema, runs migration twice and exercises real PostgreSQL authorization, revocation, stale writes, audit rollback and concurrent owner protection. GitHub CI provisions its own PostgreSQL service and runs these tests plus the frontend build. Tests never fall back to `DATABASE_URL`.

The full standalone server and existing Floot-dependent features are not covered by the frontend build. Do not treat passing CI as production cutover approval.
