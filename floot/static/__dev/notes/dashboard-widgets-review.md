# Dashboard cards and Service Admin review

Overview uses a personal card library: Tomorrow, Upcoming, Road Pickups, Deliveries, Customer Trailers and optional Today. Users can add/remove/reorder cards and choose counts. Layouts persist per authenticated user with version checks. The full queue remains under Job queue. Deliveries use the service date for now.

Only the explicitly configured owner currently has Service Admin access. Roles use trusted authenticated user IDs in service_access_roles; client flags cannot grant access. Done review cards prominently display customer name, address, phone and email. Required pickup contact and manual Lightspeed tally/close confirmations precede Mark Completed. Notes, reviewer and time are retained. No messages or Lightspeed API changes are sent.

Legacy Completed history without adminReview is read as Done; no bulk rewrite was performed. Reviewed Completed data is protected from workflow edits, source imports and database updates. Migration: migrations/002-dashboard-cards-admin-review.sql. Generated schema was pulled from Floot.

Verified six related spec files, full Floot typecheck, authenticated layout persistence/stale rejection, completion gates and audit protection using a temporary synthetic job that was removed. Real jobs were not completed during testing. Outlook synchronization remains paused. Changes are in the Floot preview pending publication; GitHub development is the source revision branch.
