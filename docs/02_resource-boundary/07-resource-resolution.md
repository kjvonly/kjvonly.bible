# ADR 07 — Resource Resolution

**Status**

Accepted

---

# Problem

Resources may use different representations and content storage mechanisms.

Resource content may be:

* carried directly by a Nostr event,
* referenced through a descriptor,
* or represented as a collection of descriptors.

Externally stored content may be retrieved through Blossom, HTTP, archives, or other supported mechanisms.

The Resource Boundary needs one consistent process for turning any known Resource Representation into verified serialized Resource content without coupling retrieval to Domain interpretation, Installation, or persistence.

---

# Decision

Resource Resolution converts a validated Resource Representation into verified serialized Resource content.

```text id="x6cqja"
Resource Representation
        ↓
Resource Resolution
        ↓
Verified Serialized Resource Content
        ↓
Domain Interpretation / Installation
```

Resolution is responsible for:

* interpreting the representation form,
* retrieving externally referenced content,
* validating descriptors,
* verifying content integrity,
* processing descriptor collections,
* and safely handling nested representations.

Resolution ends when verified serialized Resource content is available.

It MUST NOT:

* interpret Domain meaning,
* create Domain Objects,
* determine local acceptance,
* install content,
* or persist application state.

---

# Resolution Input and Output

Resolution begins with a Resource Representation already known to the application.

That representation preserves the Resource context needed by later lifecycle stages, including the applicable:

```text id="s6gjkv"
publisher
Resource Identifier
publication metadata
representation
media type
representation payload
```

A successful resolution produces serialized Resource content together with sufficient Resource provenance to preserve its origin.

The content remains serialized.

For example:

```text id="3p01pt"
application/json
application/json+gzip
application/octet-stream
```

does not become Domain information during Resolution.

---

# Representation Dispatch

The Domain Resource Model defines three Resource Representations:

```text id="zmya8u"
content
descriptor
descriptors
```

Resolution MUST interpret the representation according to that declared form.

An unknown, missing, or malformed representation is a Resolution failure.

---

# `content` Resolution

A `content` representation carries serialized Resource content directly in the Nostr event payload.

Resolution therefore obtains the content without contacting an external storage provider.

The valid Nostr signature protects the signed event payload.

Additional integrity metadata MAY be verified when present.

Resolution MUST NOT parse the serialized content according to Domain schema merely because it is directly available.

Successful `content` Resolution produces verified serialized Resource content.

---

# `descriptor` Resolution

A `descriptor` representation identifies externally stored Resource content.

A descriptor contains enough information to:

* determine how the content can be retrieved,
* identify the expected content,
* and determine its media type.

The current descriptor model may include information such as:

```text id="gn4nxo"
storage mechanism
location
SHA-256
optional size
media type
```

Resolution retrieves the referenced content using the mechanism identified by the descriptor.

The implementation MAY use strategies, adapters, providers, or other internal abstractions to perform that retrieval.

Those implementation mechanisms are not part of the Resource Boundary contract.

---

# Storage Independence

The mechanism used to retrieve external content does not change Resource meaning or identity.

Supported mechanisms may include:

```text id="6swnfx"
Blossom
HTTP
Local Archive
IPFS
future providers
```

Adding a new retrieval mechanism MUST NOT require a new Resource Identity model, Resource Type, or Installation lifecycle merely because the content is stored elsewhere.

This preserves the storage independence established by ADR 02 — Data Distribution Strategy.

---

# Integrity Verification

Externally retrieved content MUST be verified independently of the storage provider before Resolution succeeds.

The current descriptor contract uses SHA-256 content hashes for cryptographic integrity.

Conceptually:

```text id="dsskd9"
Retrieve Bytes
    ↓
Compute SHA-256
    ↓
Compare Expected Hash
    ↓
Verified Serialized Resource Content
```

If a descriptor declares an expected size, Resolution SHOULD also verify it.

Size validation does not replace cryptographic verification.

A successful HTTP response, Blossom response, archive read, or other retrieval operation does not by itself establish valid Resource content.

Resolution MUST fail when required integrity information is absent or verification fails.

Transport security or provider-specific signatures MAY provide additional assurances but MUST NOT replace descriptor-level content integrity where the descriptor requires it.

---

# `descriptors` Resolution

A `descriptors` representation describes multiple independently identifiable Resources.

Each descriptor is processed independently.

```text id="gxaft8"
descriptors Representation
        ↓
Descriptor A → Resolution Result A
Descriptor B → Resolution Result B
Descriptor C → Resolution Result C
```

The collection itself is not interpreted as one combined Domain payload.

Descriptor order MUST NOT define:

* Domain dependencies,
* Installation order,
* or application behavior.

Those concerns belong to later lifecycle stages.

---

# Partial Collection Resolution

Descriptor collections use best-effort Resolution.

Failure to resolve one descriptor MUST NOT prevent unrelated descriptors from being resolved.

A collection may therefore produce:

* complete success,
* partial success,
* complete failure,
* or failure because the collection representation itself is invalid.

Resolution MUST preserve the distinction between successful and failed members.

