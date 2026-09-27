# KJVOnly.bible Search Architecture and Implementation Specification

**Status:** Current implementation specification  
**Date:** 2026-09-24  
**Scope:** Shared Search UI/runtime contract and the current Bible Search implementation  
**Primary application:** `client/kjvonly-pwa`  
**Framework:** Svelte 5 + TypeScript + Web Workers + FlexSearch

---

## 1. Purpose

This document defines how Search is currently architected and implemented in the KJVOnly.bible PWA.

The current Search implementation is intentionally split into two layers:

1. a reusable application-level Search UI/session contract, and
2. a Bible-owned Search implementation that supplies Bible-specific resource selection, search execution, filtering, result materialization, and navigation behavior.

The goal is to keep reusable search interaction concerns out of the Bible domain while also preventing the shared layer from becoming a generic search engine that knows about Bible Resources, FlexSearch, verses, panes, or Bible-location filters.

This document is intended to be sufficient as a handoff/reference for future Search work without requiring reconstruction from the individual refactor patches.

---

## 2. Current Scope and Non-Scope

### 2.1 In scope

This specification covers:

- the shared `SearchView`,
- `SearchSession`,
- shared Search state models,
- the generic `SearchAdapter<TResult>` contract,
- the shared Search input,
- the Search input focus behavior,
- Bible Search module composition,
- `BibleSearchAdapter`,
- Bible Search Resource selection,
- `SearchService` / `SearchRuntime` / worker execution,
- `SearchResultResponse` routing,
- Bible-location filtering,
- incremental result materialization,
- result list presentation,
- result actions,
- stale-result protections,
- lifecycle cleanup,
- test boundaries,
- and extension rules for future domains.

### 2.2 Not currently implemented here

Strong's search is not yet implemented against this contract.

The generic Search architecture should therefore be treated as a reusable boundary that is currently proven by Bible Search, not as evidence that Strong's or Dictionary Search already exists.

Notes search has a separate data/index lifecycle and is not the subject of this UI specification. It may reuse UI concepts later, but its current worker/index lifecycle should not be forced into the Bible Search model.

---

## 3. Architectural Goals

The current Search design is based on the following goals.

### 3.1 Shared UX, domain-owned semantics

The application layer owns reusable Search UX:

- query state,
- debounce,
- minimum query length,
- initial/searching/results/no-results/failure states,
- retry,
- Search input rendering,
- result-count summary rendering,
- and the generic result-renderer slot.

The Bible domain owns:

- which Search Resource is selected,
- how the search is executed,
- the meaning of the result payload,
- Bible-location filtering,
- verse materialization,
- Bible book/chapter display data,
- click behavior,
- copy behavior,
- pane splitting,
- and Bible-specific result presentation.

### 3.2 Resource selection remains a module concern

A Search module instance consumes the Resource selections captured for its Buffer.

The module resolves the selected Bible Search Index Resource through `ModuleResourceSelectionResolver` and passes a `PublishedResourceReference` into the Bible Search boundary.

Pane/Buffer mechanics do not leak into the Search service/runtime.

### 3.3 Workers own expensive search runtime state

The active FlexSearch index lives in worker memory.

Persistent storage contains the serializable accepted Domain Object representation of the Bible Search Index, not a live FlexSearch object.

### 3.4 Multiple Search instances must remain isolated

Each Bible Search module creates a unique `searchID`.

That ID is used by the Search service/runtime to route worker results back to the correct Search module instance.

### 3.5 Result rendering is separate from search execution

The worker returns Bible-location references.

The Search result renderer resolves those references into user-facing verse rows using the selected Bible Chapter and Booknames Resources.

This avoids duplicating verse text inside the search index result protocol.

---

## 4. High-Level Architecture

```text
Search module / searchContainer.svelte
    |
    +-- resolves selected Bible Search Resource
    +-- creates BibleSearchAdapter
    +-- owns Bible-specific query/filter/result state
    |
    v
Shared SearchView
    |
    +-- SearchInput
    +-- SearchSession
    +-- generic Search UI states
    +-- result renderer snippet
    |
    v
SearchAdapter<SearchResultResponse>
    |
    v
BibleSearchAdapter
    |
    v
SearchService
    |
    v
SearchRuntime
    |
    +-- BibleSearchIndexService
    |      |
    |      +-- installed BibleSearchIndex Domain Object
    |
    v
Bible Search Worker
    |
    v
SearchIndexRuntime / FlexSearch.Index
    |
    v
SearchResultResponse
    |
    v
Bible searchContainer
    |
    +-- stale-result check
    +-- optional Bible-location filter
    |
    v
SearchResults
    |
    +-- incremental reference -> verse materialization
    +-- result-count callback
    +-- row interaction/actions
    |
    v
SearchViewResultSummary -> SearchSession
```

