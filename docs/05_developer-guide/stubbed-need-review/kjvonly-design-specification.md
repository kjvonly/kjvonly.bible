# KJVonly.bible Design Specification

**Status:** Draft v1  
**Scope:** Mobile-first offline PWA design system  
**Implementation vocabulary:** Svelte + Tailwind CSS v4  
**Canonical intent:** Cover the highest-ROI ~90% of recurring UI decisions with a small, restrained design system.

---

## Design Direction

KJVonly.bible should remain content-first, mobile-first, offline-first, and visually restrained.

Material Design may be used as a reference for interaction consistency, hierarchy, touch behavior, accessibility, and responsive patterns, but KJVonly.bible does **not** adopt Material's visual identity wholesale.

The application should preserve its own:

- themes,
- typography,
- icon language,
- pane/module architecture,
- restrained surfaces,
- and content-first character.

The design system exists primarily to eliminate repeated one-off decisions about:

- spacing,
- hierarchy,
- header actions,
- list treatment,
- controls,
- navigation,
- overlays,
- state feedback,
- accessibility,
- and motion.

The governing principle is:

> **Consistency should come from shared semantics and layout rules, not from decorating every screen the same way.**

---

## System Overview

The design system is organized into eight areas:

1. **Foundations** — typography, scaling, spacing, touch targets, icons, shape, boundaries, surfaces.
2. **Layout** — workspace/pane ownership, BufferContainer, BufferHeader, BufferBody, scrolling, gutters, sections, responsiveness.
3. **Headers** — leading control, title/context, action limits, overflow, narrow-pane behavior.
4. **Lists and Cards** — action lists, entity lists, informational groups, card usage.
5. **Controls** — buttons, choice controls, inputs, checkboxes, switches, forms, validation.
6. **Navigation and Overlays** — local navigation, workspace navigation, menus, popups, dialogs, focus/dismissal.
7. **States and Feedback** — empty, loading, selected, completed, offline, publication, errors, success, toast/banner behavior.
8. **Accessibility and Motion** — semantics, keyboard, focus, scaling, contrast, reduced motion, transition vocabulary.

---

## Cross-cutting Rules

These rules apply throughout the system:

- Mobile is the default layout.
- Pane width matters more than viewport category.
- `BufferBody` is the default primary vertical scroll owner.
- Horizontal padding has one owner.
- Root font scaling is intentional and should propagate through Tailwind's `rem` scale.
- Touch targets retain an accessible physical minimum even when root font size is reduced.
- Structural `outline` is valid where preserving layout geometry matters.
- Shadows are absent by default.
- Header actions are intentionally constrained.
- Cards are used for meaningful containment, not as a generic list style.
- Native semantics are preferred over simulated controls.
- Offline is context, not automatically an error.
- Important state never depends on color alone.
- Motion is functional, brief, and optional.
- New design variants are added only when repeated real UI demonstrates a need.

---

## Canonical Tailwind Rhythm

The preferred vocabulary remains intentionally small.

```text
Typography
  text-xs
  text-sm
  text-base
  text-lg
  text-xl        exceptional use

Spacing
  gap-1
  gap-2
  gap-3
  gap-4
  gap-6
  gap-8

Common layout
  px-4
  py-3
  py-4
  p-4
  min-w-0
  min-h-0
  w-full
  h-full

Shape
  rounded-none
  rounded-lg
  rounded-full

Motion
  duration-150
  duration-200
```

Theme-specific colors remain owned by the existing theme system.

---


---

# 1. Foundations

## 1. Design Principles

KJVonly.bible should remain content-first, restrained, and functional.

The foundation should provide consistency through:

- typography hierarchy,
- spacing rhythm,
- touch-target sizing,
- shape,
- structural boundaries,
- icon sizing,
- interaction states,
- and responsive scaling.

Avoid decorative complexity unless it communicates structure, state, or interaction.

The design system should prefer existing Tailwind utilities and theme tokens over one-off CSS values.

---

## 2. Root Scaling

The application controls the root font size and base font weight:

```ts
html?.setAttribute(
    'style',
    `font-size: ${settings.fontSize}px; font-weight: ${settings.fontWeight};`
);
```

Because Tailwind spacing and typography utilities are primarily `rem` based, the user's selected root font size intentionally scales:

- text,
- spacing,
- padding,
- gaps,
- component dimensions,
- and other `rem`-based layout values.

This is desirable and should be preserved.

### Rule

**Use Tailwind's normal relative scale rather than converting typography and spacing to fixed pixels.**

The primary exception is minimum touch-target size, which must remain usable even when the user selects a small root font size.

---

## 3. Typography

Typography should use a small hierarchy.

### Size roles

| Role | Tailwind | Use |
|---|---|---|
| Supporting | `text-xs` | tertiary metadata, compact supporting state |
| Secondary | `text-sm` | secondary information and metadata |
| Primary | `text-base` | normal UI text, list items, body content |
| Content title | `text-lg` | meaningful content titles where additional hierarchy is required |
| Exceptional title | `text-xl` | reserved for screens/content that genuinely require stronger hierarchy |

`text-xl` should not be the default heading size throughout the application.

### Weight roles

Font weight is user-configurable, so hierarchy must not assume fixed weights such as `font-medium` or `font-semibold`.

Define three conceptual roles:

```text
base
emphasis
strong
```

They should be derived from the user's selected base font weight.

Example:

```text
user base 300:
  base      300
  emphasis  400
  strong    500

user base 500:
  base      500
  emphasis  600
  strong    700

user base 700:
  base      700
  emphasis  800
  strong    900
```

Values should clamp at the highest supported font weight.

### Typography hierarchy

Prefer:

```text
Primary:
  text-base
  base weight
  primary text color

Emphasized primary:
  text-base
  emphasis weight
  primary text color

Secondary:
  text-sm
  base weight
  secondary text color

Supporting:
  text-xs
  base weight
  muted text color

Section title:
  text-base
  emphasis weight

Content title:
  text-lg
  strong weight
```

Hierarchy should come from a combination of:

- size,
- relative weight,
- color,
- and spacing.

Do not rely on large jumps in font size.

---

## 4. Text Color Roles

Themes already define the actual palette. Components should use semantic roles consistently.

```text
primary text
secondary text
muted/supporting text
interactive/accent text
disabled text
danger text
```

### Rules

- Primary content uses the normal high-contrast text color.
- Secondary content uses a reduced-emphasis theme color.
- Muted text is reserved for tertiary information.
- Accent colors communicate interaction, selection, or meaningful state.
- Accent colors should not replace normal text hierarchy.
- Disabled state should remain legible while clearly de-emphasized.
- State must never rely on color alone.

Avoid arbitrary color selection inside individual modules when a theme role already exists.

---

## 5. Spacing Rhythm

Use Tailwind's spacing scale consistently.

| Relationship | Tailwind |
|---|---|
| Very tightly related | `gap-1` |
| Related content | `gap-2` |
| Row/control internals | `gap-3` |
| Components/groups | `gap-4` |
| Sections | `gap-6` |
| Major separation | `gap-8` |

### Standard layout values

```text
Screen/content horizontal gutter:
  px-4

Standard contained surface:
  p-4

Standard list row:
  px-4 py-3
```

### Rule of thumb

```text
gap-1 / gap-2
  relationships inside content

gap-3 / gap-4
  relationships inside components

gap-6
  separation between sections

gap-8
  major structural separation
```

Prefer parent-owned `gap-*` layout over scattered child margins.

---

## 6. Touch Targets

Mobile usability takes priority over visually compact controls.

### Rules

- Icons may remain visually small.
- The tappable area around an icon must be larger than the icon.
- Normal action controls should target the equivalent of approximately `min-h-11` to `min-h-12`.
- Interactive controls must have a physical minimum that does not shrink below an accessible mobile touch target when the root font size is reduced.
- Header icon buttons must retain their touch target even when their visual icon is compact.

### Important implementation constraint

A purely `rem`-based `h-12 w-12` target may become too small when the root font size is reduced.

The reusable button/control layer should therefore enforce a minimum physical target while still allowing normal `rem` scaling above that minimum.

---

## 7. Icons

The existing relative SVG sizing model should be preserved.

### Standard

```text
normal UI icon:
  approximately 1.25em

icon color:
  currentColor / semantic action color
```

### Rules

- Icons scale with the surrounding typography.
- Icon-only controls must have accessible labels.
- Decorative icons should be used sparingly.
- Icons should communicate actions, state, navigation, or meaningful content.
- Avoid arbitrary per-screen icon sizes unless the semantic role requires it.

The icon's visual size and the control's touch target are separate concerns.

---

## 8. Shape

Use a deliberately small radius vocabulary.

```text
rounded-none
  structural layout
  ordinary list rows

rounded-lg
  cards
  grouped surfaces
  contained controls where appropriate

rounded-full
  circular icon controls
  swatches
  pills/chips
```

Avoid introducing multiple arbitrary radius sizes unless a real interaction pattern requires them.

---

## 9. Structural Boundaries

Structural boundaries must not unexpectedly alter scroll height, width, or container geometry.

For this reason, **outlines are an intentional part of the design system**.

### Preferred use

Use `outline` when:

- a visual boundary is required,
- the boundary must not participate in layout sizing,
- adding a border would alter the dimensions of a scroll container,
- or nested layout sizing must remain unchanged.

This is especially appropriate for:

- `BufferContainer`,
- scroll-owned surfaces,
- pane/container boundaries,
- and other layout primitives where geometry must remain stable.

### Borders

Use `border` when the boundary is part of the component's intended box model and its dimensions are already accounted for.

Typical examples:

- inputs,
- cards,
- dialogs,
- isolated contained controls.

### Focus

Because structural outlines are valid, focus indication must remain visually distinct.

Focus treatment should use a clearly distinguishable:

- color,
- thickness,
- offset,
- or ring treatment.

Do not depend on the same outline appearance for both structure and focus.

### Rule

> Choose `outline` vs `border` based on layout semantics, not decoration.

---

## 10. Elevation

Shadows are not part of the default visual language.

### Default

```text
no shadow
```

Use hierarchy through:

- typography,
- spacing,
- surface color,
- outline/border,
- and selection state.

A contained surface should normally be visually expressed with:

```text
rounded-lg
surface background
outline or border as appropriate
p-4
```

Elevation should only be introduced when an overlay or interaction genuinely needs to appear above surrounding content.

---

## 11. Surfaces

Themes own the concrete colors. The design system should recognize a small set of semantic surface roles:

```text
base
raised/grouped
selected
overlay
```

### Meaning

**Base**
- normal application/content background.

**Raised/grouped**
- a visually contained information group or card.

**Selected**
- active or selected content.

**Overlay**
- menus, popups, dialogs, and other transient content above the normal surface.

Avoid introducing unnecessary nested surface levels.

---

## 12. Interaction States

All reusable interactive controls should support consistent states:

```text
default
hover
active/pressed
focus-visible
selected
disabled
loading
```

### Rules

- Pressed state should provide immediate feedback without changing layout.
- Selected state should be visually distinct from pressed state.
- Focus must remain clearly visible for keyboard users.
- Disabled controls must remain identifiable and readable.
- Loading controls should preserve their dimensions to avoid layout shift.
- Hover is supplemental; the interface must not depend on hover because mobile is the primary target.

---

## 13. Responsive Philosophy

Mobile is the default design.

Base Tailwind utilities should describe the mobile experience.

Add responsive variants only when wider available space materially improves the interface.

Prefer naturally fluid layout before adding breakpoint-specific overrides.

Because KJVonly.bible supports multiple panes, component behavior should eventually respond to **available container width**, not assume that viewport width always represents usable component width.

Container-aware behavior is preferred when viewport breakpoints would produce incorrect behavior inside narrow panes.

---

## 14. Foundation Tailwind Vocabulary

The preferred vocabulary is intentionally small:

```text
Typography
  text-xs
  text-sm
  text-base
  text-lg
  text-xl        exceptional use

Weight
  base
  emphasis
  strong         relative to user setting

Spacing
  gap-1
  gap-2
  gap-3
  gap-4
  gap-6
  gap-8

Layout
  px-4
  p-4
  px-4 py-3

Shape
  rounded-none
  rounded-lg
  rounded-full

Boundary
  outline        geometry-neutral structural boundary
  border         boundary that participates in box layout
  focus ring / distinct focus outline

Touch
  approximately min-h-11 / min-h-12
  with a hard minimum independent of reduced root font size

Icons
  approximately 1.25em
  inherit currentColor

Elevation
  none by default
```

---

## 15. Foundation Decision Summary

The KJVonly.bible foundation is intentionally restrained.

1. Root font size controls the application's relative scale.
2. Tailwind `rem` scaling is preserved.
3. Typography uses a small `xs / sm / base / lg` hierarchy.
4. Font-weight hierarchy is relative to the user's selected base weight.
5. Spacing follows the `1 / 2 / 3 / 4 / 6 / 8` Tailwind rhythm.
6. `px-4` is the default content gutter.
7. Mobile touch targets remain physically usable even at small root font sizes.
8. SVG icons remain relative to text size.
9. Radius vocabulary is limited to `none / lg / full`.
10. Outlines are valid structural boundaries when borders would alter layout or scroll geometry.
11. Borders are used when the boundary belongs in the component's box model.
12. Shadows are absent by default.
13. Interaction states are standardized.
14. Mobile-first base styles are preferred over breakpoint-heavy styling.
15. New foundation tokens should only be introduced when an actual UI pattern demonstrates a repeated need.

---

# 2. Layout

## 1. Layout Principles

KJVonly.bible uses a pane-based application layout rather than a traditional page-per-route layout.

The design system should preserve that architecture.

The primary layout rule is:

> **Each layer owns one layout responsibility.**

```text
Workspace
  owns viewport and pane geometry

Pane
  owns the allocated pane rectangle

BufferContainer
  owns the module surface and content-width policy

BufferHeader
  owns module header height

BufferBody
  owns the module's primary vertical scroll

Module content
  owns sections and local content flow
```

A child should not recreate layout behavior already owned by its parent.

This is especially important for:

- height,
- overflow,
- outlines,
- padding,
- and scroll containers.

---

## 2. Application Viewport

The application workspace should occupy the available mobile viewport.

### Preferred behavior

```text
width:
  full available viewport

height:
  full dynamic viewport

overflow:
  controlled by panes/modules rather than the document body
```

For modern mobile browsers, prefer dynamic viewport sizing where practical:

```text
min-h-dvh / h-dvh
```

rather than relying only on:

```text
100vh
```

This avoids common mobile browser chrome issues where the visible viewport changes as browser controls appear or disappear.

### Safe areas

The application should account for device safe areas where necessary:

```text
env(safe-area-inset-top)
env(safe-area-inset-right)
env(safe-area-inset-bottom)
env(safe-area-inset-left)
```

Safe-area accommodation should happen at the appropriate outer application/control boundary rather than being manually recreated in every module.

---

## 3. Workspace Ownership

The workspace owns:

- pane arrangement,
- pane dimensions,
- split geometry,
- pane removal,
- and the overall viewport.

Modules should not infer their size from the global viewport when the pane provides the actual available space.

### Rule

> **A module responds to the dimensions of its pane, not to assumptions about the device viewport.**

This matters because a desktop-width viewport may still contain a narrow pane.

Viewport breakpoints alone are therefore insufficient for pane-contained UI.

---

## 4. Pane Ownership

A Pane fills the rectangle assigned by the workspace.

A pane should:

```text
fill allocated width
fill allocated height
allow descendants to shrink
not introduce its own content scrolling
```

Equivalent Tailwind concepts include:

```text
w-full
h-full
min-w-0
min-h-0
```

where appropriate to the containing layout.

### Pane boundaries

Pane boundaries may use structural `outline` because outlines do not alter the pane's calculated dimensions.

Avoid adding layout-affecting borders merely to show pane separation.

---

## 5. BufferContainer

`BufferContainer` is the root layout boundary for a module.

It owns:

- full pane occupation,
- module background,
- optional maximum content width,
- horizontal centering,
- and the module's outer structural boundary.

Conceptually:

```text
BufferContainer
  └── content-width container
      ├── BufferHeader
      └── BufferBody
```

### Required behavior

The container should:

```text
fill available width
fill available height
allow flex/grid descendants to shrink
center constrained content
preserve stable geometry
```

Typical vocabulary:

```text
relative
h-full
w-full
min-h-0
min-w-0
justify-center
```

### Maximum width

When the user's maximum-width setting is enabled:

```text
w-full
max-w-lg
mx-auto
```

or the existing equivalent behavior should constrain the entire module consistently.

The header and body should share the same content-width boundary.

Do not constrain only the body while allowing the header to use a different width.

### Wide mode

When maximum width is disabled:

```text
w-full
max-w-none
```

The module should use the full width provided by its pane.

---

## 6. Header and Body Relationship

A normal module is composed of:

```text
BufferContainer
  BufferHeader
  BufferBody
```

The header and body have distinct responsibilities.

### BufferHeader

The header:

- does not participate in body scrolling,
- owns its own height,
- remains visible while body content scrolls,
- spans the module content width,
- and provides the visual boundary between navigation/actions and content.

### BufferBody

The body:

- receives the remaining module height,
- is the primary vertical scroll owner,
- owns normal content gutters,
- and contains the module's sections/content.

### Rule

> **The normal module has exactly one primary vertical scroll container: BufferBody.**

---

## 7. Scroll Ownership

Nested vertical scrolling should be avoided.

### Default

```text
BufferBody
  overflow-y-auto or equivalent
```

All ordinary module content should flow inside that scroll container.

### Avoid

Do not give ordinary child sections:

```text
h-full
overflow-y-scroll
overflow-y-auto
```

when `BufferBody` already owns scrolling.

This creates:

- competing touch scroll regions,
- clipped content,
- confusing scroll restoration,
- layout measurement problems,
- and unpredictable mobile behavior.

### Valid nested-scroll exceptions

A nested scroll container is acceptable only when the nested content is intentionally an independent interactive region, such as:

- a code/text editor,
- a deliberately bounded data region,
- a horizontal carousel,
- or another component whose interaction requires independent scrolling.

The exception should be explicit, not incidental.

---

## 8. Height Ownership

Height should be owned once at each level.

```text
Workspace
  establishes application viewport height

Pane
  receives its allocated height

BufferContainer
  fills pane height

BufferHeader
  reports/owns header height

BufferBody
  receives remaining height
```

