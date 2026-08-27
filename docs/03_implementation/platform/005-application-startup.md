# Application Startup

## Status

Current

---

# Purpose

This document describes the current implementation direction for application startup in KJVOnly. It is the implementation-level companion to the architectural startup document. The architectural startup contract defines **what must become available before the application is considered interactive**. This document defines **how the browser application composes long-lived dependencies, exposes them to the Svelte component tree, executes startup work in order, and disposes those dependencies when the application ends**. The central implementation is an explicit **Application Composition Root**.

The Composition Root provides one place where the application:

* constructs long-lived services,
* connects interfaces to concrete infrastructure,
* establishes dependency direction,
* creates the application context,
* coordinates ordered startup,
* exposes application dependencies to Svelte,
* and performs application-level cleanup.

The implementation intentionally uses plain TypeScript. It does not use a dependency-injection framework, service container, runtime reflection system, or service locator. The guiding idea is simple:

> Construct the application in one place, start it in one place, and push dependencies downward from that root.

---

# Scope

This document describes:

* the Application Composition Root,
* `Application`,
* `ApplicationContext`,
* application configuration,
* synchronous dependency construction,
* asynchronous startup sequencing,
* Svelte integration,
* Svelte context,
* startup readiness,
* browser-only initialization,
* Resource Client composition,
* Resource lifecycle composition,
* signer ownership,
* verification-worker lifecycle,
* relay configuration,
* authentication restoration boundaries,
* startup failure behavior,
* cleanup and disposal,
* migration away from file-level singleton construction,
* and the future direction for Workspace Runtime initialization.

This document does not redefine:

* Workspace Runtime behavior,
* Pane behavior,
* Domain behavior,
* Resource Discovery,
* Resource Resolution,
* Nostr protocol mechanics,
* Resource installation,
* synchronization,
* the Outbox,
* or Background Processing algorithms.

Those subsystems remain responsible for their own behavior. Startup constructs and coordinates them. It does not absorb their responsibilities.

---

# Relationship to the Startup Architecture

The architectural startup lifecycle remains:

```text
Application Launch
        ↓
Initialize Platform
        ↓
Open / Restore Local State
        ↓
Initialize Workspace Runtime
        ↓
Bind Presentation
        ↓
Interactive Application
        ↓
Background Processing
```

The application is considered ready when the user can interact with the restored or initial Workspace. Readiness does not require:

* every Resource to be downloaded,
* every Domain Object to be refreshed,
* every search index to be rebuilt,
* authentication to succeed,
* every relay to be available,
* or every background task to complete.

The implementation in this document exists to realize that lifecycle without scattering initialization logic across Svelte components and file-level singleton exports.

---

# Background

Historically, the application accumulated startup behavior in several places. Examples included:

* module-level singleton exports,
* services instantiated when files were imported,
* Svelte root-component lifecycle code,
* relay setup,
* login restoration,
* database initialization,
* Workspace construction,
* Pane bindings,
* settings restoration,
* and background-service initialization.

This approach works while the application is small, but it creates several problems as the architecture becomes more explicit. Importing a file may create application state. Dependency ownership becomes difficult to see. Construction order becomes implicit.

Tests may accidentally instantiate global infrastructure. A service cannot easily receive a replacement implementation because it imports another singleton directly. Browser resources such as:

* Workers,
* WebSockets,
* Nostr clients,
* remote signers,
* and future background workers

may outlive the application object that conceptually owns them. The Composition Root addresses these problems without introducing a framework.

---

# Composition Root

The standard architectural term for the application construction boundary is:

> **Composition Root**

The Composition Root is the one place where concrete objects are created and connected. Conceptually:

```mermaid
flowchart TD

Root["Application Composition Root"] Signer["NostrSigner"] ResourceClient["ResourceClient"] Discovery["ResourceDiscovery"] Resolver["ResourceResolver"] Decoder["ResourceContentDecoder"] Runtime["Workspace Runtime"] Services["Application / Domain Services"] Root --> Signer Root --> ResourceClient Root --> Discovery Root --> Resolver Root --> Decoder Root --> Runtime Root --> Services ``` The concrete set of services will grow as the migration continues.

The important rule is that long-lived application dependencies eventually originate here.

---

# Source Organization

The current startup implementation is centered under:

```text
src/lib/application/

runtime/ application.ts application-context.ts config/ application.config.ts ``` Related infrastructure remains in its owning layer. For example:

```text
src/lib/infrastructure/
    nostr/
        resource-client.ts
        nostr-signer.ts
        verification-client.ts
        verification.worker.ts
```

Generic Resource dependencies remain in:

```text
src/lib/resource/
```

The Composition Root imports those implementations and connects them. It does not move their implementation into `application.ts`.

---

# Application Class

The application startup boundary is represented by an `Application` class. A class is appropriate here because startup has:

* long-lived state,
* a constructed dependency graph,
* startup sequencing,
* lifecycle state,
* and cleanup responsibilities.

This is different from creating a class merely because an architectural noun exists. The `Application` object represents one running browser application instance. Conceptually:

```ts
export class Application {
    readonly context: ApplicationContext;

constructor( config: ApplicationConfig ) { this.context = this.compose(config); } async start(): Promise<void> { // ordered startup work } dispose(): void { // application-owned cleanup } } ``` The exact private helpers may evolve.

The important public lifecycle is:

```text
construct
    ↓
context immediately available
    ↓
start
    ↓
running application
    ↓
dispose
```

---

# Why Construction and Startup Are Separate

Construction and startup have different responsibilities.

## Construction

Construction creates the stable object graph. Examples include:

* `NostrSigner`,
* `ResourceClient`,
* `ResourceDiscovery`,
* `ResourceResolver`,
* Resource content decorators,
* `ResourceContentDecoder`,
* and future long-lived application services.

Construction should remain synchronous wherever practical.

## Startup

