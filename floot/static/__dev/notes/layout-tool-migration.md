# Show Layouts migration — 2026-11-10

Source: brianlvmwebster/lvm-show-layouts production main 9c9448d36403b5d1fe07e10f559f281c2e6b0022. Latest production source cloned into the user's Dock Crew Scheduler workspace/layout-migration-source. All 57 upstream tests pass.

Native protected page /layouts is part of Operations Hub, using NativeGatewayGuard and existing approved Microsoft sign-in. Native component LayoutWorkspace hosts a scriptless srcDoc document and initializes a bundled helper in its own frame document/window. Executable source is helpers/layoutEngine.tsx, never a static uploaded script. Removing the frame releases its DOM and window listeners/observers. CSS is isolated in the frame. No new credentials or database needed.

Preserved production editor including boat catalogs (20 Evotti and 114 Premier models), 187 existing artwork files, dock legs/decking, geometry, grouping, alignment, text rotation, local persistence, JSON import/export and print checklist. Artwork bytes uploaded unchanged, mapped /assets/path to /_cdn/static/layout-path with slashes changed to hyphens. A migration artwork archive is also stored at /_cdn/static/f871a269-f825-4fc2-9625-0dae1ea69859-layout-library-migration.json.gz (manufacturer artwork only).

Layouts are browser-local under lvm-show-layout-v1. Old-origin data is not automatically accessible at the new origin. Users must Export layout at https://layouts.marineopstech.com and Open layout at /layouts using the same downloaded JSON. Existing layouts and old deployment were not changed. No shared/cloud layout persistence was introduced.

Verification: 57 original tests, gatewayPolicy spec, Floot typecheck clean. Local browser test of migrated code passed startup, dock add/undo, Evotti/Premier adding, themes, JSON export/import, print preview and desktop/mobile; no page errors. Floot preview /layouts initializes correctly, decodes hosted catalog artwork, opens print preview. Local scripts layout-migration-prepare.mjs, layout-migration-build.mjs, layout-migration-check.mjs reproduce transformation/testing; artifacts in layout-migration-build.
