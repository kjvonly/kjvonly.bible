# nginx Deployment Guide

This directory deploys the standalone nginx TLS load balancer for KJVOnly.

The nginx container is intentionally separate from the production application
Compose network. It proxies to the Docker host IP and the host ports published
by the application stack.

## Routing

The default deployment exposes:

```text
https://kjvonly.home
    -> HOST_IP:WEB_PORT
    -> PWA

wss://kjvonly.home:3334
    -> HOST_IP:RELAY_PORT
    -> Nostr relay

https://kjvonly.home:3335
    -> HOST_IP:BLOSSOM_PORT
    -> Blossom
```

nginx terminates TLS for all three listeners. The relay receives plain
WebSocket traffic after nginx handles the external WSS connection.

## Prerequisites

Before deploying nginx:

1. Docker and Docker Compose must be installed on the host.
2. The production application stack must already be running.
3. The PWA, relay, and Blossom services must publish their configured ports on
   the Docker host.
4. `SERVER_NAME` must resolve to the machine running this nginx deployment.
5. The certificate must be valid for `SERVER_NAME`.

The nginx container does not route by Docker service name and does not join the
production application's private Docker network.

## Configure the deployment

Create the local environment file:

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
HOST_IP=192.168.1.100
SERVER_NAME=kjvonly.home
CERT_NAME=kjvonly.home
WEB_PORT=8080
RELAY_PORT=3334
BLOSSOM_PORT=3335
```

### HOST_IP

`HOST_IP` must be an address for the Docker host that is reachable from inside
the nginx container.

Do not use `127.0.0.1`. Inside the nginx container, `127.0.0.1` refers to the
nginx container itself, not the Docker host.

### SERVER_NAME

`SERVER_NAME` is the public hostname nginx accepts for all three TLS listeners.

For a local deployment, ensure the hostname resolves to the nginx host through
local DNS or a hosts-file entry.

### CERT_NAME

`CERT_NAME` is the basename of the certificate and private-key files.

For:

```dotenv
CERT_NAME=kjvonly.home
```

nginx expects:

```text
certs/kjvonly.home.crt
certs/kjvonly.home.key
```

The certificate SAN must include the configured `SERVER_NAME`.

## Install certificates

Place the certificate and key in:

```text
zarf/docker/nginx/certs/
```

For example:

```text
zarf/docker/nginx/certs/kjvonly.home.crt
zarf/docker/nginx/certs/kjvonly.home.key
```

The `certs` directory should not contain committed private keys.

## Validate the deployment

From this directory:

```bash
make check
```

This validates:

- `.env` exists;
- Docker Compose can render the configuration;
- the configured certificate exists;
- the configured private key exists.

To inspect the fully resolved Compose configuration:

```bash
make config
```

## Deploy

Deploy or update nginx:

```bash
make deploy
```

This:

1. validates the deployment;
2. pulls the configured nginx image;
3. starts or updates the Compose deployment;
4. removes orphaned services;
5. prints the resulting container status.

For normal startup without pulling:

```bash
make up
```

After changing `.env`, certificates, or the nginx template, recreate the
container:

```bash
make restart
```

## Operations

Follow nginx logs:

```bash
make logs
```

Show container status:

```bash
make ps
```

Stop nginx:

```bash
make down
```

## Verify HTTPS

Verify the PWA endpoint:

```bash
curl -v https://kjvonly.home/
```

Verify Blossom TLS/proxy connectivity:

```bash
curl -v https://kjvonly.home:3335/
```

If the deployment uses a private development CA that the current machine does
not trust yet, add `-k` temporarily while testing. A normal trusted deployment
should not require `-k`.

## Verify the relay WebSocket

A WebSocket handshake can be tested with curl:

```bash
curl --http1.1 -i \
  -H 'Connection: Upgrade' \
  -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: SGVsbG9Xb3JsZDEyMzQ1Ng==' \
  https://kjvonly.home:3334/
```

A successful WebSocket upgrade should return HTTP status `101 Switching
Protocols`.

## Port exposure

The application Compose stack publishes `WEB_PORT`, `RELAY_PORT`, and
`BLOSSOM_PORT` on the Docker host because the standalone nginx container proxies
to `HOST_IP`.

The application's Docker network remains private, but published host ports are
reachable according to the host's network and firewall rules. If those backend
ports should not be generally reachable on the LAN, restrict them with the
host firewall while still allowing the nginx container to reach them.
