# Production Deployment Guide

This directory contains the production Docker Compose deployment for the
KJVOnly application stack.

The production stack is deployed separately from the standalone nginx TLS load
balancer under:

```text
zarf/docker/nginx/
```

The application stack publishes host ports. The standalone nginx deployment
terminates TLS and proxies to those published host ports.

## Services

The production Compose stack contains:

```text
postgres
minio
minio-init
relay
blossom
web
```

The public application flow is:

```text
nginx load balancer
    |
    +-- HTTPS 443
    |      -> WEB_PORT
    |      -> web
    |
    +-- WSS 3334
    |      -> RELAY_PORT
    |      -> relay
    |
    +-- HTTPS 3335
           -> BLOSSOM_PORT
           -> blossom
```

PostgreSQL and MinIO are application infrastructure and are not routed through
the nginx load balancer.

## Deployment User

Production Docker commands should be run as the user that owns the rootless
Docker daemon.

For the current server setup this is:

```text
deploy
```

SSH directly as that user before deploying:

```bash
ssh deploy@SERVER_IP
```

Do not run the application Compose commands with `sudo docker`. Rootless Docker
is user-scoped, so a root or different-user Docker client may connect to a
different daemon.

## Prerequisites

Before deploying the production stack:

1. Docker Engine must be installed and running in rootless mode for the
   deployment user.
2. Docker Compose must be available through `docker compose`.
3. The repository working tree must be checked out on the server.
4. `zarf/docker/.env` must contain the production configuration.
5. The standalone nginx deployment should be configured to use the same
   `WEB_PORT`, `RELAY_PORT`, and `BLOSSOM_PORT` values.
6. The Docker host ports selected for the application services must be
   reachable from the standalone nginx container through its configured
   `HOST_IP`.

Verify Docker before continuing:

```bash
docker info
docker compose version
```

`docker info` should report rootless mode under the server security options.

## Repository Checkout

The production deployment requires a normal Git working tree.

If the repository on the server is stored as a bare repository, create a
worktree for the deployment branch:

```bash
git worktree add ../simple-app-hosting ops/simple-app-hosting
```

Then enter the working tree:

```bash
cd ../simple-app-hosting
```

The deployment commands in this guide assume the repository root is:

```text
~/git/simple-app-hosting
```

Adjust paths if the worktree lives elsewhere.

## Production Environment

The production Compose deployment reads:

```text
zarf/docker/.env
```

The current Compose file uses these variables:

```dotenv
POSTGRES_PORT=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
RELAY_DB=
BLOSSOM_DB=

MINIO_API_PORT=
MINIO_CONSOLE_PORT=
MINIO_ROOT_USER=
MINIO_ROOT_PASSWORD=
MINIO_BUCKET=

RELAY_PORT=3334
BLOSSOM_PORT=3335
WEB_PORT=8080

BASE_PATH=
```

Use production values appropriate for the server.

The three values shared with the nginx deployment are:

```dotenv
WEB_PORT=8080
RELAY_PORT=3334
BLOSSOM_PORT=3335
```

They must match the corresponding values in:

```text
zarf/docker/nginx/.env
```

The nginx deployment connects to these ports through its configured
`HOST_IP`.

## PWA Build Configuration

The production Compose file builds the PWA from:

```text
client/kjvonly-pwa/Dockerfile
```

Two different environment files are involved in deployment:

```text
zarf/docker/.env
    -> Docker Compose deployment/runtime variables

zarf/docker/web.env
    -> PWA/Vite build-time variables
```

The web build file is passed to Docker BuildKit as the Compose `build_env`
secret. The PWA Dockerfile mounts that secret only for the Vite build step at:

```text
/app/kjvonly-pwa/.env.production.local
```

That filename is intentional. `vite build` runs in production mode and loads
`.env.production.local` as a production-mode environment file.

The file is mounted as a BuildKit secret rather than copied into an image
layer. However, `VITE_*` values are frontend configuration: Vite embeds values
used by the application into the generated browser assets. They must not be
treated as secrets.

Create the deployment build environment from the committed example:

```bash
cp web.env.example web.env
```

The expected variables are:

```dotenv
VITE_API_URL=http://localhost:3000/v1
VITE_BASE_URL=https://localhost:5173

VITE_NOSTR_KJVONLY_PUBKEY=4de85ea7e103b98e4ea7aedefa53177f3349b1640e5951ae764cb403696477fd
VITE_NOSTR_RELAY_URL=ws://localhost:3334
VITE_NOSTR_COMMA_DELIMITED_RELAY_URLS=ws://localhost:3334
VITE_NOSTR_STORAGE_PREFIX=KJVonly
VITE_APP_NAME=KJVonly
```

Those values are the baseline application configuration. For production,
replace development `localhost`, `http`, and `ws` endpoints with the actual
public production endpoints where appropriate. For example, the relay exposed
through the standalone TLS load balancer uses a `wss://` URL.

The production `make check` target requires both:

```text
.env
web.env
```

before it will validate or deploy the stack.

`BASE_PATH` remains a Docker build argument supplied from `zarf/docker/.env`.
The Vite application configuration comes from `web.env`.

## Validate Configuration

From:

```text
zarf/docker/
```

run:

```bash
make check
```

This verifies:

