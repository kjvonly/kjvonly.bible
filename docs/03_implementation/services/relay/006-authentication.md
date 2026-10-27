# Relay authentication

**Source:** `server/relay/main.go`.

The primary relay requires NIP-42 authentication before serving reads. On a
WebSocket connection it calls `khatru.RequestAuth(ctx)`. For each `REQ`,
`khatru.GetAuthed(ctx)` determines whether a public key is authenticated; if
not, the server rejects the filter with an `auth-required:` message.

`OnDisconnect` logs the authenticated pubkey when available. The Blossom
relay also checks NIP-42 on `REQ`, but its `main.go` does not register custom
connect/disconnect logging handlers. Blossom HTTP authorization remains a
separate concern handled by the Blossom library; do not confuse an HTTP
upload authorization event with an authenticated relay WebSocket connection.

Client signing and reconnection logic are outside the server implementation.
