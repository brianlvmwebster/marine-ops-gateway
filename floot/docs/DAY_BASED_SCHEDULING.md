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