Startup performs work that requires asynchronous operations or ordered initialization. Examples may include:

* opening IndexedDB,
* restoring persisted login state,
* configuring remote signer state,
* loading settings,
* restoring Workspace state,
* initializing Domain stores,
* and beginning background processing.

The split allows the application context to exist before asynchronous startup completes.

---

# Synchronous Composition

The application object is created synchronously. Conceptually:

```ts
const application =
    new Application(config);
```

Immediately after construction:

```ts
application.context
```

is stable and may be provided to the Svelte component tree. This is a deliberate design decision. Svelte context is established during component initialization. The application should not require:

```ts
await Application.create();
```

before `setContext()` can occur.

---

# Asynchronous Start

Asynchronous initialization begins through:

```ts
await application.start();
```

This provides a sequential, main-method-style startup flow. The user-visible application may choose to wait for the startup promise before rendering the interactive Workspace. The important point is that asynchronous work is coordinated by the application object rather than scattered across unrelated Svelte components.

---

# Main-Method Style

Startup should read as an ordered list of application initialization steps. Conceptually:

```ts
async start(): Promise<void> {
    await this.openPersistence();
    await this.restoreSettings();
    await this.configureRelays();
    await this.restoreAuthentication();
    await this.initializeDomains();
    await this.initializeWorkspace();
    this.beginBackgroundProcessing();
}
```

The exact methods above are illustrative of responsibility and sequencing; some are not yet migrated into the Composition Root. The desired style is nevertheless explicit:

```text
step 1
await
step 2
await
step 3
await
...
```

This makes ordering visible and reviewable. Startup should not become an opaque graph of automatic dependency hooks.

---

# Why Sequential Startup Is Useful

A sequential startup method makes several things clear. It shows:

* what must happen before what,
* which operations are readiness-critical,
* which operations may fail without blocking the application,
* where background processing begins,
* and which subsystem owns each operation.

It also makes startup debugging straightforward. If the application fails during step four, the startup path can identify which subsystem failed without reconstructing a hidden initialization graph.

---

# Application Context

The Composition Root exposes long-lived dependencies through:

```text
src/lib/application/runtime/application-context.ts
```

Conceptually:

```ts
export interface ApplicationContext {
    readonly nostrSigner:
        NostrSigner;

readonly resourceClient: ResourceClient; readonly resourceDiscovery: ResourceDiscovery; readonly resourceResolver: ResourceResolver; readonly resourceContentDecoratorBuilder: ResourceContentDecoratorBuilder;

readonly resourceContentDecoder: ResourceContentDecoder; } ``` The interface will grow as additional long-lived services migrate into the Composition Root.

---

# Purpose of ApplicationContext

`ApplicationContext` is the stable dependency surface produced by the Composition Root. It answers:

> Which long-lived application capabilities were composed for this running application instance?

It is not intended to become a global service locator. That distinction is critical.

---

# ApplicationContext Is Not a Service Locator

Arbitrary TypeScript classes should not import a global context and fetch their own dependencies. Avoid:

```ts
class BibleChapterService {
    async get(...) {
        const client =
            applicationContext.resourceClient;
    }
}
```

Prefer constructor injection:

```ts
class BibleChapterService {
    constructor(
        private readonly resourceDiscovery:
            ResourceDiscovery
    ) {}
}
```

The Composition Root creates the service:

```ts
const chapterService =
    new BibleChapterService(
        resourceDiscovery
    );
```

Dependencies flow downward. They are not pulled from a registry.

---

# Dependency Direction

The target dependency direction is:

```mermaid
flowchart TD

Root["Application Composition Root"] AppService["Application Service"] Domain["Domain Service"] Resource["Resource Service"] Infrastructure["Infrastructure"] Root --> AppService Root --> Domain Root --> Resource Root --> Infrastructure AppService --> Domain Domain --> Resource Resource --> Infrastructure ``` The exact relationships vary by capability, but the Composition Root is where concrete implementations meet abstractions.

---

# No Dependency-Injection Framework

The implementation intentionally avoids a DI framework. No framework is required to write:

```ts
const signer =
    new NostrSigner();

const resourceClient = createBrowserResourceClient( signer ); const resourceDiscovery = new ResourceDiscovery( resourceClient ); ``` Plain constructor arguments provide:

* explicit dependencies,
* compile-time checking,
* easy test substitution,
* and obvious object ownership.

Adding a container would currently add indirection without solving a problem that plain TypeScript cannot solve cleanly.

---

# No File-Level Singleton Requirement

Historically the repository frequently used patterns such as:

```ts
export const chapterService =
    new ChapterService();
```

or:

```ts
export let localStorageService =
    new LocalStorage();
```

These objects are created as a side effect of module import. The target Composition Root moves long-lived application service construction away from this pattern. Eventually:

```text
import module
    ≠
create running application service
```

Imports should primarily define code. The Composition Root should create the running object graph.

---

# Incremental Migration

The application is not being rewritten all at once. Existing global singleton services may remain while individual owners are migrated. The migration rule is:

> New architecture-aware dependencies should be composed explicitly; existing services migrate when their implementation phase reaches them.

This avoids a large mechanical rewrite unrelated to the current Resource work.

---

# Current Composition Root Responsibilities

The Composition Root currently owns the construction of the new Resource infrastructure developed during the Resource implementation work. This includes:

* `NostrSigner`,
* browser `ResourceClient`,
* Resource Discovery,
* Resource Resolution,
* content-representation resolution,
* the Resource content decorator builder,
* JSON Resource content decoding,
* and `ResourceContentDecoder`.

The set will expand during later implementation phases.

---

# Resource Composition

The current Resource dependency graph resembles:

