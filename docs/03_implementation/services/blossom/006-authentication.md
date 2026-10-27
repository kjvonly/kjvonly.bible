# Blossom authentication

**Source:** `server/blossom/main.go`.

The Blossom server exposes two protocol concerns through one process:

- Its **Nostr relay** uses `OnRequest` with `policies.NoComplexFilters` and
  `khatru.GetAuthed(ctx)` to require NIP-42 authentication for WebSocket reads.
- Its **Blossom HTTP service** delegates blob-operation authorization and
  request validation to the `fiatjaf.com/nostr/khatru/blossom` implementation.
  The application overrides blob storage callbacks, not the protocol's
  authentication logic.

The server does not add write-auth rules to the relay, replace Blossom
HTTP authorization with WebSocket NIP-42, or modify the client's auth flow.
Test the existing expected HTTP upload/delete authorization behavior against
the new library before deploying.
