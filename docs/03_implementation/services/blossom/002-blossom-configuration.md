# Blossom configuration

**Sources:** `server/blossom/main.go`, `server/go.mod`, and
`zarf/docker/docker-compose*.yml`.

Blossom listens on port `3335`. `DATABASE_URL` selects the **Blossom**
PostgreSQL database (provided from `BLOSSOM_DB` in Compose), not the primary
relay's `RELAY_DB`. The S3-compatible storage configuration is:

| Variable | Code fallback | Purpose |
| --- | --- | --- |
| `S3_ENDPOINT` | `http://seaweedfs:8333` | S3-compatible endpoint |
| `S3_REGION` | `us-east-1` | S3 signing region |
| `S3_ACCESS_KEY` | `admin` | Object-store access key |
| `S3_SECRET_KEY` | `secret` | Object-store secret key |
| `S3_BUCKET` | `kjvonly` | Object bucket |

The local/production Compose files explicitly use their own S3-compatible
endpoint and credentials; the fallback values above are **not** appropriate
production secrets. The Blossom `ServiceURL` is currently hard-coded to
`http://localhost:3335`, and is set by the current implementation.

This process sets a 100-byte maximum for indexable tag values and keeps the
existing blocked-publisher policy and NIP-42 relay-read requirement. Both executables use the pinned `fiatjaf.com/nostr` dependency from
the shared `server/go.mod`.
