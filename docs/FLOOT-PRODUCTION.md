# Floot production gateway

Production target: https://lakeviewwebster.marineopstech.net. The root gateway and /dashboard/ run together on the existing Floot project, using one company Microsoft session, the copied approved-user list and existing service identities. Jobs remain in the existing Floot PostgreSQL database. Five private thumbnails are now in Floot private storage; no source image bytes or membership records are in Git. Outlook synchronization remains paused.

Authoritative application source is service-dashboard development. Run node scripts/sync-floot.mjs ../service-dashboard after a verified source commit, then commit/push this repository development branch and check the Floot source build. The floot/SOURCE.json manifest records the exact source commit and hashes. Publish corresponding application releases on Floot. Main branches stay stable.

The former Next.js/Vercel gateway is retained at the repository root and on preproduction for rollback. Its legacy configuration and signing key do not power the new native Floot gateway. Do not delete the old environment until cutover is validated and retirement is explicitly requested. Gateway link/member changes after migration belong in the Floot production admin UI.
