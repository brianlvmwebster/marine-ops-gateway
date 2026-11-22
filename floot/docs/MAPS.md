# Mapping & Storage in the gateway

Route: https://lakeviewwebster.marineopstech.net/maps. Protected by the native company Microsoft session and approved-member policy, with login return to /maps and a Gateway return link. API namespace: /_api/mapping/. All reads/writes require nativeGatewayAccess; mutations require the exact Origin. Ownership remains per user, using the stable gateway service identity. The owner retains all saved maps; other approved members start with their own empty workspace.

MapTool-prefixed components/helpers isolate the imported mapping source and compact UI from the other suite apps. Route-local query cache is discarded on unmount/sign-out. Do not replace the gateway's global CSS or shared components with the standalone mapping theme. Sharp handles private uploaded images and AI analysis; XLSX handles location spreadsheets.

Migrated four ready maps and 197 saved locations, preserving IDs, revisions, timestamps, section membership, archive state, names and owner. Each of four private image copies was verified by SHA-256. Two unfinished upload records remain in the original project. Original app and records were retained as rollback, not bidirectionally synchronized. New writes belong in the gateway version after cutover. Pending unsaved browser edits cannot be migrated.

Source app: Floot 5c9bc5b8-9385-4cf3-b124-8efa4f313954. Target: 1552d0fb-863c-4274-8bcc-08496609ca66. Additive migration 006-storage-maps.sql. No changes to job data, Microsoft configuration or Outlook synchronization.

Verification: whole-project Floot typecheck; 18 policy and mapping suites; private image GETs and owner map enumeration; foreign-origin invalid-body mutation rejected 403. Original completed-map snapshots must match target IDs/revisions/location hashes before publication.