Module content should normally use natural content height inside `BufferBody`.

### Rule

Avoid duplicating calculations such as:

```text
viewport height
minus header
minus local toolbar
minus arbitrary padding
```

across module components.

If a view introduces a secondary toolbar, its height should be part of that view's explicit layout rather than being silently subtracted in multiple descendants.

### Implementation note

Whether the remaining body height is produced by:

- current measured `clientHeight - headerHeight`,
- flex layout,
- grid layout,
- or another mechanism

is an implementation detail.

The design contract is simply that there is **one authoritative owner of the remaining scrollable height**.

---

## 9. Body Gutters

The standard module content gutter is:

```text
px-4
```

This should be the normal default for `BufferBody`.

### Rule

Modules should not repeatedly add another `px-4` around the entire body when `BufferBody` already provides it.

This prevents accidental:

```text
px-8
```

effective gutters caused by nested wrappers.

### Full-bleed exception

Some content intentionally needs to reach the body edge, for example:

- a special reading surface,
- media,
- a deliberately full-width selector,
- or another design that clearly benefits from edge-to-edge treatment.

In those cases, the module may opt out of the standard body gutter deliberately.

Full-bleed behavior should be an explicit exception.

---

## 10. Vertical Content Rhythm

`BufferBody` owns horizontal gutters.

The module owns vertical content flow.

A normal screen should use:

```text
py-4
```

where outer vertical breathing room is needed, with section relationships expressed through `gap-*`.

Recommended structure:

```html
<div class="flex flex-col gap-6 py-4">
    <section class="flex flex-col gap-2">
        ...
    </section>

    <section class="flex flex-col gap-2">
        ...
    </section>
</div>
```

### Standard relationships

```text
inside tightly related content:
  gap-1 / gap-2

inside a component:
  gap-3 / gap-4

between sections:
  gap-6

major conceptual separation:
  gap-8
```

Prefer layout-owned `gap-*` over scattered `mt-*` and `mb-*`.

---

## 11. Sections

A section is the standard structural unit inside a body.

Conceptually:

```text
Section
  optional heading
  optional supporting text
  content
```

### Default

```text
flex flex-col gap-2
```

Sections are separated from one another by the parent:

```text
gap-6
```

### Rule

A section does not require:

- a card,
- a border,
- an outline,
- or a different background

simply because it is a section.

Whitespace and typography should provide the default hierarchy.

Containment is added only when the content semantics require it.

---

## 12. Horizontal Layout

Mobile content should default to a single vertical flow.

Use horizontal flex layout for:

- compact action groups,
- metadata that naturally fits,
- label/control relationships,
- and header actions.

### Wrapping

When a horizontal group can contain user-sized text or a variable number of items, prefer:

```text
flex
flex-wrap
```

rather than forcing content to remain on one line.

### Shrinking

Text-bearing flex/grid children should use:

```text
min-w-0
```

when required so they can truncate or wrap rather than push the pane beyond its width.

### Horizontal overflow

Ordinary screens should not create horizontal page scrolling.

Intentional horizontal scrolling must be a specific component behavior.

---

## 13. Narrow Pane Behavior

Pane width can become smaller than the normal mobile viewport.

The design system therefore follows this priority:

1. preserve the primary content,
2. allow text to wrap,
3. allow flexible groups to wrap,
4. reduce nonessential visual spacing where defined,
5. move secondary actions into overflow,
6. hide only genuinely optional information.

Do not solve narrow-pane problems by making text illegibly small.

### Header implication

The previously established header action limit remains important:

```text
one leading control
title
maximum three trailing slots total
```

A narrow pane may require secondary actions to move into overflow sooner.

---

## 14. Responsive Strategy

Tailwind base classes describe the mobile layout.

Use breakpoint variants only when wider available space clearly improves the interface.

### Preferred sequence

```text
base:
  mobile / narrow pane

wider container:
  enhance layout

large container:
  optionally use additional columns or spacing
```

Because pane width is more meaningful than viewport width, prefer container-aware behavior where possible.

### Principle

> **Responsive behavior follows available content width, not device category.**

Do not equate:

```text
desktop viewport = wide component
```

because a split pane may remain narrow.

---

## 15. Multi-column Content

Single-column flow is the default.

Use multiple columns only when:

- the information naturally benefits from parallel comparison,
- sufficient container width exists,
- and each column remains independently readable.

Settings, forms, descriptive lists, and reading-plan lists should generally remain single-column unless a specific wide-layout use case demonstrates clear benefit.

---

## 16. Max-width and Reading Comfort

The existing optional maximum-width setting is part of the layout system.

When enabled, it should constrain the complete module surface consistently.

The purpose is:

- comfortable line length,
- stable visual hierarchy,
- and reduced scanning distance on wide screens.

Do not introduce unrelated per-module `max-w-*` values unless a specific component has an independent semantic width requirement.

A module should normally inherit the application's configured content-width policy.

---

## 17. Structural Outlines

Outlines are the preferred geometry-neutral boundary for layout primitives where borders would affect sizing.

Appropriate uses include:

- pane edges,
- BufferContainer boundaries,
- max-width container boundaries,
- and other scroll/layout boundaries.

### Avoid duplicate boundaries

A single visual separation should normally have one owner.

For example:

```text
pane boundary
  owned by pane/workspace

header/body separator
  owned by header or body boundary

card boundary
  owned by card
```

Do not stack multiple identical outlines on nested elements unless the nested boundaries communicate genuinely different structure.

---

## 18. Header Boundary

The header/body separation must not add unexpected body height.

A geometry-neutral outline is therefore appropriate when the separator must not affect layout measurements.

The header remains outside the body's scroll flow.

Scrolling body content should disappear beneath/after the header boundary without changing header position.

---

## 19. Overlays and Popups

Popups, menus, dialogs, and transient overlays are not ordinary body sections.

They may establish their own local layout boundary.

However, if an overlay hosts a full module-like view using `BufferContainer`, it must still provide a valid available height to that container.

### Rule

> **Any component that embeds a BufferContainer becomes responsible for supplying a real container height.**

A header-only or partially embedded module must not assume that full-pane dimensions exist automatically.

This keeps popup-hosted module views consistent with normal pane-hosted views.

---

## 20. Empty and Short Content

A body with little or no content should still occupy the available module body height.

Do not vertically stretch individual list items merely to fill space.

Empty states may intentionally center or partially center their message/action region, but ordinary short content remains aligned to the normal top content flow.

---

## 21. Scroll Position

Navigation between distinct subviews should have predictable scroll behavior.

Default expectations:

```text
new logical view:
  start at top unless restoring intentional navigation state

return/back:
  restore prior view state when NavigationService preserves the view

same view content update:
  preserve or explicitly control scroll based on interaction semantics
```

Individual modules should not arbitrarily manipulate the document window scroll because module scrolling belongs to `BufferBody`.

---

## 22. Layout Accessibility

Layout must remain usable when:

- the user increases root font size,
- labels wrap onto multiple lines,
- controls become taller,
- the viewport is narrow,
- or the app is used with keyboard navigation.

Avoid fixed heights for text-bearing content unless clipping/wrapping behavior is explicitly designed.

Minimum heights are generally safer than exact heights for content rows and controls.

---

## 23. Layout Tailwind Vocabulary

The preferred layout vocabulary remains intentionally small.

```text
Root/fill
  h-full
  w-full
  min-h-0
  min-w-0

Viewport
  h-dvh / min-h-dvh where appropriate

Content width
  w-full
  max-w-lg
  max-w-none
  mx-auto

Body gutter
  px-4

Body/section flow
  flex
  flex-col
  gap-2
  gap-4
  gap-6
  gap-8
  py-4

Horizontal layout
  flex
  items-center
  justify-between
  gap-*
  flex-wrap
  min-w-0

Scrolling
  overflow-y-auto / established BufferBody equivalent

Structural boundary
  outline

Contained component boundary
  border or outline according to box-model semantics
```

Avoid adding layout utilities simply to compensate for ownership mistakes higher in the tree.

---

## 24. Layout Decision Summary

1. The workspace owns viewport and pane geometry.
2. A pane fills only its allocated rectangle.
3. `BufferContainer` is the module layout root.
4. The header and body share the same module width policy.
5. `BufferHeader` owns header height and remains outside normal body scrolling.
6. `BufferBody` is the single primary vertical scroll owner.
7. Nested vertical scroll containers are exceptions, not defaults.
8. Height calculations have one authoritative owner.
9. `px-4` is the standard body horizontal gutter.
10. Modules should not duplicate the body gutter.
11. Sections use whitespace and typography before additional containment.
12. `gap-*` is preferred over scattered child margins.
13. Mobile/single-column flow is the default.
14. Components respond to available pane width, not assumptions about viewport width.
15. Narrow panes wrap and move secondary actions to overflow before hiding primary content.
16. Optional `max-w-lg` constrains the complete module consistently.
17. Structural outlines are valid because they preserve geometry.
18. Each visual boundary should normally have one owner.
19. Overlay-hosted BufferContainers must receive a real available height.
20. Layout remains robust under user-controlled font scaling and wrapped content.
21. Mobile viewport handling should prefer dynamic viewport units and safe-area awareness where appropriate.
22. New layout primitives should only be added when a repeated pattern cannot be expressed cleanly by these rules.

---

# 3. Headers

## 1. Header Principles

The header is a navigation and high-priority action surface.

It is not a general-purpose toolbar.

A header should answer three questions immediately:

1. **Where am I?**
2. **How do I go back/close this context?**
3. **What are the few most useful actions here?**

The standard structure is:

```text
[leading]       title/context       [action] [action] [overflow]
```

The design system should strongly constrain headers so individual modules do not accumulate arbitrary toolbar actions.

---

## 2. Standard Header Contract

A normal module header contains three semantic regions:

```text
Header
  leading
  title/context
  trailing actions
```

### Leading region

Contains at most **one** control.

Typical roles:

```text
back
close
module/navigation control
```

The leading control is optional when the current view has no appropriate leading action.

### Title/context region

Contains the current module/view identity.

Typical content:

```text
Plans
Settings
Profile
Notes
Genesis 1
Strongs / Refs
```

The title region receives the remaining flexible width.

### Trailing region

Contains the highest-priority contextual actions.

The trailing region has a maximum of:

```text
3 action slots total
```

The overflow control counts as one of those slots.

---

## 3. Action Count

Header action density should remain low.

### Preferred

```text
0–2 trailing actions
```

### Maximum

```text
3 trailing action slots total
```

Examples:

```text
[leading]  Title                         Search

[leading]  Title                  Search   Overflow

[leading]  Title             Add   Search   Overflow
```

If no overflow is needed, three direct actions are technically allowed, but should be uncommon.

### When overflow exists

The normal full header is:

```text
2 direct actions + overflow
```

not:

```text
3 direct actions + overflow
```

### Rule

> Four or more header actions means action prioritization has failed.

Secondary actions must move into overflow or into the body of the view.

---

## 4. Action Priority

An action belongs directly in the header when it is:

- frequently used in the current view,
- immediately relevant to the current context,
- understandable from a compact icon or short label,
- and useful enough to justify permanent header space.

Typical direct-action candidates:

```text
search
add/create
save
edit
context-specific primary action
```

Typical overflow candidates:

```text
settings
copy
split pane
resource/version management
secondary view options
less frequent operations
destructive secondary actions
```

These examples are guidance, not hard-coded action assignments.

The actual priority depends on the module.

### Rule

> Header placement represents action priority, not merely action availability.

An action being possible on the screen does not mean it deserves a header slot.

---

## 5. Leading Control Semantics

The leading slot communicates navigation/context exit.

Use one of:

```text
Back
Close
Module/navigation control
None
```

### Back

Use when the current view was reached through local navigation and returning should reveal the previous view.

### Close

Use when the current surface itself is being dismissed rather than navigating backward.

Examples may include:

- a dismissible module context,
- popup-hosted content,
- or another transient surface.

### Rule

Do not show both Back and Close in the leading region.

If both concepts exist, the navigation model must decide which one represents the user's expected immediate action.

Detailed navigation semantics will be defined in the Navigation specification.

---

## 6. Title Behavior

The title/context region is the visual anchor of the header.

### Default title

Use:

```text
text-base
relative emphasis weight
text-primary
```

The normal title is one line.

### Width behavior

The title region should:

```text
min-w-0
flex/grid shrink safely
truncate when necessary
```

Normal module titles should prefer:

```text
truncate
whitespace-nowrap
```

rather than wrapping into arbitrary header heights.

### Long titles

The priority order is:

1. move lower-priority trailing actions into overflow,
2. preserve the leading navigation control,
3. preserve the highest-priority direct action,
4. then truncate the title.

Do not reduce the title to an unusually small font merely to make all actions fit.

---

## 7. Title Alignment

The header should use stable three-region geometry rather than arbitrary equal toolbar columns.

Conceptually:

```text
leading | flexible title/context | trailing
```

The title should be centered within the space available to it.

Exact geometric centering relative to the entire pane is secondary to:

- readable context,
- usable actions,
- and predictable narrow-pane behavior.

### Rule

> Do not distort or duplicate side regions merely to force mathematical center alignment.

If the leading and trailing regions have different widths, a small optical shift is acceptable.

Consistency and available space are more important than exact screen-center positioning.

---

## 8. Interactive Context Titles

Some modules use the title itself as a contextual control.

The Bible reader is the important example:

```text
KJV
Genesis 1
```

where tapping the title/context opens location or related navigation.

This is a supported header pattern.

### Interactive title rules

An interactive context title should:

- remain in the central title region,
- use the same typographic hierarchy as a title,
- have a meaningful accessible name,
- provide an adequate tap area,
- avoid decorative button chrome,
- and remain visually recognizable as the current context.

### Two-line context

A contextual title may use up to two compact lines when the information is genuinely hierarchical.

Example:

```text
KJV
Genesis 1
```

Use a compact line height such as the existing `leading-tight`.

Do not extend this into arbitrary multi-line descriptive content.

---

## 9. Header Height

Header height should be content-driven within a controlled range.

The header should be tall enough to contain accessible touch targets without adding unnecessary vertical bulk.

The existing pattern:

```text
px-4
py-2
```

is an appropriate default starting point.

### Important

The visible icon may be small, but the action's hit target must remain large.

Do not achieve a compact header by removing the touch area from icon buttons.

### Rule

> Compact visual design comes from small icons and restrained spacing, not undersized hit targets.

---

## 10. Header Action Buttons

Header action buttons should use a visually quiet button treatment.

They should normally have:

```text
transparent/subtle background
no permanent heavy ring
no card-like appearance
large touch target
centered icon
```

The icon should remain approximately:

```text
1.25em
```

in keeping with the Foundation specification.

### Current implementation implication

Passing:

```svelte
<KJVButton classes="">
```

must not mean "remove the button's usable hit area."

The future header-action variant of `KJVButton` should separate:

```text
visual treatment
```

from:

```text
interaction target dimensions
```

so a quiet icon button remains easy to tap.

---

## 11. Action Spacing

Trailing actions are a compact related group.

Use a small consistent gap:

```text
gap-1
```

or the equivalent internal spacing provided by the action controls.

Avoid large gaps between individual header actions.

The trailing group itself should align to the end of the header.

Conceptually:

```text
flex
items-center
justify-end
gap-1
```

---

## 12. Icons vs Text Actions

Icon-only actions are preferred when the icon is conventional and unambiguous.

Examples:

```text
search
close
back
overflow
edit
```

A short text action is allowed when the word communicates meaning more clearly than an icon.

Examples may include:

```text
Save
Done
```

### Rule

Do not create a dense mixture of several text buttons and icons in the same mobile header.

If labels become necessary for several actions, those actions probably belong in the body or overflow menu.

---

## 13. Overflow

Overflow is the standard destination for secondary actions.

The overflow trigger occupies one trailing action slot.

Conceptually:

```text
[direct action] [direct action] [overflow]
```

### Overflow contents

Overflow uses the Action List pattern defined by the Lists specification.

It should:

- contain concise action rows,
- group related operations when helpful,
- place destructive secondary actions in a clearly separated position,
- and avoid cards.

### Duplication

At a given pane width, an action should normally appear either:

```text
directly in the header
```

or:

```text
inside overflow
```

not both.

Responsive movement between the two is allowed.

---

## 14. Narrow Pane Behavior

Headers must work inside split panes that are narrower than a normal mobile viewport.

The adaptation priority is:

```text
1. preserve leading navigation
2. preserve title/context
3. preserve highest-priority direct action
4. preserve overflow when it contains actions
5. move secondary direct actions into overflow
6. truncate title if still necessary
```

### Example

Wide enough:

```text
[Back]  Plans                 Add  Search  Overflow
```

Narrower:

```text
[Back]  Plans                      Search  Overflow
```

Narrowest practical state:

```text
[Back]  Plans                              Overflow
```

The app should not keep every direct action visible at the expense of the title.

---

## 15. Responsive Action Movement

Action visibility should respond to **header/container width**, not merely global viewport breakpoints.

A split-pane header may need the narrow configuration even on a desktop-sized viewport.

Therefore:

> **Header responsiveness is container-aware.**

Viewport breakpoints may still be used when appropriate, but should not be the only mechanism for action-density decisions.

---

## 16. Dynamic Actions and Layout Stability

Header actions may change based on mode or state.

Examples:

```text
Edit -> Exit Edit
Save enabled/disabled
plan completion state
selection mode
```

Whenever possible, changing state should preserve the existing action slot.

Example:

```text
Edit icon
    becomes
Exit Edit icon
```

rather than removing one control and inserting another elsewhere.

### Rule

Avoid action jitter.

Frequently expected actions should remain in stable positions when their state changes.

---

## 17. Disabled vs Hidden Actions

Use **disabled** when:

- the action is expected in this view,
- its absence would be confusing,
- and the reason it cannot currently run is temporary or state-dependent.

Use **hidden/omitted** when:

- the action is not relevant to the current context,
- showing it would add noise,
- or it belongs only to another mode.

Disabled actions must remain accessible enough to understand their presence and must not respond to pointer events.

---

## 18. Destructive Actions

Destructive actions should rarely occupy prime header space.

Examples:

```text
delete
remove subscription
discard
```

Prefer:

```text
overflow
detail/body action area
confirmation flow
```

unless the destructive action is genuinely the primary task of the current contextual mode.

Close/dismiss is not automatically considered destructive.

---

