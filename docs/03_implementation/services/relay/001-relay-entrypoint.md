# Relay entrypoint

**Source:** `server/relay/main.go` and `server/relay/Dockerfile`.

The primary Nostr relay is its own Go process on port **3334**. Its `main`
function constructs `khatru.NewRelay()`, connects to PostgreSQL, configures
the shared PostgreSQL eventstore, NIP-11 metadata, policies, NIP-42 read authentication,
query logging, and WebSocket lifecycle logging, then serves the Khatru relay
via `http.ListenAndServe`.

The HTTP router also has a custom `/` welcome handler. The relay's NIP-11
metadata sets name, owner pubkey, description and icon. NIP-77/negentropy is
enabled explicitly on this relay; do not assume it is enabled on the separate
Blossom relay.

The service uses `fiatjaf.com/nostr/khatru` and delegates storage
through `relay.UseEventstore` to `server/internal/nostrpostgres`. This is a
shared internal package, not a dependency on either executable. Both server
apps share `server/go.mod`, and their Docker builds include the package.

The Blossom process is independent and listens on port 3335. See
[`../blossom/001-blossom-entrypoint.md`](../blossom/001-blossom-entrypoint.md)
and [`../000-khatru-services.md`](../000-khatru-services.md).
