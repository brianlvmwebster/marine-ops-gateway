# Quick status and assignment workflow

Queue rows, calendar cards and job details support immediate status and assignment updates. The primary sequence is Scheduled -> Onsite -> In progress -> Done. Done is the technician-finished stage. Legacy Completed records without an admin review are interpreted as Done. Only Service Admin review creates final Completed records with an audit. Status selection also supports New, Awaiting parts, Ready and Cancelled. Reopen cancelled appointments through Edit job first.

People & groups manages a shared directory. Add individuals, create groups from existing individuals, and assign one person or group to a job. Existing technician text is preserved until replaced. Directory entries do not create login accounts or send invitations. Group membership is shared in the directory; the technician label saved on the job is the assignment name at save time.

The authenticated jobs/workflow endpoint accepts only status and assignment IDs with an expected job version. It locks the record, preserves other data, and rejects stale versions. Directory names are resolved server-side, groups can only contain existing individuals, and directory edits also use versions. Unsaved checklist edits disable workflow controls in job details until saved.

Database migration: migrations/001-assignment-directory.sql in the GitHub development branch. New table: service_assignment_options. The typed schema was regenerated from the database. No staff names are seeded.

Verified status progression, group assignment/membership, stale-version rejection and restoration using existing test job #617. Temporary directory entries removed; 616 jobs retained. Three related spec files and Floot typecheck passed. Outlook sync remains paused. Repo source and assets must be committed/pushed to development and CI checked before reporting completion.