## 19. Header Boundary

The header remains outside the body's vertical scroll container.

Its separation from the body must not unintentionally change body-height calculations.

A geometry-neutral structural treatment is appropriate:

```text
outline
```

or another explicitly positioned visual separator that does not participate in normal layout sizing.

### Rule

The header/body boundary has one owner.

Do not stack multiple identical outlines/borders between:

```text
BufferHeader
BufferBody
module wrapper
```

unless they communicate distinct structures.

---

## 20. Header Surface

The normal header should use the application's standard header/base surface.

It should not automatically become a raised card.

Default visual hierarchy comes from:

- stable placement,
- surface contrast already present in the theme,
- typography,
- and the structural boundary.

Shadows are not used by default.

---

## 21. Accessibility

Every header action must have an accessible name.

Icon-only buttons require an explicit label equivalent to their purpose:

```text
Back
Close
Search
Edit
More actions
```

Do not rely on the SVG shape alone.

### Title semantics

The header title should be exposed as meaningful text.

When the title is interactive, the interactive element must still communicate both:

- the current context,
- and the action it performs.

Example conceptually:

```text
Genesis 1 — choose Bible location
```

### Focus

Keyboard focus must remain visibly distinct from structural outlines.

---

## 22. Header Variants

The design system should avoid many header variants.

Two patterns cover most of the application.

### Standard header

```text
[leading]  Title                  [actions]
```

Use for:

- Settings,
- Plans,
- Notes,
- Profile,
- Archive,
- modules generally.

### Context header

```text
[leading]  Interactive context    [actions]
```

Use when the current object/location itself is the primary navigation control.

Example:

```text
Bible reader
```

The geometry and action limits remain the same.

A context header is not an excuse to create a full-width toolbar.

---

## 23. Anti-patterns

Avoid:

### Arbitrary toolbar grids

```text
Edit | Settings | Copy | Location | Search | Menu | Close
```

This treats every available action as equally important and consumes the title/context area.

### More than three trailing slots

```text
Title  A  B  C  D
```

Move secondary actions to overflow.

### Tiny icon hit areas

A visually small header does not justify an inaccessible tap target.

### Per-module header geometry

Modules should not independently invent:

```text
different padding
different title placement
different action spacing
different button dimensions
```

without a semantic reason.

### Title sacrificed for actions

The current context is more important than exposing every possible action.

### Header as settings surface

Persistent configuration belongs in Settings or overflow, not permanently across every header.

---

## 24. Tailwind Vocabulary

The preferred header vocabulary is intentionally compact.

```text
Header boundary/surface
  w-full
  bg-*
  text-*
  outline
  px-4
  py-2

Header layout
  grid or flex
  items-center
  min-w-0

Leading
  shrink-0

Title
  min-w-0
  text-base
  truncate
  text-center where appropriate
  relative emphasis weight

Context title
  leading-tight
  max two lines

Trailing actions
  flex
  shrink-0
  items-center
  justify-end
  gap-1

Icon
  approximately 1.25em

Action target
  accessible minimum target
  independent of visual icon size
```

Exact CSS/grid implementation may evolve as long as it satisfies the semantic contract.

---

## 25. Migration Guidance for Existing Headers

Existing headers should be evaluated by semantic role rather than mechanically rewritten.

### `BufferHeader`

`BufferHeader` should become the normal implementation boundary for:

- header surface,
- structural separator,
- standard padding,
- and shared header geometry.

It should not require every module to recreate those rules.

### Bible header

The current Bible header uses a multi-column toolbar containing:

```text
Edit
Settings
Copy
Book/Chapter/Verse
Search
Menu
Close
```

Under this specification, the Bible header should eventually be reframed as:

```text
leading
interactive Bible location/context
highest-priority direct actions
overflow
```

The exact action assignment should be decided separately from this spec, but the seven equal toolbar positions are no longer the target layout.

### Existing simple headers

Headers such as `Strongs / Refs` already contain a recognizable title/action structure and should be normalized to the standard header contract rather than rebuilt as custom layouts.

---

## 26. Header Decision Summary

1. Headers are navigation and priority-action surfaces, not generic toolbars.
2. Every normal header has leading, title/context, and trailing regions.
3. The leading region contains at most one control.
4. The title/context region receives flexible space.
5. `0–2` trailing actions is preferred.
6. Three trailing slots total is the hard maximum.
7. Overflow counts as one trailing slot.
8. With overflow, the normal maximum is two direct actions plus overflow.
9. Secondary actions move to overflow.
10. Title readability takes priority over exposing secondary actions.
11. Normal titles remain one line and truncate when necessary.
12. Interactive contextual titles are supported and may use two compact lines.
13. Header icon buttons retain full touch targets even when visually quiet.
14. Action groups use compact spacing such as `gap-1`.
15. Header responsiveness follows pane/container width.
16. Stable action positions are preferred when state changes.
17. Disabled and hidden actions have different semantics.
18. Destructive secondary actions normally belong in overflow/body flows.
19. The header remains outside the primary body scroll.
20. The header/body separator must preserve layout geometry.
21. Icon-only actions require accessible names.
22. The app should need only Standard and Context header patterns for most views.
23. Existing arbitrary multi-column toolbars are migration targets toward this constrained model.

---

# 4. Lists and Cards

## 1. Design Principle

Lists should communicate the **semantic role of their items** before they communicate decoration.

KJVonly.bible recognizes three primary list patterns:

```text
Action List
Entity List
Informational / Content Group List
```

Cards are not a fourth generic list style.

Cards are a **containment tool** used only when a meaningful unit of related information benefits from being perceived as one object.

### Rule

> Choose the list pattern based on what an item represents, not based on how much visual styling is desired.

---

## 2. List Pattern Summary

| Pattern | Represents | Example |
|---|---|---|
| Action List | things the user can do | overflow menu, action menu |
| Entity List | things the user can open/select | plans, notes, resources |
| Informational List / Content Groups | structured information belonging together | readings in a plan, reading sessions |
| Card | meaningful contained unit | one reading session with multiple readings/metadata |

These patterns should cover most application lists.

---

# PART I — SHARED LIST RULES

## 3. Horizontal Gutter Ownership

A list must have **one owner** for horizontal padding.

Because `BufferBody` defaults to:

```text
px-4
```

normal inset content already has the application gutter.

### Inset list

When `BufferBody` owns the gutter:

```text
BufferBody
  px-4

List row
  py-3
```

Do **not** add another:

```text
px-4
```

to every row.

Otherwise the effective content gutter becomes doubled.

### Full-bleed list

When the list intentionally reaches the body edge:

```text
BufferBody
  no horizontal padding

List row
  px-4 py-3
```

### Rule

> The body or the row owns horizontal padding—never both.

This rule applies to all three list patterns.

---

## 4. Vertical Row Rhythm

The standard row rhythm is:

```text
py-3
```

for ordinary rows.

Use:

```text
py-4
```

when an entity or informational row contains enough content to benefit from additional breathing room.

Use smaller padding only for intentionally compact supporting content.

### Touch target

Interactive rows must still meet the minimum touch-target rule from the Foundations specification.

A short label does not justify a tiny tappable row.

---

## 5. Row Width

Interactive rows normally use:

```text
w-full
text-left
```

and should allow content to shrink safely:

```text
min-w-0
```

where needed.

Ordinary list rows should not produce horizontal page scrolling.

---

## 6. Typography Within Lists

List typography follows the Foundations specification.

### Primary item

```text
text-base
relative emphasis weight when needed
primary text color
```

### Secondary information

```text
text-sm
base weight
secondary text color
```

### Supporting metadata

```text
text-xs or text-sm
muted/secondary text color
```

### Important principle

Do not use very large typography simply because an item is the first line of a row.

For normal entity lists, avoid patterns such as:

```text
text-2xl
```

for every item title.

The hierarchy should remain restrained so lists scan efficiently on mobile.

---

## 7. Internal Text Spacing

Inside one list item:

```text
title -> metadata
  gap-1

title/metadata -> separate description block
  gap-2
```

A typical entity item:

```text
Plan Name
Author / metadata
Description
```

should use a compact vertical stack rather than arbitrary margins.

Prefer:

```text
flex flex-col gap-1
```

or:

```text
flex flex-col gap-2
```

depending on content complexity.

---

## 8. Separating Items

Whitespace is the default separator.

Do not automatically place a visible rule between every list item.

### Preferred hierarchy

Use:

1. row padding,
2. typography,
3. hover/pressed/selected surface changes,
4. group spacing,

before adding divider lines.

### Divider use

A divider may be used when:

- rows are visually dense,
- grouping would otherwise be ambiguous,
- or the list contains strongly tabular information.

When a divider is used, it should be subtle.

Because structural geometry matters in KJVonly.bible, avoid introducing separators that unexpectedly alter measured scroll/container dimensions.

Do not combine:

```text
large inter-item spacing
+
strong divider
+
card boundary
```

for the same separation.

---

## 9. Interaction Surface

When selecting an item opens the item, the **whole row** should normally be the interactive target.

Prefer:

```svelte
<button class="w-full ...">
```

or another semantically correct interactive element.

Avoid making only the title text clickable.

### Nested actions

Do not nest buttons inside buttons.

If a row requires a secondary trailing action:

```text
[row primary content]   [secondary action]
```

use a non-button row container with separate interactive children, or another semantic structure that avoids nested controls.

---

## 10. Pressed, Hover, Focus, and Selected States

All interactive rows support:

```text
default
hover
active/pressed
focus-visible
selected
disabled where applicable
```

### Mobile priority

`hover:` is supplemental.

The UI must still communicate interaction without hover.

### Pressed

Use a subtle temporary surface change.

### Selected

Selected state must be distinguishable from pressed state and should use the semantic selected surface.

### Focus

Keyboard focus must remain clearly visible and distinct from structural outlines.

---

## 11. Text Wrapping and Truncation

### Titles

Entity titles should normally remain concise.

Use wrapping when a title genuinely requires it.

Use truncation only when preserving row height is more valuable than displaying the full title.

### Descriptions

Descriptions in lists should normally be limited:

```text
line-clamp-2
```

or, where necessary:

```text
line-clamp-3
```

Full descriptions belong in the detail view.

### Metadata

Short metadata should remain compact and may use:

```text
whitespace-nowrap
```

when wrapping would make it harder to scan.

Do not use `whitespace-nowrap` on long human-readable descriptions.

---

## 12. Leading and Trailing Regions

List items may have:

```text
optional leading
main content
optional trailing
```

### Leading

Typical uses:

- status icon,
- resource/type icon,
- checkbox/selection affordance.

Leading decoration should be minimal.

### Trailing

Typical uses:

- progress,
- completion icon,
- short metadata,
- disclosure/navigation indicator,
- secondary action.

The main text area must remain:

```text
min-w-0
flex-1
```

so trailing metadata does not force overflow.

---

# PART II — ACTION LISTS

## 13. Action List Purpose

An Action List represents **commands**, not objects.

Examples:

```text
Search
Split Pane
Settings
Copy
Remove
```

Primary uses include:

- overflow menus,
- contextual menus,
- simple action views.

---

## 14. Action List Row

The standard action row is visually simple.

Conceptually:

```text
[optional icon]  Action label          [optional trailing state]
```

Recommended vocabulary:

```text
flex
w-full
items-center
gap-3
py-3
text-base
text-left
```

If the list owns horizontal gutter:

```text
px-4 py-3
```

### Typography

Action label:

```text
text-base
base or emphasis weight
```

Do not use large headings inside action rows.

---

## 15. Action List Density

Action lists should remain compact and easy to scan.

Do not use:

- cards,
- descriptions by default,
- large gaps between each action,
- decorative headings for every small group.

A secondary explanation is allowed only when the command would otherwise be ambiguous.

If many actions require explanations, the interaction probably belongs in a normal screen rather than an overflow menu.

---

## 16. Action Groups

Related commands may be grouped.

Prefer whitespace/group spacing first.

Use a subtle separator only when distinct categories materially improve scanning.

Example:

```text
Search
Split Pane

Settings
Remove
```

Destructive actions should normally appear at the end of the action list or in a clearly separated group.

---

## 17. Destructive Actions

Destructive commands use the semantic danger treatment.

Do not make every destructive row visually loud.

The danger treatment should identify the action without overpowering the rest of the menu.

Destructive state must not depend on color alone where ambiguity is possible.

---

# PART III — ENTITY LISTS

## 18. Entity List Purpose

An Entity List represents **things** the user can inspect, select, or open.

Examples:

```text
available reading plans
subscribed plans
notes
resources
publishers
modules
```

Entity lists are the default pattern for browsable collections.

---

## 19. Entity List Structure

A normal entity row may contain:

```text
Primary title
Secondary metadata
Optional short description
Optional trailing status
```

Example:

```text
Morning and Evening                 37%
Robert Murray M'Cheyne
Read through the Bible with...
```

### Recommended layout

```text
row
  main content flex-1 min-w-0
    title
    metadata
    optional description
  trailing
```

---

## 20. Entity Typography

### Title

```text
text-base
relative emphasis weight
primary text
```

### Metadata

```text
text-sm
secondary text
```

### Description

```text
text-sm
secondary text
line-clamp-2 or line-clamp-3
```

### Trailing progress/state

```text
text-sm
semantic state color where useful
```

Avoid using `text-2xl` as the normal list-item title size.

Large typography should be reserved for detail/content hierarchy, not repeated collection rows.

---

## 21. Entity Row Spacing

Recommended:

```text
py-3
```

for a title + small metadata row.

Use:

```text
py-4
```

for title + description + trailing metadata.

Within the item:

```text
gap-1
```

between tightly related title/metadata.

Use:

```text
gap-2
```

before a separate description block when needed.

---

## 22. Entity List vs Card

Do not turn an entity into a card merely because it contains:

- a title,
- metadata,
- and a short description.

That is still an Entity List row.

A card becomes appropriate only when the item contains multiple internal regions or needs to be perceived as an independent contained object.

### Default

```text
Plans list -> Entity List
Notes list -> Entity List
Resource list -> Entity List
```

not cards.

---

## 23. Progress and Status

Progress is supporting information.

Examples:

```text
37%
Completed
Pending
Installed
```

It should normally sit in the trailing region or beneath the title as metadata.

Progress should not visually compete with the entity title.

If exact progress is important:

```text
37%
```

is preferable to a visually heavy progress component unless the progress bar itself provides meaningful scanning value.

---

# PART IV — INFORMATIONAL LISTS AND CONTENT GROUPS

## 24. Informational List Purpose

An Informational List primarily presents structured content rather than a collection of named entities.

Examples:

```text
readings within a reading plan
Bible references belonging to a reading session
completion history
content grouped by day/session
```

The meaningful unit must be identified before choosing the visual structure.

---

## 25. Identify the Semantic Unit

For reading plans:

```text
Genesis 27
Matthew 26
Esther 3
Acts 26
```

may all belong to:

```text
Reading 14
```

or:

```text
Day 14
```

The **reading session/day** is the meaningful unit.

The individual Bible references are children of that unit.

### Rule

> Group by the object the user thinks of as one task or one piece of information.

Do not give every child reference its own card.

---

## 26. Informational Group Structure

A standard reading group may look like:

```text
Reading 14                       14 of 365
Genesis 27
Matthew 26
Esther 3
Acts 26
Verses: 84
```

The group may be rendered as:

- a structured flat row,
- a section,
- or a restrained card.

Choose containment based on complexity.

---

## 27. Flat Informational Row

Use a flat informational row when the group is simple enough to scan without a visual container.

Typical structure:

```text
main reading content
trailing sequence/progress metadata
supporting totals
```

Recommended spacing:

```text
py-4
```

because informational rows often contain more content than action/entity rows.

The main content and trailing metadata should use flexible layout:

```text
flex
gap-4
min-w-0
```

and wrap or stack naturally when the pane becomes narrow.

---

## 28. Narrow Informational Layout

Do not force a two-column layout below the width where it remains readable.

A pattern such as:

```text
readings | progress metadata
```

may stack on narrow panes:

```text
readings
progress metadata
```

or move secondary metadata beneath the primary content.

### Rule

> Preserve the reading/content first; reposition metadata before shrinking the text.

Hard-coded large minimum widths should be avoided when they force horizontal overflow in narrow panes.

---

# PART V — CARDS

## 29. Card Purpose

A card communicates:

> **This information belongs together as one meaningful contained unit.**

Cards are appropriate when a group has enough internal structure that visual containment improves comprehension.

Examples:

- one day's reading assignment containing several references,
- a summary object containing status + metadata + actions,
- a meaningful grouped information block.

Cards are not the default list row.

---

## 30. Card Default

A restrained card uses:

```text
rounded-lg
p-4
grouped/raised surface
subtle boundary where necessary
no shadow by default
```

Boundary choice follows the Foundations specification:

```text
border
```

when participating in the card box model is acceptable,

or:

```text
outline
```

when geometry must remain unchanged.

### Rule

Do not add shadows merely to make the card visibly "card-like."

---

## 31. Card Spacing

Inside a card:

```text
gap-2
```

for related content.

Use:

```text
gap-4
```

between distinct internal regions.

Between cards:

```text
gap-4
```

is the normal starting point.

Cards already provide containment, so large additional separation is usually unnecessary.

---

## 32. Card Typography

Cards follow the same typography hierarchy as other content.

A card title is typically:

```text
text-base
relative emphasis weight
```

or:

```text
text-lg
```

only when the card is a substantial content unit.

Do not make every card heading large simply because it is inside a card.

---

## 33. Cards Within Lists

A list of cards is acceptable when each card truly represents a substantial independent unit.

However, avoid:

```text
card
card
card
card
```

for simple one-line or two-line rows.

### Practical rule

If removing the card boundary does not make the semantic grouping harder to understand, the item probably does not need a card.

---

# PART VI — READING PLAN APPLICATION

## 34. Available Plans

Available/discovered plans should use an **Entity List**.

Recommended hierarchy:

```text
Plan name
Short description
optional metadata
```

Example:

```text
Morning and Evening
Read through the Bible with four daily readings...
```

Use:

```text
text-base + emphasis
text-sm + secondary
```

rather than the current repeated large-title treatment.

The whole row is tappable.

---

## 35. My Plans

Subscribed plans should also use an **Entity List**.

Recommended:

```text
Plan name                              37%
Short description
```

The percentage is trailing supporting metadata.

The plan name should remain `text-base` rather than `text-2xl`.

