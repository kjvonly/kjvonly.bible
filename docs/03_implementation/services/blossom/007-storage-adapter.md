# Blossom storage adapter

**Sources:** `server/blossom/main.go` and `server/internal/nostrpostgres/store.go`.

Blossom has two distinct storage responsibilities:

1. **Object bytes:** S3-compatible storage via `StoreBlob`, `LoadBlob`, and
   `DeleteBlob`, using the SHA-256 digest as the object key.
2. **Blob index and relay events:** Blossom's separate PostgreSQL database,
   using the shared native `nostrpostgres.Store` and
   `blossom.EventStoreBlobIndexWrapper` from the current Khatru module.

There is no legacy Nostr representation adapter. Khatru and Blossom both
receive the same current `eventstore.Store` implementation. Event table
creation, indexed queries and replacements belong to the shared store.
Blossom's existing S3 callback behavior is unchanged.
