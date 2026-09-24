# Settings Module Design Specification

## 1. Status

**Status:** Proposed design
**Scope:** Settings module UI architecture, navigation, rendering, state management, search, and reusable settings components
**Primary objective:** Replace the current settings implementation with a declarative, Android-style settings system built on the application's persistent navigation-stack pattern.

This document defines the intended architecture before implementation. Implementation details may evolve, but the behavioral and architectural boundaries described here should remain stable unless this specification is explicitly revised.

---

# 2. Background

The Settings module currently consists primarily of purpose-built Svelte components representing individual groups of settings and individual setting controls.

This works for a small number of settings but introduces several problems as the application grows:

- Settings hierarchy is encoded implicitly through component composition.
- Every settings group requires custom UI wiring.
- Similar setting controls duplicate layout and interaction behavior.
- Search has no centralized representation of available settings.
- Navigation between settings screens does not use the persistent navigation behavior established elsewhere in the application.
- Search results cannot easily identify a destination screen and a specific row within that screen.
- The visual structure of settings is tied too closely to implementation components rather than being represented as application data.

The desired user experience is similar to modern Android settings applications:

```text
Settings

Appearance
    Theme, fonts, colors and text size

Bible
    Bible reader display options

Account
    Profile and authentication options
```

Selecting a group opens another settings page:

```text
Appearance

Theme
    Light / Dark

Color theme
    Night

Font family
    Roboto Mono

Font size
    18 px
```

Pages consist primarily of reusable rows and sections.

Only settings requiring genuinely specialized interaction should require custom components.

---

# 3. Goals

The Settings architecture MUST support:

1. Hierarchical settings pages.
2. Reusable page, section, and row rendering.
3. Persistent navigation where previous pages remain mounted.
4. Preservation of scroll position and component-local state when navigating backward.
5. Declarative settings definitions.
6. Generic toggle settings.
7. Generic selection settings.
8. Custom setting views where necessary.
9. Primary and secondary row text.
10. Row icons.
11. Colored icons on the root settings page.
12. Search across all searchable settings.
13. Search metadata independent of rendered components.
14. Navigation directly from a search result to the containing page.
15. Scrolling to the matching setting after search navigation.
16. Temporarily visually pulsing or highlighting the matched row.
17. Stable identifiers for pages, sections, and rows.
18. A single shared reactive settings state across the entire settings navigation stack.
19. Clear separation between settings metadata, settings UI, settings persistence, and application navigation.
20. Incremental migration from the existing settings implementation.

---

# 4. Non-Goals

This refactor does NOT initially attempt to:

- Introduce URL-based routing for settings pages.
- Persist settings navigation history between application restarts.
- Store Svelte components directly inside settings definitions.
- Turn every setting into an individual Svelte component.
- Replace the existing Settings persistence service.
- Replace application-wide settings events or subscriber behavior.
- Make the settings definition remotely configurable.
- Build a generic form framework.
- Introduce nested modal navigation.
- Destroy inactive settings pages to reduce memory usage.

The navigation architecture intentionally keeps previous pages mounted.

---

# 5. Architectural Principles

## 5.1 Declarative over imperative

Most settings UI SHOULD be described through data rather than manually assembled through components.

The settings definition describes:

```text
what exists
where it appears
how it is labeled
how it behaves
how it can be searched
```

The renderer determines how that definition appears.

---

## 5.2 Stable identity

Every navigable settings page and every actionable settings row MUST have a stable identifier.

Stable IDs are required for:

- navigation
- search
- testing
- DOM targeting
- scroll targeting
- pulse/highlight targeting
- future analytics or diagnostics
- future migration of settings definitions

Display text MUST NOT be used as identity.

---

## 5.3 Persistent navigation

Navigating deeper into Settings MUST NOT destroy the previous page.

All pages in the active navigation stack remain mounted.

Only the last page in the stack is visible.

This preserves:

- scroll position
- local UI state
- search input state
- expanded UI state
- browser-managed element state
- component-specific transient state

---

## 5.4 Shared settings state

Settings values are application state, not page-local state.

Every page in the settings navigation stack MUST reference the same reactive settings object.

A settings change made on one page must immediately be visible to every mounted settings page.

---

## 5.5 Generic until specialization is necessary

A setting SHOULD use a generic row or generic selection view whenever possible.

A custom component SHOULD only be introduced when the interaction cannot reasonably be represented by the common settings primitives.

Examples:

```text
Theme                 generic select
Font family           generic select
Font weight           generic select
Paragraphs            generic toggle
Pericopes             generic toggle
Maximum width         generic toggle
Font size             custom control
```

