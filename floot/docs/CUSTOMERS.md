# Shared Customers module

Implemented in Google staging only. Live Floot is unchanged.

The Customers tool is enabled for Lakeview in migration 008. Every API operation requires an active company membership and Customers entitlement. Company owners and administrators can create/edit/archive customers and import records; members can search/read. Platform operator status alone does not grant customer access. Mutations check Origin, validate bounded JSON and record actor/record IDs in the audit log. Edits use version checks.

Customer UUIDs are company-scoped shared identities. The Lightspeed external identity is `(company_id, source_system, source_number)` with a unique constraint. Numbers and postal codes stay text. Preserve the original source fields, including Active, separately from editable customer fields. Marine Ops status starts active regardless of Lightspeed Active. Repeat imports skip existing identities, preserving local edits and status; they do not silently refresh source snapshots. No email/name-based automatic merging.

The authorized initial export has 9,239 records; exclude 388 with both names blank and import 8,851. Retain incomplete or unusual contact data without inventing replacements. Private source files and transformed JSON stay in ignored backups, excluded from Docker/Cloud Build and Git. `scripts/prepare-lightspeed-customers.py` requires xlrd 2.0.2 and prints only totals. `staging/import-customers.mjs` accepts the private JSON path and staging URL/login secret through the environment. It sends bounded batches over HTTPS and logs out in finally. The script pins the authorized host and expected record count.

The UI at /customers supports company selection, search, pagination, available/archived filters, creation and editing of labeled phones, primary/alternate addresses and notes. The platform workspace links to the selected company's Customers tool. Source flag is read-only and has no authorization or availability effect.

Existing Service Desk jobs can be linked from a customer record. The link validates Service Desk entitlement, restricts legacy jobs to Lakeview, prevents reassignment to a different customer, and leaves historical job contents untouched. Linked job sheets remain protected by Service Desk access. Quote, vessel and storage/slip relationships are not implemented yet; those modules must use the company/customer composite key when migrated. No speculative links to the unavailable Floot modules are exposed.

Tests in `tests/platform-customers.test.mjs` exercise HTTP authentication/CSRF, required names, real PostgreSQL import idempotency, roles, tenant isolation, source status preservation, optimistic concurrency, job links and entitlement revocation. CI runs the database tests using disposable PostgreSQL. Production SSO and production customer migration remain separate from this password-protected staging release.
