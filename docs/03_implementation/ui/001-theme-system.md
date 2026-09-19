# UI Theme System

**Status:** Current  
**Area:** `client/kjvonly-pwa`  
**Primary implementation:** `src/app.css`, `SettingsService`, Settings UI

## Purpose

KJVOnly.bible uses a CSS-token theme system controlled by application Settings.

The theme system is intentionally simple:

```text
Settings
    ↓
SettingsService
    ↓
attributes / inline typography on <html>
    ↓
CSS theme selectors in app.css
    ↓
Tailwind utility classes resolve through theme tokens
```

Theme state is application-owned. Svelte components edit Settings; they do not independently manipulate global theme attributes.

## Scope

This document covers:

- color themes,
- light/dark variants,
- fonts,
- global font size and weight,
- CSS theme tokens,
- Settings persistence/application,
- Settings subscribers that consume visual preferences.

It does not define general component styling conventions or Workspace layout. Those concerns are documented with the runtime/module implementation where they are owned.

## Source of Truth

The important implementation files are:

```text
client/kjvonly-pwa/src/app.css
client/kjvonly-pwa/src/lib/application/models/settings.model.ts
client/kjvonly-pwa/src/lib/application/services/settings.service.ts
client/kjvonly-pwa/src/lib/application/modules/settings/
```

`SettingsService` is application-owned and exposed to Svelte through `ApplicationContext`.

## Settings Model

The current Settings model contains both global visual settings and a few module-display preferences:

```ts
interface Settings {
    fontSize: number;
    fontWeight: number;
    fontFamily: string;
    colorTheme: string;
    isDarkTheme: boolean;
    showParagraphs: boolean;
    showPericopes: boolean;
    showBibleVersion: boolean;
    enableMaxWidth: boolean;
}
```

The visual theme fields are:

```text
fontSize
fontWeight
fontFamily
colorTheme
isDarkTheme
```

`enableMaxWidth` affects shared Buffer presentation but is not part of the CSS color/font theme itself.

Bible-specific toggles such as paragraphs and pericopes are Settings-backed display preferences but remain Bible behavior.

## Defaults

The current defaults are:

```text
fontSize      = 16
fontWeight    = 400
fontFamily    = sans
colorTheme    = red
isDarkTheme   = false
enableMaxWidth = true
```

Persisted Settings are normalized before use.

The font-size migration is important: `fontSize` is now a numeric pixel value. Historical values such as a Tailwind class name are not treated as CSS sizes.

## Persistence

Settings are stored in browser `localStorage` under:

```text
settings
```

`SettingsService` owns persistence.

Svelte Settings controls should not write `localStorage` directly.

The update path is:

```text
Settings UI
    ↓
SettingsService.updateSettings(settings)
    ↓
normalizeSettings()
    ↓
localStorage
    ↓
SettingsService.applySettings()
    ↓
DOM + subscribers
```

## Initial Load Ordering

The Settings UI must not persist defaults before stored Settings have been restored.

The current Settings component therefore gates its reactive persistence until initial loading completes:

```text
component creation
    ↓
newSettings()
    ↓
persistence effect blocked
    ↓
onMount()
    ↓
SettingsService.getSettings()
    ↓
settingsLoaded = true
    ↓
normal reactive persistence
```

Do not remove that initialization gate without reproducing and solving the original overwrite problem.

## Global DOM Application

`SettingsService.applySettings()` applies the global visual Settings to the application `<html>` element.

### Color Theme

Light mode uses:

```text
data-theme="color-theme-<colorTheme>"
```

Dark mode uses:

```text
data-theme="color-theme-dark-<colorTheme>"
```

Examples:

```text
color-theme-red
color-theme-dark-red
color-theme-light-blue
color-theme-dark-light-blue
```

### Font Family

The selected font family is applied as:

```text
font-family="<fontFamily>"
```

This is an application-specific attribute, not the CSS `font-family` property itself.

`app.css` maps the attribute value to the `--font-primary` token.

### Font Size and Weight

The global font size and weight are applied using the `<html>` style attribute:

```text
font-size: <fontSize>px
font-weight: <fontWeight>
```

Because much of the UI uses inherited/rem-based sizing, these settings influence the presentation broadly.

## CSS Token Model

`app.css` uses Tailwind's `@theme` block to define semantic color and font tokens.

