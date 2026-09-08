# Mental Models

There needs to be a defined contract.

- Should modules access nostr dir?
- Should services encapsulate the nostr protocol and concepts e.g. pubkey is?
- Nostr repo follows a global import convention. Should keep or refactor?
- We deleted the REST api services... Added replacements in nostr dir. Should we interface these now. Not planning on
  supporting a different protocol. Might make more sense if we refactor the global import convention.
- huge dependence on svlete writeables

## KJVOnly

- Storing kjvonly specific items in nostr/events
- using nostr parameterized replaceable event (with #d tag)

## Flows

### nsotr flows

- Nostr specific flows like login, relay list, contacts etc...

### app flows

- KJVonly specific flows like store annotation, note.
- User generated content made public. (what to show to users, web of trust, contacts etc...)
  - follow list with a little extra data (follow this person only for this type (notes, annotations, etc))

## Assumpitons

- Users will use a dedicated identity for the app.

## Nostter

### pros

- App startup code - timelines/MainTimeline.ts
  - cache
  - wasm for verifying events
- There are some abstractions/services like Signer
- use of rx-nostr handling events

### cons

Can't seem to find a pattern or contract

- global state and writeables
- It may be NIP protocol specific code baked in. If I was familiar maybe it would make more sense.

Is event driven architecture appropriate label for nostter.

## guess

- event driven architecture
- nips done in file shared across multiple files
