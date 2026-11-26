# Import update audit

Record each comparison of a refreshed source against Marine Ops data when the check finishes. Use one entry per dataset and run. Record the check date and time in Eastern time, the dataset, source and target environment, a short summary of the findings, and the application outcome.

- Use **Pending review** while a proposed update is awaiting approval, **Not applied** when it was skipped, **Applied** or **Partially applied** after verifying the saved changes, **No changes** when the comparison finds none, and **Failed** if the check or update fails.
- Update the same entry if changes are applied later. Include the application timestamp and summarize any conflicts or changes still pending. Record unknown historical timestamps as unavailable.
- Keep summaries to counts and change types. Exclude names, record IDs, contact details, source files and credentials.

## Runs

| Checked (Eastern) | Dataset and source | Environment | Findings | Application outcome |
| --- | --- | --- | --- | --- |
| Nov 26, 2026 (check time unavailable) | Customers · Lightspeed Customer Bulk | Staging | Compared 8,851 named records to the previous snapshot. Two address changes, no new or missing customers, and no conflicting staging edits. | **Applied** · Both addresses saved and verified. Staging recorded both saves at 12:55:17 a.m. EST on Nov 26, 2026. |