```mermaid
flowchart TD

Application["Application"] Signer["NostrSigner"] Client["ResourceClient"] Discovery["ResourceDiscovery"] Resolver["ResourceResolver"] ContentResolver["ContentRepresentationResolver"] Builder["ResourceContentDecoratorBuilder"] Json["JsonResourceContentDecorator"] Decoder["ResourceContentDecoder"] Application --> Signer Application --> Client Application --> Discovery Application --> Resolver Application --> Builder Application --> Decoder Signer --> Client Client --> Discovery ContentResolver --> Resolver Json --> Builder Builder --> Decoder ```

This graph is constructed once for the running application.

---

# Nostr Signer Construction

The Composition Root creates one long-lived:

```text
NostrSigner
```

The signer exists even when no authenticated user session has been restored. This is intentional. Public Resource reads should be available without requiring a Resource Client rebuild after login. Conceptually:

```text
construct application
    ↓
create NostrSigner
    ↓
create ResourceClient with signer
    ↓
public read capability exists
    ↓
restore/configure login later
    ↓
same signer becomes able to sign
```

---

# Signer State vs Application State

The signer owns signing mechanics. The application/login layer owns persisted login choice and restoration. For example, application-level ownership includes:

* which login method was selected,
* persisted nsec/session choice when applicable,
* NIP-07 provider acquisition,
* persisted NIP-46 connection details,
* persisted NIP-46 client secret,
* and authorization-flow presentation.

The signer should not become the application session store.

---

# NIP-07 Startup Boundary

For NIP-07, the browser application owns access to:

```text
window.nostr
```

The application may then configure the long-lived signer with the provider. The signer itself should not reach into global application state to decide whether NIP-07 is the active login method. This keeps browser/session policy above signing infrastructure.

---

# NIP-46 Startup Boundary

For NIP-46, startup may restore persisted remote-signing information. The application owns the persisted session material. The signer owns the active remote-signing mechanism. The lifecycle is conceptually:

```text
startup reads persisted NIP-46 state
        ↓
application configures NostrSigner
        ↓
NostrSigner establishes active signing mechanism
```

The UI remains responsible for presenting any authorization URL or user interaction required by the NIP-46 flow.

---

# Resource Client Construction

The Composition Root creates the browser Resource Client using the long-lived signer. Conceptually:

```ts
const nostrSigner =
    new NostrSigner();

const resourceClient = createBrowserResourceClient( nostrSigner ); ``` The browser Resource Client internally creates:

* the verification client,
* the verification Worker,
* the rx-nostr instance,
* the configured verifier,
* the configured signer,
* NIP-42 automatic authentication,
* connection strategy,
* retry behavior,
* and operation timeouts.

Those details remain infrastructure responsibilities. The Application only owns construction and lifetime.

---

# Verification Worker Startup

The Resource Client starts its verification client during composition. The verification library provides a main-thread verification fallback while the Worker becomes active. Therefore application startup deliberately does **not** do this:

```text
create worker
    ↓
wait until worker status = active
    ↓
allow application startup to continue
```

Instead:

```text
create ResourceClient
    ↓
verification client starts
    ↓
application continues
```

Verification remains available through the library fallback. This keeps an optimization from becoming a readiness dependency.

---

# Relay Configuration

Relay configuration belongs to startup coordination because the running application needs to establish the relay set used by Resource operations. The Resource Client exposes:

```ts
setDefaultRelays(...)
```

The Application determines which configured relay values should be applied. Conceptually:

```ts
resourceClient.setDefaultRelays(
    config.relays
);
```

The Application chooses configuration. The Resource Client owns the rx-nostr relay mechanics.

---

# Application Configuration

Static/environment startup values belong under:

```text
src/lib/application/config/
    application.config.ts
```

The configuration boundary may include values such as:

* default relay definitions,
* environment-specific endpoints,
* application publisher configuration,
* or other boot-time constants.

Configuration should describe values. It should not construct infrastructure services itself.

---

# Configuration vs Runtime State

Configuration and runtime state are different. Configuration includes values known before the application starts. Runtime state includes values discovered or restored during startup. For example:

```text
default relay URLs
    → configuration

currently authenticated pubkey → runtime state persisted login method → restored application state active Workspace → runtime state ``` Keeping them separate prevents `application.config.ts` from becoming a second service container.

---

# Resource Discovery Construction

The Composition Root connects Resource Discovery to the Resource Client. Conceptually:

```ts
const resourceDiscovery =
    new ResourceDiscovery(
        resourceClient
    );
```

This dependency is explicit. `ResourceDiscovery` does not import a global Resource Client singleton.

---

# Resource Resolution Construction

The Composition Root constructs representation-specific Resource resolvers and supplies them to the generic `ResourceResolver`. Current composition resembles:

```ts
const contentRepresentationResolver =
    new ContentRepresentationResolver();

const resourceResolver = new ResourceResolver([ contentRepresentationResolver ]); ``` Future startup composition may add:

```text
DescriptorRepresentationResolver
DescriptorsRepresentationResolver
```

without changing ResourceResolver's public role.

---

# Resource Content Decoder Construction

The Composition Root constructs the generic content decorator registry. Current registration includes:

```text
application/json
    → JsonResourceContentDecorator
```

Conceptually:

```ts
const resourceContentDecoratorBuilder =
    new ResourceContentDecoratorBuilder([
        {
            token:
                'application/json',

decorate: (inner) => new JsonResourceContentDecorator( inner ) } ]); ``` The decoder then receives the builder:

```ts
const resourceContentDecoder =
    new ResourceContentDecoder(
        resourceContentDecoratorBuilder
    );
```

Later gzip or hex support is added by composition rather than by rewriting the decoder.

---

# Composition Is the Extension Point

The Composition Root is where supported implementations are selected. Examples:

```text
Resource representation support
    → register representation resolver

Resource encoding support → register content decorator Domain interpretation support → later register/select Resource Type interpreter ``` This keeps extension decisions visible in one place.

---

# Svelte Integration

Svelte is the presentation framework around the running application. Svelte should not itself become the dependency-construction mechanism. The preferred boundary is:

