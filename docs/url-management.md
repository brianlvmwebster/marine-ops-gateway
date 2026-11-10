# Application URLs

The gateway provides a stable address for each application:

`https://lakeviewwebster.marineopstech.com/apps/service-management`

Use lowercase words separated by hyphens. Keep the permanent name independent of the display title, season and hosting platform. Do not put a year, access token, or preview deployment hash in a permanent name.

In **Manage links → Edit**:

- **Button name**: the readable label, such as Marine Service Management.
- **Permanent URL name**: `service-management`. Set once, then keep unchanged so bookmarks remain valid.
- **Destination URL**: the actual HTTPS application address. Change this when the application moves or when a preview is replaced with its permanent deployment.

Select **Apply to list**, then **Save changes**. Permanent names must be unique. The gateway requires authorized sign-in before resolving a named destination and uses a temporary redirect so browser bookmarks continue to pick up later destination edits. Old destinations without permanent names keep their existing direct links.

The stable gateway address does not host or proxy the destination application. The current service dashboard is an unpublished Floot preview. Its access link still expires, so this remains a preview until the dashboard is migrated to Vercel or published with its own stable authenticated URL. Do not treat a preview bearer link as permanent application authentication.

When the dashboard moves into this Next.js app, use `/service` for its home, `/service/jobs/<job-id>` for job details, `/service/schedule` for scheduling, and `/service/jobs/<job-id>/print` for print views. Job IDs are stable identifiers; titles and customer names belong in page content rather than routing keys. Those service routes are a convention for the migration and are not implemented by this gateway alias change.

The pre-production and production gateway currently share the same destination list in the existing database. Editing a destination is reflected in both gateways; adding permanent names is backward compatible with the current production renderer.
