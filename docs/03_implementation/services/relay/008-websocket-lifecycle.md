# WebSocket lifecycle

**Source:** `server/relay/main.go`.

The Khatru HTTP server handles the relay's WebSocket protocol. The main relay
adds `OnConnect` and `OnDisconnect` logging callbacks. On connect it logs the
new client and requests NIP-42 authentication. On disconnect it logs the
currently authenticated public key when present.

Khatru owns WebSocket framing, subscription lifetime, NIP-42 challenge
handling, and optional NIP-77 support. The current implementation uses the
Khatru hook API but does not add a separate WebSocket server or change
application-level reconnect behavior. Keep integration testing of connection,
AUTH, REQ/EOSE, EVENT/OK and NIP-77 during development smoke tests.
