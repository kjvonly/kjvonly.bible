# Authentication Implementation

**Status:** Current
**Area:** Application / Nostr Infrastructure

---

# Purpose

This document describes the current KJVOnly.bible authentication implementation.

The implementation separates generic application authentication state from Nostr-specific credential handling and signing.

The central rule is:

> Application code consumes `AuthenticationService`; Nostr credential interpretation and signing stay behind the authentication strategy and signer infrastructure.

The current ownership model is:

```text
+layout.svelte
    ↓ restore saved login
AuthenticationService
    ↓
AuthenticationStrategy
    ↓
NostrAuthenticationStrategy
    ↓
NostrSigner

Application
    ├── owns NostrSigner privately
    ├── owns AuthenticationService
    ├── owns NostrClient using the same signer
    └── exposes AuthenticationService through ApplicationContext
```

Authentication state and signer state are related, but they are not the same abstraction.

---

# Scope

This document covers:

- application authentication state,
- `AuthenticationStrategy`,
- `AuthenticationService`,
- `NostrAuthenticationStrategy`,
- saved-login restoration,
- nsec login,
- NIP-07 restoration,
- NIP-46 restoration,
- npub read-only restoration,
- `NostrSigner`,
- startup ordering,
- account loading after authentication,
- fresh account setup,
- relationship to Nostr transport and publication,
- shutdown,
- error behavior,
- testing and extension rules.

This document does not define account/profile state in detail, relay preference policy, Resource synchronization, or Outbox internals.

---

# Application Authentication Contract

Application-facing authentication contracts live under:

```text
src/lib/application/services/authentication/
```

The Application layer models only generic authentication state.

## AuthenticationState

```ts
type AuthenticationState =
    | {
        status: 'signed-out';
    }
    | {
        status: 'authenticated' | 'read-only';
        userId: string;
    };
```

The Application layer does not expose Nostr login modes such as:

```text
nsec
npub
nip07
nip46
```

Those are infrastructure details.

For the current Nostr implementation, `userId` is the user's hex public key.

Application consumers treat it as an application identity value rather than decoding how it was obtained.

---

# AuthenticationResult

Authentication strategies return:

```ts
interface AuthenticationResult {
    readonly status:
        'authenticated' |
        'read-only';

    readonly userId:
        string;
}
```

`authenticated` means a signer is available.

`read-only` means the identity is known but no signing capability is configured.

The current read-only path is saved `npub` restoration.

---

# AuthenticationStrategy

The application-facing strategy contract is intentionally small:

```ts
interface AuthenticationStrategy {
    tryLogin():
        Promise<AuthenticationResult | null>;

    login(
        credentials: string
    ): Promise<AuthenticationResult>;
}
```

`AuthenticationService` depends on this contract, not directly on Nostr infrastructure.

That keeps the application state owner independent from the credential implementation.

---

# AuthenticationService

`AuthenticationService` is the authoritative application authentication state owner.

It owns:

```text
current AuthenticationState
current user id
saved-login restoration orchestration
explicit login orchestration
state subscribers
signed-out reason used by getUserId()
```

It does not own:

```text
Nostr private keys
NIP-07 extension objects
NIP-46 bunker signers
Nostr relay transport
account metadata
relay preferences
Resource publication
```

## State access

The service exposes:

```text
getState()
subscribe()
tryGetUserId()
getUserId()
```

`subscribe()` immediately publishes the current state and returns an unsubscribe function.

`getUserId()` throws when no authenticated/read-only user exists.

`tryGetUserId()` converts that condition into `undefined` for callers such as Resource-selection contributors.

## Saved-login restoration

`tryLogin()` asks the configured strategy to restore the saved login.

Result behavior is:

```text
strategy returns authenticated/read-only
    → update AuthenticationState
    → return true

strategy returns null
    → signed-out
    → reason = no saved login
    → return false

strategy throws
    → signed-out
    → reason = saved login could not be restored
    → return false
```

The service therefore converts infrastructure restoration behavior into a stable application state transition.

## Explicit login

`login(credentials)` delegates to the strategy and publishes the resulting authentication state.

The current UI uses this for nsec login.

---

# Application Composition

Authentication composition occurs in the concrete `Application` composition root.

Conceptually:

```text
NostrSigner
    ↓
NostrAuthenticationStrategy
    ↓
AuthenticationService

same NostrSigner
    ↓
NostrClient
```

The exact current composition is:

```text
Application
    creates NostrSigner
    creates NostrAuthenticationStrategy(localStorage, signer)
    creates AuthenticationService(strategy)
    creates NostrClient(signer)
```

The signer is private to `Application`.

It is deliberately not exposed through `ApplicationContext`.

UI code authenticates through `AuthenticationService`; it does not configure the signer directly.

