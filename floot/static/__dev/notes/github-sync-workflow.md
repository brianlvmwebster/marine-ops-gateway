# Dashboard change and GitHub sync workflow

Floot is the running application platform. GitHub repository https://github.com/brianlvmwebster/service-dashboard is the source backup and revision history, not a request to migrate hosting. Local checkout: C:/Projects/v2/service-dashboard.

For every dashboard change handled in this workflow:

1. Read current Floot source and repository state before editing; preserve concurrent changes.
2. Implement the authorized change in Floot and perform appropriate type/runtime/visual checks. Keep Outlook calendar sync paused unless the user explicitly changes that requirement.
3. Sync every affected source file, stylesheet, spec, development note, and referenced asset to the GitHub checkout. Include renames and deletions. Preserve repository-only files such as AGENTS.md, build scripts, lockfile, CI configuration, and migration notes. Floot exports may need dependency versions reconciled with the live project.
4. Review the diff and exclude secrets, env.json, customer/job data, database dumps, OAuth tokens, preview access tokens, build output and node_modules.
5. Commit each coherent completed change with a descriptive message and push to development. Keep main as the stable baseline; promote changes to main only when the user requests it. The user has authorized routine commits and pushes as part of requested dashboard changes. If branch protection or concurrent remote edits prevent a safe push, preserve the changes, use an appropriate branch/PR, and report the concrete issue; never force-push or overwrite unrelated work.
6. Check the pushed commit and applicable GitHub build checks. Fix failures caused by the change before reporting completion. If synchronization or checks cannot complete, explicitly report what remains unsynced and why.
7. In the completion message, summarize the change and say it was committed/pushed, linking the commit when useful.

This is a working agreement for changes handled by the assistant. It is not an automatic background sync for edits made directly in Floot outside this workflow. No hosting cutover or calendar-sync activation is implied by a GitHub push.
