# Relay and Blossom deployment

**Sources:** `server/relay/Dockerfile`, `server/blossom/Dockerfile`,
`server/go.mod`, and `zarf/docker/docker-compose*.yml`.

The relay runs on container port **3334**, Blossom on **3335**. They are two
independent executables built from one Go module (`server/`), using a shared
PostgreSQL eventstore package in `server/internal/nostrpostgres`. The processes
use distinct PostgreSQL databases; Blossom also uses S3-compatible storage
for blob bytes.

Both Compose manifests set **`../../server`** as the Go build context and
select `relay/Dockerfile` or `blossom/Dockerfile`. Each Dockerfile copies
`server/go.mod` and `server/go.sum` from that context, downloads dependencies,
then compiles its own package (`./relay` or `./blossom`). The client/web build
context is separate and unchanged. No Go `replace` directives or repository-
root Docker context are necessary for server images.

For development, the repository-root `make up` runs Compose with `--build`,
so the relay and Blossom images are built against the current local `server/`
source, using Docker's normal layer cache. `make test-up` does the same for the
separate test Compose project. Neither target runs Go tests. Use
`make server-tidy`, `make server-test`, and `make server-build` from the
repository root as described in
[`../000-khatru-services.md`](../000-khatru-services.md), and commit any
regenerated `server/go.mod` and `server/go.sum` files. The production
`zarf/docker/Makefile` remains separate; its `deploy` target explicitly
builds the production images. Docker image builds do not run `go mod tidy`.

During development, use a disposable PostgreSQL database for integration
tests and verify relay publishing, replacement, NIP-42 reads, NIP-77, and
Blossom upload/download/delete against local S3-compatible storage.
