# Company dashboard delivery

The user chose a directly served /dashboard/ app with one gateway Microsoft login. Vercel serves the React frontend on lakeviewwebster.marineopstech.com; Floot retains the existing database, sheet imports, Maps credentials and Microsoft calendar brokering. Outlook remains paused. There is no iframe.

Gateway server requests use a dedicated preproduction-only Ed25519 signing key. Floot gateway/dispatch verifies the complete body digest, issuer/audience, algorithm, expiry and one-use nonce before invoking an allowlisted route in AsyncLocalStorage viewer context. Other requests retain requireViewer checks. No browser-supplied role or identity is trusted. The owner gateway identity is explicitly mapped in the database to the existing Service Admin identity, preserving personal preferences. Other staff have their own gateway identity and no automatic admin role.

Source/rollout workflow: GitHub service-dashboard development is authoritative. Update the gateway's versioned frontend snapshot using scripts/sync-dashboard.mjs, then commit/push marine-ops-gateway preproduction and check Vercel. Publish matching backend changes on Floot. Keep both main branches stable. Detailed setup is in docs/GATEWAY.md in the source repository. No signing private keys, user mappings or job data belong in Git.