The important architectural direction is that the shared Search layer does not directly call the worker, Resource system, Bible services, or workspace runtime.

---

## 5. Primary File Map

### 5.1 Shared application Search layer

```text
client/kjvonly-pwa/src/lib/application/ui/search/
    search-adapter.ts
    search-view.model.ts
    search-session.svelte.ts
    search-session.spec.ts
    searchView.svelte
```

Public exports are surfaced through:

```text
client/kjvonly-pwa/src/lib/application/ui/index.ts
```

### 5.2 Shared Search controls

```text
client/kjvonly-pwa/src/lib/components/inputs/searchInput.svelte
client/kjvonly-pwa/src/lib/components/buttons/KJVIconButton.svelte
```

### 5.3 Bible Search module

```text
client/kjvonly-pwa/src/lib/domains/bible/modules/search/
    bible-search-adapter.ts
    bible-search-adapter.spec.ts
    searchContainer.svelte
    searchResults.svelte
    searchResultActions.svelte
```

### 5.4 Bible Search model/service/runtime/worker

```text
client/kjvonly-pwa/src/lib/domains/bible/models/search.model.ts
client/kjvonly-pwa/src/lib/domains/bible/models/bible-search-index.model.ts

client/kjvonly-pwa/src/lib/domains/bible/services/search.service.ts
client/kjvonly-pwa/src/lib/domains/bible/services/bible-search-index.service.ts

client/kjvonly-pwa/src/lib/domains/bible/runtime/search/search-runtime.ts

client/kjvonly-pwa/src/lib/domains/bible/workers/kjvsearch.worker.ts
client/kjvonly-pwa/src/lib/domains/bible/workers/search/search-index-runtime.ts
client/kjvonly-pwa/src/lib/domains/bible/workers/search/search-worker-message.ts

client/kjvonly-pwa/src/lib/domains/bible/resources/search/
```

---

## 6. Shared Search Contract

## 6.1 `SearchAdapter<TResult>`

The shared Search layer exposes a deliberately small domain-facing adapter contract:

```ts
export interface SearchAdapter<TResult> {
    search(query: string): Promise<void>;
    subscribe(listener: (result: TResult) => void): () => void;
}
```

### Responsibility

The adapter binds domain-specific search infrastructure while exposing only the operations required by a Search module/container:

- start a search for a query,
- subscribe to completed domain results,
- return a cleanup function for the result subscription.

### Non-responsibility

`SearchAdapter` does not define:

- how the index is stored,
- how workers are created,
- how results are rendered,
- how result counts are computed,
- how search terms are highlighted,
- what a domain result looks like,
- or how a result is opened.

The type parameter `TResult` preserves domain ownership of the result payload.

---

## 6.2 `SearchViewState`

The shared Search UI recognizes five states:

```ts
type SearchViewState =
    | 'initial'
    | 'searching'
    | 'results'
    | 'no-results'
    | 'failure';
```

These states are generic interaction states rather than Bible-specific result states.

### State meaning

- **`initial`** - No searchable query is currently active.
- **`searching`** - A valid query has been issued and the view is waiting for domain-owned result state.
- **`results`** - The current query has at least one result.
- **`no-results`** - The current query completed with zero results.
- **`failure`** - Starting/executing the current search rejected through the `onSearch` promise boundary.

---

## 6.3 `SearchViewResultSummary`

The shared view does not own domain results. Instead, the domain reports only the summary needed by the generic Search UX:

```ts
interface SearchViewResultSummary {
    query: string;
    renderedCount: number;
    totalCount: number;
}
```

This is intentionally a summary rather than a generic result model.

The domain keeps ownership of the actual result payload.

---

## 6.4 `SearchViewResultsContext`

The shared Search view passes a small context to the domain-owned result renderer:

```ts
interface SearchViewResultsContext {
    query: string;
    showResults: boolean;
}
```

The result renderer receives the current query and whether results should currently be visible.

It does not receive search-service infrastructure from the shared layer.

---

## 7. `SearchSession`

`SearchSession` is the non-visual owner of reusable Search interaction state.

It is implemented in a `.svelte.ts` module so its rune-backed state remains directly consumable by Svelte while also being independently testable.

### 7.1 Session-owned state

```text
query
searchState
renderedResultsCount
totalResultsCount
DebounceService
```

### 7.2 Configuration

`SearchSessionOptions` currently includes:

