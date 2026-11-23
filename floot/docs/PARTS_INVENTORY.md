# Parts Inventory in Google staging

Lakeview has a Parts Inventory tool at `/inventory/parts`, available through Company workspace. The first version is a searchable catalog and opening stock snapshot. Search covers part/description, supplier, category, manufacturer, UPC and bins; filters include active/inactive and positive/zero/negative on-hand balances. Details show prices, costs, reorder values, all three bins and the original Lightspeed fields.

Migration 012 registers the Lakeview entitlement and creates company-scoped parts. Every part receives a Marine Ops UUID. Supplier code plus part number is unique within a company; numbers and UPCs stay text, including leading zeros. Quantities and prices retain exact decimal strings, including negative and fractional quantities. Available stock is separate from on hand. Inactive records remain searchable. No pricing, reservation or stock-adjustment rules are inferred from source flags or ambiguous headings.

The authorized export contains 24,097 records: 17,942 active and 6,155 inactive. All inactive records have zero on hand. There are 34 negative and five fractional on-hand balances. No source records are excluded. Blank layout rows and the report footer are not records. The full 127-cell source row is retained in column order, preserving repeated/truncated headings and original values.

`scripts/prepare-lightspeed-parts.py` reads legacy XLS with xlrd 2.0.2 and produces private JSON in ignored backups. `staging/import-parts.mjs` pins the staging host, imports bounded batches and verifies every mapped field and source-row hash, distinct UUIDs, counts and status/stock filters. Identical retries skip existing records. Conflicting supplier/part records reject and roll back the batch instead of overwriting. Imports require company owner/admin access, enabled tool access and same-origin requests. Read access requires active company membership and tool access. Audit events contain batch hashes/counts only.

Receiving, adjustments, stock movement history, catalog editing, serial tracking and Service Desk parts usage remain subsequent work. No stock deductions, purchasing or live inventory synchronization are enabled. Runtime routes and deployment are staging-only. Live Floot, main branches and Outlook synchronization remain unchanged.

PostgreSQL CI covers authorization, inactive and fractional/negative balances, independent supplier keys, retry safety and conflicting-batch rollback. Source XLS/JSON and staging records must never enter Git or container build contexts.

## Verified staging release — November 22, 2026

All 24,097 records imported with zero skips. Complete reconciliation passed for every mapped field, source-row SHA-256, unique Marine Ops ID and active/stock filter count. Original negative and fractional quantities and all 6,155 inactive parts are retained. Anonymous access was rejected. Browser checks passed for workspace navigation, search, details, original fields, inactive/negative filters and pagination. Visual review corrected inherited-theme contrast. Unfiltered browsing avoids unnecessary text matching. Customer-linked Dock Builder quotes and Service Desk jobs passed regression checks. Final Cloud Run revision: `marine-ops-staging-00022-8xr`. No live Floot changes.