---

# Startup Ordering

The concrete `Application` class is imported directly only by:

```text
src/routes/+layout.svelte
```

The startup sequence is intentionally:

```text
construct Application
    ↓
provide ApplicationContext
    ↓
+layout onMount
    ↓
authenticationService.tryLogin()
    ↓
application.start()
```

Saved authentication restoration happens before `Application.start()`.

This matters because startup uses the current user identity for account loading and user-dependent Resource-selection defaults.

Inside `Application.start()` the application then:

```text
applies Settings
restores Resource selections
initializes WorkspaceRuntime
configures default Nostr relays
loads cached account state for the restored user
starts a non-blocking account refresh
continues Resource/bootstrap startup
```

Authentication restoration is therefore a bootstrap prerequisite, while account network refresh is not.

---

# NostrAuthenticationStrategy

`NostrAuthenticationStrategy` interprets Nostr-specific saved login values and credentials.

It owns:

```text
saved login format interpretation
nsec decoding
npub decoding
NIP-07 restoration
NIP-46 restoration
NIP-46 client-secret persistence
configuration of NostrSigner
```

It does not own application authentication state.

That state belongs to `AuthenticationService`.

---

# Saved Login Storage

Saved Nostr authentication uses browser `localStorage`.

The primary key is:

```text
${VITE_APP_NAME}:login
```

A second key stores the generated NIP-46 client secret:

```text
${VITE_APP_NAME}:login:bunker:client-seckey
```

The saved login value determines the restoration path.

Supported values are currently:

```text
NIP-07
bunker://...
nsec...
npub...
```

Unknown values do not become authenticated state.

---

# Signer Reset During Restoration

`NostrAuthenticationStrategy.tryLogin()` clears the shared signer before interpreting the saved login.

This is an important invariant.

A failed restoration or read-only `npub` restoration must not leave signing state from a previously active account.

Conceptually:

```text
tryLogin()
    ↓
clear shared signer
    ↓
inspect saved login
    ↓
configure new signer only for authenticated modes
```

Read-only authentication therefore cannot accidentally inherit a previous signing identity.

---

# nsec Authentication

Fresh UI login currently accepts nsec credentials.

`NostrAuthenticationStrategy.login(credentials)`:

1. decodes the NIP-19 value,
2. requires `nsec`,
3. configures `NostrSigner`,
4. derives the public key through the signer,
5. saves the nsec login value,
6. returns `authenticated` state.

The application state contains only the resulting public user ID.

The raw nsec does not become `AuthenticationState`.

---

# NIP-07 Restoration

Saved NIP-07 login uses the sentinel:

```text
NIP-07
```

Restoration waits for a browser extension through `nip07-awaiter`.

Current wait limit:

```text
10 seconds
```

If the extension does not become available, restoration returns `null`.

When available:

```text
NIP-07 extension
    ↓
NostrSigner.useNip07()
    ↓
public key
    ↓
authenticated AuthenticationResult
```

The extension object stays inside Nostr infrastructure.

---

# NIP-46 Restoration

Saved values beginning with:

```text
bunker://
```

use NIP-46 remote signing.

The strategy loads or creates a 32-byte client secret and asks `NostrSigner` to connect to the bunker.

The `Application` supplies the authentication-URL callback:

```text
window.open(url, '_blank')
```

This keeps browser presentation behavior outside `NostrSigner` itself.

After successful connection, the remote signer's public key becomes the authenticated `userId`.

---

# npub Read-Only Restoration

A saved `npub` is decoded into a hex public key and produces:

```text
status: read-only
```

No signer is configured.

This supports identity-aware read behavior without pretending that publication is possible.

Code requiring signing should fail through the signer/transport boundary rather than treating read-only state as authenticated signing capability.

---

# NostrSigner

`NostrSigner` is the single active Nostr signing identity owned by `Application`.

Supported modes are:

```text
nsec
NIP-07
NIP-46
```

It implements the `rx-nostr` `EventSigner` contract.

Responsibilities include:

```text
replace active signing mode
return active public key
sign events
close previous NIP-46 signer when replaced
best-effort zeroing of owned nsec bytes when cleared
```

Changing modes disposes the previous signer state before the new state becomes active.

`NostrSigner` does not own login persistence or application authentication state.

---

# Relationship to NostrClient

`NostrClient` and authentication share the same `NostrSigner` instance.

This prevents duplicated signing state.

```text
Authentication
    configures NostrSigner

NostrClient
    uses NostrSigner for signing/public-key behavior
```

The client therefore sees the currently authenticated signing identity without the UI passing private keys into publication calls.

The same signer is used for Nostr publication and relay authentication behavior configured by the Nostr client factory.

---

# Account State After Authentication

Authentication and account/profile state are separate responsibilities.

