# Live search

Customer and unit directories, Parts Inventory, job customer/unit/parts lookups, unit-owner lookup, and Dock Builder customer/saved-quote searches update automatically after 200 ms without typing. Enter and existing search buttons remain optional. Directory queries reset pagination; clearing a directory query restores its unfiltered list. Lookups remain editable while fetching, cancel superseded requests, and never select or save a record automatically.

Verified November 23, 2026 on staging revision `marine-ops-staging-00029-kj2`, application commit `3724366`: typed synthetic queries returned customer, unit, owner, inventory, job-parts and Dock Builder matches without submission. Customer clearing restored the full directory; changing a query from page two reset to page one. The job unit lookup narrowed to one matching unit. Saved-quote search returned the expected empty result for a nonexistent query. No customer, job, unit, quote or stock changes were saved.

GitHub CI passed frontend build, standalone startup and database regression checks. The local startup test could not run without a generated `dist` directory; the Linux CI build supplied it and passed. Production Floot and Outlook sync remain unchanged.
