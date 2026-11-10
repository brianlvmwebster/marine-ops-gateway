# Unified dashboard and compact calendar

Overview now has one Dashboard heading, shared actions and summary metrics, and one configurable widget grid. Columns (1–4) save with each account's widgets using the existing version check. Smaller screens cap the visible columns at two, then one, without changing the saved desktop choice. Migration 005 adds the bounded columns preference; older clients that omit it preserve the current value.

Compact calendar is available from Add widget. Each instance saves its own 1–14 day range, job limit per day, and pickup/drop-off, status, trailer, assignment (individual/group/unassigned), priority, service, and return/storage filters. Default is five days from the Eastern service date with active jobs. This Week means the current Monday–Sunday week, including earlier days; From today returns to a rolling range. The agenda uses category colors and opens the existing job details, with a Full calendar shortcut. Road pickups retain pickup address/body of water and trailer type. No job or Outlook event is created by configuring widgets.

Existing widget IDs, order, limits and account ownership remain intact. Tests cover old layouts, columns/range validation, Sunday/week/year/DST boundaries and combined filters. Outlook syncing remains paused.
