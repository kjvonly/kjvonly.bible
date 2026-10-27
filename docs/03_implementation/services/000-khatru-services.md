# Khatru services (relay and Blossom)

**Status:** Development implementation. Source remains authoritative.

The backend is a **single Go module** rooted at `server/` with two independent
executables and a reusable PostgreSQL eventstore package:

```text
server/
├── go.mod                     # module kjvonly.bible/server
├── go.sum                     # shared dependency checksums
├── internal/
│   └── nostrpostgres/         # shared private eventstore implementation
│       ├── store.go
│       └── store_test.go
├── relay/
│   ├── main.go                # port 3334 executable
│   └── Dockerfile
└── blossom/
    ├── main.go                # port 3335 executable
    └── Dockerfile
```

Both apps depend on the same pinned `fiatjaf.com/nostr` version,
`v0.0.0-20261026145325-252a038facda`, through `server/go.mod`. The
`nostrpostgres` package implements `fiatjaf.com/nostr/eventstore.Store`
directly and is imported by each executable as
`kjvonly.bible/server/internal/nostrpostgres`. It is independent of both
executables' `main` packages. The Go `internal/` boundary keeps this shared
implementation private to the server code without requiring a separate module
or public API. No nested Go modules, local `replace` directives, or legacy
storage adapters are required.

## Runtime boundaries

- `server/relay/main.go`: port 3334, NIP-11 metadata, NIP-77/negentropy,
  NIP-42 authenticated reads, indexable-tag limit 512, blocked-publisher
  policy, query tracing and connection tracing.
- `server/blossom/main.go`: port 3335, its **own** Khatru relay, NIP-42
  authenticated relay reads, indexable-tag limit 100, blocked-publisher
  policy, Blossom HTTP routes and S3-compatible bytes.
- `server/internal/nostrpostgres`: the shared PostgreSQL implementation of
  `eventstore.Store`. Each service supplies its own `DATABASE_URL`; the event
  tables are therefore independent. Blossom passes the same store to
  `blossom.EventStoreBlobIndexWrapper` for descriptor/ownership events.
- `zarf/docker/docker-compose*.yml`: each Go image builds with **`server/`
  as its Docker context**, using the corresponding application Dockerfile.
  Both Dockerfiles resolve the single `server/go.mod` and compile their
  respective packages.

## Storage contract

`Store.Init` creates `nostr_events` and `nostr_event_tags` with supporting
indexes in each configured database. Events are stored as Nostr JSON using
native `fiatjaf.com/nostr` types. Indexed selectors cover IDs, authors,
kinds, `since`, `until`, and single-character tag names. A `search` filter is
implemented as a case-insensitive literal content substring, not full NIP-50
search. Query results are newest first and obey the configured limit (500).
Query errors are logged because `QueryEvents` exposes only an iterator.

`SaveEvent` inserts atomically, returning `eventstore.ErrDupEvent` for a
conflicting ID. `ReplaceEvent` takes a PostgreSQL transaction-scoped advisory
lock on (publisher, kind, `d` for addressable kinds), checks timestamp and ID
precedence, deletes older address-matching records and inserts the replacement
in one transaction. The method returns deleted events to Khatru. Deletes
cascade to indexed tags. `CountEvents` counts matching rows independently
of a REQ limit. The shared store interface has no per-operation context.

Blossom's object bodies are independent of event storage and keep the digest
as the S3 object key. Resource/Domain identity and the PWA Outbox workflow do
not change in this server implementation.

## Development validation

From the repository root in **wt1**, use the Makefile targets for the shared
Go module:

```sh
make server-tidy
make server-test
make server-build
make up
```

`make server-test` runs `go test ./...` from `server/` and includes the shared
PostgreSQL storage tests. `make server-build` builds both executables to
`server/bin/`. `make up` rebuilds local Docker images (using the build cache)
and starts the development stack; it does **not** run Go tests. For the
separate Compose test stack use `make test-up`.

Run an individual service from `server/` with `go run ./relay` or
`go run ./blossom`, with its `DATABASE_URL` and other relevant environment
variables configured. The integration test in
`server/internal/nostrpostgres/store_test.go` is enabled with `TEST_POSTGRES_URL`
pointing to a disposable development PostgreSQL database. It tests
replacement, tag filtering, query, count and deletion. Also verify NIP-42
REQ flow, NIP-77, rejection rules, and Blossom upload/download/delete against
local S3-compatible storage.

Go 1.25.4+ and network access are required to resolve dependencies. The
module manifests may require `go mod tidy` after migrating the layout;
compile and runtime test results must be verified in the development
worktree. No legacy schema migration is part of this development refactor.