```text
Svelte root layout
    ↓
construct Application
    ↓
provide ApplicationContext
    ↓
call Application.start()
    ↓
render application subtree
```

This allows the core application composition to remain plain TypeScript.

---

# Why the Root Layout Is Preferred

The Composition Root belongs at the highest stable browser component boundary. For the SvelteKit SPA, that is preferably:

```text
+layout.svelte
```

rather than:

```text
+page.svelte
```

The distinction matters because `+page.svelte` already owns significant Workspace Runtime implementation behavior. Moving application composition into the root layout prevents startup infrastructure and Workspace logic from continuing to accumulate in the same component.

---

# Svelte Context

The Svelte component tree may access long-lived dependencies through Svelte context. Svelte context is:

* scoped to a component subtree,
* established by a parent component,
* and retrieved by descendants.

It is not a global application registry. Conceptually:

```ts
setContext(
    APPLICATION_CONTEXT_KEY,
    application.context
);
```

Descendants may use a small helper around:

```ts
getContext(...)
```

for UI integration. Plain TypeScript services continue using constructor injection.

---

# Svelte Context Must Be Established Synchronously

A critical Svelte constraint is that `setContext()` belongs to component initialization. Therefore the application context must be available before awaiting startup. Correct conceptual ordering:

```ts
const application =
    new Application(config);

setContext( APPLICATION_CONTEXT_KEY, application.context ); onMount(() => { // asynchronous start happens here }); ``` Avoid:

```ts
onMount(async () => {
    const application =
        await createApplication();

setContext(...); }); ``` That makes Svelte context creation depend on asynchronous mount timing and violates the intended initialization boundary.

---

# Stable Context Before Readiness

The object references inside `ApplicationContext` exist before startup is complete. That does not mean every capability is fully initialized. For example:

```text
ResourceClient object exists
    before
relay operations necessarily succeed
```

or:

```text
NostrSigner object exists
    before
persisted authentication is restored
```

The context represents the application object graph. Readiness represents completion of required startup work. These concepts should not be conflated.

---

# Root Layout Startup Pattern

A representative Svelte startup pattern is:

```svelte
<script lang="ts">
    import {
        onMount,
        setContext
    } from 'svelte';

import { Application } from '$lib/application/runtime/application'; import { APPLICATION_CONTEXT_KEY } from '$lib/application/runtime/application-context'; import { applicationConfig } from '$lib/application/config/application.config'; const application = new Application( applicationConfig );

setContext( APPLICATION_CONTEXT_KEY, application.context ); let ready = $state(false); let startupError = $state<unknown>(); onMount(() => { let disposed = false; const start = async () => { try { await application.start();

if (!disposed) { ready = true; } } catch (error) { if (!disposed) { startupError = error; } } }; void start(); return () => { disposed = true; application.dispose(); }; }); </script> ``` This is the preferred lifecycle shape.

The exact state syntax may evolve with the Svelte version and UI needs.

---

# Why onMount Is Not async

Avoid:

```ts
onMount(async () => {
    await application.start();

return () => { application.dispose(); }; }); ``` An async function returns a Promise rather than a synchronous cleanup callback. Instead, `onMount()` should remain synchronous and invoke an inner async function. This preserves Svelte teardown semantics.

---

# Cleanup Ownership

The root component that owns the `Application` instance should dispose it when that application instance ends. Conceptually:

```text
root component created
    ↓
Application created
    ↓
Application.start()
    ↓
running application
    ↓
root teardown
    ↓
Application.dispose()
```

This provides one explicit lifetime boundary for application-owned infrastructure.

---

# Application Disposal

`Application.dispose()` coordinates cleanup of long-lived objects created by the Composition Root. Examples include:

* Resource Client disposal,
* verification-worker termination through Resource Client disposal,
* active signer cleanup,
* remote NIP-46 connection cleanup,
* future background workers,
* future long-lived subscriptions,
* and other application-scoped resources.

Each subsystem should still own the mechanics of its cleanup. The Application calls the appropriate disposal operations because it owns their lifetime.

---

# Resource Client Disposal

The browser Resource Client owns the verification client it creates. Disposing Resource Client therefore disposes verification infrastructure and terminates the verification Worker. The Application does not terminate the Worker directly. The lifetime chain is:

```text
Application
    owns ResourceClient
        owns VerificationServiceClient
            owns Worker
```

Cleanup should follow the same ownership chain.

---

# Signer Disposal

The Application also owns the long-lived signer instance. Signer disposal may:

* clear locally held secret key bytes,
* close an active NIP-46 signer/connection,
* and release signer-specific resources.

NIP-07 requires no equivalent owned connection cleanup when the browser extension owns the provider.

---

# Startup Readiness

The architectural definition remains:

> The application is ready when the user can interact with the restored or initial Workspace.

Implementation readiness should therefore track the minimum blocking startup sequence rather than the completion of every possible asynchronous activity.

---

# Blocking Startup Work

Blocking startup work is work without which the application cannot correctly present its initial interactive state. Likely examples include:

* opening required local persistence,
* restoring required application settings,
* creating/restoring the initial Workspace Runtime,
* and establishing the minimum state needed by the initial Module.

As implementation moves into the Composition Root, each step should be explicitly classified as blocking or deferred.

---

# Non-Blocking Startup Work

The following generally should not become readiness gates merely because they are asynchronous:

* verification-worker optimization becoming active,
* successful relay connection to every configured relay,
* Resource refresh,
* optional Resource installation,
* search-index rebuilding,
* Outbox publishing,
* synchronization convergence,
* and other maintenance tasks.

These belong to infrastructure fallback or Background Processing where possible.

---

# Authentication and Readiness

Authentication failure does not automatically prevent the locally available application from becoming interactive. The architecture explicitly allows startup to degrade when authentication or remote capabilities are unavailable. This supports offline-first behavior. A user may still be able to:

