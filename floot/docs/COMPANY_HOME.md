# Gateway and Company Dashboard

The November 23 organization correction supersedes the prior root-dashboard layout.

Microsoft SSO returns to the company gateway at `/`. Standalone staging password login also returns to `/`. The gateway presents a grid of enabled tools, including Company Dashboard at `/dashboard`, Dock Builder, Dock Crew Scheduler at `/dockscheduler`, and Mapping Tool at `/mapping`. Dock Crew Scheduler and Mapping Tool open as standalone workspaces with a return link to the gateway. Company Dashboard navigation and its Company settings omit both tools. Platform administration at `/platform` still manages company entitlements.

Company Dashboard opens the existing customizable Overview, preserving saved widgets and column preferences. One sidebar contains Overview, Job queue, Schedule, shared Customers, Units, Sales / Dock Builder, Inventory, company administration, and Back to gateway. Customer, inventory, company-administration and Dock Builder pages use that same sidebar. The extra company navigation bar is removed. Point of Sale is not introduced or advertised as available.

The company context provider validates active membership and entitlements, passes company IDs in links and preserves the selected company. Dock Crew Scheduler and Mapping Tool show in-place, read-only Customers and Parts Inventory lookups from the same company records used by the dashboard. The lookups honor the same entitlements and session checks. Service jobs and Dock Builder quotes keep their existing links. Operator-only company enable/suspend and entitlement controls remain separate from company member administration.

The retained production Floot application and Microsoft integration are not cut over by this staging change. Outlook stays paused and main branches remain stable.

## Staging verification

Verified the correction on November 23, 2026, revision `marine-ops-staging-00036-ghf`, serving 100% of traffic, application source `51aeb34`. Frontend and platform CI passed.

- Staging login redirects to `/`, now the gateway grid; Company Dashboard opens `/dashboard`.
- Browser verified gateway entry/return, one sidebar and no old company top navigation, shared Customers, Inventory, Schedule and company administration without platform controls.
- Customizable Overview's widget chooser opens; changing columns from one to two persisted after reload and was restored to one. Selected dashboard sections update the URL and Overview survives reload.
- A 390px viewport kept readable navigation labels and no horizontal document overflow. Desktop viewport was restored. Sidebar account text contrast was corrected after inspection.
- The API verifier passed login destination, shared customer access, active entitlements, operator controls, stale updates and cross-company denial. No real customer or job records were changed. One browser reload stalled without a server error and succeeded on retry.

Staging uses its isolated test login; Microsoft SSO itself is not exercised here. Production Microsoft sign-in defaults to the root gateway and is unchanged pending authorized cutover.
