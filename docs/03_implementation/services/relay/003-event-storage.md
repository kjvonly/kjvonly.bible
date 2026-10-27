# Relay event storage

**Sources:** `server/relay/main.go`, `server/internal/nostrpostgres/store.go`, and
`server/go.mod`.

`relay.UseEventstore(store, 500)` configures the storage callbacks for the
current Khatru interface. The `nostrpostgres.Store` package lives under
`server/internal/` and is shared with the Blossom executable. It implements
`fiatjaf.com/nostr/eventstore.Store` directly using `database/sql` and
`lib/pq`. No older eventstore package or representation conversion is used.

This relay connects to its `DATABASE_URL` and initializes its own
`nostr_events` and `nostr_event_tags` tables. The Blossom service uses a
separate database with the same schema and implementation. Indexed SQL
filters, transactional replacement semantics, duplicate handling, and the
500-event query cap are described in
[`../000-khatru-services.md`](../000-khatru-services.md).

The original relay query-logging callback wraps Khatru's standard query
callback rather than implementing separate storage logic.
