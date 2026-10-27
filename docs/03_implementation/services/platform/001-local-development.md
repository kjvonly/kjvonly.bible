# Local service development

The repository-root `makefile` manages the development and test Docker Compose
stacks. Both server executables share one Go module at `server/` and the
PostgreSQL eventstore package at `server/internal/nostrpostgres/`.

## Development Docker stack

From the **repository root**:

```sh
make up                  # docker compose up -d --build (development environment)
make logs-relay          # follow the relay logs
make logs-blossom        # follow Blossom logs
make down                # stop services without removing volumes
```

`make up` uses `zarf/docker/.env.development` and
`zarf/docker/docker-compose.yml`. It builds the local application images before
starting the stack, even if images already exist. Normal Docker layer caching
still applies: unchanged layers are reused, while changes under `server/`
invalidate the relevant build steps. Compose recreates containers when their
image or configuration changes. This target **does not execute Go tests**.

`make test-up` does the same rebuild-and-start operation using
`zarf/docker/.env.test` and the separate `kjvonly-test` Compose project;
`make test-down` stops that stack. The test stack is not the same as running
`go test`.

## Go development commands

From the **repository root**:

```sh
make server-tidy         # go mod tidy in server/
make server-test         # go test ./... (relay, Blossom, and nostrpostgres)
make server-build        # build both executables into server/bin/

make relay-test          # relay package tests only
make blossom-test        # Blossom package tests only
make relay-build         # server/bin/relay
make blossom-build       # server/bin/blossom
```

Individual `make relay-run` and `make blossom-run` commands use `go run`
from `server/`; configure `DATABASE_URL` and the relevant service environment
before running them outside Docker. Built binaries under `server/bin/` are
local artifacts and are ignored by Git.

The PostgreSQL integration test in `server/internal/nostrpostgres/store_test.go`
requires `TEST_POSTGRES_URL` and otherwise skips its live-database coverage.
Use a disposable development database when enabling that test. The module
requires Go 1.25.4 or later; with `GOTOOLCHAIN=auto`, Go can obtain a newer
toolchain if downloads are available.

For per-service Docker operations, `make relay-docker-rebuild` and
`make blossom-docker-rebuild` rebuild and start only the selected service.
The corresponding `*-docker-up` targets start from available images without
requesting a rebuild. Both use the same development environment and Compose
project as `make up`.
