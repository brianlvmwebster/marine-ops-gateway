# Mapping & Storage: standalone phase one

Source: LVM Mapping Utility, Floot project `5c9bc5b8-9385-4cf3-b124-8efa4f313954`, checkpoint `c0965e17-6083-4fe7-928a-6c78931e6887`. Source reconciled against the published November 24 release. The existing older MapTool integration is updated with configurable Text/Number/Boolean columns, custom Boolean labels, spreadsheet template export/import, and review/editing.

The standalone staging server now has a separate `platform/mapping.ts` backend. It imports no Floot services. Requests require a registered session, active Lakeview membership and the enabled `mapping` entitlement. Every map and image is scoped to both company and owner; another member cannot access a map by knowing its ID. Company navigation enforces the selected company's entitlement as well. Mutations require exact Origin; payload sizes, image bytes/type/dimensions, data types and optimistic revisions are checked. Completed source images cannot be replaced. Uploads, saves and organization changes are audited.

Apply `015-mapping.sql` with `node --import tsx staging/migrate-mapping.ts` in the isolated staging runtime. This creates new standalone tables, retaining the older imported Floot tables unchanged. It does not import maps or alter service/customer records. The regular staging migration also includes this migration. Manual markers, boundaries, layout folders, custom fields, XLSX templates, imports and explicit Save map are supported.

For this preparation phase, private image bytes are stored in PostgreSQL, bounded at 10 MB per map and 100 maps per owner. They are served only through authenticated image requests with private/no-store caching. This avoids provisioning or assuming access to an unconfigured bucket. Production cutover requires moving private bytes to Cloud Storage with immutable keys and hash verification; the small staging database is not the long-term image store. AI detection is disabled at both UI and API until a direct provider/model and server credentials are selected and verified. No Floot AI, storage, viewer or broker calls are made by these standalone routes.

## Remaining migration gates

1. Apply the schema and deploy to Google staging, then verify authenticated image upload, manual mapping, save/reload and spreadsheet round-trip over HTTPS.
2. Reconcile source records from BOTH the original mapping app and the older Marine Ops Floot integration. They have diverged since the earlier four-map copy. Compare IDs, revisions, location hashes and modified times; never overwrite the newer copy automatically. Map Floot owner identities explicitly to Marine Ops users.
3. Privately copy map images and verify hashes, map/space counts, column definitions and ownership. No customer/map records or signed URLs belong in Git.
4. Replace staging image storage with Cloud Storage and connect direct AI detection. Complete production authentication and private-data backup/restore checks.
5. Obtain cutover authorization and a write-freeze window before final import/DNS changes. Keep existing Floot apps available for rollback; do not delete them or resume Outlook sync.

Dock Crew Scheduler is the next tool in the migration queue, per the owner's November 24 selection. Its Floot brokered launch and identity need standalone replacements; it is not included in this mapping change.

Verification: `node --import tsx --test tests/platform-mapping.test.mjs tests/staging.test.mjs`. With `TEST_DATABASE_URL`, the mapping suite applies the migration twice in an isolated schema and verifies owner isolation, private uploads, field-type persistence, conflicts, archiving, entitlement and membership revocation. CI's `platform*.test.mjs` pattern includes it.