---

## 36. Next Readings

"Next Readings" is richer than a normal entity list.

Each row represents:

```text
plan
+
next reading session
+
progress
+
reading references
```

This can use either:

- a rich informational row,
- or a restrained card if containment materially improves scanning.

If cards are introduced, this is one of the strongest candidates.

Do not make each individual Bible reference a card.

---

## 37. Plan Details — Reading Sessions

A Plan Details view contains a sequence of reading sessions.

The semantic structure is:

```text
Plan
  Reading 1
    reference
    reference
  Reading 2
    reference
    reference
```

The preferred presentation is a series of **informational groups**.

Each reading session may use:

```text
Reading 1
references...
```

with restrained grouping.

A card is optional, not mandatory.

If cards are used, the card represents the entire reading session.

---

## 38. Reading References

Individual Bible references are compact child content.

Example:

```text
Genesis     27:1-20
Matthew     26
```

They should use a compact aligned structure.

A table, grid, or flex pattern may be used as long as it:

- preserves readable alignment,
- adapts to narrow panes,
- avoids unnecessary borders,
- and remains semantically appropriate.

The references themselves should not gain card boundaries.

---

## 39. Completed Reading State

Completed readings need a state beyond color alone.

Preferred signals may include:

```text
check icon
Completed label
semantic completion color
```

Completion styling should de-emphasize without making the reading unreadable.

Do not use completion color as the sole signal.

---

## 40. Show/Hide Completed Content

When a list can hide completed items, the state-changing control belongs in the header or relevant control area according to the Header specification.

The list itself should simply render the appropriate rows.

Filtering should not change the fundamental row design.

---

# PART VII — LIST STATES

## 41. Empty State

An empty list is not rendered as an empty box.

It should use the application Empty State pattern defined later in the States specification.

Examples:

```text
No plans yet
No notes
No discovered resources
```

The empty state replaces the list content.

---

## 42. Loading State

Loading should preserve expected list geometry where practical and avoid sudden large layout shifts.

Detailed loading behavior will be defined in the States specification.

Do not render fake cards purely because loading placeholders are convenient.

Loading presentation should match the eventual list pattern.

---

## 43. Error State

An error affecting the entire collection belongs at the list/body level.

An error affecting one entity belongs with that entity only when recovery is entity-specific.

Detailed error treatment will be defined in the States specification.

---

# PART VIII — ACCESSIBILITY

## 44. Semantic Elements

Use semantic interactive elements whenever possible.

Preferred:

```text
button
a
```

rather than:

```text
div role="button"
```

when native semantics can represent the interaction.

Native controls reduce the amount of keyboard and accessibility behavior that must be reimplemented.

---

## 45. Keyboard Behavior

Interactive rows must support:

```text
Tab focus
Enter/Space activation where appropriate
visible focus
```

Using a native `button` provides much of this behavior automatically.

Avoid manually implementing only `Enter` while omitting normal button behavior.

---

## 46. Reading Order

Visual placement must not create a confusing DOM reading order.

Trailing metadata should follow the primary content logically.

Responsive stacking should preserve meaningful reading order.

---

# PART IX — ANTI-PATTERNS

## 47. Avoid Cardification

Do not use cards simply because Material Design uses cards.

Avoid:

```text
one simple row = one card
```

Cards are reserved for meaningful containment.

---

## 48. Avoid Oversized Entity Titles

Repeated:

```text
text-2xl
```

titles inside lists create unnecessary visual noise and reduce scan density.

Normal entity titles use:

```text
text-base
relative emphasis
```

---

## 49. Avoid Double Gutters

Do not combine:

```text
BufferBody px-4
+
row px-4
```

without intentionally wanting a doubled inset.

Horizontal padding has one owner.

---

## 50. Avoid Forced Two-Column Widths

Do not rely on large fixed/minimum widths such as:

```text
min-w-50 + min-w-50
```

when the row must work in a narrow split pane.

Allow rich informational rows to stack or wrap.

---

## 51. Avoid Visual Separation Overload

Do not simultaneously use:

```text
large gap
border/divider
different surface
rounded card
shadow
```

to distinguish ordinary list items.

Use the minimum visual treatment that clearly communicates structure.

---

## 52. Avoid Non-semantic Clickable Containers

Prefer native interactive elements over:

```text
div tabindex="0" role="button"
```

when the interaction is simply a button/link.

---

# PART X — TAILWIND VOCABULARY

## 53. Shared List Vocabulary

```text
Container
  flex
  flex-col
  w-full
  min-w-0

Inset list
  BufferBody owns px-4

Full-bleed list
  BufferBody no horizontal gutter
  row owns px-4

Row
  w-full
  min-w-0
  py-3
  py-4 for rich rows
  text-left

Internal layout
  flex
  flex-col
  flex-1
  min-w-0
  gap-1
  gap-2
  gap-3
  gap-4

Primary text
  text-base

Secondary
  text-sm

Supporting
  text-xs / text-sm

Descriptions
  line-clamp-2
  line-clamp-3

Card
  rounded-lg
  p-4
  gap-2 / gap-4
  no shadow by default
```

Exact theme color utilities are supplied by the theme system and semantic state rules.

---

# PART XI — DECISION SUMMARY

## 54. Lists and Cards Decisions

1. KJVonly.bible uses three primary list semantics: Action, Entity, and Informational/Content Group.
2. Cards are a containment primitive, not a generic list style.
3. Horizontal padding has one owner: `BufferBody` or the row.
4. Standard rows use `py-3`; rich informational rows may use `py-4`.
5. Interactive rows use the full row as the primary target.
6. Normal list titles use `text-base`, not repeated `text-2xl`.
7. Secondary information uses `text-sm`.
8. Descriptions are normally clamped to two or three lines in collection views.
9. Whitespace is the default item separator.
10. Divider lines are optional and should remain subtle.
11. Hover is supplemental; pressed, focus, and selected states must work without hover.
12. Action Lists are compact, flat, and card-free.
13. Entity Lists are the default for plans, notes, resources, and similar browsable objects.
14. Title + metadata + description does not by itself justify a card.
15. Informational lists group content by the meaningful user task/object.
16. In reading plans, the reading session/day is the meaningful group; individual Bible references are child content.
17. Rich reading sessions may use restrained cards when containment materially improves scanning.
18. Individual Bible references should not become cards.
19. Cards use `rounded-lg`, restrained surface/boundary treatment, `p-4`, and no default shadow.
20. Progress/status is supporting information and should not overpower the primary content.
21. Completed state must not rely on color alone.
22. Rich informational layouts must stack/wrap in narrow panes rather than forcing horizontal overflow.
23. Native semantic controls are preferred over manually simulated clickable `div`s.
24. Empty/loading/error presentation follows the eventual semantic list type.
25. New list variants should only be introduced when one of these three patterns cannot express a repeated real use case.

---

# 5. Controls

## 1. Control Principles

Controls should be:

- obvious enough to discover,
- visually restrained,
- large enough to use comfortably on mobile,
- semantically correct,
- consistent across modules,
- and responsive to the user's configured font size and weight.

The application should avoid creating many visually different button types for interactions that have the same semantic purpose.

### Core control set

Most UI should be expressible with:

```text
Icon Button
Action Button
Choice Button
Text Input
Checkbox
Switch / Toggle
```

Specialized controls should only be introduced when these cannot express a repeated real interaction.

---

# PART I — SHARED CONTROL RULES

## 2. Native Semantics First

Use native HTML controls whenever they correctly represent the interaction:

```text
button
input
textarea
select
checkbox
radio
```

Prefer native controls over manually recreating their keyboard and accessibility behavior.

### Rule

> Styling should adapt native semantics, not replace them unnecessarily.

A control that behaves like a button should normally be a `<button>`.

---

## 3. Touch Targets

Mobile touch usability is mandatory.

The visual content of a control may be compact, but its interactive target must remain large enough to tap reliably.

Normal interactive controls should target approximately:

```text
min-h-11
to
min-h-12
```

with an accessible physical minimum that does not become too small when the application's root font size is reduced.

### Important distinction

```text
visual icon size != interactive target size
```

An icon may remain approximately:

```text
1.25em
```

while its button target is substantially larger.

---

## 4. Typography

Controls follow the Foundation typography hierarchy.

Normal control labels use:

```text
text-base
base or emphasis weight
```

Compact secondary form labels may use:

```text
text-sm
```

Do not use arbitrary fixed font weights that can become lighter than the user's configured application weight.

---

## 5. Control States

Reusable controls should consistently support:

```text
default
hover
active / pressed
focus-visible
selected / checked where applicable
disabled
loading where applicable
error where applicable
```

### Hover

Hover is supplemental only.

The control must remain understandable and usable on touch devices without hover.

### Pressed

Pressed state should provide immediate, subtle feedback without changing layout.

### Focus

Focus must be clearly visible and distinguishable from structural outlines.

### Disabled

Disabled controls:

- remain recognizable,
- use reduced visual emphasis,
- do not respond to pointer interaction,
- and should still communicate their label.

A typical existing pattern such as:

```text
disabled:pointer-events-none
disabled:opacity-50
```

is appropriate as a baseline.

---

## 6. Layout Stability

Control state changes must not change the control's external dimensions.

Examples:

```text
default -> selected
enabled -> disabled
save -> saving
unchecked -> checked
```

should not cause neighboring content to shift.

Where labels change, reserve enough flexible space or use a stable icon/control slot where practical.

---

# PART II — ICON BUTTONS

## 7. Icon Button Purpose

Icon Buttons are compact controls for common actions that are recognizable through an icon.

Examples:

```text
Back
Close
Search
Edit
Add
Delete
Save
Overflow
Split
```

`KJVButton` is the natural reusable primitive for this role.

---

## 8. Icon Button Geometry

A normal icon button should provide:

```text
large touch target
centered icon
approximately 1.25em visual icon size
```

The control may visually use:

```text
rounded-full
```

when a circular button treatment is appropriate.

### Quiet variant

Headers and inline form actions frequently need a visually quiet icon button.

A quiet icon button should remove heavy permanent decoration **without removing the touch target**.

This distinction should eventually be represented explicitly in `KJVButton`.

### Anti-pattern

Do not use:

```svelte
<KJVButton classes="">
```

as a way to remove all dimensions and styling if it also removes the accessible interaction target.

---

## 9. Icon Button Visual Treatments

Most use cases can be covered by two treatments.

### Standard icon button

Used where the control benefits from visible containment.

Conceptually:

```text
rounded-full
surface background
subtle ring/outline
text-primary
```

### Quiet icon button

Used in:

- headers,
- tightly grouped toolbar actions,
- inline field actions.

Conceptually:

```text
transparent background
no permanent heavy boundary
full touch target retained
```

Do not create a unique icon-button treatment for every module.

---

## 10. Icon Button Labels

Icon-only buttons require accessible names.

Use:

```text
aria-label
```

or equivalent accessible text such as:

```text
sr-only
```

Examples:

```text
Add relay
Delete relay
Close settings
Search Bible
Save font size
```

The label should describe the action, not the shape of the icon.

---

# PART III — ACTION BUTTONS

## 11. Action Button Purpose

Action Buttons contain visible text and perform an immediate operation.

Examples:

```text
Save
Import
Export
Subscribe
Create Plan
Retry
```

`KJVButtonRounded` or a successor component can represent this category.

---

## 12. Action Hierarchy

The application should use a small action hierarchy.

### Primary action

The most important immediate action in a local context.

Use a clear accent/selected surface.

Examples:

```text
Save
Create
Import
Subscribe
```

### Secondary action

A valid but less prominent action.

Use restrained containment.

Examples:

```text
Cancel
Preview
Reset
```

### Destructive action

An action with destructive consequences.

Use the semantic danger treatment and confirmation where appropriate.

Examples:

```text
Delete
Remove
Discard
```

### Rule

A screen should rarely contain several visually competing "primary" buttons.

---

## 13. Action Button Geometry

Normal text buttons should use:

```text
min-h-11 / min-h-12
px-4
rounded-lg
```

or the established equivalent.

Avoid arbitrary fixed widths where the label should determine the control width.

A minimum width is acceptable where it creates useful consistency, but should not force awkward layout in narrow panes.

---

## 14. Full-width Actions

Full-width action buttons are appropriate when:

- the action is the dominant next step,
- the screen is narrow,
- and a large target improves clarity.

Example:

```text
Create Plan
```

Do not use full-width controls merely to fill empty space.

---

# PART IV — CHOICE BUTTONS

## 15. Choice Button Purpose

Choice Buttons represent discrete selectable options.

This is the pattern currently used effectively for:

```text
Font Family
Font Weight
Color Theme
Bible display settings
```

Examples:

```text
Serif
Sans
Mono

300
400
500

Paragraphs
Pericopes
Max Width
```

Choice Buttons are particularly appropriate when all options can be shown directly without opening another control.

---

## 16. Choice Button Layout

Choice groups normally use:

```text
flex
flex-wrap
gap-2
```

This is preferred over a horizontally scrolling selector for normal Settings screens.

Each choice uses:

```text
px-3
py-2
```

with sufficient minimum touch height.

### Selected state

Selected choices use:

```text
selected/accent background
contrasting text
```

Unselected choices use:

```text
base surface
subtle structural boundary
primary text
```

The selected state must be more than a slight text-color change.

---

## 17. Choice Button Semantics

### Single-select group

Examples:

```text
font family
font weight
color theme
```

Only one option is active.

The conceptual semantics are similar to a radio group.

Where practical, accessibility semantics should communicate that relationship.

### Independent boolean choice

Examples:

```text
Show Paragraphs
Show Pericopes
Max Width
```

Each item represents an independent on/off preference.

Use:

```text
aria-pressed
```

on button-based toggles.

This is appropriate for the current Bible Settings treatment.

---

## 18. When to Use Choice Buttons

Prefer Choice Buttons when:

- the number of choices is small,
- labels are short,
- all choices benefit from being visible,
- and direct tapping is faster than opening another selector.

Do not use them for:

- very long option lists,
- long descriptive choices,
- values that require searching,
- or content that wraps into large button blocks.

Those cases need a list/detail or another selection view.

---

# PART V — TEXT INPUTS

## 19. Text Input Purpose

Text inputs are for editable textual/numeric data.

Examples:

```text
profile name
relay URL
search query
font size number
```

A normal text input should visually communicate a clear editable region without unnecessary decoration.

---

## 20. Text Input Geometry

Recommended baseline:

```text
w-full
min-w-0
p-2 or px-3 py-2
primary text
base surface
```

The input must remain usable when text scales.

Prefer minimum height over fixed height for normal text-bearing controls.

---

## 21. Input Boundaries

Inputs require a visible boundary or affordance.

Both of these patterns are valid:

### Contained input

```text
outline outline-neutral-*
rounded-lg where appropriate
px-3 py-2
```

### Underline/search input

```text
border-b
outline-none
```

when used in a clearly established search/input surface.

### Geometry note

Using an `outline` for a contained input is valid when preserving exact box geometry is useful.

Focus styling must remain visually distinguishable from the normal structural outline.

---

## 22. Labels

Form labels should normally appear above the field.

Preferred structure:

```text
label
gap-2
input
```

Avoid styling labels through decorative conventions such as permanent underline unless the underline communicates something meaningful.

Normal label treatment:

```text
text-base
relative emphasis
```

or:

```text
text-sm
relative emphasis
```

for compact supporting forms.

Labels should use normal capitalization appropriate to the content rather than relying on CSS `capitalize` for arbitrary strings.

---

## 23. Placeholder Text

Placeholder text is supporting information, not a replacement for a label when the field's purpose would otherwise become unclear.

Examples:

```text
wss://relay.example
Search
```

Use secondary/muted text treatment.

Do not put critical validation instructions only in the placeholder.

---

## 24. Input Actions

A field may have a trailing or adjacent action.

Example:

```text
font-size input + save
relay URL + delete
```

Use:

```text
flex
items-center
gap-2
```

The input gets:

```text
flex-1
min-w-0
```

The action retains its normal touch target.

Do not shrink the action to the visual icon size merely to fit beside the field.

---

## 25. Numeric Inputs

Numeric values should still use labeled input semantics.

For user-configurable font size:

```text
label
numeric input
apply/save action when needed
preview
```

If changes are not immediately committed, the action should clearly indicate that the displayed value differs from the saved setting.

The preview is informational content, not part of the input itself.

---

# PART VI — SEARCH INPUTS

## 26. Search Input

Search is a specialized text-input context.

A search input should:

- remain prominent enough to find,
- use full available width,
- avoid excessive chrome,
- and keep the query visible while results scroll where the design requires it.

The existing bottom-border search treatment is appropriate for a restrained UI.

Example vocabulary:

```text
w-full
border-b
border-primary-*
bg-surface
outline-none
```

### Sticky search

A sticky search area may use:

```text
sticky
top-0
```

when search refinement must remain accessible while results scroll.

The sticky control should use the appropriate surface so scrolling content does not show through it.

---

# PART VII — CHECKBOXES

## 27. Checkbox Purpose

Checkboxes represent independent multiple-selection or boolean values where the familiar checkbox metaphor is useful.

The current Profile relay configuration is a good example:

```text
Read
Write
```

Both may be independently enabled.

---

## 28. Checkbox Layout

Recommended pattern:

```text
<label class="flex items-center gap-2">
    <input type="checkbox" />
    <span>Label</span>
</label>
```

The label and checkbox together should create a comfortable touch target.

For small inline groups:

```text
flex
flex-wrap
gap-4 or gap-6
```

is appropriate.

### Accent

Using the semantic/theme accent color through native checkbox accent styling is appropriate.

---

## 29. Checkbox vs Choice Button

Use a checkbox when:

- the standard checkbox metaphor improves clarity,
- multiple independent values are shown together,
- and compactness is useful.

Use an independent Choice Button when:

- the setting is part of a visual/settings option group,
- direct selected-surface feedback fits the rest of the screen,
- and the button itself represents the complete option.

Consistency within a section matters more than forcing every boolean in the application into one widget.

---

# PART VIII — SWITCHES / TOGGLES

## 30. Switch Purpose

Switches are supported but specialized.

Use a switch when the interaction semantically means:

```text
immediately enable / disable a persistent behavior
```

and the on/off nature benefits from being visible as a switch.

Do not use switches automatically for every boolean setting.

The current move toward selected Choice Buttons for Bible display preferences is a valid and often clearer Settings pattern.

