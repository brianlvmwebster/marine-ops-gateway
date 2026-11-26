# Marine Ops staging integration API

The staging API serves read-only Customers and Parts Inventory data at `/api/v1`. Send a dedicated server-side `Authorization: Bearer <token>` header over HTTPS. A key belongs to one company and has independent customer and parts grants. Company suspension, tool disablement, expiry and key revocation take effect on the next request. Browser sign-in cookies do not authorize these routes.

## Requests

| Method and path | Query parameters | Result |
| --- | --- | --- |
| `GET /api/v1/customers` | `q`, optional `limit` and `after` | Customers matching a name or Lightspeed number. Returns IDs, names, Lightspeed numbers where linked, status and update timestamps. |
| `GET /api/v1/customers/lookup` | Exactly one of `id` (Marine Ops UUID) or `number` (Lightspeed number) | Customer summary plus email and preferred phone (mobile, home, then work), or null for unavailable contacts. |
| `GET /api/v1/parts` | `q`, optional `limit` and `after` | Parts matching the number, supplier code or description. |
| `GET /api/v1/parts/lookup` | `supplier` and `number` | Exact supplier code and part number match. Preserve leading zeros in both values. |

Search text is a case-insensitive literal of 2–200 characters. Lists return `{ items, nextCursor }` with 25 results by default and at most 50. If `nextCursor` is present, repeat the same search with it as `after`. Lookups return one object. Customer addresses, notes, source rows, job and quote information are excluded. Inventory includes `id`, `partNumber`, `supplierCode`, `description`, `active`, `onHand`, `available` and `quantityUpdatedAt`. Quantities are exact decimal strings. The timestamp comes from the opening import or latest Marine Ops stock movement. It describes the staged balance and gives no indication of a live Lightspeed sync. Parts costs and pricing are excluded.

Error responses use `{ error }`. A malformed query returns 400, a missing/invalid/expired/revoked key 401, a valid key without access 403, an unavailable lookup 404 and a write method 405. Responses are non-cacheable. Application request logs contain the key ID, dataset, operation and response status. Query strings can appear in infrastructure access logs, so use IDs for lookups where practical and keep tokens out of URLs.

## Key administration

An operator with access to the staging Cloud Run job registers a key by sending its SHA-256 verifier. Generate a token as `mops_stg_` followed by 32 cryptographically random bytes encoded as unpadded base64url. Store the raw token in the consuming app's server-side secret store. Pass only the verifier to the job and record the returned key ID for revocation. Create one key per consuming app. For rotation, register a replacement, switch the app, and revoke its previous key.

```sh
gcloud run jobs execute marine-ops-staging-api-admin --project=marine-ops --region=us-east1 --wait \
  --args=--import,tsx,staging/integration-api-admin.ts,register,KEY_UUID,COMPANY_UUID,APP_NAME,customers,SHA256_HEX,30

gcloud run jobs execute marine-ops-staging-api-admin --project=marine-ops --region=us-east1 --wait \
  --args=--import,tsx,staging/integration-api-admin.ts,revoke,KEY_UUID
```

Use `customers`, `parts`, or `customers+parts` as the grant and an expiry of 1 to 90 days. Use an app name made of letters, digits, spaces, periods, underscores or hyphens. The job's default command applies migration 018 to staging. The main staging migration also includes 018.