---

# 6. High-Level Architecture

The Settings module is divided into six major responsibilities:

```text
Navigation
    NavigationService
    NavigationContainer

Settings Definition
    SettingsPageDefinition
    SettingsSectionDefinition
    SettingsRowDefinition

Settings Rendering
    SettingsPage
    SettingsSection
    SettingsRow
    SettingsChoicePage

Settings State
    shared reactive Settings object

Settings Persistence
    existing SettingsService

Settings Search
    search index
    result navigation
    focus/pulse handling
```

These responsibilities SHOULD remain independent.

---

# 7. Navigation Architecture

## 7.1 Existing navigation pattern

The Profile module establishes the desired navigation behavior.

The NavigationService maintains a stack of view definitions.

Conceptually:

```text
push Profile
push EditProfile
push RelaySettings
```

The UI maintains all three mounted:

```text
Profile         hidden
EditProfile     hidden
RelaySettings   visible
```

When RelaySettings is popped:

```text
Profile         hidden
EditProfile     visible
```

`EditProfile` was never destroyed.

Its DOM state and scroll position therefore remain intact.

---

# 8. Generic Navigation Container

The persistent rendering behavior SHOULD be extracted from `profileContainer` into a reusable application-level navigation component.

Conceptual structure:

```text
NavigationContainer
    BufferContainer
        navigation entry 0
        navigation entry 1
        navigation entry 2
        ...
```

Visibility rule:

```text
entry index === stack.length - 1
    visible
otherwise
    hidden
```

Inactive entries MUST remain mounted.

The NavigationContainer SHOULD NOT understand Settings-specific behavior.

It only knows:

```text
navigation stack
component definitions
active stack position
visibility
```

---

# 9. NavigationService

The current NavigationService model is already suitable for Settings and SHOULD initially remain structurally unchanged.

Its primary responsibilities are:

```text
push view
pop view
expose stack
identify current view
```

Settings-specific concepts such as:

```text
pageID
rowID
search
focus
pulse
```

MUST NOT become first-class NavigationService concepts.

Those belong in the navigation entry's payload.

Example:

```ts
{
    component: SettingsPage,
    obj: {
        pageID: 'appearance',
        focusRowID: 'font-family'
    }
}
```

This preserves NavigationService as a generic application service.

---

# 10. Navigation Container Migration

The intended migration order is:

```text
Profile
    existing behavior becomes reference implementation

NavigationContainer
    extracted from Profile behavior

Profile
    converted to NavigationContainer

Settings
    adopts NavigationContainer

Archive
    optionally migrated later

Login
    optionally migrated later
```

Profile MUST behave identically before and after extraction.

This provides a regression boundary for the shared navigation component.

---

# 11. Settings Information Model

The settings hierarchy is represented as:

```text
Settings Definition
    Page
        Section
            Row
            Row
        Section
            Row
```

The hierarchy MUST reflect semantic UI structure rather than rendering artifacts.

For example, section spacing is not represented as a fake row.

---

# 12. Settings Page Definition

A settings page represents one navigable settings screen.

Conceptual model:

```ts
interface SettingsPageDefinition {
  id: SettingsPageID;
  title: string;
  description?: string;
  sections: SettingsSectionDefinition[];
}
```

Example:

```ts
{
    id: 'appearance',
    title: 'Appearance',
    sections: [...]
}
```

Page IDs MUST be unique across the Settings module.

Examples:

```text
root
appearance
bible
account
privacy
storage
```

---

# 13. Settings Sections

A settings page consists of ordered sections.

Conceptual model:

```ts
interface SettingsSectionDefinition {
  id: SettingsSectionID;
  label?: string;
  description?: string;
  rows: SettingsRowDefinition[];
}
```

Examples:

```text
Appearance

Theme
    Light / Dark
    Color theme

Text
    Font size
    Font family
    Font weight
```

Here:

```text
Theme
Text
```

are section labels.

Sections MAY omit a label.

---

# 14. Section Boundaries

Section boundaries SHOULD be represented structurally rather than through entries such as:

```ts
{
  type: "break";
}
```

The renderer determines visual separation between sections.

This avoids mixing layout instructions into the semantic settings model.

The renderer may use:

- vertical spacing
- divider
- section heading
- padding
- other future visual treatments

without modifying the settings definition.

---

# 15. Settings Rows

Rows represent meaningful settings entries.

Rows use a discriminated union.

Initial row types:

