# Blossom entrypoint

**Source:** `server/blossom/main.go` and `server/blossom/Dockerfile`.

Blossom is a **separate** Go process listening on port **3335**. It constructs
its own Khatru relay and the shared PostgreSQL eventstore, sets relay event and read
policies, configures S3-compatible object storage, and calls
`blossom.New(relay, "http://localhost:3335")` to install Blossom behavior on
that relay.

The associated PostgreSQL database is independent of the primary Nostr
relay's database on port 3334. The Blossom process stores blob bytes through
S3 callbacks and indexes blob descriptors/ownership through the eventstore
backed `blossom.EventStoreBlobIndexWrapper`.

`http://localhost:3335` is an existing source constant, not a newly derived
public base URL. Verify publicly returned URLs in an environment matching
production before changing it. Docker builds from the `server/` context.
Blossom imports the shared internal `nostrpostgres` package directly, not the
relay executable.

See [`../000-khatru-services.md`](../000-khatru-services.md) for the current storage contract and development tests.