```text
initialQuery
minimumQueryLength
debounceMilliseconds
onSearch(query)
onQueryInput(query)?
```

`SearchView` defaults are currently:

```text
minimumQueryLength = 3
debounceMilliseconds = 300
```

### 7.3 Start behavior

When `SearchView` mounts it calls:

```text
searchSession.start()
```

The initial query is searched only when its length is at least `minimumQueryLength`.

This makes initial-query behavior consistent with normal user-entered queries.

### 7.4 Input behavior

When the user edits the query:

```text
SearchInput
    -> SearchSession.handleQueryInput(value)
```

The session then:

1. updates `query`,
2. invokes optional `onQueryInput`,
3. resets rendered/total result counts,
4. cancels pending debounce when the query is below the minimum length,
5. returns to `initial` when below the minimum,
6. otherwise sets `searching`,
7. schedules `onSearch(query)` through `DebounceService`.

### 7.5 Result-summary behavior

`SearchView` forwards the domain-owned `resultSummary` into:

```text
SearchSession.applyResultSummary(...)
```

The session ignores a summary when:

```text
summary.query !== current query
```

For a current summary:

```text
totalCount > 0 -> results
totalCount = 0 -> no-results
```

### 7.6 Failure behavior

`SearchSession` catches rejection from `onSearch(query)`.

The current implementation only changes the session to `failure` when the failed query still equals the current query.

This prevents a normal stale failure from an older, different query from replacing the state of a newer query.

### 7.7 Retry

Retry:

1. cancels pending debounce,
2. runs the current query immediately.

### 7.8 Destroy

`SearchView` calls:

```text
searchSession.destroy()
```

which cancels pending debounce work.

The session does not own the domain subscription or worker lifetime; those belong to the domain/module/service layers.

---

## 8. `SearchView`

`SearchView` is the reusable visual Search shell.

### 8.1 Props

The current contract is conceptually:

```text
initialQuery?: string
placeholder?: string
showInput?: boolean
focusInputOnMount?: boolean
minimumQueryLength?: number
debounceMilliseconds?: number
resultSummary?: SearchViewResultSummary
onSearch(query): Promise<void>
onQueryInput?(query): void
results: Snippet<[SearchViewResultsContext]>
```

### 8.2 One-time configuration capture

The initial query and session configuration are intentionally captured when the Search session is created rather than treated as continuously reactive configuration.

This avoids Svelte's `state_referenced_locally` warning and makes the lifecycle explicit: one mounted `SearchView` owns one `SearchSession`.

### 8.3 Sticky Search surface

The Search input and result-count summary live in one sticky surface:

```text
sticky top-0 z-10
```

This avoids measured input-height offsets and keeps CSS responsible for Search surface geometry.

### 8.4 Generic UI states

`SearchView` renders:

#### Searching

```text
Searching...
```

with status/live-region semantics.

#### No results

```text
No results
Try another search.
```

This is informational, not an error.

#### Failure

```text
Search failed.
[Retry]
```

The failure state is visually and semantically distinct from no-results.

#### Results summary

When results exist:

```text
Showing <rendered> of <total>
```

The counts come from the domain-owned result summary, not from the shared view inspecting result objects.

---

## 9. Shared `SearchInput`

The shared Search input is located at:

```text
src/lib/components/inputs/searchInput.svelte
```

It is a controlled component.

### 9.1 Contract

Conceptually:

```text
value: string
placeholder?: string
label?: string
focusOnMount?: boolean
onInput(value): void
```

The input never owns authoritative query state.

### 9.2 Stable geometry

The input uses permanent leading and trailing action slots.

Conceptually:

```text
[44px search slot] [flex input] [44px clear slot]
```

The clear button becomes `invisible` and disabled when there is nothing to clear rather than being removed from layout.

This prevents the input text from shifting when the first character is entered or when the clear action appears.

### 9.3 Touch targets

The Search surface has a minimum 44px height and the action slots remain large while the actual icons remain approximately 20px.

### 9.4 Native search cancel handling

The browser-provided WebKit search cancel control is hidden so the application has one predictable trailing clear action.

### 9.5 Accessibility

The input receives an accessible name from:

```text
label ?? placeholder
```

The clear button has an explicit accessible label.

### 9.6 Focus on creation

`SearchInput` supports:

```text
focusOnMount = false
```

The shared `SearchView` defaults:

```text
focusInputOnMount = true
```

and forwards that to the input.

The component uses a small Svelte action on the native `<input>` element:

```svelte
use:focusInput
```