* read installed Bible data,
* use local notes,
* restore Workspace state,
* and interact with other installed Domain Objects

without successful remote authentication.

---

# Public Resource Reads Before Login

The long-lived signer / Resource Client construction was designed specifically so public Resource reads are not coupled to login reconstruction. Conceptually:

```text
Application construction
    ↓
ResourceClient available
    ↓
public Nostr reads available
```

Authentication later adds signing capability to the existing signer. The Resource Client remains the same object.

---

# Relay Availability and Readiness

Relay failure should not automatically fail application startup when locally authoritative data is available. ResourceClient already distinguishes:

```text
normal absence
```

from:

```text
transport unavailable
```

Startup and later application services can therefore degrade appropriately instead of converting all remote failures into fatal startup failures.

---

# Offline Startup

The startup implementation should preserve normal operation while offline whenever the necessary Domain Objects are already installed. Conceptually:

```text
start application
    ↓
open local persistence
    ↓
restore settings/workspace
    ↓
remote services unavailable
    ↓
continue with installed local state
```

Remote Resource discovery and synchronization can resume when connectivity returns.

---

# Startup Error Categories

Not all startup failures should be handled identically. At a minimum, implementation should distinguish conceptually between:

```text
critical local startup failure
    vs
optional remote capability failure
```

A critical local failure may prevent the application from constructing a valid interactive Workspace. A relay or authentication failure generally should not when local state remains usable.

---

# Avoid Catch-and-Ignore Startup

Startup should not become:

```ts
try {
    await everything();
} catch {
    // ignore
}
```

That hides which application capability failed. Instead, startup coordination should either:

* propagate a genuinely fatal error,
* isolate an optional subsystem failure,
* or record/surface the degraded capability appropriately.

The owning subsystem should retain useful diagnostic information.

---

# Workspace Runtime Boundary

The Composition Root will eventually construct or obtain the long-lived Workspace Runtime services required by the application. However, Workspace Runtime behavior remains separate. Startup may say:

```text
initialize Workspace Runtime
```

but the Runtime still owns:

* Pane-tree state,
* Buffer assignment,
* Module Instance placement,
* layout operations,
* selection/focus coordination,
* and Workspace persistence semantics.

The Application coordinates initialization. It does not become the Workspace Runtime.

---

# Current +page.svelte Migration

The current application historically performs significant Workspace management in:

```text
+page.svelte
```

This includes event-driven operations such as:

* close Pane,
* split Pane,
* replace Buffer,
* reorganize the Pane tree,
* and restore runtime state.

That code is not discarded merely because the Composition Root now exists. The migration is incremental. The desired end state is:

```text
+layout.svelte
    → application composition / lifecycle boundary

+page.svelte → Workspace presentation host Workspace Runtime services → own Workspace operations ```

---

# Composition Root Does Not Replace Workspace Runtime

A common mistake would be to move all root-component logic into `Application` simply because `Application` is now the startup owner. That would recreate the same coupling in a TypeScript class. The Application should coordinate:

```text
workspaceRuntime.start(...)
```

or equivalent behavior. It should not implement:

```text
splitPane()
deletePane()
replaceBuffer()
calculateGrid()
```

Those remain Runtime responsibilities.

---

# Settings Boundary

Persisted settings should be available early enough that the initial interface reflects the user's preferences. Startup may coordinate settings restoration. The settings subsystem still owns:

* settings models,
* persistence format,
* validation,
* and change behavior.

Application startup should consume that capability rather than duplicate it.

---

# Local Persistence Boundary

Opening required persistence is a startup concern. Database implementation is not. The desired dependency is:

```text
Application.start()
    ↓
Persistence capability.open()
```

not:

```text
Application.start()
    ↓
raw IndexedDB transaction logic
```

The Composition Root connects the application to the persistence implementation. The persistence owner manages the database mechanics.

---

# Background Processing Boundary

Background Processing begins after the application has reached its usable state, except for any narrowly required recovery step that the architecture identifies as blocking. Conceptually:

```text
await blocking startup
        ↓
application ready
        ↓
start background processing
```

Background work may include:

* Resource refresh,
* deferred installation,
* Outbox retry,
* synchronization,
* derived-data maintenance,
* and search indexing.

The Application coordinates the transition into background operation. The background subsystem owns the work itself.

---

# Startup Must Not Await Convergence

Avoid:

```text
Application.start()
    waits for all sync
    waits for all Resources
    waits for all relays
    waits for all indexes
    waits for Outbox empty
    then renders UI
```

That would violate the offline-first startup architecture. The application should restore a usable local state first and converge afterward.

---

# Browser-Only Application

KJVOnly is a browser-only SPA. The startup implementation may therefore use browser capabilities such as:

* IndexedDB,
* localStorage,
* Web Workers,
* WebSockets,
* browser extension APIs,
* and DOM-integrated presentation services.

There is no server-side rendering startup path to maintain. This simplifies Composition Root ownership.

---

# Browser Infrastructure Should Still Be Isolated

Browser-only does not mean every service should directly reach into browser globals. Prefer explicit boundaries such as:

```text
Application
    obtains NIP-07 provider
        ↓
configures NostrSigner
```

rather than:

```text
NostrSigner
    globally reads window.nostr whenever it wants
```

Similarly, infrastructure factories may own Worker creation while application code owns their lifetime.

---

# Construction vs Browser Side Effects

Construction may create long-lived browser infrastructure where the implementation requires it, such as the Resource Client verification service. But asynchronous application state restoration remains in `start()`. The important rule is not "constructors may never create browser objects." The important rule is:

> Object graph construction must remain predictable, and asynchronous application readiness work must remain explicit.

---

# Startup Idempotence

`Application.start()` should be treated as the lifecycle transition for one Application instance. Normal application code should call it once. If later implementation requires protection against duplicate calls, the Application may track startup state explicitly. For example:

```text
created
starting
started
disposed
```

