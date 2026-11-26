# Mapping & Storage: Google staging

Source: LVM Mapping Utility, Floot project `5c9bc5b8-9385-4cf3-b124-8efa4f313954`, checkpoint `c0965e17-6083-4fe7-928a-6c78931e6887`. Source reconciled against the published November 24 release. The existing older MapTool integration is updated with configurable Text/Number/Boolean columns, custom Boolean labels, spreadsheet template export/import, and review/editing.

Open Mapping Tool directly from the signed-in Marine Ops gateway. Its standalone toolbar looks up the same company Customers and Parts Inventory records used by the dashboard when the corresponding tools are enabled.

The standalone staging server now has a separate `platform/mapping.ts` backend. It imports no Floot services. Requests require a registered session, active Lakeview membership and the enabled `mapping` entitlement. Every map and image is scoped to both company and owner; another member cannot access a map by knowing its ID. Company navigation enforces the selected company's entitlement as well. Mutations require exact Origin; payload sizes, image bytes/type/dimensions, data types and optimistic revisions are checked. Completed source images cannot be replaced. Uploads, saves and organization changes are audited.

Apply `015-mapping.sql` with `node --import tsx staging/migrate-mapping.ts` in the isolated staging runtime. This creates new standalone tables, retaining the older imported Floot tables unchanged. It does not import maps or alter service/customer records. The regular staging migration also includes this migration. Manual markers, boundaries, layout folders, custom fields, XLSX templates, imports and explicit Save map are supported.

For this preparation phase, private image bytes are stored in PostgreSQL, bounded at 10 MB per map and 100 maps per owner. They are served only through authenticated image requests with private/no-store caching. This avoids provisioning or assuming access to an unconfigured bucket. Production cutover requires moving private bytes to Cloud Storage with immutable keys and hash verification; the small staging database is not the long-term image store. AI detection is disabled at both UI and API until a direct provider/model and server credentials are selected and verified. No Floot AI, storage, viewer or broker calls are made by these standalone routes.

## November 25 staging release

The owner authorized deployment and data migration to `/mapping`. Google staging revision `marine-ops-staging-00037-m4b` serves this route; `/maps` redirects while retaining query parameters. Navigation and the tool registry use `/mapping`.

Image build: `b0c26c02-7a6f-42a4-96c5-45f698f7806f`, digest `sha256:e2fccee36f77f0782284863e7bc042c16df0cd8e06a44fd7f1fee4e4d6d70e5d`. Schema job `marine-ops-staging-mapping-migrate-4nrz5` applied migrations 015 and 016. Import job `marine-ops-staging-mapping-import-cqg2w` copied four completed maps, 298 locations and four private images (15,878,399 bytes), retaining archived state. Two incomplete uploads were excluded.

Reconciliation: all four image hashes match across both Floot projects. Three maps have identical location data. For the divergent slip map, the original app's newer November 24 22:13 UTC record supplies its 2026 name, locations and typed columns; the integrated app's organization revision 3 supplies the two folders and map section assignments. Original Floot owner `6e846880-bc19-44d8-97dd-87cbaf5fea06` maps explicitly to `owner@staging.example.invalid` in Lakeview. Raw exports, signed URLs and records are excluded from Git.

`staging/import-mapping.ts` is an operator-only, staging-guarded job. It validates ownership, spaces, columns and image hashes/dimensions before one transaction; verifies stored bytes and JSON; refuses a nonempty target workspace. The temporary Secret Manager bundle versions are disabled after verification. Floot remains available as rollback, without new publishing or destructive changes.

## Remaining production migration gates

1. Staging deployment and import are complete. Retain the staging login until production authentication is ready.
2. The November 25 source reconciliation is recorded above. New staging writes are independent of Floot; do not rerun the initial importer over them.
3. Private image copies and imported JSON were verified transactionally. No customer/map records or signed URLs belong in Git.
4. Replace staging image storage with Cloud Storage and connect direct AI detection. Complete production authentication and private-data backup/restore checks.
5. Obtain cutover authorization and a write-freeze window before final import/DNS changes. Keep existing Floot apps available for rollback; do not delete them or resume Outlook sync.

Dock Crew Scheduler is the next tool in the migration queue, per the owner's November 24 selection. Its Floot brokered launch and identity need standalone replacements; it is not included in this mapping change.

Verification: `node --import tsx --test tests/platform-mapping.test.mjs tests/staging.test.mjs`. With `TEST_DATABASE_URL`, the mapping suite applies the migration twice in an isolated schema and verifies owner isolation, private uploads, field-type persistence, conflicts, archiving, entitlement and membership revocation. CI's `platform*.test.mjs` pattern includes it.

Layout correction build: 8cdd59c1-3fa3-42e0-8cff-de0ccad1d674 moves the manual-mapping notice into the workspace content rather than a separate flex column.

HTTPS browser verification passed: login, legacy redirect, all imported JSON and image hashes, custom Boolean labels, private upload, Excel template download/import, typed values, save/reload and no JavaScript errors. The disposable test map was removed by a narrowly scoped staging job, which verified four maps and 298 locations remained.
