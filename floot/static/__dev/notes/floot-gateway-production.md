# Native Floot production gateway

User requested migrating the gateway from Vercel to Floot, production lakeviewwebster.marineopstech.net. Root is gateway; /dashboard is service; /dashboard/jobs/:id/print is printing. One Microsoft session and the existing database cover both. The prior Vercel gateway stays available during cutover; do not routinely redeploy it afterwards.

Managed Floot auth and Microsoft login are provisioned. Brokered callback/session steps are preserved. oauth_accounts has a company-tenant constraint; native_gateway_members enforces the copied approved-user list and roles on every request. Password auth/reset/register are disabled. Trusted preview owners use their explicitly mapped service identity. Service Admin remains the existing owner only.

Five destinations, five private thumbnails and two members were migrated. Upload bytes go directly to temporary private storage, then are checked and copied to final filenames; they never pass through an API or database. Jobs/imports/Maps/calendar brokering remain in the existing database. Outlook stays paused.

Source: service-dashboard development. Gateway repository development has a floot/ backup and manifest. Keep main branches stable. Never commit memberships, jobs, credentials, sessions or private thumbnails. See docs/GATEWAY.md in the source repository.
