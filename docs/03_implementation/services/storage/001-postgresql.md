# PostgreSQL for Nostr relay and Blossom

**Sources:** `server/internal/nostrpostgres/store.go`, `server/relay/main.go`,
`server/blossom/main.go`, and `zarf/docker/docker-compose*.yml`.

Both Go executables import the shared internal `nostrpostgres` package, a
single implementation of the current
`fiatjaf.com/nostr/eventstore.Store` interface, from
`server/internal/nostrpostgres` in the same Go module. PostgreSQL is retained
for concurrent connections and shared DB service operation. The **relay** and **Blossom** still use distinct databases via
`RELAY_DB` / `BLOSSOM_DB` and per-service `DATABASE_URL`.

`Init` provisions `nostr_events` (binary ID/publisher, kind, timestamp,
address tag, content and native Nostr JSON) and `nostr_event_tags` (indexed
key/value pairs with cascading deletes). Queries use indexed SQL predicates
and newest-first ordering. Replaceable and addressable writes use
transaction-scoped PostgreSQL advisory locks to coordinate relay instances.
No old eventstore tables or old Go Nostr types are required.

Blossom stores descriptor and ownership events in its PostgreSQL database;
blob **bytes** remain in the S3-compatible bucket using digest keys.

See [`../000-khatru-services.md`](../000-khatru-services.md) for the current
contract and development validation commands.
