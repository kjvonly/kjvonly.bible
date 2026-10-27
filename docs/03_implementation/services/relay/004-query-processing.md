# Relay query processing

**Source:** `server/relay/main.go`.

For incoming Nostr `REQ` filters, the relay composes
`policies.NoComplexFilters` with a NIP-42 authentication check via
`khatru.GetAuthed(ctx)`. Without an authenticated pubkey, the filter is
rejected with an `auth-required:` reason; accepted filters are passed through
the PostgreSQL-backed `QueryStored` iterator.

The main relay logs the incoming filter, authentication state, each returned
event's kind, publisher, `d` tag and ID, and the final yielded count. The
backend is responsible for stored-event filtering and ordering. Read
eligibility is a relay access rule; it does not install a discovered Resource
as accepted PWA state.

The Blossom service has its own relay and authenticated-read policy but does
not implement this per-event query trace. See
[`../blossom/001-blossom-entrypoint.md`](../blossom/001-blossom-entrypoint.md).
