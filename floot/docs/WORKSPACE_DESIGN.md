# Workspace appearance

Standalone staging has a compact workspace design: square corners, flat surfaces, fine dividers, 13px body/table text and restrained heading sizes. Shared controls retain visible keyboard focus and larger targets for touch input. Customer disclosures remain individually collapsible with only the first open initially.

The workspace header offers three light themes (Paper, Mist, Sand) and three dark themes (Midnight, Graphite, Pine). Palette values are shared by the company workspace, customers/units, inventory, Service Desk, dialogs and gateway shell. Branding images retain white backing where needed for their original artwork. Embedded third-party tools and mapping imagery are not recolored.

Preferences are stored under `marineops.appearance.v1` in this browser, applied before React renders, retained across navigation/reload, and synchronized across tabs. Invalid or unavailable storage falls back to Paper; blocked persistence does not prevent changing themes for the current page. No customer/account records are changed. Print pages omit the theme toolbar and use white paper with dark text regardless of the screen theme.

`node --test tests/appearance.test.mjs` verifies all six palettes maintain at least 4.5:1 contrast for body/secondary/action text across their surfaces and for primary button labels. CI includes these checks with the frontend build and standalone startup tests. Staging retains its isolation banner; live Floot, main and Outlook synchronization are unchanged.

Verified November 23, 2026 on staging revision `marine-ops-staging-00028-748` (application commit `94d7e33`). Browser checks covered all six themes, reload/navigation persistence and cross-tab preference updates; customer disclosures; 390px mobile layouts; Service Desk and its job dialog; inventory notice contrast; and gateway branding in dark mode. The job print route retained white paper and dark text without the appearance toolbar. No customer, job or inventory changes were saved during design verification. Frontend, startup, palette contrast and PostgreSQL CI checks passed.