```text
AuthenticationService
    = who is the current user and can they sign?

AccountService
    = profile/account state for that user
```

After restored authentication, `Application.start()` attempts to load cached account state and starts a non-blocking refresh.

For a fresh nsec login, the current login UI performs:

```text
authenticationService.login(nsec)
    ↓
accountService.setup(userId, name)
    ↓
replace current Buffer with Profile
```

`AccountService.setup()` delegates to the configured account strategy and reloads accepted account state afterward.

The current Nostr account strategy creates/maintains Nostr metadata, relay-list, and contacts/follow events through the Nostr event/Outbox path.

---

# Resource Selection Dependency

Some module Resource-selection contributors use:

```text
AuthenticationService.tryGetUserId()
```

for user-owned default Resources such as:

```text
Notes
Bible Text Markup
Reading Plan subscriptions
```

That dependency is on application identity, not on Nostr-specific credential modes.

The contributor does not inspect nsec/NIP-07/NIP-46 state.

---

# Shutdown

`Application.stop()` disposes Resource/Nostr runtime state and then clears the signer.

Conceptually:

```text
stop Resource worker activity
    ↓
dispose NostrClient
    ↓
clear NostrSigner
```

Clearing the signer also closes an active NIP-46 signer or best-effort wipes the signer's owned nsec byte copy.

---

# Error Boundaries

## No saved login

This is a normal signed-out state.

`tryLogin()` returns `false`.

## Saved login cannot be restored

The application becomes signed-out with a restoration failure reason.

The exception does not become a half-authenticated state.

## Invalid fresh credentials

`login()` rejects.

The caller decides how to present the error.

## Read-only identity attempts to sign

Because no signer mode is configured, signing fails at the signer/transport boundary.

## Account refresh failure

Account network refresh is non-blocking after startup and logs a warning rather than failing the entire application startup.

---

# Public Boundaries

Normal application/runtime consumers use:

```text
$lib/application
ApplicationContext.authenticationService
ApplicationContext.accountService
```

Nostr authentication implementation remains under:

```text
$lib/infrastructure/nostr/authentication/
$lib/infrastructure/nostr/nostr-signer.ts
```

The concrete `Application` composition root imports those implementations directly.

Svelte code must not import or configure `NostrSigner` directly.

---

# Testing

Current tests cover the boundary at several levels.

## AuthenticationService tests

Cover:

```text
initial signed-out state
state subscription
successful restoration
missing saved login
restoration failure
explicit login
user-id access
```

## NostrAuthenticationStrategy tests

Cover credential interpretation and restoration behavior for the supported Nostr modes.

## NostrSigner tests

Cover signer replacement, key handling, signing, and mode behavior.

## Nostr client tests

Verify that the configured signer is the one used for publication/authentication behavior.

## Browser/integration tests

May construct concrete Nostr infrastructure when Nostr transport itself is the subject under test.

That does not make raw Nostr infrastructure part of `ApplicationContext`.

---

# Architectural Invariants

1. `AuthenticationService` is the application authentication state owner.
2. Nostr login modes do not appear in `AuthenticationState`.
3. `Application` owns one `NostrSigner` instance.
4. `NostrAuthenticationStrategy` and `NostrClient` share that signer.
5. The signer is not exposed through `ApplicationContext`.
6. Saved-login restoration clears previous signer state first.
7. `npub` restoration is read-only and does not configure a signer.
8. Saved authentication restoration runs before `Application.start()`.
9. Account/profile state is separate from authentication state.
10. User-owned Resource defaults depend on the generic current user ID, not Nostr login mode.
11. `+layout.svelte` is the runtime bootstrap boundary; ordinary UI code does not construct authentication infrastructure.

---

# Important Files

```text
src/routes/+layout.svelte

src/lib/application/runtime/application.ts
src/lib/application/runtime/application-context.ts
src/lib/application/services/authentication.service.ts
src/lib/application/services/authentication/authentication-state.ts
src/lib/application/services/authentication/authentication-strategy.ts

src/lib/infrastructure/nostr/authentication/nostr-authentication-strategy.ts
src/lib/infrastructure/nostr/nostr-signer.ts
src/lib/infrastructure/nostr/client/

src/lib/application/services/account/
src/lib/infrastructure/nostr/account/
```

---

# Final Mental Model

```text
saved/fresh credential
    ↓
NostrAuthenticationStrategy
    ↓ configures
NostrSigner
    ↓ returns generic result
AuthenticationService
    ↓
AuthenticationState
    ↓
Application / Svelte consumers

same NostrSigner
    ↓
NostrClient
    ↓
relay auth + publication
```

Authentication answers **who the application user is and whether signing is available**.

Nostr infrastructure answers **how that identity is restored and how events are signed**.
