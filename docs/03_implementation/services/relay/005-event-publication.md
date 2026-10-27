# Relay event publication

**Source:** `server/relay/main.go`.

For incoming published events, Khatru calls the configured `OnEvent` policy
sequence: kind validation, the existing large-indexable-tag guard (512-byte
value limit), then the existing blocked-publisher rule. Once Khatru accepts an
event, storage is delegated to the shared PostgreSQL eventstore as appropriate for Khatru's lifecycle.

The current server preserves its blocked pubkey, tag-value limit, rejection
messages, and PostgreSQL storage. NIP-42 authentication is required for **reads** through
`OnRequest` and is not introduced here as an additional write requirement.

This is the server-side Nostr event publication boundary. The PWA's Domain
Object → ResourcePublication → Outbox → Publisher pipeline remains unchanged.