This focuses the field only when that DOM element is created. It does not continuously re-focus the field when later state changes occur.

The shared input itself remains neutral because its default is `false`; SearchView opts into the Search-specific behavior.

---

## 10. Bible Search Module Composition

The Bible Search module container is the domain composition boundary for Search UI.

It owns the connection between:

```text
pane/module state
selected Resources
shared SearchView
BibleSearchAdapter
Bible result filtering
Bible SearchResults
workspace navigation
```

### 10.1 Per-instance identity

Each Search module creates:

```text
searchID = uuid4()
```

The ID identifies one Search instance to the Bible Search service/runtime result router.

This is required because more than one Search module can exist at the same time.

### 10.2 Resource selection

On mount, the Search module resolves its captured Bible Search Index selection:

```ts
moduleResourceSelectionResolver.require(
    paneID,
    BIBLE_SEARCH_RESOURCE_TYPE
)
```

The resulting `PublishedResourceReference` is passed into `BibleSearchAdapter`.

The service does not receive `paneID`, Buffer state, or the Resource resolver itself.

### 10.3 Adapter creation

The module creates:

```text
BibleSearchAdapter(
    searchService,
    searchID,
    selectedSearchSource
)
```

The adapter permanently binds the instance ID and selected Search Resource for that module instance.

### 10.4 Result subscription

The module subscribes through:

```text
searchAdapter.subscribe(handleSearchResult)
```

The adapter returns the cleanup function used by the Svelte mount lifecycle.

The `SearchResults` renderer no longer subscribes directly to `SearchService`.

That ownership is deliberate: the container owns the domain search result stream; the child owns rendering/materialization only.

---

## 11. `BibleSearchAdapter`

`BibleSearchAdapter` implements:

```text
SearchAdapter<SearchResultResponse>
```

It binds three pieces of Bible-specific infrastructure:

```text
SearchService
searchID
PublishedResourceReference search source
```

### 11.1 Search

Shared/domain container code calls:

```text
adapter.search(query)
```

The adapter calls the Bible service using the bound instance identity and source.

### 11.2 Subscription

Shared/domain container code calls:

```text
adapter.subscribe(listener)
```

The adapter:

1. subscribes the listener under the bound `searchID`,
2. returns a cleanup callback,
3. cleanup unsubscribes that `searchID`.

### 11.3 Why this adapter exists

The adapter prevents `searchContainer.svelte` from knowing the exact transport signature of `SearchService`.

It also defines a concrete reusable boundary for future Search domains without forcing those domains to share Bible's worker/index implementation.

---

## 12. Bible Query and Filter Ownership

The Bible Search container owns Bible-specific query/filter state that does not belong in `SearchView`.

Current container state includes conceptually:

```text
activeSearchQuery
activeSearchFilter
searchResponse
searchResultSummary
useInitialFilter
```

### 12.1 Initial Bible-location filter

A Search may be opened with an optional Bible-location filter.

The filter is allowed for the initial Search context.

Once the user edits the query:

```text
useInitialFilter = false
activeSearchFilter = undefined
```

This is intentionally owned by the Bible Search container.

The shared Search layer only reports that the query changed through `onQueryInput`.

### 12.2 Search start

Before calling the adapter, `runSearch(value)`:

1. stores the active query,
2. captures the initial Bible filter when still applicable,
3. clears the previous domain response,
4. clears the previous result summary,
5. delegates to `searchAdapter.search(value)`.

Clearing response/summary ensures the generic view does not display counts belonging to the previous query.

---

## 13. Search Result Protocol

`SearchResultResponse` includes the Search instance ID, query text, Bible-location references, and search statistics.

Conceptually:

```ts
interface SearchResultResponse {
    id: string;
    text: string;
    bibleLocationRefs: string[];
    stats: SearchResultStats;
}
```

The explicit `text` field is important because the module can verify that an asynchronously delivered response still belongs to the current query.

The worker returns references rather than complete verse presentation objects.

---

## 14. Current Stale-Result Protections

Search uses several protections at different ownership boundaries.

### 14.1 Container result check

The Bible container ignores a result when:

```text
response.text !== activeSearchQuery
```

This prevents a normal result from an older query from replacing a newer query's domain state.

### 14.2 Shared result-summary check

`SearchSession` ignores a summary when:

```text
summary.query !== current query
```

This prevents stale rendered-count updates from transitioning the generic Search UI.

### 14.3 Incremental materialization check

`SearchResults` captures the active response object before loading a result batch.

After each async verse lookup, it verifies that the same response is still active.

If the response has changed, the old render batch exits without appending additional stale verses.

### 14.4 Overlapping batch guard

