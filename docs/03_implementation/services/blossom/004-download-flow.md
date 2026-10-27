# Blossom download flow

**Source:** `server/blossom/main.go`.

Blossom invokes `LoadBlob(ctx, sha256, ext)` for blob content. The callback
reads the object at key **`sha256`** from the configured S3-compatible bucket,
closes the object body, and returns `bytes.NewReader(data)` as an
`io.ReadSeeker`, with no redirect URL. The `ext` parameter does not alter
the key.

This preserves the original memory-buffered download behavior; the server
reads the whole object before returning the reader. The updated Khatru API
also requires an optional URL result, which remains `nil`.

Blob authorization/descriptor semantics are supplied by the Blossom package;
the application does not infer resource acceptance from a successful HTTP
blob download. Verify that previously stored SHA-256 blobs remain
addressable after the Khatru update.
