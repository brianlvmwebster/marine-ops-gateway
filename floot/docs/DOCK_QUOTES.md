# Shared Dock Builder quotes (staging)

Dock Builder is enabled for Lakeview in standalone Google staging. Open **Customer & saved quotes** to search available customers, fill contact details, name and save a quote, or find and reopen saved quotes. Saved quotes are stored in Cloud SQL, accessible from other devices after signing in with authorized Lakeview access. Local browser drafts and JSON export remain available; changes require an explicit Save.

The full layout and pricing worksheet are stored with a contact snapshot and optional customer relationship. Customer edits do not rewrite existing quotes. Mobile phone is preferred, then home, then work. The imported Lightspeed Active flag remains informational. A saved customer relationship is preserved; Save as new quote creates a separate copy. Customers show links to their saved Dock Builder quotes. Standalone quotes without a customer link are also supported.

Migration 009 registers the tool and its Lakeview entitlement and creates dock_quotes. The API authenticates sessions, requires company membership and tool access, checks request origins, validates documents using the trusted bundled Dock Builder validator, and checks versions transactionally to reject stale saves. Selecting a new customer additionally requires Customers access and an available Lakeview record. Existing links survive customer archival. Audit entries contain IDs and revisions, not customer contact details.

The staging asset handler adds the integration script to the existing embedded editor; the Floot endpoint and bundled source are unchanged. Same-origin framing is allowed only for the authenticated Dock Builder assets. All other staging integrations remain restricted.

This is the first quote-management layer: shared storage, search, copies, customer links and overwrite protection. Quote status/approval workflows, revision-history browsing, attachments, sending email and production authentication/cutover are separate work. The revision counter is not a historical archive.

Verification: tests/platform-dock-quotes.test.mjs exercises validation, authorization, customer snapshots, shared reads, conflicts and links against PostgreSQL in CI. Staging browser verification uses synthetic customer/quote records only.

## Verification — November 22, 2026

Frontend and PostgreSQL CI passed. Staging API checks passed for save/read/update, stale-version rejection, invalid customer rejection, anonymous access and same-origin framing. Browser testing selected the synthetic Picker QA customer, added a dock frame and five decking panels, set custom labor to $150, saved and reopened from another tab and from the customer record. The restored worksheet and print preview retained the $2,048.69 test total and contact snapshot. A second-tab update caused the original tab's stale save to be rejected. Save as new quote created a separate linked copy. Existing Service Desk staging smoke checks also passed. These are synthetic test quotes, not real offers or orders. Live Floot was not changed.