This state machine should be introduced only if duplicate-start or lifecycle race behavior becomes a real concern. Do not add lifecycle ceremony merely for stylistic completeness.

---

# Disposal After Failed Startup

If startup fails after some infrastructure has been constructed, the Application object still owns that infrastructure. Root teardown should therefore still call:

```ts
application.dispose();
```

This ensures partially started browser resources are not leaked. The exact rollback of individual startup steps belongs to the subsystem that created mutable state.

---

# Application Context Helpers

Svelte components may use a small helper such as:

```ts
export function getApplicationContext():
    ApplicationContext {

return getContext( APPLICATION_CONTEXT_KEY ); } ``` This helper is appropriate at the Svelte presentation boundary. It should not be imported into arbitrary Domain or Resource classes as a substitute for constructor injection.

---

# UI Dependency Access

A Svelte Module component may retrieve an application capability from context because the component itself is constructed by Svelte rather than by the Composition Root. Conceptually:

```text
Svelte component
    ↓
getApplicationContext()
    ↓
application service
```

That is different from a plain TypeScript service performing service location. The UI framework boundary is exactly where Svelte context is useful.

---

# Future Domain Composition

As Domain implementation is migrated, the Composition Root should eventually construct long-lived Domain services as well. Conceptually:

```text
Application
    ├── Bible Domain services
    ├── Notes Domain services
    ├── Reading Plans Domain services
    ├── shared Application Services
    ├── Resource services
    └── Technical Infrastructure
```

This does not mean every small object must be application-scoped. Only dependencies whose ownership/lifetime makes sense at the application level belong in the root graph.

---

# Transient Objects

The Composition Root should not become a factory for every short-lived object in the codebase. Examples of objects that may remain locally constructed include:

* request-local values,
* candidate Domain Objects,
* parser-local helpers,
* view-local navigation objects,
* short-lived operation contexts,
* and immutable data values.

The Composition Root is for application composition, not universal object creation.

---

# Long-Lived Objects

Likely Composition Root candidates are objects with one or more of these properties:

* application lifetime,
* expensive infrastructure ownership,
* connection lifecycle,
* shared mutable state,
* cross-feature coordination,
* dependency graph significance,
* or explicit startup/disposal behavior.

Examples include:

* ResourceClient,
* NostrSigner,
* Workspace Runtime,
* background coordinator,
* Domain stores/services,
* and shared application services.

---

# Composition Root and Tests

Explicit construction improves testing because tests can instantiate a dependency with controlled collaborators. For example:

```ts
const discovery =
    new ResourceDiscovery(
        fakeResourceClient
    );
```

No module-level global Resource Client must be replaced. Likewise, the Resource Client factory already accepts dependencies useful for testing infrastructure composition.

---

# Startup Unit Testing

Startup tests should focus on application coordination rather than retesting subsystem internals. Useful tests may eventually prove:

* required startup operations occur in order,
* optional remote failure does not prevent readiness,
* fatal local initialization failure is propagated,
* background work begins only after the readiness boundary,
* and dispose delegates to owned long-lived dependencies.

Do not duplicate the Resource Client's browser integration tests inside Application tests.

---

# Browser Integration Testing

Browser-specific infrastructure is tested at its own boundary. Current Resource Client browser tests already prove:

* real Worker loading,
* event verification,
* real browser WebSockets,
* real signing,
* relay publication,
* and relay retrieval.

Application startup tests do not need to mock those internals merely to prove the Composition Root calls the Resource Client factory correctly.

---

# Startup Smoke Test

A useful application-level browser smoke test is simply:

```text
construct Application
    ↓
provide context
    ↓
start Application
    ↓
initial application renders
    ↓
no startup exception
```

This proves the composed graph remains valid as migrations continue. The current application has already been manually exercised after the new Composition Root wiring and continues to boot.

---

# No Hidden Startup Through Imports

New code should avoid patterns where importing a module performs application initialization. For example, avoid:

```ts
export const client =
    createBrowserResourceClient(...);
```

at module scope for application-scoped infrastructure. Prefer:

```ts
export function createBrowserResourceClient(...) {
    ...
}
```

and call it from the Composition Root. This keeps startup explicit.

---

# No Parallel Composition Roots

Feature modules should not begin creating their own independent copies of application infrastructure. Avoid:

```text
Bible module
    creates ResourceClient A

Notes module creates ResourceClient B Plans module creates ResourceClient C ``` The application should normally share one long-lived Resource Client unless a concrete isolation requirement says otherwise. The Composition Root makes that ownership visible.

---

# No Generic Service Registry

Avoid turning `ApplicationContext` into:

```ts
Map<string, unknown>
```

or:

```ts
resolve<T>(name: string): T
```

Explicit properties preserve:

* TypeScript discoverability,
* dependency visibility,
* refactoring support,
* and architectural ownership.

A generic registry would recreate a DI container without the benefits of explicit composition.

---

# No Svelte-Specific Core Services

The Application Composition Root is plain TypeScript. Core Resource and Domain services should remain usable without Svelte. Svelte context is merely how the UI receives the already-composed application dependencies. This keeps framework concerns at the presentation boundary.

---

# Startup Sequence as the Migration Continues

The startup sequence will grow as existing application responsibilities are moved to their final owners. A likely target flow is:

```text
1. Construct application graph

2. Open required local persistence 3. Restore application settings 4. Configure Resource relay defaults 5. Restore authentication/signing state

6. Initialize Domain services requiring local state 7. Restore or create Workspace Runtime 8. Establish initial Pane / Buffer / Module state 9. Mark application interactive

10. Begin Background Processing
```

The exact ordering should be determined by real dependency requirements during implementation. The sequence above is not permission to invent dependencies before they exist.

---

# Blocking and Deferred Classification

As each new startup step is migrated, document whether it is:

```text
blocking
```

or:

```text
deferred
```

