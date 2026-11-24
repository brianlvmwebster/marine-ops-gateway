# Day-based scheduling

Implemented and verified in standalone staging on November 23, 2026.

Schedule opens the Day board: seven start-day columns with compact clickable job cards. New staging jobs default to day-based scheduling and require a start day; start time and estimated duration are optional. No end date is required. Cards open the existing job details and editor.

Timed appointments remain available through the Schedule view toggle and scheduling-mode selector. They require a start time and duration. Existing jobs without a scheduling mode retain timed behavior. The timed calendar excludes day-based jobs; the day board shows both modes with explicit labels.

Carryover / In progress shows unfinished jobs whose start day is before today, independently of the selected week. Done, Completed, Cancelled and cancelled appointments are excluded. Undated legacy jobs have an unscheduled section. Narrow screens scroll the day columns within the board.

Blank day-based duration is stored as zero under the existing numeric contract and displayed as blank, never as a fabricated duration. Details and printed job sheets omit absent time and duration. Day-based jobs cannot be calendar eligible; Outlook synchronization remains paused.

## Verification

- Cloud Run revision: `marine-ops-staging-00032-cgx`, receiving 100% of staging traffic.
- Application source: `dddccc4`; repeatable staging verifier added in `b3380b2`.
- GitHub frontend and platform checks passed, including PostgreSQL job-save tests for day/timed validation and mode transitions.
- Browser: saved and reopened a day-based job with blank time/duration; timed mode rejected missing required fields; printed job sheet showed the start day without an invented time or duration.
- Browser: day and timed cards appeared in their start-day columns; timed calendar excluded day jobs; carryover persisted when navigating weeks.
- Paper and Midnight themes inspected; 390px viewport retained readable cards with board-contained horizontal scrolling and no document overflow. Viewport and theme were restored afterward.
- `staging/verify-day-board.mjs` verified persistence, invalid API requests and paused synchronization. It uses environment-supplied authentication, never committed credentials.

Three explicitly synthetic staging examples remain: DAY-BOARD-QA, CARRYOVER-BOARD-QA and TIMED-BOARD-QA. No real customer jobs were edited. Production Floot and both main branches were not changed.

## Rescheduling on the board

Drag a job card from a day column, Carryover / In progress, or Unscheduled onto a day column to save its new start day. The destination column highlights during dragging. The card moves after a successful save; a same-day drop does nothing. The Move to day selector provides the same action for keyboard and touch users. Navigate weeks first to choose a date outside the current week.

Only the service date changes: scheduling mode, time, duration, status, assignment, checklist and calendar eligibility are preserved. Existing version checks reject stale updates without overwriting concurrent work. While saving, further moves are disabled; failures show an error and refresh action. Moving carryover to today or a future day removes it from carryover; moving to an earlier day keeps it there.

The repeatable staging verifier now moves all three synthetic examples, checks exact data preservation, rejects a stale version, and restores the examples to their initial dates.

Rescheduling verification: revision `marine-ops-staging-00033-gkq` (source `87563f1`) received 100% of staging traffic. Source CI passed. The staging API verifier passed exact-field preservation and stale-version conflict checks. Browser mouse drags moved synthetic job #17 to November 25 and carryover job #18 to November 26; carryover became empty. The accessible selector moved timed job #19 to November 27, retaining 10:00 ET and 60 minutes. All three dates persisted after a full reload. These synthetic examples remain at the new dates. Outlook stayed paused.