`SearchResults` keeps a `loadingResponse` reference.

If the same response is already loading a batch, another scroll event does not start an overlapping batch.

### 14.5 Current correlation identity

The current container/session stale checks are query-value based.

There is not currently a separate request-token/generation field in the documented active Search protocol.

This is an implementation fact that should be preserved in maintenance documentation so future changes do not accidentally assume stronger request identity than currently exists.

---

## 15. `SearchService`, `SearchRuntime`, and Worker

The Bible Search service/runtime layer isolates Svelte from worker and Search Index initialization details.

### 15.1 SearchService

`SearchService` is the application/domain-facing routing boundary.

Its responsibilities include:

- accepting Search requests,
- delegating to the Search runtime,
- receiving completed worker results,
- routing results by `searchID`,
- maintaining/removing subscribers.

A Search module does not talk directly to the worker.

### 15.2 SearchRuntime

`SearchRuntime` owns the main-thread worker protocol.

Its responsibilities include:

```text
load selected BibleSearchIndex
initialize the worker index once
coalesce duplicate initialization work
route search requests to the worker
receive typed worker messages
forward SearchResultResponse to SearchService
```

### 15.3 Selected source readiness

A selected Bible Search Resource is keyed by its published source identity.

Repeated searches using the same selected source reuse pending/ready initialization work.

If source/index initialization fails, the failed readiness entry is removed so a later request can retry.

### 15.4 Worker index readiness

The runtime also tracks initialized Search Index IDs and pending index initializations.

This prevents repeated import of the same persisted FlexSearch chunks into worker memory.

### 15.5 Current worker lifetime

The current Bible Search worker/index runtime is application/runtime-owned rather than one ephemeral worker per mounted Search view.

Initialized indexes remain available in worker memory for reuse.

Ephemeral Search workers are a possible future memory optimization but are not part of this current Search implementation.

---

## 16. Bible Search Index Resource and Persistence

Bible Search uses a prebuilt Search Index distributed through the normal Resource architecture.

### 16.1 Resource flow

```text
Published Bible Search Resource
    -> interpret / validate
    -> BibleSearchIndex Domain Object
    -> domain_objects IndexedDB persistence
    -> BibleSearchIndexService
    -> SearchRuntime
    -> worker-owned FlexSearch.Index
```

### 16.2 Persistence/runtime distinction

```text
IndexedDB
    stores serializable exported Search Index chunks

Worker memory
    stores live FlexSearch.Index objects
```

The live FlexSearch runtime is not persisted directly.

### 16.3 Local-first retrieval

Given a selected `PublishedResourceReference`, `BibleSearchIndexService`:

1. derives the expected installed Search Index identity,
2. checks local Domain persistence,
3. returns it when installed,
4. otherwise uses the Resource installation boundary,
5. reloads and returns the installed index.

The service does not silently substitute a different Search Index.

---

## 17. Worker Search Behavior

The Bible Search worker owns an in-memory map:

```text
BibleSearchIndex.id -> FlexSearch.Index
```

The current worker protocol includes:

```text
init
search
```

Conceptually:

```ts
{ action: 'init', searchIndex }
{ action: 'search', id, searchIndexId, text }
```

The current Search algorithm:

1. resolves the requested in-memory index,
2. splits query text on the literal `OR` delimiter,
3. searches each term,
4. combines matches,
5. removes duplicate IDs,
6. sorts Bible locations into canonical Bible order,
7. returns Bible-location references plus search statistics.

The worker does not materialize complete verse text.

---

## 18. Domain Result Processing in `searchContainer.svelte`

When the container receives a `SearchResultResponse`:

1. it verifies `response.text` matches `activeSearchQuery`,
2. clones the returned Bible-location reference array,
3. applies the captured Bible-location filter when one was active for that search,
4. creates a domain-owned `searchResponse`,
5. passes that response to `SearchResults`.

The response is cloned rather than mutating the worker/service result object in place.

This keeps result adaptation at the domain boundary explicit.

---

## 19. `SearchResults` Responsibilities

`SearchResults` is a Bible-specific result renderer and materializer.

It is not the owner of Search execution.

### 19.1 Inputs

Conceptually it receives:

```text
searchText
paneID
scrollContainerID
searchResponse?
showResults
onRenderedCountChanged(query, rendered, total)
```

### 19.2 It does not subscribe to SearchService

This is an important ownership rule.

The parent Bible container owns the Search result subscription.

`SearchResults` reacts to the `searchResponse` prop.

### 19.3 Response change behavior

When a new response arrives, `SearchResults`:

1. marks it as the active response,
2. resets rendered count to zero,
3. clears currently materialized result rows,
4. starts rendering the first batch.

### 19.4 Incremental rendering

The worker response contains Bible-location references, not verse rows.

`SearchResults` materializes references in batches.

Current behavior uses:

```text
10 results per batch
load next batch when the scroll container is within 20px of the bottom
```

This reduces the amount of verse materialization required before the first results are visible.

### 19.5 Verse materialization

For each Bible-location reference, the result renderer uses the selected Bible data/services to resolve:

```text
Bible location ref
    -> verse
    -> book name
    -> chapter number
    -> verse number
    -> verse text
```

The resulting UI-facing `SearchResult` is separate from the worker's reference-only response.

### 19.6 Result count reporting

After a batch loads, `SearchResults` reports:

```text
query
rendered count
total reference count
```

The Bible container converts that into `SearchViewResultSummary` and passes it to the shared Search view.

This preserves the direction:

```text
Domain result renderer
    -> summary
    -> shared Search UX
```

rather than making the shared Search view inspect domain result objects.

---

## 20. Search Result Row Interaction

Each result is presented as an entity/content row rather than a card.

### 20.1 Primary row action

The verse content uses a native full-width `<button>` as the primary interaction target.

Selecting a result navigates the current pane to the Bible module at the selected Bible-location reference.

### 20.2 Secondary actions

Copy and pane-split actions are siblings of the primary row button.

They are not nested inside the primary button.

This preserves valid native interaction semantics.

### 20.3 Search result actions

Current actions are:

```text
Copy verse
Split pane horizontally
Split pane vertically
```

Split actions open the Bible module at the Search result's Bible-location reference.

---

## 21. `KJVIconButton` and Result Actions

Search result actions now use `KJVIconButton` rather than ad hoc `KJVButton classes=""` overrides.

### 21.1 Purpose

`KJVIconButton` is a semantic wrapper over `KJVButton` for icon-only controls.

It centralizes:

- physical touch-target minimum,
- centered icon layout,
- accessible label,
- focus treatment,
- standard/quiet presentation.

### 21.2 Physical target

The component uses both relative sizing and an absolute physical floor:

```text
h-11 w-11
min-h-[44px] min-w-[44px]
```

This is important because the application allows the root font size to change.

A pure rem-based target could otherwise shrink below an accessible physical size.

### 21.3 Variants

Current variants:

```text
standard
quiet
```

Search result actions use `quiet` because the row content should remain visually dominant.

### 21.4 Accessible names

Each Search result icon action provides an explicit label such as:

```text
Copy verse
Split pane horizontally
Split pane vertically
```

The visual SVG is not relied on as the accessible name.

---

## 22. Search Result Visual Design

The current Search result row follows the KJVOnly.bible list design rules.

### 22.1 Row geometry

```text
px-4 py-4
```

The row is a richer multi-line entity/content row, so `py-4` is appropriate.

One row wrapper owns the horizontal gutter.

### 22.2 Reference hierarchy

The Bible reference is intentionally secondary to the verse content:

```text
text-sm
text-neutral-600
```

It remains easy to scan without becoming a repeated oversized heading.

### 22.3 Verse body

Verse text is the primary content:

```text
text-base
text-neutral-700
leading-relaxed
```

The verse is not italicized by default.

Italic styling would turn normal content into continuous emphasis and reduce readability across long result lists.

### 22.4 Reference/body spacing

The reference and verse body use:

```text
gap-2
```

because the Bible reference acts as locator/metadata and the verse is a separate content block.

### 22.5 Match highlighting

Matched words use the Search/accent semantic treatment:

```text
text-primary-500
```

Search matches no longer reuse the red-letter text token because those concepts have different semantic meaning.

### 22.6 Row states

The row uses restrained surface changes for:

```text
hover
active
focus-within
```

and a short color transition.

The design relies on whitespace, hierarchy, and interaction surface rather than heavy cards or dividers between every result.

---

## 23. Search Input and Result Scroll Ownership

`BufferBody` remains the primary vertical scroll owner for the Search module.

`SearchView` provides a sticky Search/input/count surface inside that scroll context.

`SearchResults` listens to the known BufferBody scroll container using the Search instance's `scrollContainerID`.

The Search implementation deliberately avoids a nested vertical result scroll container.

This preserves the application layout rule that one authoritative body owns vertical scrolling.

---

## 24. Lifecycle Sequence

### 24.1 Module mount