A blocking step contributes to the readiness promise. A deferred step belongs after readiness or behind a fallback. This prevents the startup path from slowly accumulating unnecessary waits.

---

# Example Readiness Classification

Conceptually:

```text
Open required IndexedDB
    blocking

Restore Workspace snapshot blocking if required for initial presentation Load theme/settings blocking or immediate local read Verification Worker reaches active deferred / fallback exists Connect every relay deferred

Refresh installed Resources deferred Rebuild optional search indexes deferred Publish pending Outbox deferred ``` The classification should follow application usability, not implementation convenience.

---

# Startup and Resource Installation

Resource installation is not automatically part of startup. Startup may initiate or resume installation work where necessary. The Resource installation subsystem owns:

* candidate interpretation,
* Domain validation,
* installation policy,
* and accepted-state persistence.

The Application should not reimplement those steps inside `start()`.

---

# Startup and Resource Discovery

Likewise, startup may decide **when** discovery should begin. Resource Discovery owns **how** Resources are discovered. Conceptually:

```text
Application startup
    ↓
request discovery / background refresh
    ↓
ResourceDiscovery
```

The Application should not construct raw Nostr filters for Resource identities itself.

---

# Startup and Outbox

Future startup may resume pending Outbox publication. The desired relationship is:

```text
Application becomes usable
    ↓
Background Processing resumes Outbox
```

Startup should not block until the Outbox is empty. Publication remains independently retryable.

---

# Startup and Synchronization

Synchronization should similarly converge after startup. Avoid coupling readiness to:

```text
remote state fully synchronized
```

The local Domain stores remain authoritative for the running application. Remote updates are proposals processed through the normal installation/synchronization policy.

---

# Startup and Application State Restoration

Application state restoration is distinct from Resource synchronization. Examples of application state include:

* current Bible location,
* Pane tree,
* Buffer state,
* theme,
* dark mode,
* and future named Workspace snapshots.

This state should be restored from local persistence without requiring a relay round trip.

---

# Current Workspace Persistence Context

The current application already persists runtime information such as:

* Pane tree,
* last Bible location reference,
* color theme,
* and dark mode

through local browser storage. As Workspace Runtime implementation is migrated, restoration of this state should move behind the Runtime/application startup boundary rather than remain scattered through presentation components.

---

# Initial Module Selection

Startup must eventually choose the initial Workspace content. That may come from:

* restored Workspace state,
* last active session,
* a configured application default,
* or a first-run policy.

The Application coordinates selection policy. The Workspace Runtime owns the resulting Runtime Objects. No permanent route-based startup model is required because the application is pane-driven rather than route-driven.

---

# SPA Routing Context

KJVOnly uses a single browser application route for normal operation. The visible application is driven by:

```text
Workspace
    ↓
Pane
    ↓
Buffer
    ↓
Module Instance
```

Startup therefore initializes application/runtime state rather than navigating to a sequence of pages. This should remain reflected in startup diagrams and implementation.

---

# Startup Does Not Own Rendering

The Application may expose readiness state to the root component. Rendering remains Svelte's responsibility. Conceptually:

```text
Application.start()
    ↓
ready
    ↓
Svelte presents Workspace
```

`Application` should not manipulate DOM nodes or render Modules directly.

---

# Startup Does Not Own Domain Behavior

Similarly, `Application.start()` may initialize a Domain service, but it should not execute Domain business rules itself. Avoid:

```text
Application.start()
    calculates reading-plan progression
    merges notes
    validates Chapter verses
```

Those responsibilities belong to their Domains.

---

# Startup Does Not Own Nostr Mechanics

The Application configures the Resource Client and signer. It does not own:

* rx-nostr requests,
* WebSocket reconnection,
* NIP-42 challenge handling,
* event verification algorithms,
* or relay acknowledgement streams.

Those remain inside the Resource Client infrastructure.

---

# Startup Does Not Own Resource Content Decoding

The Application constructs:

```text
ResourceContentDecoratorBuilder
ResourceContentDecoder
```

but does not decode content itself. This distinction between composition and behavior should remain consistent throughout the application.

---

# Explicit Ownership Table

| Concern | Owner | Startup Role | | --- | --- | --- | | Object graph | Application Composition Root | Construct | | Application context | Application | Expose | | Svelte context | Root Svelte layout | Provide to UI subtree | | Local DB mechanics | Persistence infrastructure | Initialize when coordinated | | Workspace tree | Workspace Runtime | Restore/create when coordinated | | Pane rendering | Rendering layer | Render after runtime exists | | Relay mechanics | ResourceClient / rx-nostr | Configure defaults | | Event signing | NostrSigner | Restore/configure signing mode | | Nostr verification | ResourceClient crypto infrastructure | Construct/start; do not wait for Worker optimization | | Resource discovery | ResourceDiscovery | Start/request when appropriate | | Resource resolution | ResourceResolver | Construct only | | Content decoding | ResourceContentDecoder | Construct only | | Domain behavior | Domains | Initialize services if required | | Installation | Resource/Domain installation workflow | Resume/request, do not implement inline | | Background maintenance | Background Processing | Begin after readiness |

---

# Anti-Patterns

The following patterns should be avoided as startup implementation evolves.

## Async Application Construction Before Svelte Context

```ts
const application =
    await createApplication();

setContext(...); ``` Prefer synchronous composition plus asynchronous `start()`.

## onMount(async ...)

Do not make the Svelte mount callback itself async when a cleanup callback is required. Use an inner async function.

## File-Level Infrastructure Singleton

```ts
export const resourceClient =
    createBrowserResourceClient(...);
```

Application-scoped infrastructure should be created by the Composition Root.

## Service Locator

```ts
getApplicationContext()
```

inside plain TypeScript Domain/Resource services is a dependency smell. Use constructor injection.

## Waiting for Every Remote Capability

Do not block readiness on:

* every relay,
* every Resource,
* every sync,
* every index,
* or successful authentication.