```ts
type SettingsRowDefinition =
  | SettingsGroupRowDefinition
  | SettingsToggleRowDefinition
  | SettingsSelectRowDefinition
  | SettingsCustomRowDefinition;
```

Additional row types MAY be introduced if future requirements genuinely require different behavior.

---

# 16. Common Row Model

Every row shares common metadata.

Conceptually:

```ts
interface SettingsRowDefinitionBase {
  id: SettingsRowID;

  title: string;

  secondary?: SettingsSecondaryDefinition;

  icon?: SettingsIconDefinition;

  search?: SettingsSearchDefinition;
}
```

Every row ID MUST be stable.

Every row ID SHOULD be unique globally within the Settings definition rather than merely unique inside its page.

Global uniqueness simplifies:

- search
- testing
- row lookup
- DOM targeting
- navigation targeting

Example IDs:

```text
appearance
theme-mode
color-theme
font-size
font-family
font-weight
show-paragraphs
show-pericopes
show-bible-version
maximum-width
```

---

# 17. Group Rows

A group row navigates to another settings page.

Example:

```ts
{
    type: 'group',
    id: 'appearance',
    title: 'Appearance',
    secondary: 'Theme, fonts, colors and text size',
    icon: {
        name: 'appearance',
        accent: 'purple'
    },
    pageID: 'appearance'
}
```

Selecting the row pushes the destination SettingsPage onto the navigation stack.

Group rows generally appear on the root page but MAY also appear inside nested settings pages.

---

# 18. Toggle Rows

A toggle row represents a boolean setting.

Example:

```ts
{
    type: 'toggle',
    id: 'show-paragraphs',
    title: 'Paragraphs',
    secondary: 'Display Bible text using paragraph formatting',
    setting: 'showParagraphs'
}
```

Rendered approximately as:

```text
Paragraphs                           [ ON ]
Display Bible text using
paragraph formatting
```

A toggle row SHOULD NOT require a dedicated Svelte component unless its behavior later becomes substantially different from normal boolean settings.

---

# 19. Select Rows

A select row represents a setting where a value is chosen from a known group of options.

Examples:

```text
Theme
Color theme
Font family
Font weight
```

Conceptual definition:

```ts
{
    type: 'select',
    id: 'font-family',
    title: 'Font family',
    setting: 'fontFamily',
    options: [...]
}
```

Selecting a select row navigates to a reusable selection screen.

The selection screen receives enough information to render:

```text
title
available options
current selection
selection behavior
```

---

# 20. Custom Rows

A custom row navigates to a specialized settings component.

Example:

```ts
{
    type: 'custom',
    id: 'font-size',
    title: 'Font size',
    secondary: {
        setting: 'fontSize',
        formatter: 'font-size'
    },
    view: 'font-size'
}
```

The definition contains a stable custom view identifier.

It MUST NOT directly contain the Svelte component.

---

# 21. Component References

Settings definitions SHOULD remain UI-framework-light.

Avoid:

```ts
{
  view: FontSizeComponent;
}
```

Prefer:

```ts
{
  view: "font-size";
}
```

A component resolver maps:

```text
font-size
    ↓
FontSize.svelte
```

This resembles the application's existing component mapping patterns while maintaining separation between definition data and UI implementation.

---

# 22. Why Components Are Not Stored in Definitions

Keeping component references outside the definition provides several benefits:

- definitions remain easier to test
- definitions can be inspected without rendering
- search does not load Svelte components
- component imports remain localized
- Node-safe boundaries are easier to maintain
- definitions are easier to serialize conceptually
- circular dependencies are less likely
- domain/UI import boundaries remain clearer

---

# 23. Icons

Rows MAY define icons.

Conceptual icon definition:

```ts
interface SettingsIconDefinition {
  name: SettingsIconID;
  accent?: SettingsAccentID;
}
```

Example:

```ts
icon: {
    name: 'palette',
    accent: 'purple'
}
```

Definitions SHOULD contain semantic icon IDs rather than imported SVG/Svelte components.

A UI resolver determines the actual rendered icon.

---

# 24. Root Settings Icons

The root Settings page should provide stronger visual categorization.

Root group rows SHOULD have:

```text
icon
accent/color
primary text
secondary text
```

Example:

```text
[ colored palette icon ] Appearance
                         Theme, fonts and colors

[ colored Bible icon ]   Bible
                         Bible reader display options
```

Nested settings rows can use a more restrained presentation.

---

# 25. Generic Row Layout

Most settings rows share one common visual structure:

```text
icon | primary text                       accessory
       secondary text
```

The accessory area varies by row type:

