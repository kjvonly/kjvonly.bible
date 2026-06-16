## Seeding Data

The seed scripts publish Bible content, Strong's Concordance data, and reading plans to the relay and Blossom storage.

### Environment Variables

| Variable           | Description                           | Default                 |
| ------------------ | ------------------------------------- | ----------------------- |
| `NOSTR_SECRET_KEY` | Nostr private key used to sign events | Required                |
| `RELAY_URL`        | Relay websocket endpoint              | `ws://localhost:3334`   |
| `BLOSSOM_URL`      | Blossom HTTP endpoint                 | `http://localhost:3335` |
| `DATA_DIR`         | Source data directory                 | Script specific         |
| `PARALLEL`         | Number of parallel workers            | `10`                    |

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

The Makefile exports `NOSTR_SECRET_KEY` for all seed targets.

---

## Bible Chapters

Chapter files are published directly to the relay using Kind `37770`.

### Relay

```bash
make seed-chapters-relay
```

### Blossom

Uploads aggregated Bible files to Blossom and publishes reference events.

```bash
make seed-chapters-blossom
```

### Everything

```bash
make seed-chapters
```

### Individual Bible Bundles

```bash
make seed-kjv
make seed-kjvs
```

---

## Strong's Concordance

Individual Strong's entries are published directly to the relay using Kind `37770`.

### Relay

```bash
make seed-strongs-relay
```

### Blossom

Uploads the aggregated concordance file and publishes a reference event.

```bash
make seed-strongs-blossom
```

### Everything

```bash
make seed-strongs
```

### Individual Bundle

```bash
make seed-strongs-all-file
```

---

## Reading Plans

Reading plans are published directly to the relay using Kind `37775`.

```bash
make seed-plans-relay
```

---

## Custom Nostr Kinds

| Kind    | Purpose                                  |
| ------- | ---------------------------------------- |
| `37770` | Bible chapter and Strong's entry content |
| `37775` | Reading plans                            |
| `37778` | Blossom file reference events            |

### Relay Content Events

Small files are stored directly in Nostr events.

* Content is hex-encoded `json.gz`
* Data is immediately available from the relay
* Used for chapters, Strong's entries, and reading plans

### Blossom Reference Events

Large files are uploaded to Blossom first.

A Kind `37778` event is then published containing:

* SHA256 hash (`x` tag)
* File URL (`url` tag)
* MIME/type metadata
* Deterministic identifier (`d` tag)

The relay stores metadata and discovery information while Blossom stores the actual file bytes.
