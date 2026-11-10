# Marine Service Desk
        
Build a Marine Service department job queue management dashboard that utilizes a form for new jobs based on the current Jotform https://form.jotform.com/262123603882151, then links the jobs to an Outlook Calendar two-way sync integration. Dashboard shows calendar schedules, upcoming jobs, editing information, and print tools for printing job descriptions and checklists. Primary account. Internal staff application. Match the source form fields after inspecting it; do not claim a match without reading it. Two-way sync job scheduling and Outlook event edits, visible sync health and conflict handling. Professional marine service operations UI.

Made with Floot.

# Instructions

For security reasons, the `env.json` file is not pre-populated — you will need to generate or retrieve the values yourself.  

For **JWT secrets**, generate a value with:  

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then paste the generated value into the appropriate field.  

For the **Floot Database**, download your database content as a gzipped pg_dump (.sql.gz) from the cog icon in the database view (right pane -> data -> floot data base -> cog icon on the left of the name), restore it into your own PostgreSQL database (gunzip -c database-dump.sql.gz | psql <connection string>), and then fill in the connection string value.  

**Note:** Floot OAuth will not work in self-hosted environments.  

For other external services, retrieve your API keys and fill in the corresponding values.  

Once everything is configured, you can build and start the service with:  

```
npm install -g pnpm
pnpm install
pnpm vite build
pnpm tsx server.ts
```
