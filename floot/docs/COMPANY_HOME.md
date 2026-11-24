# Company Home Dashboard

The standalone staging root `/` is now the company Home Dashboard. Staging sign-in redirects there; the existing Microsoft sign-in default already returns to `/`. Production Floot login and routing are not cut over by this change.

The shared company navigation includes Customers, Units, Service, Sales / Dock Builder, Inventory, Mapping, company administration and other tools. Existing Service Desk dashboard widgets, job queues, scheduling, drag rescheduling, printing and service administration remain available in the Home Dashboard and at `/dashboard`.

Company selection is validated against active memberships and active companies, then retained in session storage and passed explicitly in navigation URLs. Operators do not gain company data access merely by being platform operators. Service, Dock Builder and inventory remain subject to their existing rollout and backend authorization checks. Unsupported company IDs show an access error rather than falling back to another company's records.

Customers remain the existing company-scoped directory and API. Service/customer-unit links and Dock Builder quote/customer links retain the same IDs; no customer copy or migration is performed. Customers and Units are reachable from the same navigation throughout the company workspace. Mapping, layouts and dock scheduling still await standalone backend migration; the Mapping staging page states this limitation and retains shared customer navigation.

## Administration separation

- `/company/admin`: company member management for company owners/administrators; no entitlement or company-status controls.
- `/platform`: platform operator administration, outside company navigation, for company creation, enable/suspend and tool entitlements. Its overview endpoint enforces operator access on the server.
- Company status updates use optimistic versions, transactional row locks, same-origin checks and audit events. Existing company/tool access checks enforce suspended-company denial.

The old gateway tool launcher is replaced in staging by an available-tools page at `/tools`. Existing production gateway code remains retained for the authorized future cutover. No new sales workflow is fabricated: current sales functionality is Dock Builder and its saved customer quotes.

## Verification

The database CI suite covers operator-only overview/status changes, stale-version rejection, membership boundaries, company suspension and existing tool access enforcement. `staging/verify-company-home.mjs` checks the root login redirect, enabled tools, shared customer access, operator controls and cross-company customer denial using a synthetic QA company. The QA company is left suspended and without memberships or enabled tools.

Verified November 23, 2026 on revision `marine-ops-staging-00034-csc`, serving 100% of staging traffic, application source `03fda9e`. Frontend and PostgreSQL CI passed after correcting selector markup. Staging API verification passed login redirect, tool entitlements, shared customers, operator controls, optimistic-version rejection and cross-company denial. Browser verification confirmed the root Home Dashboard, retained day board, customer directory, Dock Builder customer picker, inventory, Mapping customer navigation, company member administration without platform controls, and a separate platform page without company navigation or membership forms. Outlook remained paused. No real customer/job records were modified.
