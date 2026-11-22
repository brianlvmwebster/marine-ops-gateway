# Shared Customers module

Implemented in Google staging only. Live Floot is unchanged.

The Customers tool is enabled for Lakeview in migration 008. Every API operation requires an active company membership and Customers entitlement. Company owners and administrators can create/edit/archive customers and import records; members can search/read. Platform operator status alone does not grant customer access. Mutations check Origin, validate bounded JSON and record actor/record IDs in the audit log. Edits use version checks.

Customer UUIDs are company-scoped shared identities. The Lightspeed external identity is `(company_id, source_system, source_number)` with a unique constraint. Numbers and postal codes stay text. Preserve the original source fields, including Active, separately from editable customer fields. Marine Ops status starts active regardless of Lightspeed Active. Repeat imports skip existing identities, preserving local edits and status; they do not silently refresh source snapshots. No email/name-based automatic merging.

The authorized initial export has 9,239 records; exclude 388 with both names blank and import 8,851. Retain incomplete or unusual contact data without inventing replacements. Private source files and transformed JSON stay in ignored backups, excluded from Docker/Cloud Build and Git. `scripts/prepare-lightspeed-customers.py` requires xlrd 2.0.2 and prints only totals. `staging/import-customers.mjs` accepts the private JSON path and staging URL/login secret through the environment. It sends bounded batches over HTTPS and logs out in finally. The script pins the authorized host and expected record count.

The UI at /customers supports company selection, search, pagination, available/archived filters, creation and editing of labeled phones, primary/alternate addresses and notes. The platform workspace links to the selected company's Customers tool. Source flag is read-only and has no authorization or availability effect.

Existing Service Desk jobs can be linked from a customer record. The link validates Service Desk entitlement, restricts legacy jobs to Lakeview, prevents reassignment to a different customer, and leaves historical job contents untouched. Linked job sheets remain protected by Service Desk access. Dock Builder quotes now use the company/customer composite key and appear on customer records in staging; see docs/DOCK_QUOTES.md. Vessel and storage/slip relationships remain future work.

Tests in `tests/platform-customers.test.mjs` exercise HTTP authentication/CSRF, required names, real PostgreSQL import idempotency, roles, tenant isolation, source status preservation, optimistic concurrency, job links and entitlement revocation. CI runs the database tests using disposable PostgreSQL. Production SSO and production customer migration remain separate from this password-protected staging release.

## Staging verification — November 22, 2026

Imported 8,851 named Lightspeed records, excluded 388 unnamed records, and reran the import: zero inserts and 8,851 skips. Reconciled every external identity and list field against the private export using staging/verify-customers.mjs; sampled full source records, original Active flags and addresses also match. Browser checks passed for create/save, preserved postal-code leading zero, search, archive filtering and persisted Service Desk job linkage. One synthetic QA customer remains archived and linked to synthetic job #2. The 8,851 imported customers remain available. Source and customer data were never published to Floot.

## Customer selection in Service Desk

In standalone staging, New/Edit job includes Lakeview customer search by name, Lightspeed number, email or phone. Selecting an available customer copies first/last name, email and mobile/home/work phone in that order. Missing source details remain blank for staff to complete; existing job validation still applies. Addresses are not assumed to be pickup/delivery locations. Clearing an unsaved selection retains editable contact fields and creates no link.

The staging job-save endpoint commits the job and relationship in one PostgreSQL transaction. It checks Service Desk access and Customers access for a new selection, Lakeview ownership, available status, job version and completion lock. Existing links cannot be silently reassigned. Editing/checklist saving without customerId preserves the relationship and historical contact snapshot. Existing linked archived customers remain readable; they cannot be selected for new links. Live Floot keeps its existing save handler and UI until a separate release.

Regression coverage: tests/job-customer.test.mjs (run with node --import tsx --test), including atomic save failures, tenant isolation, member selection without customer-admin rights, archived customer behavior, stale versions and snapshot preservation.

Deployed and verified on staging revision marine-ops-staging-00008-dcn. Browser tests created a new linked job and linked an existing unlinked job, then reopened the latter to confirm persisted association. API verification confirmed both appear on the customer record with correct name/email/mobile-phone snapshots. Synthetic Picker QA customer and test jobs remain clearly marked. Existing Service Desk smoke checks and frontend/PostgreSQL CI passed.
