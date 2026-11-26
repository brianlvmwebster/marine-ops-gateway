# Import update audit

In Marine Ops staging, open **Administration** from the Company Dashboard sidebar. The page shows the three most recent runs for each dataset and links to its full history. Staging records customer checks and their application outcomes here automatically. Continue to use this document for operator comparisons run outside Administration.

For Customers, choose the Lightspeed Customer Bulk `.xls` or `.xlsx` file and use **Check for changes**. The check matches by Lightspeed customer number and compares the previous source snapshot, the export, and current Marine Ops contact fields. Review the counts and changed fields before choosing **Apply customer changes**. Applying keeps unrelated local edits, excludes conflicts and unnamed rows, and leaves missing customers in place. Stale previews must be checked again. The workbook and detailed preview are temporary. Audit history stores counts and status. Parts Inventory, ROs and Units currently have history views while their comparison workflows are pending.

Record each comparison of a refreshed source against Marine Ops data when the check finishes. Use one entry per dataset and run. Record the check date and time in Eastern time, the dataset, source and target environment, a short summary of the findings, and the application outcome.

- Use **Pending review** while a proposed update is awaiting approval, **Not applied** when it was skipped, **Applied** or **Partially applied** after verifying the saved changes, **No changes** when the comparison finds none, and **Failed** if the check or update fails.
- Update the same entry if changes are applied later. Include the application timestamp and summarize any conflicts or changes still pending. Record unknown historical timestamps as unavailable.
- Keep summaries to counts and change types. Exclude names, record IDs, contact details, source files and credentials.

## Runs

| Checked (Eastern) | Dataset and source | Environment | Findings | Application outcome |
| --- | --- | --- | --- | --- |
| Nov 26, 2026 (check time unavailable) | Customers · Lightspeed Customer Bulk | Staging | Compared 8,851 named records to the previous snapshot. Two address changes, no new or missing customers, and no conflicting staging edits. | **Applied** · Both addresses saved and verified. Staging recorded both saves at 12:55:17 a.m. EST on Nov 26, 2026. |