```text
group
    chevron

toggle
    toggle control

select
    current value and/or chevron

custom
    current value and/or chevron
```

One generic `SettingsRow.svelte` SHOULD initially render all common row types.

Separate row components SHOULD only be introduced when a row type develops meaningfully different rendering or interaction requirements.

---

# 26. Primary Text

Every settings row MUST have primary text.

Primary text represents the setting or settings group itself.

Examples:

```text
Appearance
Paragraphs
Font family
Font size
Maximum width
```

Primary text styling MUST be consistent throughout Settings.

---

# 27. Secondary Text

Rows MAY display secondary text beneath the primary text.

Secondary text has two primary purposes:

1. Explain the setting.
2. Display the current value.

Examples:

```text
Paragraphs
Display Bible text using paragraph formatting
```

or:

```text
Font family
Roboto Mono
```

---

# 28. Secondary Text Model

Secondary text SHOULD support both static and dynamic values.

Conceptually:

```ts
type SettingsSecondaryDefinition =
  | string
  | {
      setting: keyof Settings;
      formatter?: SettingsValueFormatterID;
    };
```

Static:

```ts
secondary: "Display Bible text using paragraph formatting";
```

Dynamic:

```ts
secondary: {
  setting: "fontFamily";
}
```

Formatted dynamic:

```ts
secondary: {
    setting: 'fontSize',
    formatter: 'font-size'
}
```

Example output:

```text
18 px
```

---

# 29. Value Formatters

Generic settings definitions SHOULD NOT contain arbitrary display functions where stable formatter IDs are sufficient.

Prefer:

```ts
formatter: "font-size";
```

to:

```ts
formatter: (value) => `${value}px`;
```

A formatter resolver can map:

```text
font-size
    ↓
18 → "18 px"
```

This keeps definitions declarative and avoids embedding behavior unnecessarily.

---

# 30. Shared Settings State

The Settings navigation stack MUST share one reactive Settings object.

Conceptually:

```text
SettingsContainer
    SettingsState
        shared Settings object

    NavigationContainer
        SettingsRoot
        AppearancePage
        FontSizePage
```

All mounted pages reference the same state.

There MUST NOT be one independently loaded settings object per page.

---

# 31. SettingsContainer Responsibilities

The SettingsContainer becomes the composition root for Settings.

It is responsible for:

```text
obtaining the current settings
creating/providing shared reactive settings state
creating/accessing navigation
mounting NavigationContainer
providing the Settings root page
```

It SHOULD NOT contain individual settings UI.

---

# 32. Settings Context

The shared settings state MAY be provided through Svelte context or another existing application-state mechanism.

Consumers should be able to retrieve:

```text
current settings object
settings update mechanism
settings service where appropriate
```

A nested page should not need explicit prop threading from every ancestor.

---

# 33. Updating Settings

A generic row modifies the shared settings state.

For example:

```text
Paragraphs toggle
    ↓
settings.showParagraphs = false
```

The Settings persistence boundary remains responsible for persistence and external application effects.

UI components SHOULD NOT independently reproduce persistence logic.

---

# 34. SettingsService Responsibilities

The existing SettingsService remains responsible for application-level settings behavior.

This includes responsibilities such as:

```text
persist settings
apply settings to the application
update DOM-level settings where required
publish relevant settings changes
notify existing subscribers
```

The declarative UI does not replace this service.

---

# 35. Rendering Architecture

The core Settings UI should primarily consist of:

```text
SettingsContainer
NavigationContainer
SettingsPage
SettingsHeader
SettingsSearch
SettingsSection
SettingsRow
SettingsChoicePage
```

Only specialized controls live outside this reusable layer.

---

# 36. SettingsPage

`SettingsPage` is the generic renderer for settings pages.

Input conceptually includes:

```text
pageID
optional navigation state
```

It resolves the corresponding page definition and renders:

```text
header
search where applicable
sections
rows
```

The same component is used for:

```text
Settings root
Appearance
Bible
Privacy
other future groups
```

where their layouts fit the generic page model.

---

# 37. SettingsSection

`SettingsSection` renders:

```text
optional label
optional description
rows
section spacing
```

It receives a section definition and does not know what page it belongs to beyond what is necessary for rendering.

---

# 38. SettingsRow

`SettingsRow` receives one row definition.

It is responsible for:

```text
icon
primary text
secondary text
accessory rendering
click behavior
toggle behavior
navigation behavior
search focus/pulse styling
```

Behavior is selected based on the row discriminant.

---

# 39. SettingsChoicePage

Select-type settings SHOULD navigate to one reusable selection page rather than creating bespoke pages.