```text
searchContainer mounts
    -> resolve selected Bible Search Index Resource
    -> create BibleSearchAdapter
    -> subscribe to result stream
    -> render SearchView

SearchView mounts
    -> create/use SearchSession
    -> focus SearchInput when enabled
    -> SearchSession.start()
    -> initial query searches only if >= minimum length

SearchResults mounts
    -> attach BufferBody scroll listener
```

### 24.2 Query edit

```text
user types
    -> SearchInput.onInput
    -> SearchSession.handleQueryInput
    -> Bible container onQueryInput
         -> disable initial Bible-location filter
         -> clear prior response/summary
    -> debounce
    -> SearchSession calls onSearch
    -> Bible container runSearch
    -> BibleSearchAdapter.search
```

### 24.3 Search execution

```text
BibleSearchAdapter
    -> SearchService
    -> SearchRuntime
    -> ensure selected BibleSearchIndex is ready
    -> worker search
    -> SearchIndexRuntime / FlexSearch
    -> SearchResultResponse
    -> SearchRuntime
    -> SearchService result router
    -> BibleSearchAdapter subscription
    -> searchContainer.handleSearchResult
```

### 24.4 Result rendering

```text
searchContainer
    -> stale-query check
    -> optional Bible-location filter
    -> searchResponse
    -> SearchResults
    -> materialize first 10 references
    -> report rendered/total counts
    -> SearchViewResultSummary
    -> SearchSession -> results/no-results
```

### 24.5 Scroll continuation

```text
BufferBody approaches bottom
    -> SearchResults.handleScroll
    -> load next 10 references
    -> materialize verses
    -> update rendered count
    -> update "Showing X of Y"
```

### 24.6 Destroy

```text
SearchView destroy
    -> cancel pending debounce

SearchResults destroy
    -> remove scroll listener

searchContainer destroy
    -> adapter unsubscribe
```

The current runtime/worker itself is not terminated by unmounting one Search view.

---

## 25. Initial Query Behavior

A Search module can be created with an existing `searchTerms` value.

The container passes it as:

```text
SearchView.initialQuery
```

`SearchSession.start()` applies the same minimum-length rule used for normal typed queries.

An initial query shorter than the configured minimum is not automatically searched.

This prevents initial-state behavior from diverging from user-input behavior.

---

## 26. Error and Empty-State Behavior

Search distinguishes execution failure from a valid query with zero results.

### 26.1 No results

A successfully completed result summary with zero total results becomes:

```text
No results
Try another search.
```

### 26.2 Search failure

A rejected current `onSearch` operation becomes:

```text
Search failed.
[Retry]
```

### 26.3 Worker/index readiness

`SearchRuntime` is responsible for ensuring the selected Search Index is initialized before issuing the worker Search request.

Callers are not expected to coordinate worker readiness themselves.

If index retrieval/installation/initialization fails through the Search promise boundary, the shared Search failure state can surface the error path.

---

## 27. Testing Strategy

Search is intentionally testable at narrow ownership boundaries.

### 27.1 `SearchSession` tests

The session tests cover reusable behavior such as:

- initial query start,
- debounce behavior,
- cancellation when query falls below the minimum,
- stale result-summary rejection,
- results/no-results state transitions,
- current search failure,
- retry,
- and stale older failure not replacing a newer different query.

The intent is to test the state/lifecycle owner directly instead of requiring browser tests for every Search state transition.

### 27.2 `BibleSearchAdapter` tests

The adapter tests verify:

- `searchID` and selected Resource source are bound to every search,
- the listener is subscribed under the correct ID,
- the returned cleanup function unsubscribes the same Search instance.

### 27.3 Search runtime/service tests

The lower Search stack should continue testing:

- local-first Search Index retrieval,
- Resource installation fallback,
- one-time worker initialization,
- concurrent initialization coalescing,
- result routing by Search ID,
- subscriber removal,
- and canonical Bible-location ordering.

### 27.4 Browser/integration tests

Browser tests should be reserved for boundaries that truly require the browser/runtime stack, such as:

- IndexedDB-backed Resource installation,
- real worker integration,
- or complete UI-to-worker behavior.

---

## 28. Ownership Matrix

