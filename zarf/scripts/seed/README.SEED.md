# Seeding Data

The seed scripts publish Bible content to the relay and Blossom storage.

### Environment Variables

The following variables are used by the seed scripts:

| Variable           | Description                           | Default                 |
| ------------------ | ------------------------------------- | ----------------------- |
| `NOSTR_SECRET_KEY` | Nostr private key used to sign events | Required                |
| `RELAY_URL`        | Relay websocket endpoint              | `ws://localhost:3334`   |
| `BLOSSOM_URL`      | Blossom HTTP endpoint                 | `http://localhost:3335` |
| `DATA_DIR`         | Directory containing source files     | `../../../data/json.gz` |
| `PARALLEL`         | Number of parallel uploads/events     | `10`                    |

### Nostr Key

Generate a development key:

```bash
make nostr-key
```

View the public key:

```bash
make nostr-pub
```

The key is stored at:

```text
~/.config/nostr/dev.key
```

The Makefile automatically exports `NOSTR_SECRET_KEY` for all seed targets.

### Seed Chapter Events

Publish chapter content directly to the relay:

```bash
make seed-chapters-relay
```

### Seed Blossom Files

Upload aggregated files to Blossom and publish reference events to the relay:

```bash
make seed-chapters-blossom
```

### Seed Everything

```bash
make seed-chapters
```

### Seed Individual Bundle Files

Upload a single file to Blossom and publish its metadata event:

```bash
make seed-kjv
make seed-kjvs
```

### Custom Nostr Kinds

| Kind    | Purpose                                         |
| ------- | ----------------------------------------------- |
| `37770` | Chapter content stored directly in relay events |
| `37778` | Blossom file reference events                   |

Large files are uploaded to Blossom first. A corresponding Kind `37778` event is then published containing:

* SHA256 hash (`x` tag)
* File URL (`url` tag)
* File type metadata
* Deterministic identifier (`d` tag)

This allows clients to discover files through the relay while retrieving the actual content from Blossom.