## Putting Workspace Operations in Application

The Composition Root should not become a replacement `+page.svelte` containing Pane algorithms.

## Recreating Infrastructure per Module

Do not create separate Resource clients, signers, or worker infrastructure for each visible Module instance.

## Hidden Construction Through Import

Importing a feature should not unexpectedly open sockets or create Workers.

---

# Current Implementation Achievement

The first Composition Root migration phase is complete. The application now has an explicit place to construct the new Resource infrastructure. The new Resource stack can be composed without depending on the older file-level singleton pattern. The application continues to boot with this wiring in place.

This proves the Composition Root can be introduced incrementally rather than requiring a whole-application rewrite.

---

# Current Resource Dependencies in ApplicationContext

The current Resource work has established long-lived application dependencies equivalent to:

```text
NostrSigner
ResourceClient
ResourceDiscovery
ResourceResolver
ResourceContentDecoratorBuilder
ResourceContentDecoder
```

These dependencies represent the completed generic Resource implementation through decoded Resource content. Later phases will add Domain interpretation and installation services as their boundaries settle.

---

# Future Composition Root Migration

The long-term direction is for all appropriate application-scoped services to be created from the Composition Root. Migration should remain incremental. A reasonable progression is:

```text
Resource infrastructure
    ↓
Resource lifecycle services
    ↓
Bible Domain services
    ↓
shared Application Services
    ↓
Workspace Runtime
    ↓
remaining Domain services
    ↓
background coordinators
```

The actual order should follow implementation work and dependency pressure.

---

# Migration Rule

Do not move a service into the Composition Root merely to make the directory tree look complete. Move it when:

* its owner is clear,
* its dependencies are understood,
* its public API is stable enough,
* and the migration improves explicit composition.

This preserves the architecture-first migration style used elsewhere in the project.

---

# Future Application Composition Document Split

If startup and general dependency composition become large enough to deserve separate documents later, the split should be:

```text
Application Composition
    → how the long-lived object graph is constructed

Application Startup → how the constructed graph transitions to ready state ``` At the current implementation stage they are tightly related enough to document together because the Composition Root was introduced specifically to clean up startup and service construction.

---

# Complete Startup Flow

The target implementation flow can be summarized as:

```mermaid
sequenceDiagram

participant Svelte as Root Layout participant App as Application participant Context as ApplicationContext participant Local as Local Persistence participant Auth as Authentication / Signer participant Resource as Resource Infrastructure participant Runtime as Workspace Runtime participant BG as Background Processing Svelte->>App: new Application(config) App->>Resource: construct signer/client/resource services App-->>Svelte: stable ApplicationContext Svelte->>Context: setContext(context) Svelte->>App: start() App->>Local: open/restore required local state App->>Resource: configure runtime relay settings App->>Auth: restore/configure login state App->>Runtime: restore/create Workspace Runtime-->>App: initial runtime ready App-->>Svelte: startup resolved / interactive App->>BG: begin deferred work

Note over Resource: Worker verification may become active independently Note over BG: synchronization/refresh do not block readiness ```

---

# Simplified Responsibility Flow

```text
+layout.svelte
    │
    ├── construct Application
    │
    ├── setContext(application.context)
    │
    └── onMount
            │
            ├── application.start()
            │
            └── cleanup → application.dispose()

Application │ ├── constructs long-lived graph │ ├── coordinates startup order │ └── coordinates application lifetime Subsystems │ └── own their actual behavior ```

---

# Key Implementation Principles

The startup implementation should preserve these rules.

## One Composition Root

Long-lived application dependencies are connected in one explicit place.

## Synchronous Construction

The stable `ApplicationContext` exists immediately after `new Application(...)`.

## Asynchronous Startup

Initialization work requiring awaits belongs in `Application.start()`.

## Sequential Coordination

Startup order should remain readable like a main method.

## Constructor Injection

Plain TypeScript services receive their collaborators explicitly.

## Svelte Context Only at the UI Boundary

Svelte descendants may retrieve application capabilities from context; core services do not service-locate.

## Application Owns Lifetime, Not Behavior

The Application constructs and coordinates subsystems without absorbing their internal responsibilities.

## Local Readiness Before Remote Completeness

The app should become usable from locally authoritative state whenever possible.

## Background Work After Readiness

Synchronization and maintenance should not become unnecessary startup gates.

## Cleanup Mirrors Ownership

Objects created for the Application lifetime are disposed through that same lifetime boundary.

---

# Next Implementation Work

The Composition Root itself is now established enough to support the next Resource phases. The immediate Resource implementation work can continue with:

```text
DecodedResourceContent
    ↓
BibleChapterInterpreter
    ↓
Candidate Chapter
    ↓
Domain Validation
    ↓
Installation Decision
```

As those services become long-lived application dependencies, the Composition Root should create and expose them through the appropriate application/domain boundaries. Separately, existing Workspace startup logic can continue migrating out of Svelte root files when that implementation phase begins.

---

# Key Takeaways

Application startup now has a concrete implementation boundary:

```text
Application Composition Root
```

The root constructs the running application's long-lived dependency graph. It makes that graph available synchronously through:

```text
ApplicationContext
```

Svelte provides that context synchronously to the component tree. Then:

```text
Application.start()
```

performs ordered asynchronous initialization. When the application ends:

```text
Application.dispose()
```

releases application-owned infrastructure. The important separation is:

```text
Composition
    = create and connect objects

Startup = initialize the constructed application Runtime = ongoing application behavior Background Processing = deferred maintenance after readiness ``` This keeps initialization visible, dependencies explicit, Svelte focused on presentation, browser infrastructure properly owned, and the application free from a dependency-injection framework or hidden service-locator model.

The implementation is intentionally incremental. The new Resource stack already uses this Composition Root successfully, while older application services can migrate into the same pattern as their own implementation boundaries are revised.