- **Query text:** `SearchSession`
- **Debounce:** `SearchSession` / `DebounceService`
- **Minimum query length:** `SearchSession`
- **Generic Search state:** `SearchSession`
- **Search UI state rendering:** `SearchView`
- **Input DOM/control behavior:** shared `SearchInput`
- **Input focus-on-creation policy:** `SearchView` opt-in -> `SearchInput`
- **Generic search interface:** `SearchAdapter<TResult>`
- **Bible Search binding:** `BibleSearchAdapter`
- **Search instance ID:** Bible `searchContainer`
- **Buffer Resource selection:** Bible `searchContainer`
- **Initial Bible-location filter semantics:** Bible `searchContainer`
- **Domain result payload:** Bible domain
- **Result subscription:** Bible `searchContainer`
- **Worker result routing:** `SearchService`
- **Search Index readiness:** `SearchRuntime`
- **Live FlexSearch index:** Bible Search worker
- **Reference -> verse materialization:** `SearchResults`
- **Incremental result paging:** `SearchResults`
- **Rendered/total count:** `SearchResults` -> container summary
- **Result row navigation:** Bible `SearchResults`
- **Copy/split actions:** `searchResultActions.svelte`
- **Icon-button touch target:** `KJVIconButton`

---

## 29. Architectural Invariants

Future Search changes should preserve these invariants unless a deliberate architecture decision replaces them.

1. **Shared Search UI must not know Bible models or services.**
2. **Bible Search semantics remain in the Bible domain.**
3. **Resource selection remains module/Buffer-owned.**
4. **Domain services receive selected Resource references, not Pane/Buffer objects.**
5. **Search results remain domain-owned; the shared layer consumes only summaries.**
6. **`SearchResults` must not re-own the Search service subscription.**
7. **Workers do not use `ApplicationContext`.**
8. **The worker owns live FlexSearch runtime state, not authoritative persistence.**
9. **Search instance routing must remain isolated across multiple panes.**
10. **Async result/materialization code must reject stale work before updating current UI.**
11. **The Search input remains controlled by the Search session rather than maintaining a second authoritative query value.**
12. **Search interaction state must distinguish initial, searching, no-results, results, and failure.**
13. **Result rows use valid native interactive structures; no nested buttons.**
14. **Icon-only actions retain a true 44px minimum physical touch target.**
15. **BufferBody remains the primary vertical scroll owner.**

---

## 30. Extension Pattern for a Future Search Domain

When a future domain such as Strong's adds Search, it should not copy Bible's worker/index code blindly.

The correct sequence is:

### 30.1 Define domain Search semantics

Decide:

- what data is authoritative,
- what gets indexed,
- how queries are interpreted,
- what the result payload means,
- and whether the index is published, persisted, rebuilt, or ephemeral.

### 30.2 Implement a domain adapter

Implement:

```ts
SearchAdapter<DomainSearchResult>
```

The adapter should bind the domain-specific transport/runtime dependencies.

### 30.3 Reuse `SearchView`

Provide:

```text
onSearch
onQueryInput if domain-specific input behavior is required
resultSummary
domain-owned results snippet
```

### 30.4 Keep result rendering domain-owned

The domain result component should own:

- domain result materialization,
- domain-specific row layout,
- domain-specific actions,
- and rendered/total count reporting.

### 30.5 Do not expand the generic contract prematurely

Only add another shared Search concept when two or more real Search domains require the same behavior.

The current architecture intentionally keeps the shared contract small.

---

## 31. Current Known Constraints

These are implementation facts, not automatic refactor requirements.

### 31.1 Query-value correlation

Current stale-response/session checks correlate using the query string rather than an explicit request token.

Maintenance code should not assume a unique request identity exists beyond `searchID` + current query semantics.

### 31.2 Long-lived worker/index runtime

The current worker/index runtime is reusable and long-lived.

It is not yet an ephemeral worker that is created only while a Search module is open.

### 31.3 Bible is the current generic SearchView consumer

The shared Search boundary has been generalized in preparation for other Search domains, but Strong's search is not yet implemented.

A second domain should be used to validate whether any further generic Search abstractions are actually necessary.

---

## 32. Summary

The current Search architecture can be summarized as:

```text
Shared Search UX
    SearchView
    SearchSession
    SearchInput
    SearchAdapter<TResult>

        does not own domain results
        does not know Bible
        does not know workers

Bible Search composition
    searchContainer
    BibleSearchAdapter
    SearchResults
    SearchResultActions

        owns resource selection
        owns filter semantics
        owns domain result state
        owns result materialization
        owns navigation/actions

Bible Search runtime
    SearchService
    SearchRuntime
    BibleSearchIndexService
    Worker / SearchIndexRuntime

        owns index readiness
        owns worker protocol
        owns live FlexSearch state
        routes results by searchID
```

The key design decision is that Search is reusable at the interaction boundary without pretending all searchable domains have the same persistence/index/runtime model.

That keeps the shared layer small, keeps Bible-specific responsibilities in the Bible domain, and leaves a clear extension point for future Search implementations such as Strong's.