---

## 31. Switch Layout

A switch should normally appear in a labeled row:

```text
Setting label                          [switch]
optional supporting text
```

not as an isolated unlabeled control.

The switch's entire labeled row should provide a comfortable interaction target when practical.

---

## 32. Switch Accessibility

A switch must expose its checked state through native checkbox semantics or appropriate switch semantics.

The visible movement/color of the thumb is not sufficient on its own.

Focus state must remain visible.

---

# PART IX — FORM STRUCTURE

## 33. Form Sections

Forms use the same Section system defined in Layout.

Typical structure:

```text
Section
  section title
  optional supporting text

  Field
  Field
  Field
```

Standard spacing:

```text
gap-4
```

between fields.

Use:

```text
gap-6
```

between major form sections.

---

## 34. Field Structure

A normal field is:

```text
label
control
optional supporting/error text
```

Recommended:

```text
flex
flex-col
gap-2
```

For tightly related label/supporting metadata, `gap-1` is acceptable.

---

## 35. Form Actions

Form actions should be placed predictably.

For a short mobile form:

```text
fields

primary action
optional secondary action
```

If Save belongs naturally in the header under the Header specification, do not duplicate a second Save button in the body without a clear reason.

### Rule

> Each action should have one obvious primary location.

---

# PART X — VALIDATION AND ERRORS

## 36. Validation

Validation should occur at the level where the user can correct the problem.

For a specific invalid field, prefer:

```text
field
error/supporting text
```

over relying exclusively on a toast.

A toast may still summarize an operation failure or global issue.

---

## 37. Field Error State

An invalid field should use:

- semantic danger boundary/text,
- supporting error text,
- and accessible invalid-state semantics.

Do not rely on red alone.

Example:

```text
Relay URL
[input with error state]
Enter a valid ws:// or wss:// relay URL.
```

---

## 38. Save Failures

Operation-level failures may use the Feedback system defined later.

Examples:

```text
Unable to save Profile
Import failed
Publication failed
```

If the failure maps to a specific field, also show the field-level error where possible.

---

# PART XI — LOADING CONTROLS

## 39. Loading Action

When a control starts an asynchronous operation:

```text
Save
Import
Export
Subscribe
```

the control should prevent duplicate activation while the operation is active.

### Preferred behavior

```text
same dimensions
disabled interaction
clear loading state
```

The loading state may:

- change the label (`Save` -> `Saving…`),
- show a compact progress indicator,
- or change the icon,

as long as layout remains stable.

---

## 40. Saving in Headers

For header actions such as Save:

- preserve the action's slot,
- disable repeated activation,
- keep the title/action geometry stable.

Do not remove the Save control entirely while saving.

---

# PART XII — DESTRUCTIVE CONTROLS

## 41. Destructive Actions

Destructive controls use semantic danger treatment.

Examples:

```text
Delete note
Delete relay
Unsubscribe
Discard changes
```

A delete icon alone should still have an accessible action label.

### Confirmation

Confirmation is required when the destructive action:

- cannot be easily undone,
- removes substantial user content,
- or has consequences that may not be obvious.

Not every removable transient row requires a full confirmation dialog.

The confirmation policy will be refined under Overlays/Feedback.

---

# PART XIII — SETTINGS-SPECIFIC CONTROL RULES

## 42. Settings Presentation

Settings should prefer direct visible choices when practical.

Current appropriate patterns include:

```text
Color Theme:
  flex-wrap Choice Buttons

Font Family:
  flex-wrap Choice Buttons

Font Weight:
  flex-wrap Choice Buttons

Bible display preferences:
  independent Choice Buttons
```

This creates a consistent Settings grammar.

---

## 43. Selected Settings

Selected options use the shared selected-state treatment:

```text
bg-primary-*
contrasting text
```

Unselected options use the normal surface and a subtle boundary.

Avoid adding checkmarks to every selected chip unless the state is otherwise ambiguous.

---

## 44. Settings Sections

Do not implement section labels as unrelated:

```text
ps-4
```

followed by independent:

```text
p-4
```

containers if the surrounding layout already owns its gutter.

Under the Layout specification, each Settings section should instead follow:

```text
Section
  heading
  content
```

with one consistent horizontal gutter owner.

---

# PART XIV — ACCESSIBILITY

## 45. Accessible Names

Every control must expose a meaningful accessible name.

Icon-only actions require explicit names.

Inputs require labels through:

```text
<label for>
aria-label
aria-labelledby
```

depending on the structure.

Visible labels are preferred when practical.

---

## 46. State Semantics

Use the appropriate semantic state:

```text
disabled
checked
aria-pressed
aria-expanded
aria-selected
aria-invalid
```

rather than expressing the state only through color/classes.

---

## 47. Keyboard Interaction

Native buttons and inputs should preserve normal keyboard behavior.

Do not remove focus outlines without replacing them with a visible `focus-visible` treatment.

Choice Buttons must be keyboard operable.

Complex single-select groups may later adopt radio-group keyboard semantics when warranted.

---

# PART XV — ANTI-PATTERNS

## 48. Avoid Raw Class Overrides as Variants

Avoid making every use of `KJVButton` define its own complete `classes` string.

That bypasses the shared control contract and makes touch-target regressions easy.

Prefer semantic variants such as conceptually:

```text
icon standard
icon quiet
action primary
action secondary
action destructive
```

The exact component API can be designed during implementation.

---

## 49. Avoid Tiny Icon Buttons

Do not reduce a control to:

```text
icon dimensions only
```

because it appears inside a header or input row.

Keep the target large.

---

## 50. Avoid Border/Outline Noise

Controls need enough boundary to communicate interaction.

Do not stack:

```text
ring
border
outline
shadow
```

on the same ordinary control.

Use the minimum treatment necessary.

---

## 51. Avoid Every Boolean as a Switch

Switches are not inherently more modern or more Material.

Use:

- Choice Button,
- Checkbox,
- or Switch

according to the interaction semantics.

---

## 52. Avoid Hidden Labels

Placeholder-only forms reduce clarity.

Visible labels should remain the default for persistent form fields.

Search is a reasonable exception when the purpose is already unambiguous.

---

## 53. Avoid Fixed Widths for Text Controls

Do not make action buttons or choice buttons fixed-width unless the interaction genuinely requires equal sizing.

Let text and container width determine the control naturally.

---

# PART XVI — TAILWIND VOCABULARY

## 54. Preferred Control Vocabulary

```text
Shared
  min-w-0
  text-base
  disabled:opacity-50
  disabled:pointer-events-none
  focus-visible:*

Icon Button
  large minimum target
  rounded-full
  flex
  items-center
  justify-center
  icon ~1.25em

Action Button
  min-h-11 / min-h-12
  px-4
  rounded-lg

Choice Group
  flex
  flex-wrap
  gap-2

Choice
  px-3
  py-2
  selected surface
  subtle boundary

Field
  flex
  flex-col
  gap-2

Text Input
  w-full
  min-w-0
  px-3
  py-2
  outline or border affordance

Inline Field + Action
  flex
  items-center
  gap-2
  input flex-1 min-w-0

Checkbox Label
  flex
  items-center
  gap-2

Form
  gap-4 between fields
  gap-6 between sections
```

Theme-specific colors remain controlled by the existing theme system.

---

# PART XVII — IMPLEMENTATION DIRECTION

## 55. Reusable Control API Direction

The existing controls are useful starting points, but the design specification suggests moving from arbitrary class replacement toward semantic variants.

Conceptually, a future shared API might express:

```text
KJVButton
  variant:
    icon
    icon-quiet
    primary
    secondary
    destructive

  selected
  disabled
  loading
```

This is a design direction, not an immediate implementation requirement.

Do not refactor purely to match a theoretical API until the existing uses are audited.

---

## 56. Choice Control Reuse

The repeated Settings patterns for:

- font family,
- font weight,
- theme,
- Bible display options

may eventually justify a shared Choice Button or Choice Group primitive.

The shared component should only be introduced after confirming the repeated requirements are genuinely identical.

The design contract comes first; component extraction follows repeated implementation.

---

# PART XVIII — DECISION SUMMARY

## 57. Controls Decisions

1. The core control set is Icon Button, Action Button, Choice Button, Text Input, Checkbox, and Switch.
2. Native HTML semantics are preferred.
3. Visual icon size and touch-target size are separate concerns.
4. Touch targets retain an accessible physical minimum despite root font-size scaling.
5. Controls support consistent pressed, focus, disabled, selected, loading, and error states as applicable.
6. Control state changes should not cause layout shift.
7. `KJVButton` is the primary icon-button primitive.
8. Header/inline quiet icon buttons keep their full hit area.
9. Icon-only buttons require accessible action names.
10. Action buttons use a small primary/secondary/destructive hierarchy.
11. Normal action buttons use restrained `rounded-lg` geometry and sufficient vertical target size.
12. Choice Buttons are the preferred direct-selector pattern for small visible option sets.
13. Choice groups use `flex flex-wrap gap-2`.
14. Button-based booleans use `aria-pressed`.
15. Text inputs use normal field labels and clear editable boundaries.
16. Structural input outlines are valid when geometry preservation matters.
17. Field focus must remain distinct from the normal input boundary.
18. Inputs paired with actions use `flex-1 min-w-0` plus a full-sized action target.
19. Search may use a restrained bottom-border input treatment.
20. Checkboxes are appropriate for compact independent multi-select values such as relay read/write.
21. Switches are specialized and are not the default representation of every boolean.
22. Form fields normally use `gap-2`; fields use `gap-4`; sections use `gap-6`.
23. Field-specific validation should appear at the field rather than only in a toast.
24. Async action controls disable duplicate activation and preserve their dimensions while loading.
25. Destructive actions use semantic danger treatment and confirmation when consequences warrant it.
26. Settings should continue using direct visible choices where the option set is small.
27. Settings sections should use the shared Layout section/gutter rules rather than independent padding conventions.
28. Arbitrary full `classes` overrides on shared controls should gradually give way to semantic variants.
29. Reusable Choice components should be extracted only after repeated behavior is confirmed.
30. New control patterns should only be introduced when the core set cannot cleanly represent a repeated real use case.

---

# 6. Navigation and Overlays

## 1. Navigation Principles

KJVonly.bible has more than one kind of navigation.

The design system distinguishes:

```text
Workspace navigation
Module-local navigation
Transient overlay navigation
```

These are different interactions and should not be represented by the same behavior.

### Workspace navigation

Changes which module occupies a pane or changes the pane layout.

Examples:

```text
open Bible
open Notes
replace current module
split pane
close pane
```

### Module-local navigation

Changes the view *inside* an existing module instance.

Examples:

```text
Plans list -> Plan details
Settings -> Appearance
Profile -> Relay editor
Notes list -> Note detail
```

### Transient overlay navigation

Temporarily places UI above the current view without replacing the underlying navigation state.

Examples:

```text
overflow menu
popup
confirmation dialog
context menu
```

### Rule

> Navigation type is determined by the user's mental model, not by which component is easiest to render.

---

# PART I — MODULE-LOCAL NAVIGATION

## 2. NavigationService Ownership

Each module instance owns its own local navigation context.

Navigation state must not be shared globally between unrelated module instances.

This matters because KJVonly.bible may show:

```text
Settings | Settings
Plans    | Plans
Notes    | Bible
```

at the same time.

Each module instance must be able to navigate independently.

### Rule

> One module instance = one local navigation stack/context.

The existing `NavigationService` + `NavigationServiceFactory` pattern is the correct architectural direction.

---

## 3. Navigation Context Isolation

Svelte context should be scoped to the module container.

A module container creates/provides its navigation context, and descendants consume that context.

Conceptually:

```text
ModuleContainer
  create NavigationService
  setContext(unique navigation key/service)

  NavigationContainer
    current view
```

Sibling module instances must not affect one another.

### Rule

Do not place module navigation state in:

```text
global singleton
shared application store
workspace-global navigation state
```

unless the navigation is genuinely workspace-level.

---

## 4. Local Navigation Stack

Module-local navigation follows stack semantics:

```text
root
  -> detail
      -> nested detail
```

Operations are conceptually:

```text
push(view)
pop()
replace(view) when explicitly warranted
reset(root) when explicitly warranted
```

### Default

Use `push` when the user drills deeper into a module.

Use `pop` when Back returns to the previous local view.

---

## 5. Root View

Every module with local navigation has a root view.

Examples:

```text
Settings
  root: settings list

Plans
  root: plans overview

Profile
  root: profile overview

Notes
  root: notes list
```

At the root, Back should not invent another internal destination.

What happens next is determined by the workspace/module context:

- no leading Back control,
- or another meaningful module-level leading action,
- or Close if the surface itself is transient.

---

## 6. Back Semantics

Back means:

> Return to the previous logical view in the current module's local navigation history.

Back does **not** mean:

```text
close module
close pane
dismiss arbitrary overlay
return to application root
```

unless that is explicitly the current navigation context.

### Example

```text
Plans
  -> Plan Details
      -> Reading Details
```

Back should produce:

```text
Reading Details
  -> Plan Details
  -> Plans
```

one step at a time.

---

## 7. Close Semantics

Close means:

> Dismiss the current surface or exit the current module context.

Close is not the same as Back.

Typical Close uses:

```text
dismiss popup
dismiss dialog
close module
close pane/module state according to workspace rules
```

### Rule

Do not show Back and Close side-by-side merely because both actions are technically possible.

The current surface must have one obvious primary exit behavior.

---

## 8. Back vs Close Decision

Use this decision model:

```text
Did the user drill into another view inside the same module?
  yes -> Back

Is the current surface transient and layered above another surface?
  yes -> Close / dismiss

Is the user leaving the module/pane itself?
  yes -> module Close behavior
```

This distinction should be consistent throughout the application.

---

## 9. State Preservation

Returning with Back should preserve the prior view's useful state where practical.

Examples:

```text
scroll position
selected tab/subview
search query
expanded groups
draft field values
selected item state
```

The existing NavigationService pattern that keeps prior views/state available is compatible with this goal.

### Rule

> Back should feel like returning to where the user was, not reconstructing a fresh screen.

---

## 10. Scroll Restoration

Module-local navigation should preserve scroll state for the previous view when returning with Back.

Default behavior:

```text
push new view
  new view begins at top unless intentionally restored

pop/back
  previous view restores prior scroll position
```

The scroll state belongs to the module's `BufferBody` or view-owned scroll region, not the browser window.

---

## 11. Replace Navigation

`replace` should be uncommon.

Use it when the prior view should not remain in Back history.

Examples may include:

```text
post-login transition
successful completion that invalidates the prior temporary step
redirect from an invalid state
```

Do not use replace merely to simplify implementation.

---

## 12. Reset Navigation

Reset returns a module to its known root state.

Use reset for explicit lifecycle events such as:

```text
module reinitialization
account/context replacement
workflow completion where prior navigation is no longer valid
```

Reset should not happen silently during normal Back/forward use.

---

# PART II — WORKSPACE / MODULE NAVIGATION

## 13. Module Changes Are Not Local Navigation

Opening another module in a pane is a workspace action.

Examples:

```text
Bible -> Notes
Bible -> Modules
Plans -> Bible
```

This must not be represented as another entry in the current module's local NavigationService stack.

### Rule

> Local navigation changes views inside a module; workspace navigation changes the module occupying the pane.

---

## 14. Default Module State

The workspace-level default/empty pane state is the Modules module.

Closing a normal module returns that pane to Modules.

Closing Modules may remove the pane when another pane exists.

The final remaining Modules pane remains so the workspace never reaches an invalid zero-pane state.

This behavior is a workspace rule, not a local navigation rule.

---

## 15. Split Pane Navigation

Creating a split pane is a workspace layout action.

It may open:

```text
Modules
same module
another selected module
```

according to the specific workflow.

The new pane receives its own module/navigation context.

Never share the source pane's local navigation stack automatically.

---

# PART III — NAVIGATION UI

## 16. Leading Header Control

The Header specification defines one leading control maximum.

Navigation determines what it represents.

Priority:

```text
local Back when local history exists
otherwise module/surface-specific leading action
otherwise no leading action
```

Close is used when the surface itself is dismissible rather than navigable backward.

---

## 17. Navigation Labels

Navigation actions should describe the destination/action clearly to assistive technology.

Examples:

```text
Back to Plans
Close Note
Close Settings
Open Appearance Settings
```

Visible UI may remain icon-only where the icon is conventional.

Accessible labels should be descriptive.

---

## 18. Navigation Rows

Rows that navigate deeper into the current module use the Entity/Action List semantics from the Lists specification.

A trailing disclosure indicator may be used when it improves clarity.

Do not require chevrons everywhere if the row is already obviously navigational.

---

# PART IV — OVERLAY MODEL

## 19. Overlay Categories

The application should use a small overlay vocabulary:

```text
Menu / Popover
Popup
Dialog
```

Do not create many overlapping overlay types unless a repeated interaction genuinely requires them.

---

## 20. Menu / Popover

A Menu/Popover presents a compact list of immediate actions.

Examples:

```text
header overflow
context actions
small selector
```

### Characteristics

```text
transient
anchored to triggering control where practical
compact
non-navigational
Action List content
dismisses easily
```

A menu is not a mini page.

---

## 21. Menu Dismissal

A menu should dismiss when:

```text
an action is selected
the user taps/clicks outside
Escape is pressed
the relevant mobile/system Back action dismisses the current transient layer
```

When dismissed, focus returns to the triggering control where practical.

---

## 22. Popup

A Popup is a larger transient surface that contains meaningful content or a module-like subview while preserving the underlying view.

Examples:

```text
Bible -> Notes popup
editor popup
contextual reader/detail popup
```

A popup may contain its own:

```text
header
body
navigation context
scrolling
```

when required.

### Rule

> A popup is transient relative to its host, even when its internal content is complex.

---

## 23. Popup Navigation

If a popup contains multiple internal views, it may own a local NavigationService.

That navigation belongs to the popup/module instance, not to the underlying host module.

Example:

```text
Bible
  opens Notes popup

Notes popup
  Notes list
    -> Note detail
```

Back inside the popup returns:

```text
Note detail -> Notes list
```

Close dismisses the entire popup and returns to Bible.

This is an important distinction:

```text
Back = navigate within popup
Close = dismiss popup
```

---

## 24. Popup Height

A popup that hosts a `BufferContainer` must provide a real available height.

It cannot assume pane height exists automatically.

