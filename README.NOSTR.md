# Nostr Development Key

## Generate a Keypair

```bash
nak key generate
```

Example output:

```text
secret key: nsec...
public key: npub...
hex public key: ...
```

## Persist the Key

Create a config directory:

```bash
mkdir -p ~/.config/nostr
```

Generate and save a key:

```bash
nak key generate | tee ~/.config/nostr/dev.key
```

Or save an existing key manually:

```bash
echo "nsec1..." > ~/.config/nostr/dev.key
chmod 600 ~/.config/nostr/dev.key
```

## Load Key into Shell

Add to `~/.zshrc`:

```bash
export NOSTR_SECRET_KEY=$(cat ~/.config/nostr/dev.key)
```

Reload:

```bash
source ~/.zshrc
```

Verify:

```bash
echo $NOSTR_SECRET_KEY
```

## Get Public Key

```bash
nak key public $(cat ~/.config/nostr/dev.key)
```

## Project-Specific `.env`

```bash
cat > .env <<EOF
NOSTR_SECRET_KEY=nsec1...
EOF
```

Load it:

```bash
source .env
```

## Recommended Location

```text
~/.config/nostr/dev.key
```

Load when needed:

```bash
export NOSTR_SECRET_KEY=$(<~/.config/nostr/dev.key)
```

This keeps the same Nostr identity across reboots, container rebuilds, and repository resets.