Example:

```text
Font family

Roboto
Roboto Mono          selected
Atkinson Hyperlegible
Noto Serif
```

The same page should support:

```text
Theme mode
Color theme
Font family
Font weight
```

Configuration comes from data.

---

# 40. Custom Settings Components

Custom components are reserved for interaction patterns that cannot be cleanly represented through standard rows and choice lists.

Initial example:

```text
Font Size
```

A specialized font-size view may contain:

```text
preview
increase/decrease controls
slider
preset values
```

depending on the current design.

The important distinction is:

```text
navigation and surrounding page architecture
    generic

specialized interaction body
    custom
```

---

# 41. Proposed Directory Structure

A likely organization is:

```text
settings/
├── components/
│   ├── settingsPage.svelte
│   ├── settingsHeader.svelte
│   ├── settingsSection.svelte
│   ├── settingsRow.svelte
│   ├── settingsSearch.svelte
│   └── settingsChoicePage.svelte
│
├── custom/
│   └── fontSize.svelte
│
├── definitions/
│   └── settings.definition.ts
│
├── models/
│   ├── settings-definition.model.ts
│   └── settings-navigation.model.ts
│
├── resolver/
│   ├── settings-icon-resolver.ts
│   ├── settings-view-resolver.ts
│   └── settings-value-formatter.ts
│
├── search/
│   ├── settings-search.ts
│   └── settings-search.model.ts
│
├── settingsContainer.svelte
└── settingsRoot.svelte
```

Exact filenames may change during implementation.

The architectural separation is more important than the precise physical layout.

---

# 42. Search

Settings search is a first-class design requirement.

Search operates over the settings definition rather than rendered DOM.

Search SHOULD be able to locate a setting regardless of whether its page has ever been mounted.

---

# 43. Searchable Metadata

Every searchable row automatically contributes metadata from its location.

A row may additionally supply explicit search metadata.

Conceptually:

```ts
interface SettingsSearchDefinition {
  keywords?: string[];
  hidden?: boolean;
}
```

Example:

```ts
{
    id: 'font-family',
    title: 'Font family',
    search: {
        keywords: [
            'font',
            'typeface',
            'text'
        ]
    }
}
```

---

# 44. Search Document

The effective search document for a row SHOULD contain:

```text
row title
static secondary text
explicit keywords
section label
page title
possibly parent page titles
```

For:

```text
Appearance
    Text
        Font family
```

the effective searchable information may include:

```text
Font family
Text
Appearance
font
typeface
```

---

# 45. Search Exclusions

Some rows may not make sense as direct search destinations.

These MAY specify:

```ts
search: {
  hidden: true;
}
```

Hidden search rows continue to render normally.

---

# 46. Search Result Model

A search result MUST identify a stable destination.

Conceptually:

```ts
interface SettingsSearchResult {
  pageID: SettingsPageID;
  rowID: SettingsRowID;

  title: string;
  secondary?: string;
  pageTitle?: string;
  sectionLabel?: string;
}
```

The result does not need to contain component references.

---

# 47. Search Result Presentation

A result should contain enough context to distinguish similarly named settings.

Example:

```text
Font family
Appearance > Text
```

or:

```text
Paragraphs
Bible > Display
```

The precise visual treatment can be determined during UI implementation.

---

# 48. Search Navigation

Selecting a search result should navigate directly to the page containing that row.

Example:

```text
search query:
    font

result:
    Font family
```

Destination:

```text
pageID: appearance
rowID: font-family
```

Navigation payload:

```ts
{
    pageID: 'appearance',
    focusRowID: 'font-family'
}
```

---

# 49. Row Focus Behavior

After navigation from search:

1. The destination page is mounted.
2. The destination row is resolved by stable row ID.
3. The row is scrolled into view.
4. The row receives a temporary visual pulse/highlight.
5. The transient focus state is considered consumed.

The settings definition itself MUST NOT contain transient state such as:

```ts
pulse: true;
```

Pulse is navigation/UI state.

---

# 50. Pulse Animation

The pulse should visually identify the destination without permanently changing the row.

Conceptually:

```text
normal
    ↓
highlight/pulse
    ↓
normal
```

The pulse SHOULD:

- be noticeable but restrained
- respect reduced-motion preferences
- not move surrounding content
- not affect settings state
- not persist after navigation away
- remain independent of hover/focus styles

---

# 51. Search and Persistent Navigation

Persistent navigation provides an important search UX benefit.

Example:

```text
Settings root
search = "font"
scroll position = 350px

select Font family

Settings root        hidden, still mounted
Appearance           visible
```

Back navigation:

```text
Settings root        visible
```

The user returns to:

```text
search = "font"
same search results
same scroll position
```

No state reconstruction is required.

---

# 52. Search State Ownership

Search query state SHOULD belong to the mounted search page rather than global application state unless later requirements demand otherwise.

Because the page remains mounted while navigating forward, the query is naturally preserved.

This is another reason persistent stack rendering is important.

---

# 53. Search Index Construction

The searchable index can be derived deterministically from the settings definition.

Conceptually:

```text
for each page
    for each section
        for each row
            if row searchable
                create search document
```

No DOM crawling is necessary.

No rendered components are necessary.

---

# 54. Search Implementation Complexity

The Settings dataset is expected to remain relatively small.

A simple normalized in-memory search is likely sufficient initially.

A larger search library SHOULD NOT be introduced without evidence that it is necessary.

Matching may initially normalize:

```text
case
spacing
possibly punctuation
```

and search fields such as:

```text
title
secondary
keywords
section
page
```

---

# 55. Settings Definition Registry

The Settings module SHOULD expose a central definition registry.

Conceptually:

```ts
const SETTINGS_PAGES = {
    root: ...,
    appearance: ...,
    bible: ...
};
```

or equivalent strongly typed structure.

This registry acts as the authoritative description of the Settings information architecture.

---

# 56. Definition Validation

Development-time validation SHOULD detect invalid settings definitions.

Useful invariants include:

```text
page IDs are unique
row IDs are unique
group destinations exist
custom view IDs resolve
icon IDs resolve
formatter IDs resolve
setting property references exist
select options are valid
search result destinations are resolvable
```

Many of these can be statically enforced through TypeScript.

Others can be covered by unit tests.

---

# 57. Setting Property References

Generic rows need a safe way to reference settings values.

Example:

```ts
setting: "fontFamily";
```

These SHOULD be typed against the actual Settings model where possible.

The compiler should reject:

```ts
setting: "fontFamly";
```

where no such setting exists.

---

# 58. Select Options

Selection values should also be described declaratively.

Conceptually:

```ts
interface SettingsOption<T> {
  id: string;
  label: string;
  secondary?: string;
  value: T;
}
```

Example:

```text
Roboto Mono
Atkinson Hyperlegible
Noto Serif
```

The choice page should not need setting-specific code.

---

# 59. Generic Select Behavior

For a generic select row:

```text
tap row
    ↓
push SettingsChoicePage
    ↓
select option
    ↓
update shared settings
```

Whether selecting an option automatically navigates back or leaves the page open should be standardized during implementation.

The default should favor predictable behavior across all generic selection pages.

---

# 60. Generic Toggle Behavior

Toggle rows should support interaction through both the row and the visible toggle, unless doing so creates accessibility ambiguity.

A click SHOULD result in exactly one state change.

Event propagation must avoid accidental double toggles.

---

# 61. Navigation Back Behavior

Settings uses normal NavigationService back semantics.

If:

```text
Settings
    ↓
Appearance
    ↓
Font Size
```

then:

```text
Back
    Font Size → Appearance

Back
    Appearance → Settings
```

Each prior page remains mounted until popped.

Once popped, a page may be destroyed because it is no longer part of the stack.

---

# 62. Scroll Preservation

Scroll preservation is achieved structurally.

The architecture MUST NOT implement manual scroll-position bookkeeping unless a later browser-specific issue requires it.

Because inactive pages remain mounted:

```text
element scrollTop
```

naturally remains intact.

This is preferable to:

```text
capture scrollTop
destroy page
recreate page
restore scrollTop
```

---

# 63. Settings Page Headers

The Settings page header SHOULD be reusable.

Header behavior may vary based on stack depth.

Root:

```text
Settings
Search...
```

Nested page:

```text
< back    Appearance
```

The navigation container or page navigation context should make stack depth/current-page state available without hard-coding page-specific behavior.

---

# 64. Settings Search Placement

The root settings screen includes a search bar at the top.

Whether nested pages also expose scoped search can be decided later.

Initial design assumes:

```text
global settings search on root
```

because the search index already spans all settings pages.

---

# 65. Root Settings Page

The root page primarily consists of group rows.

Example structure:

```text
Settings

[ Search settings ]

General
    Appearance
    Bible

Account
    Profile
    Authentication

Data
    Archive
    Storage
```

The actual grouping can evolve independently of renderer implementation.

---

# 66. Nested Settings Pages

Nested pages should visually share the same structural language as the root:

```text
header
sections
rows
```

They should not require separate layout components solely because they represent different categories.

---

# 67. Visual Consistency

Generic rendering ensures consistent treatment of:

```text
row heights
padding
icon placement
primary text
secondary text
accessories
section labels
section spacing
hover states
focus states
active states
disabled states
pulse states
```

Visual changes should therefore be possible largely through common settings components instead of editing every settings page.

---

# 68. Accessibility

Generic settings components MUST preserve normal accessibility requirements.

Rows must:

```text
use semantic controls where appropriate
support keyboard activation
show visible keyboard focus
provide meaningful accessible names
expose toggle state
avoid click-only interaction
respect reduced motion
```

Toggle controls should use appropriate checkbox/switch semantics.

Selection pages should expose selected state.

---

# 69. Reduced Motion

Pulse/highlight behavior triggered by search MUST respect:

```css
prefers-reduced-motion
```

When reduced motion is enabled, the destination may receive a temporary static highlight instead of animation.

---

# 70. Disabled Settings

The row model MAY eventually support disabled settings.

Conceptually:

```ts
disabled?: boolean
```

or a derived condition.

This is not required for the initial implementation but the generic row architecture should not make future support difficult.

---

# 71. Conditional Visibility

Some future settings may only apply under certain conditions.

Conditional rendering SHOULD NOT initially be generalized until a real requirement exists.

When needed, it should be added deliberately rather than embedding arbitrary functions throughout the definition.

---

# 72. Error Handling

A malformed settings definition should fail clearly during development.

Examples:

```text
unknown page ID
unknown custom view
unknown icon
unknown formatter
invalid settings key
```

The renderer SHOULD NOT silently omit invalid definitions during development.

Production fallback behavior can be conservative if necessary.

---

# 73. Testing Strategy

The architecture should support testing at multiple layers.

## Definition tests

Verify:

```text
unique page IDs
unique row IDs
valid navigation destinations
valid custom view IDs
valid settings property references
```

## Search tests

Verify:

```text
title matches
secondary text matches
keyword matches
section matches
page matches
hidden rows excluded
correct destination returned
```

## Navigation tests

Verify:

```text
push keeps previous component mounted
previous component is hidden
pop reveals previous component
local state is preserved
scroll state is preserved where browser testing permits
```

## Row tests

Verify:

```text
toggle updates correct property
select opens correct choice view
group opens correct page
custom opens correct view
secondary text reflects current setting
```

## Search navigation browser tests

Verify:

```text
search
select result
navigate to page
scroll to row
pulse row
back
original search state remains
```

---

# 74. NavigationContainer Tests

Because NavigationContainer becomes application infrastructure, it should be tested independently from Settings.

Important behavior:

```text
initial root render
push one entry
push several entries
only final entry visible
previous entries remain mounted
pop reveals same component instance
pop cleanup removes popped entry
root behavior remains valid
```

Profile behavior should act as a real-world regression case.

---

# 75. Migration Strategy

The Settings refactor should proceed incrementally.

## Phase 1 — Navigation extraction

Extract the persistent stack rendering behavior from Profile into generic NavigationContainer.

Convert Profile to the new shared container.

No Settings behavior changes yet.

Success criterion:

```text
Profile navigation behaves identically before and after refactor.
```

---

## Phase 2 — Settings navigation foundation

Convert SettingsContainer to:

```text
shared settings state
NavigationContainer
Settings root entry
```

The existing settings UI may initially remain behind the root entry if necessary.

Success criterion:

```text
Settings can participate in persistent navigation.
```

---

## Phase 3 — Definition models

Introduce:

```text
SettingsPageDefinition
SettingsSectionDefinition
SettingsRowDefinition
stable IDs
```

Create the initial root definition.

Success criterion:

```text
Settings information architecture can be represented entirely as typed data.
```

---

## Phase 4 — Generic page renderer

Introduce:

```text
SettingsPage
SettingsSection
SettingsRow
```

Render the root settings page from its definition.

Success criterion:

```text
root page contains no hand-built group list.
```

---

## Phase 5 — Generic toggle migration

Migrate simple Bible boolean settings.

Likely initial candidates:

```text
Paragraphs
Pericopes
Bible Version
Maximum Width
```

Success criterion:

```text
these settings require no dedicated row components.
```

---

## Phase 6 — Generic selection page

Introduce SettingsChoicePage.

Migrate:

```text
Theme
Color Theme
Font Family
Font Weight
```

Success criterion:

```text
one selection component renders all these settings.
```

---