The popup/container boundary owns:

```text
available width
available height
safe overflow behavior
```

and then the embedded module follows the normal:

```text
BufferHeader
BufferBody
```

layout contract.

This prevents partial-header or clipped-body regressions.

---

## 25. Popup Width

Mobile-first popup width should generally use the available viewport/pane width with a restrained outer margin.

Conceptually:

```text
w-full
max-w-* where appropriate
```

A popup should not create an unnecessarily narrow desktop-style modal on mobile.

On wider containers, a reasonable maximum width may be introduced when it improves readability.

---

## 26. Dialog

A Dialog is used when the user must make or acknowledge a focused decision before continuing.

Typical uses:

```text
confirm destructive action
resolve a blocking choice
acknowledge an important failure
```

Dialogs should be small, focused, and action-oriented.

They should not become general-purpose navigation containers.

---

## 27. Confirmation Dialogs

A destructive confirmation dialog should contain:

```text
short title
brief consequence explanation
cancel action
destructive action
```

Example conceptually:

```text
Delete note?

This permanently removes the note.

Cancel     Delete
```

Do not bury the consequence in long prose.

The destructive action must be clearly distinguishable from Cancel.

---

## 28. Dialog Dismissal

Non-destructive informational dialogs may allow outside/Escape dismissal.

Destructive or decision-critical dialogs should not dismiss in ways that make the result ambiguous.

### Rule

> Accidental dismissal must never be interpreted as destructive confirmation.

Cancel/dismiss always means no destructive action occurred.

---

# PART V — OVERLAY STACKING

## 29. One Primary Transient Layer

Avoid stacking multiple independent modal overlays.

Preferred:

```text
base view
  -> one popup/dialog
```

A menu may appear over a popup when it is clearly owned by that popup, but deep stacks should be avoided.

### Anti-pattern

```text
page
 -> popup
   -> dialog
     -> second popup
       -> menu
```

Complex overlay stacks make mobile Back, focus, scrolling, and context difficult to understand.

---

## 30. Overlay Priority

When transient layers are stacked, dismissal follows topmost-first semantics.

Example:

```text
Popup
  Overflow menu open
```

Back/Escape first closes:

```text
Overflow menu
```

then a subsequent dismissal may close:

```text
Popup
```

Do not dismiss multiple independent layers with one ambiguous action.

---

# PART VI — BACKDROP AND BACKGROUND BEHAVIOR

## 31. Backdrop

Popups/dialogs that obscure the underlying context should use a restrained backdrop.

The backdrop exists to communicate:

```text
current interaction is above the base view
```

It should not become visually dominant.

Exact opacity belongs to the theme/overlay implementation.

---

## 32. Background Scrolling

When a modal popup/dialog is open, the underlying body should not continue scrolling independently.

The active overlay owns interaction until dismissed.

Menus/popovers may not require full background scroll locking if their behavior remains clear, but taps outside must dismiss them cleanly.

---

## 33. Background Interaction

Underlying controls must not accidentally activate through a modal overlay/backdrop.

Pointer and keyboard interaction should remain within the active modal surface.

---

# PART VII — FOCUS MANAGEMENT

## 34. Focus on Open

When a menu, popup, or dialog opens:

- focus should move into the transient surface when keyboard interaction requires it,
- or remain on an appropriate first actionable element.

A destructive dialog may initially focus:

```text
Cancel
```

rather than the destructive action when that reduces accidental activation.

---

## 35. Focus Trap

Dialogs and modal popups should keep keyboard focus within the active overlay while open.

Menus should use appropriate menu/popover keyboard behavior where implemented.

---

## 36. Focus Restoration

When an overlay closes, restore focus to the control that opened it when that control still exists.

Examples:

```text
overflow closes -> focus returns to overflow button
popup closes -> focus returns to button/link that opened popup
dialog closes -> focus returns to destructive-action trigger
```

This is especially important for keyboard accessibility.

---

# PART VIII — MOBILE BACK / ESCAPE

## 37. Dismissal Priority

When the user invokes a system-like Back/Escape action, the conceptual priority is:

```text
1. close topmost menu/popover
2. close/dismiss topmost modal overlay where appropriate
3. pop module-local navigation history
4. otherwise remain at module root / use workspace behavior
```

Exact browser/PWA event handling is an implementation detail.

The design contract is topmost-context-first.

---

## 38. Avoid Ambiguous Back Behavior

Back should not sometimes:

```text
close module
```

and sometimes:

```text
pop local view
```

when the same visible state suggests the same interaction.

The current context determines behavior consistently.

---

# PART IX — OVERLAY LAYOUT

## 39. Overlay Surface

Overlay surfaces follow Foundation rules:

```text
theme overlay surface
restrained boundary
rounded-lg where appropriate
no unnecessary shadow
```

A shadow may be used more readily for overlays than normal cards if it materially improves depth separation, but it remains optional rather than default.

---

## 40. Overlay Padding

Small menus:

```text
compact Action List spacing
```

Dialogs:

```text
p-4
gap-4
```

Large module-like popups:

```text
use BufferHeader / BufferBody rules
```

Do not apply both:

```text
popup p-4
+
BufferBody px-4
```

when that would unintentionally double the content gutter.

Padding ownership remains explicit.

---

## 41. Safe Areas

Full-height or edge-adjacent mobile overlays must respect device safe areas.

Safe-area handling belongs to the overlay shell rather than each child view.

---

# PART X — OVERFLOW MENUS

## 42. Header Overflow

Header overflow is the standard home for secondary contextual actions.

The overflow menu uses:

```text
Action List
```

from the Lists specification.

It should not contain:

- large descriptions,
- cards,
- unrelated navigation trees,
- entire settings forms.

If an item leads to a larger workflow, selecting it closes the menu and navigates/opens the appropriate destination.

---

## 43. Overflow Grouping

Menu groups may be separated by:

```text
whitespace
or a subtle separator
```

Typical ordering:

```text
common contextual actions
secondary/navigation actions
destructive actions last
```

Do not over-categorize a five-item menu with multiple headings.

---

# PART XI — POPUP VS NAVIGATION DECISION

## 44. Use Local Navigation When

Use module-local navigation when:

- the user is moving deeper into the same task/module,
- the prior view should remain in Back history,
- and the new view does not need to remain visually over the old one.

Examples:

```text
Plans -> Plan Details
Settings -> Appearance
Notes -> Note Detail
```

---

## 45. Use a Popup When

Use a popup when:

- the underlying context should remain visible/conceptually present,
- the user is performing a temporary contextual task,
- dismissal should return exactly to the host state,
- or another module is temporarily being used in support of the host task.

Example:

```text
Bible -> Notes popup
```

---

## 46. Use a Dialog When

Use a dialog when:

- a focused decision blocks continuation,
- the interaction is short,
- and the user should not navigate around inside the surface.

Examples:

```text
Delete note?
Discard changes?
```

---

## 47. Avoid Popup for Ordinary Detail Navigation

Do not place every detail view in a modal because it looks visually contained.

If the user is simply navigating:

```text
list -> details
```

inside a module, use NavigationService.

---

# PART XII — MULTIPLE MODULE INSTANCES

## 48. Independent Context

Two instances of the same module must remain completely independent.

Example:

```text
Settings pane A
  Appearance

Settings pane B
  Bible Settings
```

Navigating pane A must not move pane B.

The same applies to popups containing modules.

### Rule

> Navigation service/context is instance-scoped, not module-type-scoped.

---

## 49. Shared Data vs Shared Navigation

Two module instances may observe the same underlying application/domain data.

That does **not** mean they share navigation state.

Example:

```text
two Settings modules
```

may both reflect a changed setting after data updates, while each remains on its own current subview.

This distinction should remain explicit.

---

# PART XIII — TRANSITIONS

## 50. Navigation Motion

Navigation transitions should remain subtle.

A small transition may reinforce:

```text
push deeper
pop back
overlay open/close
```

but motion is not required to understand navigation.

Use restrained durations consistent with the later Motion specification.

Respect:

```text
prefers-reduced-motion
```

Do not create large page-slide animations that delay interaction.

---

# PART XIV — ACCESSIBILITY

## 51. Dialog Semantics

Modal dialogs should expose appropriate dialog semantics:

```text
role="dialog"
aria-modal="true"
accessible title
```

or native `<dialog>` behavior where appropriate and reliable for the implementation.

---

## 52. Menu Semantics

Use semantic button/list/menu patterns appropriate to the actual interaction.

Do not add `role="menu"` merely because a surface visually resembles a menu if full menu keyboard semantics are not being implemented.

Native buttons in a popover-style action list are acceptable and often simpler.

---

## 53. Popup Labels

Complex popups require an accessible title/context.

If a popup has `BufferHeader`, that header title should provide the popup's visible context.

---

# PART XV — ANTI-PATTERNS

## 54. Avoid Global Module Navigation

Do not create one global navigation service for every module.

Multiple panes/module instances make that model invalid.

---

## 55. Avoid Back as Close

Do not label a Close interaction as Back or vice versa.

Users should be able to predict whether their underlying state will remain.

---

## 56. Avoid Overlay-for-Everything

Do not turn:

```text
lists
details
settings pages
ordinary module navigation
```

into popups.

Overlays are for transient context.

---

## 57. Avoid Deep Modal Stacks

Keep overlay depth shallow.

If a popup workflow continually needs new modal layers, it probably belongs in module-local navigation instead.

---

## 58. Avoid Losing Host State

Closing a popup should not unexpectedly reset the host module's:

```text
scroll
selection
reading location
draft
navigation state
```

The purpose of the popup is to preserve context.

---

## 59. Avoid Rebuilding Prior Views

Back navigation should restore prior state rather than reconstruct an unrelated fresh copy whenever practical.

---

# PART XVI — TAILWIND VOCABULARY

## 60. Navigation / Overlay Vocabulary

```text
Navigation container
  h-full
  w-full
  min-h-0
  min-w-0

Overlay shell
  fixed / absolute as appropriate
  inset-0
  z-*
  flex
  items-center / items-end as appropriate
  justify-center
  safe-area-aware

Backdrop
  absolute/fixed
  inset-0
  restrained translucent surface

Popup surface
  relative
  w-full
  max-w-*
  max-h-*
  min-h-0
  rounded-lg where appropriate
  bg-overlay
  outline/border as appropriate
  overflow-hidden

Dialog content
  p-4
  flex
  flex-col
  gap-4

Dialog actions
  flex
  justify-end or mobile-appropriate stacking
  gap-2

Menu
  compact Action List
  overflow-hidden
  rounded-lg
  overlay surface
```

Exact z-index values and surface colors belong to the implementation/theme layer.

---

# PART XVII — IMPLEMENTATION DIRECTION

## 61. NavigationService Direction

Continue using:

```text
NavigationService
NavigationServiceFactory
NavigationContainer
Svelte context
```

as the normal module-local navigation architecture.

Key expectations:

```text
service is created per module instance
service is provided by the module container
subviews receive it through context
Back calls pop
new detail views call push
```

---

## 62. Context Keys

Navigation context should remain intentionally scoped and unambiguous.

If unique Symbols/context keys are used, their role is to prevent accidental collisions between unrelated context types.

The important design requirement is instance isolation.

---

## 63. Overlay-hosted Modules

When another module is embedded in a popup:

- create/provide the correct module-local context,
- provide a real available height,
- use normal BufferHeader/BufferBody ownership where the popup is module-like,
- preserve the host module underneath,
- and destroy the transient module context when the popup closes unless the workflow explicitly requires persistence.

---

# PART XVIII — DECISION SUMMARY

## 64. Navigation and Overlay Decisions

1. KJVonly.bible distinguishes workspace navigation, module-local navigation, and transient overlays.
2. Each module instance owns an independent NavigationService/context.
3. Navigation state is never shared merely because two panes show the same module type.
4. Local navigation uses stack semantics.
5. `push` is the normal drill-in operation.
6. Back means `pop` within the current module's local history.
7. Close dismisses a surface/module; it is not interchangeable with Back.
8. Root views do not invent local Back destinations.
9. Back should restore prior useful state, including scroll where practical.
10. Replace/reset navigation are explicit exceptions, not normal drill-in behavior.
11. Changing the module occupying a pane is workspace navigation, not local navigation.
12. Split panes receive independent module/navigation contexts.
13. The application uses a small overlay vocabulary: Menu/Popover, Popup, Dialog.
14. Menus are compact Action Lists and dismiss easily.
15. Popups preserve the host context and may contain their own local navigation.
16. Back inside a popup navigates within it; Close dismisses the popup.
17. Popup-hosted BufferContainers must receive a real available height.
18. Dialogs are for focused blocking decisions, not ordinary navigation.
19. Destructive confirmation dialogs never interpret dismissal as confirmation.
20. Overlay stacks remain shallow.
21. Topmost transient context dismisses first.
22. Modal overlays prevent interaction/scrolling through to the background.
23. Focus moves into modal overlays as appropriate and restores to the trigger on close.
24. Mobile/system Back or Escape follows topmost-context-first semantics.
25. Header overflow is the normal home for secondary contextual actions.
26. Ordinary list-to-detail navigation uses NavigationService rather than popups.
27. Two module instances may share underlying data while retaining independent navigation state.
28. Navigation motion is subtle and respects reduced-motion preferences.
29. Semantic dialog/button behavior is preferred over purely visual role simulation.
30. New navigation or overlay types should only be introduced when these patterns cannot represent a repeated real interaction.

---

# 7. States and Feedback

## 1. State Principles

KJVonly.bible is offline-first.

The UI must distinguish between:

```text
content state
interaction state
operation state
network state
publication/sync state
feedback
```

These concepts should not collapse into one generic:

```text
loading
error
offline
```

### Core rule

> Show the state that affects the user's next action, at the smallest useful scope.

Examples:

- A completed reading gets a local completion state.
- One failed resource download gets an item-level error when possible.
- A failed import gets operation-level feedback.
- Being offline should not become a blocking error when the requested content is already local.
- A pending publication is not an error.

---

# PART I — STATE CATEGORIES

## 2. Persistent Content States

Persistent or semi-persistent states describe the content itself.

Examples:

```text
selected
active
completed
installed
downloaded
pending publication
published
failed publication
draft
disabled
```

These states remain visible as long as they are relevant.

They should normally be represented inline with the object they describe.

---

## 3. Transient Operation States

Operation states describe work currently occurring.

Examples:

```text
loading
saving
importing
exporting
downloading
publishing
searching
```

These states should communicate:

```text
what is happening
whether the user can continue
whether duplicate activation is prevented
```

They disappear when the operation resolves.

---

## 4. Environment States

Environment states describe conditions around the app.

Examples:

```text
offline
network unavailable
relay unavailable
resource unavailable locally
stale remote data
```

Environment state should only become prominent when it materially affects the current workflow.

### Rule

> Offline is context, not automatically an error.

If the user can continue normally with locally installed content, the UI should remain calm.

---

## 5. Feedback

Feedback communicates the result of an action.

Examples:

```text
saved
copied
import complete
export complete
failed to publish
unable to load resource
```

Feedback can be:

```text
silent
inline
toast/snackbar
blocking dialog
```

Use the least disruptive level that still communicates what the user needs to know.

---

# PART II — EMPTY STATES

## 6. Empty State Purpose

An empty state explains why a collection or view has no content and, when useful, provides the next action.

Examples:

```text
No plans yet
No notes
No search results
No discovered resources
No pending publications
```

An empty state is not simply blank space.

---

## 7. Empty State Structure

The standard structure is:

```text
short title
optional one- or two-line explanation
optional primary action
```

Example:

```text
No plans yet

Discover a reading plan to get started.

[Discover Plans]
```

Recommended layout:

```text
flex
flex-col
items-center where appropriate
gap-2
```

with:

```text
gap-4
```

before an action.

### Typography

Title:

```text
text-base
relative emphasis
```

Supporting text:

```text
text-sm
secondary text
```

Do not make empty states visually louder than normal application content.

---

## 8. Empty State Position

Normal empty states should appear naturally in the body.

A lightly centered treatment is acceptable when the entire screen is empty.

Do not vertically center every empty state if doing so causes awkward movement between empty and populated states.

For list replacement, top-aligned content with normal body spacing is often sufficient.

---

## 9. Actionable vs Informational Empty States

### Actionable

Use an action when the user can directly resolve the empty state.

Examples:

```text
No plans -> Discover Plans
No notes -> Create Note
```

### Informational

Do not add an action when there is nothing useful for the user to do.

Example:

```text
No search results
```

Instead show concise guidance such as:

```text
Try another search.
```

---

# PART III — LOADING

## 10. Loading Principle

Loading feedback should appear only when the user would otherwise be unsure whether the app is working.

Because the app is offline-first, locally available content should render immediately where possible.

### Rule

> Prefer usable local content plus background activity over replacing the screen with a blocking loader.

---

## 11. Initial Loading

A blocking loading state is appropriate when the current view cannot render meaningful content yet.

Examples:

```text
initial application bootstrap
opening a resource that has not yet been decoded/loaded
```

Use a simple, quiet treatment.

Avoid elaborate skeleton systems unless repeated real use demonstrates they materially improve perceived performance.

---

## 12. Background Loading

Background work should not replace usable content.

Examples:

```text
refreshing discovery
downloading resources
publishing outbox entries
updating indexes
```

Prefer:

```text
small inline status
header/action loading state
background status indicator
```

over a full-screen spinner.

---

## 13. Loading Controls

When an action initiates work:

```text
Save
Import
Export
Subscribe
Publish
```

the initiating control should:

- remain in place,
- disable duplicate activation,
- communicate activity,
- and preserve its dimensions.

Examples:

```text
Save -> Saving…
Import -> Importing…
```

or an icon/progress treatment with an accessible label.

---

## 14. Loading Lists

If a list is genuinely unavailable while loading:

- preserve the expected content region,
- use a quiet loading indication,
- avoid flashing between multiple placeholder layouts.

A skeleton should match the eventual list semantics if one is used.

Do not render fake cards for a list that will ultimately be flat rows.

---

# PART IV — SELECTED AND ACTIVE STATES

## 15. Selected State

Selected means:

> This option/item is currently chosen.

Examples:

```text
selected theme
selected font
selected resource
selected module option
```

The standard treatment uses:

```text
selected surface
primary/contrasting text
optional accent icon
```

State should remain legible in every theme.

---

## 16. Active vs Selected

Use **active** for the item currently controlling/representing an active context.

