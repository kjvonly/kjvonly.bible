# Blossom upload flow

**Source:** `server/blossom/main.go`.

The Blossom library handles the HTTP upload request and its protocol checks.
The server supplies a `StoreBlob(ctx, sha256, ext, body)` callback that writes
bytes to the configured S3-compatible bucket with object key **`sha256`**.
The extension argument is not used in object storage keys.

The `blossom.EventStoreBlobIndexWrapper` uses the server's PostgreSQL-backed
native Nostr eventstore to maintain blob descriptor/ownership information.
The server uses the current Blossom callbacks and does not add a
new upload route, storage naming convention, or client-side publication path.

During development, test upload, retrieval and metadata listing
using a disposable database and S3-compatible test bucket. See
[`../000-khatru-services.md`](../000-khatru-services.md).