## Phase 7 — Custom setting views

Move specialized controls such as Font Size into custom settings views.

Success criterion:

```text
specialized UI integrates with the same navigation and shared settings state.
```

---

## Phase 8 — Search

Generate search records from definitions.

Implement:

```text
query
result display
destination navigation
```

Success criterion:

```text
all ordinary searchable settings can be discovered without page-specific search code.
```

---

## Phase 9 — Scroll and pulse

Implement navigation payload:

```text
pageID
focusRowID
```

Then:

```text
scroll into view
pulse destination
```

Success criterion:

```text
search results visibly identify their destination after navigation.
```

---

## Phase 10 — Additional navigation consumers

Once NavigationContainer has proven stable in Profile and Settings, consider moving:

```text
Archive
Login
```

onto the same shared implementation.

This is not required for completing Settings.

---

# 76. Expected End State

A large portion of the Settings module should ultimately be describable through structures resembling:

```ts
{
    id: 'appearance',
    title: 'Appearance',
    sections: [
        {
            id: 'theme',
            label: 'Theme',
            rows: [
                {
                    type: 'select',
                    id: 'color-theme',
                    title: 'Color theme',
                    setting: 'colorTheme'
                }
            ]
        },
        {
            id: 'text',
            label: 'Text',
            rows: [
                {
                    type: 'custom',
                    id: 'font-size',
                    title: 'Font size',
                    view: 'font-size'
                },
                {
                    type: 'select',
                    id: 'font-family',
                    title: 'Font family',
                    setting: 'fontFamily'
                },
                {
                    type: 'select',
                    id: 'font-weight',
                    title: 'Font weight',
                    setting: 'fontWeight'
                }
            ]
        }
    ]
}
```

The renderer then owns presentation.

---

# 77. Responsibility Boundaries

The final architecture should maintain the following boundaries:

```text
NavigationService
    owns navigation stack state

NavigationContainer
    owns persistent rendering of navigation stack

Settings Definition
    owns settings information architecture

SettingsPage
    owns generic page rendering

SettingsSection
    owns section rendering

SettingsRow
    owns generic row rendering and interaction

SettingsChoicePage
    owns generic selection UI

Settings state
    owns currently selected settings values

SettingsService
    owns persistence and application effects

Settings Search
    owns searchable representation and matching

Custom View Resolver
    maps custom view IDs to specialized UI

Icon Resolver
    maps semantic icon IDs to actual icons

Value Formatter
    maps formatter IDs to displayed values
```

No layer should assume responsibilities belonging to another.

---

# 78. Key Design Decisions

The following decisions should be considered part of the architectural baseline:

1. Settings uses the persistent navigation-stack model established by Profile.
2. Previous navigation views remain mounted and hidden.
3. Navigation rendering is extracted into a reusable NavigationContainer.
4. NavigationService remains generic.
5. Settings uses a shared reactive settings object across the entire navigation stack.
6. Settings are modeled as pages containing sections containing rows.
7. Section separation is structural rather than represented by fake break rows.
8. Every page and setting row has a stable ID.
9. Most settings UI is declarative.
10. Row behavior uses discriminated row types.
11. Generic toggles do not receive dedicated Svelte components.
12. Generic choices share one selection page.
13. Specialized controls use custom views only when necessary.
14. Definitions contain component/view IDs rather than imported Svelte components.
15. Icons are referenced through semantic IDs.
16. Dynamic secondary values are derived from settings state.
17. Search is generated from settings definitions rather than DOM.
18. Search results identify both page ID and row ID.
19. Search destination highlighting is transient navigation/UI state.
20. Search navigation scrolls to and pulses the matching row.
21. Back navigation naturally restores previous search and scroll state because previous pages remain mounted.
22. The existing SettingsService remains the persistence/application-effects boundary.

---

# 79. Architectural Outcome

After the refactor, adding an ordinary setting should usually require changing only the settings definition.

For example, adding:

```text
Show verse numbers
```

should primarily require something resembling:

```ts
{
    type: 'toggle',
    id: 'show-verse-numbers',
    title: 'Verse numbers',
    secondary: 'Display verse numbers in Bible text',
    setting: 'showVerseNumbers'
}
```

The developer should not need to create:

```text
showVerseNumbers.svelte
showVerseNumbersContainer.svelte
showVerseNumbersNavigation.svelte
showVerseNumbersSearchEntry.ts
```

The common architecture provides those behaviors automatically.

That is the central objective of this design:

**Settings should be an information model rendered by reusable infrastructure, with custom components reserved for genuinely custom interactions.**