The important token groups include:

```text
--font-*
--color-primary-*
--color-neutral-*
--color-vivid-a-*
--color-support-a-*
--color-support-b-*
--color-highlight[a-e]
--color-redtxt
```

Components should normally use semantic utilities such as:

```text
bg-neutral-50
text-neutral-700
bg-primary-500
border-neutral-400
bg-highlighta
```

rather than embedding theme-specific RGB/HSL values in component code.

The theme selectors redefine these tokens, so components automatically follow the selected palette.

## Color Themes

The Settings UI currently offers:

```text
red
light-blue
purple
cyan
pink
```

Each has a light and dark CSS selector in `app.css`.

For example:

```text
[data-theme='color-theme-red']
[data-theme='color-theme-dark-red']
```

Dark themes generally invert/rebalance neutral and semantic scales so the same utility names continue to express semantic roles.

Components should not need separate dark-mode branches merely to swap basic theme colors.

## Font Families

The Settings UI currently exposes:

```text
sans
serif
mono
kjv
roboto-mono
jetbrains-mono
```

`app.css` maps each attribute value to `--font-primary`.

The application bundles custom font faces for:

```text
KJV1611
Roboto Mono
JetBrains Mono
```

System stacks are used for sans, serif, and mono.

## Theme Consumers

Most components consume the theme indirectly through CSS tokens.

A smaller set consumes Settings directly for behavior that cannot be represented solely by CSS tokens.

For example, `BufferContainer` subscribes to Settings for:

```text
enableMaxWidth
```

The correct subscriber pattern is:

```ts
settingsService.subscribe(id, onSettingsChange);

function onSettingsChange(settings: Settings) {
    // consume the published Settings snapshot
}
```

Do not ignore the subscriber payload and reread `localStorage` from each consumer.

## Settings Normalization

`normalizeSettings()` treats persisted Settings as untrusted/legacy data.

Each field falls back independently.

This allows an old or partially corrupted Settings object to retain valid fields while invalid fields return to defaults.

Current behavior includes:

```text
numeric fontSize
    → accepted

numeric-string fontSize
    → converted to number

old class-name fontSize such as "text-base"
    → default font size

wrong-typed booleans
    → field default

missing fields
    → field default
```

At present, non-empty strings for `fontFamily` and `colorTheme` are structurally accepted by normalization. The UI limits normal selections to supported values, while the CSS selectors determine whether a persisted string has a visual definition.

## Theme Ownership Rules

Keep these rules:

1. `SettingsService` owns global Settings persistence and DOM application.
2. Svelte Settings controls edit the Settings object; they do not become independent persistence owners.
3. Global palette values belong in `app.css`, not scattered through components.
4. Components should prefer semantic Tailwind/theme tokens.
5. Settings subscribers consume the published Settings snapshot.
6. Module-specific Settings behavior stays in the owning module/domain even when the value is stored in the application Settings object.

## Adding a Color Theme

To add a new supported color theme:

1. Add the selectable value to the Settings UI.
2. Add a light selector:

   ```text
   [data-theme='color-theme-<name>']
   ```

3. Add a dark selector:

   ```text
   [data-theme='color-theme-dark-<name>']
   ```

4. Define the complete semantic token set used by the application.
5. Verify highlight colors and text contrast in both variants.
6. Test existing components without adding theme-specific component branches unless truly necessary.

## Adding a Font Family

To add a font family:

1. Add the font asset / `@font-face` declaration if it is bundled.
2. Add a `[font-family='<value>']` selector in `app.css`.
3. Set `--font-primary` in that selector.
4. Add the value to the Settings UI.
5. Verify typography at multiple global font sizes/weights.

## Testing

`SettingsService` tests should cover:

- persisted Settings restoration,
- legacy normalization,
- global DOM attributes/styles,
- subscriber notification,
- invalid/corrupt storage fallback.

UI/browser tests are appropriate when behavior depends on actual CSS rendering or browser DOM behavior.

## Summary

The theme system is an application-owned Settings-to-CSS-token pipeline.

```text
Settings UI
    ↓
SettingsService
    ↓
<html> attributes / typography
    ↓
app.css theme selectors
    ↓
semantic Tailwind tokens
    ↓
components
```

The important architectural boundary is that components consume semantic styling and application Settings; they do not each own theme persistence or palette definitions.