Use **selected** for a chosen option.

Examples:

```text
current navigation destination -> active
chosen theme -> selected
```

The visual treatment may be related, but semantics should remain distinct in code/accessibility where applicable.

---

## 17. Selected State Must Not Rely on Color Alone

Where ambiguity exists, combine color with:

```text
check icon
aria-pressed
aria-selected
label/state text
```

A selected settings button can rely on a strong selected surface plus semantic `aria-pressed`, even if no checkmark is displayed.

---

# PART V — COMPLETION STATES

## 18. Completed Content

Completion is a content state, not a disabled state.

Examples:

```text
completed reading
completed plan day
completed reading plan
```

Completed items may be visually de-emphasized, but should remain readable and actionable when undo/review is supported.

Recommended signals:

```text
check icon
Completed text where useful
semantic completion color
```

Do not use low opacity alone if it makes the item appear unavailable.

---

## 19. Undoable Completion

If completion can be undone, the completed item remains interactive.

The UI should not make it look disabled.

A completion toggle should preserve the row's geometry.

---

# PART VI — INSTALLED / DOWNLOADED / AVAILABLE STATES

## 20. Local Availability

Offline-first resources can have meaningful availability states:

```text
available remotely
downloading
installed locally
failed download
```

These should be distinguished from network connectivity.

Example:

```text
Offline + installed locally
```

is a usable state.

Example:

```text
Offline + not installed
```

is an unavailable-content state.

---

## 21. Installed State

Installed/downloaded content can use a subtle persistent status.

Examples:

```text
Installed
check/download-complete icon
```

Do not over-emphasize installed status when installation is normal and no user decision depends on it.

---

## 22. Downloading State

Downloading is an operation state.

Where progress is known, a compact progress indicator may be useful.

Where progress is unknown, use a simple activity indication.

The rest of the app should remain usable unless the requested operation truly requires blocking interaction.

---

## 23. Failed Download

A resource-specific download failure should appear near that resource when possible.

Preferred structure:

```text
resource
Failed to download
Retry
```

A global toast may accompany the failure, but should not be the only place the recovery action exists.

---

# PART VII — OFFLINE STATE

## 24. Offline Philosophy

KJVonly.bible is designed to work offline.

Therefore:

> **Offline is not inherently exceptional.**

Do not show a persistent alarming banner merely because network connectivity is absent.

---

## 25. When Offline Should Be Visible

Show offline status when it materially changes the current action.

Examples:

```text
resource is not available locally
discovery cannot refresh
publication remains queued
profile/relay operation cannot complete
```

A small contextual indicator is preferable to a full-screen interruption.

---

## 26. Offline + Local Content

When content is installed locally:

```text
render it normally
```

Network absence may be invisible unless the user attempts a network-dependent action.

This is the preferred offline-first behavior.

---

## 27. Offline + Network-dependent Action

If the user invokes an action that requires connectivity:

```text
publish
download unavailable resource
refresh discovery
```

the UI should explain the state and, when appropriate, preserve/queue the action.

Examples:

```text
Queued for publication
Will publish when a relay connection is available
```

This is not a generic failure if the system is intentionally designed to retry later.

---

# PART VIII — PENDING / OUTBOX / PUBLICATION STATES

## 28. Publication State Model

Outbox/publication state should use explicit semantics such as:

```text
Pending
In Progress
Published / Completed
Failed
```

Avoid representing all non-completed items as "syncing."

---

## 29. Pending

Pending means:

> The local change has been accepted but has not yet completed remote publication.

Pending is a normal state.

Suggested treatment:

```text
text-sm
secondary text
optional pending icon
```

Do not use danger styling.

---

## 30. In Progress

In Progress means an active publication attempt is occurring.

Use a subtle activity indicator.

The local object remains usable unless the operation requires otherwise.

---

## 31. Published / Completed

Successful publication normally does not require a persistent success badge everywhere.

Where publication state matters, use:

```text
Published
check icon
```

Otherwise silently return to the normal content state.

### Rule

> Success should disappear into normality when no decision depends on the historical success event.

---

## 32. Failed Publication

Failure should:

- identify the affected object/operation,
- preserve local content,
- explain whether retry is possible,
- expose Retry when appropriate.

Do not imply data loss merely because remote publication failed.

---

# PART IX — ERROR STATES

## 33. Error Scope

Errors should be displayed at the smallest useful scope.

### Field level

For invalid user input.

### Item level

For one failed list/resource item.

### Section level

For one failed region while the rest of the view remains usable.

### View level

When the entire current view cannot function.

### Application level

Reserved for application-wide unrecoverable/bootstrap failures.

---

## 34. Error Structure

A useful error normally contains:

```text
what failed
brief consequence
recovery action if available
```

Example:

```text
Unable to download this resource.

It is not available offline yet.

[Retry]
```

Avoid dumping implementation details or raw exception text into the primary UI.

---

## 35. Retry

Retry should be local to the failure whenever practical.

Examples:

```text
resource download failed -> Retry on resource
search failed -> Retry in search state
import failed -> Retry/import again in operation area
```

Do not force users to discover a global refresh action to recover from a local failure.

---

## 36. Partial Failure

When part of a screen fails but other content remains usable:

```text
keep usable content visible
show the local failure
```

Do not replace the entire screen with an error state unnecessarily.

---

# PART X — SUCCESS FEEDBACK

## 37. Silent Success

Many successful actions require no explicit notification.

Examples:

```text
select theme
select font
toggle paragraph display
navigate to another view
```

The visible state change is sufficient feedback.

### Rule

> Do not toast every successful interaction.

---

## 38. Inline Success

Use inline success when the resulting state itself matters.

Examples:

```text
Published
Installed
Completed
Saved locally
```

This is often preferable to a transient toast for persistent status.

---

## 39. Toast / Snackbar Success

Use transient success feedback when:

- the result is not otherwise visible,
- the user needs confirmation,
- and the message does not require a decision.

Examples:

```text
Copied to clipboard
Export complete
Import complete
Profile saved
```

Keep messages concise.

---

# PART XI — TOASTS / SNACKBARS

## 40. Purpose

Toast/snackbar feedback is for short-lived information that does not require the user to stop what they are doing.

Examples:

```text
Copied
Saved
Import complete
Unable to publish — queued for retry
```

Do not use a toast as the only location for an important recoverable error.

---

## 41. Toast Content

A toast should usually contain:

```text
short message
optional single action
```

Example:

```text
Note deleted     Undo
```

Avoid:

- long paragraphs,
- multiple buttons,
- complex forms,
- navigation trees.

Those belong in the main UI or a dialog.

---

## 42. Toast Placement

For mobile, use a predictable edge location that avoids:

- browser safe areas,
- critical navigation,
- keyboard/input overlays where possible.

The exact implementation may use top or bottom placement depending on the current app shell.

Placement must be consistent.

---

## 43. Toast Duration

Noncritical informational feedback may dismiss automatically.

Errors that require reading or action should remain long enough to understand or use the action.

Do not make time-limited feedback the only representation of a consequential failure.

---

## 44. Toast Queue

Avoid stacking many simultaneous toasts.

Prefer:

```text
one visible toast
small queue
coalescing repeated identical messages
```

Repeated background events should not flood the user.

---

# PART XII — WARNING / INFORMATION BANNERS

## 45. Banner Purpose

Use an inline banner when a condition:

- affects a meaningful portion of the current view,
- remains relevant for more than a moment,
- and should stay visible while the condition persists.

Examples:

```text
This resource is not available offline
Publication is waiting for connectivity
Imported content requires reload/reselection
```

A banner is more persistent than a toast and less blocking than a dialog.

---

## 46. Banner Structure

Recommended:

```text
optional icon
short message
optional action
```

Use restrained padding such as:

```text
p-3
```

or the normal application spacing rhythm.

Avoid giant alert boxes.

---

# PART XIII — DISABLED / UNAVAILABLE

## 47. Disabled

Disabled means:

> The control is present and expected, but cannot currently be activated.

Use:

```text
reduced emphasis
semantic disabled state
no pointer activation
```

Do not hide a control when its temporary unavailability is meaningful.

---

## 48. Unavailable Content

Unavailable content differs from a disabled control.

Example:

```text
Bible resource not installed and network unavailable
```

Explain:

```text
what is unavailable
why
what the user can do next
```

Do not render an empty blank container.

---

# PART XIV — STALE DATA

## 49. Stale Data

Offline-first applications may display locally cached data that is older than remote state.

Only expose "stale" state when freshness materially matters.

Do not label ordinary locally stored Bible/resource content as stale merely because the device is offline.

Examples where freshness may matter:

```text
discovery results
relay status
remote profile data
```

---

## 50. Refresh

When refresh is available:

- keep the current data visible,
- indicate refresh activity subtly,
- replace content only when new data arrives.

Avoid clearing usable cached data during refresh.

---

# PART XV — SEARCH STATES

## 51. Search Initial State

Before a query is entered, the view may show:

```text
nothing
recent/helpful content
brief prompt
```

Do not call this an empty state if no search has been performed yet.

---

## 52. Searching

Keep the query visible.

Use subtle operation feedback.

Do not replace the search field with a loader.

---

## 53. No Results

Use:

```text
No results
Try another search.
```

This is an informational empty state.

Do not present "No results" as an error.

---

## 54. Search Failure

A failure to perform the search is an error and must be visually distinct from "No results."

Example:

```text
Search failed.
[Retry]
```

---

# PART XVI — AUTH / ACCESS STATES

## 55. Authentication-required State

When the user must authenticate before continuing, this is a workflow state rather than a generic error.

The UI should clearly provide the next action.

Example:

```text
Sign in to continue.
```

Do not expose low-level relay/auth failure language when a normal login action is the appropriate recovery.

---

## 56. Permission / Capability Unavailable

If an action depends on a browser capability or permission:

```text
explain what is needed
provide the relevant retry/action
```

Avoid repeatedly prompting automatically after the user has declined.

---

# PART XVII — VISUAL LANGUAGE

## 57. Semantic State Roles

Themes should support semantic roles rather than per-screen colors.

Conceptually:

```text
state-info
state-success
state-warning
state-danger
state-pending
state-selected
state-disabled
```

These can map onto the existing theme palette.

Do not require every role to have a unique saturated hue.

The visual language should remain restrained.

---

## 58. Color Is Supplemental

Important state should use at least one additional cue:

```text
icon
label
position
shape/surface
semantic control state
```

Examples:

```text
✓ Completed
Pending
Retry
Installed
```

Do not communicate critical state through green/red alone.

---

## 59. Icons

State icons should be small and functional.

Examples:

```text
check
warning
error
download
pending/activity
offline
```

Avoid decorative status iconography where text/state is already obvious.

Icons follow the Foundation relative sizing rules.

---

# PART XVIII — MOTION AND PROGRESS

## 60. Progress Indicators

Use determinate progress when meaningful progress is known.

Use indeterminate activity only when progress cannot be measured.

A progress indicator should not dominate the screen unless the operation is truly blocking.

---

## 61. Reduced Motion

Animated spinners/transitions should respect:

```text
prefers-reduced-motion
```

Where reduced motion is requested, provide a static or minimal activity indication while preserving semantic state.

---

# PART XIX — ACCESSIBILITY

## 62. Live Feedback

Important asynchronous feedback should be announced appropriately to assistive technology.

Use polite live-region behavior for noncritical updates where necessary.

Avoid repeatedly announcing noisy background operations.

---

## 63. Error Association

Field errors must be programmatically associated with their inputs.

View-level errors should have clear headings/text and a reachable Retry action.

---

## 64. Status Semantics

Where appropriate, expose state with semantic attributes rather than visual classes only.

Examples:

```text
aria-pressed
aria-selected
aria-invalid
disabled
aria-busy
```

Use live regions intentionally rather than globally.

---

# PART XX — ANTI-PATTERNS

## 65. Avoid Offline as a Global Error

Do not display a persistent alarming offline banner when all current content remains usable.

---

## 66. Avoid Toasting Everything

Do not show:

```text
Theme changed
Font changed
Paragraphs enabled
Tab selected
```

when the UI state already visibly confirms the action.

---

## 67. Avoid Spinner-first Design

Do not replace usable local content with a spinner during background work.

---

## 68. Avoid Error = Empty

These states are different:

```text
No results
No items
Failed to load
Unavailable offline
```

Each requires different wording and recovery behavior.

---

## 69. Avoid Low-opacity Completion

Completed does not mean disabled.

Do not make completed content hard to read.

---

## 70. Avoid Generic "Something Went Wrong"

Whenever practical, name:

```text
what failed
what is affected
what the user can do
```

Keep technical detail out of the primary message unless it is actionable.

---

## 71. Avoid Global Errors for Local Failures

One failed row/resource should not replace the entire view.

Keep the failure scoped.

---

# PART XXI — TAILWIND VOCABULARY

## 72. Preferred State Vocabulary

```text
Empty state
  flex
  flex-col
  gap-2
  text-center where appropriate
  text-base
  text-sm
  secondary text

Action spacing
  gap-4 before primary recovery action

Selected
  selected surface
  contrasting/primary text

Disabled
  disabled:opacity-50
  disabled:pointer-events-none

Inline status
  text-sm
  flex
  items-center
  gap-2

Banner
  p-3
  flex
  gap-2 / gap-3
  rounded-lg where appropriate
  semantic surface/boundary

Toast
  compact overlay surface
  p-3 / p-4
  rounded-lg
  optional single action

Error/recovery
  semantic danger text/boundary
  gap-2
  retry action

Progress/activity
  compact
  non-layout-shifting
```

Theme-specific semantic colors are supplied by the existing theme system.

---

# PART XXII — IMPLEMENTATION DIRECTION

## 73. State Components

Do not immediately create a component for every state.

Potential repeated primitives may eventually include:

```text
EmptyState
InlineStatus
StatusBanner
Toast/Snackbar
LoadingIndicator
ErrorState
```

Extract only where repeated behavior and layout are genuinely shared.

---

## 74. Central Toast/Feedback Service

Transient app-level feedback may eventually justify a single feedback/toast service so modules do not independently implement:

```text
positioning
queueing
timeouts
safe areas
live-region behavior
```

This is an implementation direction, not a prerequisite for the design spec.

---

## 75. Domain State Mapping

Domain/application state should remain explicit and then map to presentation state.

Examples:

```text
outbox pending
outbox in-progress
outbox completed
outbox failed
```

should not be collapsed into a single boolean such as:

```text
isSyncing
```

when the distinction affects user understanding or recovery.

---

# PART XXIII — DECISION SUMMARY

## 76. States and Feedback Decisions

1. Persistent content state, operation state, environment state, and feedback are separate concepts.
2. State should appear at the smallest useful scope.
3. Offline is not automatically an error.
4. Locally available content renders normally while offline.
5. Network-dependent unavailable content explains what is missing and what can happen next.
6. Empty states contain a short title, optional explanation, and optional next action.
7. No-results is an empty state, not an error.
8. Loading blocks the screen only when meaningful content cannot yet render.
9. Background work should not replace usable local content.
10. Async controls preserve their dimensions and prevent duplicate activation.
11. Selected and active states are semantically distinct.
12. Important selected/completed states do not rely on color alone.
13. Completed content remains readable and interactive when undo/review is supported.
14. Local resource availability is distinct from network connectivity.
15. Download failures should be recoverable near the affected resource.
16. Publication uses explicit Pending, In Progress, Completed/Published, and Failed states.
17. Pending publication is a normal state, not a danger state.
18. Publication failure preserves local content and offers Retry where appropriate.
19. Errors are scoped to field, item, section, view, or app according to impact.
20. Partial failures keep unaffected content usable.
21. Many successful interactions require no explicit toast.
22. Toasts are for short-lived nonblocking feedback.
23. Important recoverable failures must not exist only in a transient toast.
24. Toasts normally contain one short message and at most one action.
25. Persistent conditions that affect a view use a restrained inline banner rather than repeated toasts.
26. Disabled means temporarily unavailable; unavailable content requires explanatory state.
27. Stale indicators appear only where freshness materially matters.
28. Refresh preserves currently usable cached data.
29. Search distinguishes initial, searching, no-results, and failure states.
30. Semantic theme state roles should be reused rather than inventing colors per module.
31. Important state uses text/icon/semantics in addition to color.
32. Progress indicators remain compact unless the operation is truly blocking.
33. Motion respects reduced-motion preferences.
34. Async feedback should be accessible without producing noisy repeated announcements.
35. New state patterns should only be introduced when these categories cannot express a repeated real use case.

---

# 8. Accessibility and Motion

## 1. Accessibility Principles

Accessibility is part of the default component contract.

The app should not depend on:

- color alone,
- hover,
- pointer precision,
- fixed text size,
- fixed control dimensions,
- or visual layout alone

to communicate meaning.

### Core rule

> Every interactive or stateful pattern must remain understandable through semantics, text, focus, and interaction behavior—not only styling.

---

# PART I — SEMANTIC STRUCTURE

## 2. Native Elements First

Use native HTML semantics whenever they fit the interaction.

Prefer:

```text
button
a
input
textarea
select
label
fieldset
legend
dialog
heading elements
```

over:

```text
div role="button"
span onclick
generic containers with keyboard handlers
```

when native semantics already provide the correct behavior.

### Rule

> Use ARIA to complete semantics, not to replace valid native semantics without need.

---

## 3. Headings

Views should use a meaningful heading hierarchy.

Typical structure:

```text
module/view title
section title
subsection title
```

Do not choose heading levels based only on visual size.

A visually `text-base` section title can still be a semantic heading.

### Rule

Visual hierarchy and document hierarchy are related but not identical.

---

## 4. Landmark / Region Semantics

Major areas should expose meaningful structure where helpful.

Examples:

```text
header
main/content region
navigation
dialog
```

Do not add excessive ARIA landmarks to every small container.

Use enough structure to make navigation understandable without making the accessibility tree noisy.

---

# PART II — ACCESSIBLE NAMES

## 5. Icon-only Controls

Every icon-only interactive control requires an accessible name.

Examples:

```text
Back
Close
Search
Edit note
Save profile
Delete relay
More actions
Split pane
```

The label should describe the action, not the icon.

Bad:

```text
Pencil
X icon
Magnifying glass
```

Good:

```text
Edit note
Close popup
Search Bible
```

---

## 6. Visible Labels

Persistent inputs should normally have visible labels.

Placeholder text should not be the only label for:

```text
profile name
relay URL
font size
settings input
```

Search may use a more compact treatment when the field purpose is already obvious.

---

## 7. Contextual Labels

When controls repeat, accessible names should include enough context.

Example:

```text
Delete relay wss://example.com
```

may be more useful than multiple controls all named:

```text
Delete
```

Do not add excessive context when the surrounding structure already provides it clearly.

---

# PART III — KEYBOARD INTERACTION

## 8. Keyboard Baseline

All interactive elements must be keyboard reachable unless intentionally excluded.

Normal interaction expectations:

```text
Tab
Shift+Tab
Enter
Space where appropriate
Escape for transient surfaces
Arrow keys where native/complex control semantics require them
```

Native buttons and inputs should retain native keyboard behavior.

---

## 9. Do Not Reimplement Buttons Poorly

Avoid patterns that only support:

```text
onclick
Enter
```

but omit:

```text
Space
disabled semantics
focus behavior
button role/state
```

Use a real `<button>` when the interaction is a button.

---

## 10. Logical Focus Order

Keyboard focus order should match the meaningful visual/reading order.

Do not use positive `tabindex` values to manually force a custom order.

Layout should be structured so DOM order is already sensible.

---

# PART IV — FOCUS

## 11. Focus Visibility

Keyboard focus must always be visible.

Use:

```text
focus-visible:*
```

so focus styling appears for keyboard-style navigation without unnecessarily adding strong focus chrome to every pointer tap.

### Important

Structural outlines are part of the KJVonly.bible visual system.

Therefore focus styling must be visually distinct from structural outlines.

Use one or more of:

```text
different semantic color
thicker outline
outline offset
ring
```

---

## 12. Focus Must Not Change Layout

Focus treatment must not alter element dimensions.

Prefer:

```text
outline
ring
```

over adding/removing layout-participating border width on focus.

This aligns with the application's geometry-preserving use of outlines.

---

## 13. Focus Restoration

When transient UI closes, focus should return to the element that opened it when practical.

Examples:

```text
overflow menu -> overflow button
dialog -> triggering action
popup -> popup trigger
```

This is defined in Navigation and Overlays and remains an accessibility requirement.

---

## 14. Focus in Modal Surfaces

Dialogs and modal popups should keep focus within the active transient surface.

Focus must not move into obscured/inactive background controls.

When the overlay closes, normal focus order resumes.

---

# PART V — TOUCH AND POINTER ACCESSIBILITY

## 15. Touch Targets

Touch targets must remain comfortably tappable on mobile.

The visual content may be compact, but the interaction target should normally be approximately:

```text
min-h-11
to
min-h-12
```

with a hard practical minimum independent of reduced root font size.

This applies to:

- header icons,
- row actions,
- close buttons,
- checkboxes and their labels,
- choice buttons,
- small inline controls.

---

## 16. Spacing Between Targets

Closely grouped targets must still be distinguishable.

Header action buttons may visually use:

```text
gap-1
```

because the targets themselves provide sufficient hit areas.

Tiny targets separated by tiny gaps are not acceptable.

---

## 17. Entire Row Targets

When a list row performs one primary action, the whole row should normally be tappable.

This improves mobile usability and reduces precision requirements.

Avoid tiny clickable text inside an otherwise noninteractive row.

---

# PART VI — USER TEXT SCALING

## 18. Root Font Scaling

The application intentionally sets user-selected font size on the root element.

Therefore typography and many Tailwind `rem`-based dimensions scale together.

This behavior is part of the accessibility model and should be preserved.

### Rule

> Components must tolerate larger and smaller root font sizes without clipping, overlap, or inaccessible controls.

---

## 19. Avoid Fixed Text Heights

Text-bearing components should generally use:

```text
min-height
padding
natural line wrapping
```

rather than fixed exact heights.

Fixed heights are acceptable for icon-only controls when the touch-target requirement is satisfied.

---

## 20. Wrapping

Labels, descriptions, and content should wrap when necessary.

Do not use:

```text
whitespace-nowrap
```

as a blanket UI rule.

Use it only for:

- compact metadata,
- intentionally single-line header titles,
- short known labels where truncation behavior is designed.

---

## 21. Font Weight Scaling

The user's selected base font weight is part of the app's accessibility/personalization model.

Relative hierarchy should be derived from that base.

Do not hard-code:

```text
font-medium
font-semibold
```

everywhere if doing so can make emphasized content lighter than the selected base.

---

# PART VII — CONTRAST AND COLOR

## 22. Contrast

Text and interactive states must maintain sufficient contrast across all supported themes.

The app's existing theme system is responsible for concrete colors.

The design system should ensure roles remain distinguishable:

```text
primary text
secondary text
muted text
interactive/accent
selected
danger
disabled
focus
```

---

## 23. Color Is Not Enough

Never rely on color alone for important state.

Pair color with:

```text
text
icon
shape/surface
semantic state
position
```

Examples:

```text
✓ Completed
Pending
Retry
Selected via aria-pressed
```

---

## 24. Disabled Contrast

Disabled content may use reduced opacity, but must remain legible enough to identify.

Avoid making disabled labels effectively disappear.

---

# PART VIII — FORM ACCESSIBILITY

## 25. Labels and Inputs

Each input must have a programmatic label.

Preferred:

```html
<label for="...">...</label>
<input id="..." />
```

or an equivalent association.

---

## 26. Supporting Text

Help/error text should be associated with the relevant control where practical.

For errors, use semantic invalid state such as:

```text
aria-invalid
aria-describedby
```

when applicable.

---

## 27. Checkboxes

Checkbox labels should be tappable as a unit.

Preferred structure:

```text
label
  checkbox
  text
```

The visible label expands the interaction target and clarifies state.

---

## 28. Choice Buttons

Button-based choices should expose state through:

```text
aria-pressed
```

for independent on/off controls.

Single-select choice groups should expose group/selection semantics when practical.

The visual selected surface is not sufficient by itself.

---

# PART IX — LIST ACCESSIBILITY

## 29. Interactive List Rows

Use:

```text
button
a
```

for interactive rows where appropriate.

Do not require custom role and key handling when native elements work.

---

## 30. Nested Actions

Avoid invalid nested interactive elements.

A row containing separate actions must use a structure that exposes each action independently.

The keyboard user should be able to understand:

```text
open item
secondary action
```

as separate controls.

---

## 31. Status in Rows

Status text/icons should have a meaningful reading order.

Example:

```text
Morning and Evening, 37 percent complete
```

should be understandable even if the percentage is visually aligned to the far right.

---

# PART X — OVERLAY ACCESSIBILITY

## 32. Dialog Semantics

Modal dialogs should expose:

```text
dialog semantics
modal state
accessible title
```

and, when necessary, a description.

Do not create a visually modal `<div>` with no corresponding semantic behavior.

---

## 33. Escape / Dismissal

Escape should dismiss the topmost dismissible transient surface where appropriate.

The action must be equivalent to Cancel/Close, never confirmation.

---

## 34. Backdrop

A modal backdrop must prevent pointer interaction with underlying controls.

The background should also be removed from active keyboard navigation while the overlay is modal.

---

# PART XI — STATUS AND LIVE REGIONS

## 35. Async Feedback

Important asynchronous state changes may need assistive announcement.

Examples:

```text
Profile saved
Import complete
Search failed
Publication queued
```

Use polite live-region behavior when appropriate.

Do not make every background update announce itself.

---

## 36. Avoid Announcement Noise

Background operations such as:

```text
resource indexing
routine downloads
outbox retries
```

should not repeatedly interrupt assistive technology users unless the state requires attention.

User-triggered results deserve higher priority than routine background churn.

---

# PART XII — MOTION PRINCIPLES

## 37. Motion Is Functional

Motion should communicate:

- state change,
- spatial relationship,
- expansion/collapse,
- overlay appearance,
- or navigation direction.

Do not animate merely to make the interface feel more active.

### Rule

> If removing an animation does not reduce understanding, the animation is optional.

---

## 38. Motion Vocabulary

Keep the transition vocabulary small.

Preferred durations:

```text
duration-150
duration-200
```

Use longer durations only for interactions where the movement itself conveys meaningful structure.

Avoid long, theatrical transitions.

---

## 39. Preferred Transition Properties

Prefer inexpensive, stable properties such as:

```text
opacity
transform
background-color
color
```

Avoid animating layout-heavy properties unnecessarily.

Do not create transitions that cause content to jump or reflow during interaction.

---

## 40. Pressed / Hover Transitions

Small state transitions may use:

```text
transition-colors
duration-150
```

for:

- buttons,
- rows,
- selected surfaces.

Do not add motion delay to primary interaction feedback.

Pressed feedback should feel immediate.

---

## 41. Overlay Motion

Menus, dialogs, and popups may use subtle transitions.

Examples:

```text
opacity fade
small scale
small translate
```

Keep movement short and restrained.

Avoid large screen-spanning slide animations unless the spatial model genuinely benefits from them.

---

## 42. Navigation Motion

Module-local navigation may optionally communicate:

```text
push
pop
```

with subtle directionality.

However:

- motion must not delay content availability,
- view state must remain the primary cue,
- and reduced-motion mode must still be fully understandable.

Navigation should work perfectly with no animation.

---

## 43. Expand / Collapse

Expandable UI such as a color selector or disclosure group may animate its opening/closing.

Prefer:

```text
opacity
small transform
controlled height/grid transition where reliable
```

The final layout state must remain stable.

Do not animate every list insertion/removal.

---

# PART XIII — REDUCED MOTION

## 44. Respect User Preference

All nonessential motion must respect:

```text
prefers-reduced-motion
```

Tailwind concepts may include:

```text
motion-safe:*
motion-reduce:*
```

---

## 45. Reduced-motion Behavior

When reduced motion is requested:

- remove large translations,
- remove decorative scaling,
- shorten or eliminate nonessential transitions,
- keep state changes immediate and clear.

Do not remove the underlying state feedback.

Example:

```text
normal:
  fade + slight scale

reduced motion:
  immediate visibility change or minimal fade
```

---

## 46. Loading Indicators Under Reduced Motion

If an animated spinner is used, ensure the state remains understandable if motion is reduced.

Possible alternatives:

```text
static loading icon
Loading… text
minimal animation
```

Do not make motion itself the only indication that work is occurring.

---

# PART XIV — SCROLL AND MOTION

## 47. Smooth Scrolling

Do not globally force smooth scrolling.

Programmatic scrolling may use smooth behavior only when it improves orientation and respects reduced-motion preferences.

Immediate scroll is preferable for:

```text
restoring prior navigation position
initial view placement
focus correction
```

when animation would be distracting.

---

## 48. Scroll Restoration

Back navigation restoring a prior position should generally restore directly rather than animate through a long scroll.

The user's mental model is:

```text
return to previous place
```

not:

```text
watch the app travel back there
```

---

# PART XV — RESPONSIVE ACCESSIBILITY

## 49. Narrow Panes

Accessibility rules must continue to hold in narrow split panes.

When width becomes constrained:

1. wrap text,
2. wrap flexible control groups,
3. move secondary header actions to overflow,
4. stack rich informational layouts,
5. preserve touch targets,
6. never solve the problem by shrinking text below the user's chosen scale.

---

## 50. Zoom / Larger Text

The UI should remain functional when users increase browser zoom or the app root font size.

Avoid layouts that rely on:

```text
one-line labels
fixed control widths
fixed row heights
exact pixel alignment
```

for correctness.

---

# PART XVI — CONTENT ACCESSIBILITY

## 51. Reading Content

Bible text and other long-form content should prioritize readability over dense UI layout.

Interactive verse/reference affordances should not interfere with normal reading order.

State such as:

```text
highlight
markup
selected verse
```

must remain distinguishable without depending only on color.

---

## 52. Text Selection

Custom interaction behavior must not unnecessarily block native text selection, copy, or assistive interaction unless the feature explicitly requires an alternate gesture model.

When implementing drag-based markup/highlight selection, preserve a clear distinction between:

```text
selecting text/content
activating navigation/actions
```

---

# PART XVII — ACCESSIBILITY TESTING CONTRACT

## 53. Minimum Manual Checks

Representative screens should be checked with:

```text
keyboard only
large root font size
small root font size
narrow pane
dark theme
colorblind theme
reduced motion
touch/mobile viewport
```

This does not require testing every screen for every change, but reusable primitives should be validated across these conditions.

---

## 54. Keyboard Smoke Test

For a representative module:

```text
Tab through controls
activate with Enter/Space
open overflow
close with Escape
navigate Back
open/close popup
confirm visible focus throughout
```

Any reusable control that fails this should be corrected at the shared primitive level.

---

## 55. Semantic Smoke Test

Check:

```text
buttons are buttons
inputs have labels
dialogs have titles
selected controls expose state
errors associate with fields
icon actions have names
```

This catches a large portion of high-impact accessibility regressions.

---

# PART XVIII — ANTI-PATTERNS

## 56. Avoid Hover-only UI

Do not reveal required actions only on hover.

Mobile and keyboard users must have equivalent access.

---

## 57. Avoid Invisible Focus

Never use:

```text
outline-none
```

without supplying a visible replacement focus style.

---

## 58. Avoid Tiny Controls

A `1.25em` icon is not a `1.25em` touch target.

---

## 59. Avoid Fixed Heights Around Text

Do not clip larger user text to preserve a visual row height.

Use minimum height and allow expansion.

---

## 60. Avoid Color-only State

Do not communicate:

```text
selected
completed
error
warning
disabled
```

through color alone.

---

## 61. Avoid Motion-required Meaning

Do not require the user to perceive an animation to understand where content went or what changed.

Final state must always communicate the result.

---

## 62. Avoid Long Default Animations

Do not use long transitions for:

```text
headers
menus
rows
settings selections
routine navigation
```

The application should feel immediate.

---

## 63. Avoid Global Smooth Scroll

Global smooth scrolling can conflict with navigation restoration and reduced-motion needs.

---

# PART XIX — TAILWIND VOCABULARY

## 64. Preferred Accessibility / Motion Vocabulary

```text
Focus
  focus-visible:outline-*
  focus-visible:outline-offset-*
  focus-visible:ring-* where appropriate

Visibility
  sr-only

Touch
  min-h-11 / min-h-12
  min-w-11 / min-w-12 where appropriate

Text/layout resilience
  min-w-0
  flex-wrap
  break-words where appropriate
  line-clamp-* only for intentional collection summaries

State semantics
  disabled:*
  aria-[pressed=true]:*
  aria-[selected=true]:*
  aria-[invalid=true]:*

Motion
  transition-colors
  transition-opacity
  transition-transform
  duration-150
  duration-200
  motion-safe:*
  motion-reduce:*
```

Theme-specific focus and state colors remain controlled by the existing theme system.

---

# PART XX — IMPLEMENTATION DIRECTION

## 65. Shared Primitives Carry Accessibility

Accessibility behavior should be implemented at shared boundaries wherever possible.

Examples:

```text
KJVButton
  touch target
  focus-visible
  disabled semantics
  accessible label contract

BufferHeader
  title structure
  action semantics

Choice control
  aria-pressed / selection semantics

Dialog
  focus trap
  accessible title
  focus restoration
```

This gives better coverage than fixing accessibility independently in every module.

---

## 66. Accessible Defaults Over Optional Flags

Reusable components should be accessible by default.

Avoid APIs such as conceptually:

```text
accessible={true}
showFocus={true}
keyboardSupport={true}
```

for behavior that should always be present.

Accessibility is not an optional variant.

---

# PART XXI — DECISION SUMMARY

## 67. Accessibility and Motion Decisions

1. Accessibility is part of the default component contract.
2. Native semantic elements are preferred over role-simulated controls.
3. ARIA supplements semantics rather than replacing native elements unnecessarily.
4. Heading semantics are independent of visual font size.
5. Icon-only controls require meaningful accessible action names.
6. Persistent form fields normally use visible labels.
7. Interactive controls are keyboard reachable and retain native keyboard behavior.
8. DOM/focus order follows meaningful visual order.
9. Keyboard focus is always visible.
10. Focus styling must be distinct from structural outlines.
11. Focus treatment must not change layout geometry.
12. Modal focus remains inside the active overlay and restores to the trigger on close.
13. Touch targets remain large even when icons are visually small.
14. Whole-row interaction is preferred for single-action list rows.
15. User root font scaling is an intentional accessibility feature and must be preserved.
16. Text-bearing components avoid fixed heights that clip scaled content.
17. Font-weight hierarchy remains relative to the user's chosen base weight.
18. Important state never depends on color alone.
19. Disabled content remains legible.
20. Inputs expose labels and associated errors/help where applicable.
21. Button-based choices expose selected state semantically.
22. Dialogs expose proper modal/title semantics.
23. Async announcements are used selectively to avoid assistive-technology noise.
24. Motion is functional, not decorative.
25. The normal transition vocabulary is small: approximately `duration-150` and `duration-200`.
26. Prefer opacity, transform, and color transitions over layout-heavy animation.
27. Pressed feedback is immediate.
28. Overlay/navigation motion remains subtle and optional.
29. Expand/collapse motion may reinforce structure but is not required for understanding.
30. Nonessential motion respects `prefers-reduced-motion`.
31. Loading remains understandable without animation.
32. Global smooth scrolling is avoided.
33. Back-navigation scroll restoration is normally immediate.
34. Narrow panes preserve text size and touch targets before sacrificing secondary content.
35. Representative primitives should be smoke-tested with keyboard, font scaling, narrow panes, themes, reduced motion, and mobile layout.
36. Shared components should carry accessibility behavior so modules inherit correct defaults.
37. Accessibility behavior is never an opt-in component variant.

---

# Implementation Guidance

The design specification should guide refactors incrementally.

Recommended order:

1. Normalize shared primitives first:
   - `BufferContainer`
   - `BufferHeader`
   - `BufferBody`
   - `KJVButton`
   - shared navigation containers/context
2. Normalize representative modules:
   - Settings
   - Plans
   - Notes
   - Bible
3. Extract shared components only after repeated implementations prove the abstraction.
4. Avoid broad visual rewrites that change many modules before the shared primitive behavior is stable.
5. Prefer small patches that establish one design rule at a time.
6. Preserve module/domain boundaries and existing application architecture while applying presentation rules.

The design system is intentionally constrained. If a new pattern is proposed, first ask whether an existing foundation, layout, list, control, navigation, or state rule can express it cleanly.

