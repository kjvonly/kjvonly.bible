# KJVonly.bible

KJVOnly is an offline-first PWA Bible app built with Svelte and Tailwind.

Features include:

* Strong's Concordance
* Cross references
* Light and dark themes
* Fast local search
* Offline reading

In development:

* Decentralized relay network built on the Nostr protocol

## Setup

Install [Git LFS](https://git-lfs.com/) before cloning. Resource data is tracked
in this repository, not as a Git submodule. For a normal GitHub checkout:

```bash
git lfs install
git clone <github-repository-url>
cd kjvonly.bible
```

With Git LFS installed, cloning normally downloads the required Resource files.
To update an existing checkout:

```bash
git pull --ff-only
```

If an LFS file is still a pointer or its contents are missing, run `git lfs pull`
from that checkout. No separate data repository or submodule initialization is
required.

The repository's `data/` directory contains serialized Resources and generated
publication artifacts. See [data/README.md](data/README.md) for its layout and
verification instructions.

Git worktrees each check out their own version of `data/` at the worktree's
commit, while normally sharing the local Git LFS object cache. Run `git lfs pull`
inside a worktree if its Resource files need to be downloaded.

```bash
make up
```

# NOSTR

Read [README.NOSTR.md](README.NOSTR.md).


# SEED

Read [README.SEED.md](zarf/scripts/seed/README.SEED.md)


