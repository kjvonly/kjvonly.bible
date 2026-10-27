# Relay configuration

**Source:** `server/relay/main.go`, `server/go.mod`, and
`zarf/docker/docker-compose*.yml`.

The process listens on `:3334`. `DATABASE_URL` selects the existing main
relay PostgreSQL database; the code retains a local PostgreSQL fallback when
that variable is unset. Docker Compose supplies `DATABASE_URL` using `RELAY_DB`
and PostgreSQL credentials. NIP-11 name, description, owner key and icon are
currently source constants, **not** environment variables.

The relay enables NIP-77/negentropy, applies kind validation, restricts values
of indexable tags to 512 bytes, and blocks the existing configured publisher
pubkey. It requires NIP-42 authentication for read filters; that is distinct
from write acceptance. These are the current server settings.

The shared `server/go.mod` pins one `fiatjaf.com/nostr` **Go pseudo-version**, not a
floating `master` dependency; see
[`../000-khatru-services.md`](../000-khatru-services.md) for the pinned version and
required dependency-validation steps.