- `.env` exists;
- Docker Compose can resolve the production configuration.

To inspect the fully rendered Compose configuration:

```bash
make config
```

Review the output before the first production deployment, especially:

```text
published ports
database names
volume names
build contexts
service dependencies
```

## Build

Build the locally built application images without starting the stack:

```bash
make build
```

This builds services that have a `build:` configuration, including the relay,
Blossom, and PWA image.

PostgreSQL, MinIO, and the MinIO client use published container images and are
pulled by Docker as required.

## Deploy

Deploy or update the complete production stack:

```bash
make deploy
```

The deployment target performs:

```text
validate production configuration
    |
    v
build application images
    |
    v
docker compose up -d --remove-orphans
    |
    v
show service status
```

This is the normal deployment command after pulling new application source.

## Start Without Rebuilding

If the images are already built and only the existing production stack needs to
be started:

```bash
make up
```

## Recreate Containers

After changing Compose configuration or runtime environment values:

```bash
make restart
```

This recreates the production containers from the current configuration.

If source code or Docker build inputs changed, use:

```bash
make deploy
```

instead so images are rebuilt first.

## Service Status

Show the production stack:

```bash
make ps
```

A healthy deployment should show the long-running services running:

```text
postgres
minio
relay
blossom
web
```

`minio-init` is a one-shot initialization container. It creates the configured
bucket and then exits successfully.

## Logs

Follow logs for the complete stack:

```bash
make logs
```

For an individual service, use Docker Compose directly:

```bash
docker compose \
  --env-file .env \
  -f docker-compose.prod.yml \
  logs -f relay
```

Replace `relay` with another service name as needed:

```text
postgres
minio
minio-init
relay
blossom
web
```

## Verify Published Ports

After deployment:

```bash
docker compose \
  --env-file .env \
  -f docker-compose.prod.yml \
  ps
```

Then verify listeners on the host:

```bash
ss -lnt
```

The expected application listeners include the configured values for:

```text
WEB_PORT
RELAY_PORT
BLOSSOM_PORT
```

Depending on the production configuration, PostgreSQL and MinIO ports may also
be published.

## Verify the PWA Directly

Before testing through the TLS load balancer, verify the PWA directly through
its published host port:

```bash
curl -v http://127.0.0.1:${WEB_PORT:-8080}/
```

If running the command from a shell where `.env` has not been sourced, replace
the variable with the configured value:

```bash
curl -v http://127.0.0.1:8080/
```

A successful response proves the PWA container is reachable independently of
the external nginx deployment.

## Verify the Relay Directly

The relay backend itself receives plain WebSocket traffic. TLS is terminated by
the standalone nginx load balancer.

Verify that the relay port is listening:

```bash
ss -lnt | grep ':3334\b'
```

For production clients, use the external endpoint:

```text
wss://SERVER_NAME:3334
```

The nginx load balancer converts that external WSS connection into plain
WebSocket traffic to the configured host relay port.

## Verify Blossom Directly

Verify the Blossom backend through its published host port:

```bash
curl -v http://127.0.0.1:3335/
```

For production clients, use the external endpoint:

```text
https://SERVER_NAME:3335
```

TLS is terminated by the standalone nginx deployment.

## Verify Through nginx

After the application stack is healthy, deploy or restart the nginx load
balancer from:

```text
zarf/docker/nginx/
```

Then verify:

```bash
curl -v https://SERVER_NAME/
curl -v https://SERVER_NAME:3335/
```

The relay should be configured by clients as:

```text
wss://SERVER_NAME:3334
```

For local certificates signed by a private CA, the client machine must trust
that CA. `curl -k` may be used temporarily for diagnostics, but production
clients should trust the certificate normally.

## Stop the Production Stack

Stop and remove production containers:

```bash
make down
```

The named PostgreSQL and MinIO volumes are not removed by this command.

Do not add `-v` to the Compose down command unless destruction of persisted
production data is explicitly intended.

## Persistent Data

The Compose deployment uses named volumes for:

```text
postgres_data
minio_data
```

These contain persistent application infrastructure state.

Normal operations such as:

```text
make down
make up
make restart
make deploy
```

must preserve these volumes.

Before destructive Docker cleanup commands, verify that they will not remove
production volumes.

## Updating the Application

A normal source update is:

```bash
cd ~/git/simple-app-hosting
git status
git pull --ff-only

cd zarf/docker
make check
make deploy
```

If this working tree is managed through a bare repository and Git worktrees,
update it using the repository's normal branch/worktree workflow instead of
creating another checkout over the existing directory.

## Deployment Order

For a new server, use this order:

```text
1. Install and verify rootless Docker.
2. Check out the production worktree.
3. Configure zarf/docker/.env.
4. Run make check.
5. Run make deploy.
6. Verify web, relay, and Blossom on their direct host ports.
7. Configure zarf/docker/nginx/.env and certificates.
8. Run the nginx make check.
9. Deploy nginx.
10. Verify HTTPS, WSS, and Blossom through the public hostname.
```

For routine application updates:

```text
update source
    |
    v
zarf/docker/make deploy
    |
    v
verify application stack
```

The nginx deployment normally does not need to be recreated for an application
code update unless its configuration, certificates, hostname, or routing ports
also changed.
