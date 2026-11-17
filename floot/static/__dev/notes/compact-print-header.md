# Printable job-sheet layout

2026-11-14: The full job sheet uses a 200px preview logo and 180px print/mobile logo (previously 250px / 220px). Header bottom padding is 8px instead of 20px; title and RO margins and header line height are compact. The service checklist retains its existing 118x59px logo and 68px header.

Header verified with synthetic page examples: preview 148px to 111px; Edge print media 133px to 101px. Original emblem loads; 393px phone layout has no horizontal overflow. Typecheck and checklistPrintFit spec passed. The Helmet title uses a single string. This header change was pushed as fe76210 and published to production on 2026-11-14.

Return / storage now formats recognized US addresses on two lines: street (including any unit details), then city and state. ZIP code and country are omitted only in this print presentation. Saved job addresses and pickup addresses are unchanged; unrecognized free-form addresses are preserved. Helper specs cover Google-style, multiline, units, blanks and unrecognized addresses; typecheck and the rendered sample preview passed.

Imported Return Address values may include literal Street name, House number, City, State and Zip labels, with street before house number. The print formatter now extracts those fields and prints only their values in the requested order. Verified with synthetic labeled-address fixtures, including missing fields; stored addresses are not rewritten.

The full job sheet now places six details sections in one three-column grid: Customer / Vessel / Appointment & assignment, then Requested services / Pickup / drop-off / Return / storage. Notes and checklists remain full width. Print uses three columns; screens 600px or narrower stack the sections. Verified six sections, row/column alignment in Edge print media, no phone overflow at 393px, clean page typecheck, and the existing checklist-only layout. Sample preview image uses synthetic data.

Production publishing remains a separate release action. The additional marine-ops-gateway backup synchronization was blocked by automatic approval review as outside the layout request and needs explicit user authorization.
