# MOT account platform requirements
User decision: public demo at demo.marineopstech.net; application routes stay under the same hostname, e.g. /layouts. Demo sample data must be isolated from customer records.

An MOT account means a customer organization, not an individual user. Future platform work must include:
- account lifecycle and MOT operator administration; organization name, status, branding and unique account ID
- verified domain/subdomain mapping, with demo, www, api, admin and auth reserved; manual/custom-domain setup initially
- memberships bound to authenticated user IDs, scoped roles (owner, admin, editor, viewer), invitations, suspension and revocation
- account-scoped saved layouts, calendars, events, service records, uploads, integrations, exports, background jobs and audit logs
- server-resolved account context from an exact trusted hostname allowlist; never trust a client-supplied account ID alone
- ownership and membership checks on every read/write/download; deny unknown hosts and cross-account IDs; composite constraints and database row-level security where supported
- private/shared resource permissions within each account, with explicit read/edit/manage levels; OAuth credentials and calendar connections account-scoped
- safe migration: assign all existing Lakeview data to Lakeview before enabling another real account; do not change existing permissions during demo work
- hostname-safe login return paths, host-only cookies, invitation acceptance and cross-account tests including list/load/save/export/jobs
- provision workflow statuses: requested, domain pending, verified, active, suspended. Never claim an account domain works before DNS and TLS verification.

Hosting constraint verified November 20 2026: Floot floot-overview explicitly states it cannot support multi-tenant subdomains. It supports individually attached custom domains. Automatic wildcard per-account subdomain provisioning therefore requires a separate hosting/tenant-routing design before implementation. Do not mistake attaching another domain to the existing Lakeview app for account isolation.

Current delivery: separate public demo project; browser-local saved plans, blank startup, same-origin navigation. No MOT account administration or server-side tenant model has been implemented. Scheduler and Service Desk demos remain to be built without production connections.
