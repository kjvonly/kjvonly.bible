# Blossom object identity

**Source:** `server/blossom/main.go` and `server/internal/nostrpostgres/store.go`.

Physical object identity is the blob's SHA-256 digest: `StoreBlob`,
`LoadBlob`, and `DeleteBlob` all use the digest directly as the S3 object key.
Extensions are accepted by callbacks but not appended to the key.

The Blossom library maintains independent descriptor/ownership metadata using
fake Nostr events in the Blossom PostgreSQL database (including kind 24242). `EventStoreBlobIndexWrapper` continues to
index through that database through the shared `nostrpostgres.Store`.

Blob SHA-256, the Nostr event ID advertising an external Resource, and a PWA
Domain Object ID are distinct identities. These roles remain distinct; blob bytes are never written to PostgreSQL.