Whether partial results are acceptable for Installation is not a Resolution decision.

---

# Resolution and Nostr Resource References

Some Resource graphs contain references to other Nostr-published Resources.

Locating another Nostr Resource remains the responsibility of Resource Discovery.

Therefore:

```text id="o1abec"
reference to external content
    → Resource Resolution

reference to another Nostr Resource
    → Resource Discovery
```

Resolution MUST NOT silently perform relay discovery as part of external content retrieval.

Once Discovery has produced the referenced Resource Representation, that representation may independently enter Resource Resolution.

This preserves the boundary between ADR 06 — Resource Discovery and this ADR.

---

# Nested Representations

Resources may compose collections from other Resources, including Resources that themselves use descriptor-based representations.

Such traversal may therefore alternate between Discovery and Resolution:

```text id="3tcy3h"
Known Resource Representation
        ↓
Resolution
        ↓
Resource Reference
        ↓
Discovery, when another Nostr Resource must be located
        ↓
Referenced Resource Representation
        ↓
Resolution
```

Resolution MAY also be invoked recursively when a nested Resource Representation is already available, such as through an archive or previously obtained Resource graph.

Every nested representation MUST follow the same validation and integrity rules as the root representation.

No separate manifest abstraction is required merely to support nested Resource collections.

---

# Recursion Safety

Nested Resource graphs MUST be bounded.

A compatible implementation MUST prevent:

* cycles,
* unbounded nesting,
* unbounded descriptor expansion,
* unreasonable individual content size,
* and unreasonable aggregate retrieval size.

When Published Resource Identity is available, traversal SHOULD use it to detect repeated Resources within the active traversal path.

Exact numerical limits, timeout behavior, and cancellation mechanisms are implementation policy.

The architectural requirement is that malformed or hostile Resource graphs cannot cause unbounded Resolution.

---

# Already-Available Content

Resolution does not require content to have been obtained from a live network operation.

A caller MAY supply content already available from:

* a local archive,
* previously staged retrieval,
* or another supported source.

The same integrity requirements apply.

Offline availability MUST NOT weaken Resource verification.

Whether verified content is cached or persisted is outside the Resolution contract.

---

# Resolution Failures

Resolution failures MUST be explicit.

At minimum, callers must be able to distinguish failures caused by invalid Resource information from failures caused by temporary content unavailability.

Examples include:

* invalid representation,
* invalid descriptor,
* unsupported retrieval mechanism,
* retrieval failure,
* integrity failure,
* malformed nested representation,
* cycle detection,
* or traversal limits.

The exact error types and diagnostic structures are implementation details.

---

# Resolution and Domain Validation

Resource integrity and Domain validity are different concerns.

Resolution determines:

> **Did this Resource Representation produce the serialized content it claims to represent?**

The owning Domain later determines:

> **Does that content represent valid Domain information?**

Therefore:

```text id="8e3gjr"
Resource Resolution
    ↓
Verified Serialized Resource Content

Domain Interpretation
    ↓
Candidate Domain Object
    ↓
Domain Validation
```

Successful Resolution MUST NOT be treated as successful Domain validation or local acceptance.

---

# Resolution and Installation

Resource Resolution and Resource Installation are separate lifecycle stages.

Resolution ends with:

```text id="e0e2r8"
Verified Serialized Resource Content
```

Installation begins from that verified content and determines whether the resulting Domain information becomes accepted local state.

Resolution does not require a particular parser, Domain Object Factory, repository, or persistence mechanism.

Those are outside this responsibility.

---

# Specification Invariants

A compatible implementation MUST preserve these rules:

```text id="pf72pj"
Resolution begins with a known Resource Representation.

Resolution ends with verified serialized Resource content.

Representation determines how content is obtained.

External content is cryptographically verified
independently of its storage provider.

Resolution does not interpret Domain meaning.

Resolution does not install or persist application state.

Descriptor collection members resolve independently.

Partial collection success is preserved.

Nostr Resource lookup belongs to Discovery.

Nested Resource traversal is bounded and cycle-safe.
```

---

# Scope

This ADR defines:

* Resolution of `content`, `descriptor`, and `descriptors` representations,
* external content retrieval,
* descriptor validation,
* content-integrity verification,
* collection Resolution,
* partial collection results,
* nested representation Resolution,
* traversal safety,
* and the boundary between Resolution and Domain interpretation.

It does not define:

* Resource Discovery,
* Discovery Roots,
* Nostr event validation,
* Domain schema validation,
* Domain Object construction,
* Installation or acceptance,
* local persistence,
* caching policy,
* synchronization,
* or long-lived retry behavior.

Those concerns belong to the corresponding Resource Boundary or Application Architecture specifications.

---

# Big Takeaway

Resource Resolution has one responsibility:

> **Turn a known Resource Representation into verified serialized Resource content.**

Representation determines how the content is obtained.

Integrity verification determines whether externally retrieved content may proceed.

Discovery locates Resources; Resolution obtains their content; the Domain interprets that content; Installation determines whether it becomes accepted local state.
