# Color System Implementation
**Status:** Current  
**Area:** `client/kjvonly-pwa`  
**Primary implementation:** `client/kjvonly-pwa/src/app.css`  
**Settings UI definition:** `client/kjvonly-pwa/src/lib/application/modules/settings/definitions/settings.definition.ts`
---
# Purpose
KJVOnly.bible uses semantic color tokens rather than hard-coded component palettes.

The color system is designed so that components express roles such as:
```text
primary
neutral
support
vivid
highlight
```
while the active theme decides the actual color values.

The runtime flow is:
```text
Settings.colorTheme
    +
Settings.isDarkTheme
    ↓
SettingsService.applySettings()
    ↓
<html data-theme="color-theme-...">
    ↓
app.css theme selector
    ↓
semantic CSS color tokens
    ↓
Tailwind utilities
    ↓
components
```
Components should normally remain unaware of the selected palette.
---
# Scope
This document covers:

- semantic color-token ownership;
- theme selector naming;
- light/dark palette pairing;
- scale reversal in dark mode;
- application color roles;
- highlight colors;
- the Night reading theme;
- the Night Colorblind theme;
- contrast targets;
- color-vision accessibility;
- extension and testing rules.

Typography, font size, font family, persistence, and the broader Settings lifecycle are documented in:
```text
docs/03_implementation/ui/001-theme-system.md
```
---
# Source of Truth
The concrete palette values live in:
```text
client/kjvonly-pwa/src/app.css
```
The selectable theme values live in the Settings definition:
```text
client/kjvonly-pwa/src/lib/application/modules/settings/definitions/settings.definition.ts
```
The global theme attribute is applied by:
```text
client/kjvonly-pwa/src/lib/application/services/settings.service.ts
```
Color definitions should not be duplicated in Svelte components.
---
# Theme Identity
`Settings.colorTheme` stores the palette name.

Examples:
```text
red
light-blue
purple
cyan
pink
night
night-colorblind
```
`Settings.isDarkTheme` selects the light or dark member of that palette.

The generated application selector is:
```text
light:
color-theme-<colorTheme>

dark:
color-theme-dark-<colorTheme>
```
For example:
```text
colorTheme = night
isDarkTheme = false

→ data-theme="color-theme-night"
```
and:
```text
colorTheme = night
isDarkTheme = true

→ data-theme="color-theme-dark-night"
```
The Night Colorblind pair is:
```text
color-theme-night-colorblind
color-theme-dark-night-colorblind
```
No special-case code is required in `SettingsService` for these themes.
---
# Semantic Token Model
The application uses named color roles rather than palette-specific component values.

The important families are:
```text
--color-primary-*
--color-neutral-*
--color-support-a-*
--color-support-b-*
--color-vivid-a-*
--color-vivid-b-*
--color-highlighta
--color-highlightb
--color-highlightc
--color-highlightd
--color-highlighte
--color-redtxt
--color-primary-surface
```
Components consume these through utilities such as:
```text
bg-neutral-50
text-neutral-700
border-neutral-400

bg-primary-500
text-primary-700

text-support-a-600
bg-support-b-100

bg-highlighta
bg-highlightb
```
A component should express the semantic role it needs.

It should not know that the current theme happens to map that role to red, blue, amber, teal, or another hue.
---
# Shade Scales
Most semantic families expose a scale:
```text
50
100
200
300
400
500
600
700
800
900
```
The scale has semantic meaning across the application.

In a light theme:
```text
50
    → light surface end

900
    → dark text / strong end
```
In a dark theme the values are generally reversed:
```text
50
    → dark surface end

900
    → light text / strong end
```
This allows component code such as:
```text
bg-neutral-50
text-neutral-700
```
to continue expressing the same UI intent in both modes.

The component does not need:
```text
if dark
    use another utility
else
    use this utility
```
for ordinary theme behavior.
---
# Light/Dark Pairing
A color theme should normally define both:
```text
[data-theme='color-theme-<name>']
[data-theme='color-theme-dark-<name>']
```
The dark member is not an unrelated palette.

It should preserve the same semantic families while adapting their luminance ordering for a dark surface.

Conceptually:
```text
Light theme
50  ← light
...
500 ← middle
...
900 ← dark
```
becomes approximately:
```text
Dark theme
50  ← dark
...
500 ← middle
...
900 ← light
```
The exact values do not need to be mathematical mirrors.

Accessibility and perceptual balance take precedence over mechanical inversion.
---
# Primary Surface
`--color-primary-surface` identifies the theme's principal reading/background surface.

For ordinary light themes this is a light value.

For dark themes this is a dark value.

Night deliberately uses a warm near-black instead of pure black:
```css
hsl(30deg 6% 6%)
```
This keeps the display dark while reducing the perceptual jump between the page background and reading text.
---
# Neutral Scale
The neutral scale is the most important accessibility scale because it carries much of the reading UI.

It is used for roles including:
```text
application background
buffer background
body text
secondary text
borders
pane separators
disabled states
controls
```
The Night themes use warm gray rather than perfectly achromatic gray.

Dark Night neutral endpoints are approximately:
```text
neutral-50
    hsl(30deg 6% 6%)

neutral-700
    hsl(35deg 7% 64%)

neutral-900
    hsl(38deg 10% 84%)
```
The purpose is not to make text faint.

The purpose is to avoid pure white against pure black while retaining strong readable luminance contrast.
---
# Existing General Color Themes
The application currently supports general palettes including:
```text
RED
LIGHT BLUE
PURPLE
CYAN
PINK
```
Each palette defines the same semantic token vocabulary.

These themes are general application themes.

They are not specifically optimized for low-luminance nighttime reading.
---
# Night Theme
The selectable value is:
```text
night
```
The selectors are:
```text
[data-theme='color-theme-night']
[data-theme='color-theme-dark-night']
```
The Night theme is intended for long-form reading in a dark environment.

Its goals are:
```text
avoid pure black / white glare
retain strong text contrast
keep surfaces low luminance
keep accents muted
avoid highly saturated highlights
preserve the normal semantic-token contract
```
The dark Night palette uses:
```text
near-black warm gray
    → primary reading surface

soft warm gray
    → normal reading text

muted amber
    → primary

muted teal
    → support A

muted rust
    → support B

muted ochre
    → vivid A

muted plum
    → vivid B
```
Night is optimized primarily for comfortable low-luminance reading.

It is not intended to make its five accent families maximally distinguishable for every form of color-vision deficiency.
---
# Night Colorblind Theme
The selectable value is:
```text
night-colorblind
```
The selectors are:
```text
[data-theme='color-theme-night-colorblind']
[data-theme='color-theme-dark-night-colorblind']
```
Night Colorblind preserves the Night reading surface and neutral scale.

Its accent families are deliberately changed to reduce hue collisions.

The five principal families are:
```text
amber
teal
terracotta
blue
rose
```
Mapped conceptually as:
```text
primary
    → amber

support-a
    → teal

support-b
    → terracotta

vivid-a
    → blue

vivid-b
    → rose
```
This replaces the original Night combination in which amber and ochre were too similar for reliable categorical distinction.
---
# Why Night Colorblind Is Separate
Night and Night Colorblind are separate user choices.

Night is allowed to prioritize a visually cohesive muted reading palette.

Night Colorblind prioritizes stronger categorical separation between accent families.

The colorblind palette must not overwrite the Night palette.

The settings therefore expose:
```text
NIGHT
NIGHT COLORBLIND
```
as independent values.

This allows a user to choose the presentation that works best for them rather than assuming one palette is universally preferable.
---
# Color-Vision Design
Color-vision accessibility must not be treated as:
```text
choose five different hue angles
```
Different hues can collapse perceptually under:
```text
protanopia
deuteranopia
tritanopia
other color-vision differences
```
Night Colorblind therefore separates important colors with more than hue.

The design uses a combination of:
```text
hue
+
lightness
+
semantic context
```
The highlight colors also vary in luminance rather than being equal-lightness swatches with different hue values.

This makes the categories more robust when hue discrimination is reduced.
---
# Color Must Not Be the Only Signal
Palette design cannot by itself guarantee accessible meaning.

If a color represents information such as:
```text
selected / unselected
error / success
category A / category B
state changes
markup meaning
```
the UI should provide another signal where the distinction matters.

Additional signals may include:
```text
text
icon
underline
border
shape
pattern
position
label
```
Bible Text Markup already supports classes beyond background color, including underline/decoration behavior.

That capability should be preferred when a markup distinction must remain identifiable without reliable hue perception.

This follows WCAG 2.2 Success Criterion 1.4.1, Use of Color.
---
# Highlight Tokens
The application provides five highlight tokens:
```text
--color-highlighta
--color-highlightb
--color-highlightc
--color-highlightd
--color-highlighte
```
Highlights are presentation tokens.

They are not Domain enums.

Bible Text Markup stores generic CSS class names and should remain independent from the current palette definitions.

For example:
```text
bg-highlighta
bg-highlightb
text-highlighta
decoration-highlighta
```
can all resolve through the current theme.
---
# Night Highlights
Dark Night uses deliberately subdued highlight surfaces.

They should:
```text
remain visibly different from the reading surface
avoid becoming luminous blocks
preserve readable foreground text
fit the low-luminance reading environment
```
The original Night highlight families are warm amber, teal, rust, ochre, and plum.

Because some of those colors are intentionally close, Night should not be considered the strongest choice when the five highlight categories themselves must be distinguished by color.
---
# Night Colorblind Highlights
Dark Night Colorblind currently uses approximately:
```text
highlight A
    amber
    hsl(40deg 24% 21%)

highlight B
    teal
    hsl(175deg 20% 20%)

highlight C
    terracotta
    hsl(15deg 28% 19%)

highlight D
    blue
    hsl(215deg 20% 18%)

highlight E
    rose
    hsl(320deg 18% 14%)
```
These values intentionally vary in both hue and lightness.

The light Night Colorblind counterparts use brighter versions of the same families.

This is preferable to making all five highlights identical in luminance and relying entirely on hue.
---
# Contrast Targets
Color-pair accessibility is evaluated using relative luminance contrast.

The implementation should use WCAG 2.2 as the baseline accessibility reference.

Important targets are:
```text
normal text
    AA
    ≥ 4.5:1

normal text
    AAA
    ≥ 7:1

large text
    AA
    ≥ 3:1

meaningful UI component / graphical boundary
    AA
    ≥ 3:1
```
These correspond primarily to:
```text
WCAG 2.2 SC 1.4.3
    Contrast (Minimum)

WCAG 2.2 SC 1.4.6
    Contrast (Enhanced)

WCAG 2.2 SC 1.4.11
    Non-text Contrast
```
A palette meeting these ratios for selected pairs does not mean the entire application conforms to WCAG AA or AAA.

Application conformance depends on all applicable success criteria and all actual foreground/background combinations.
---
# Night Contrast Intent
The dark Night surface was designed so that normal reading text is substantially above the AA minimum while avoiding white text.

The intended relationship is approximately:
```text
near-black warm background
    +
soft warm-gray body text

→ strong reading contrast without white-on-black glare
```
The primary reading pair was designed around an approximately AAA-level contrast relationship.

Secondary text may intentionally use lower contrast.

Where secondary text is normal-sized and meaningful, it must still remain at or above the AA threshold.
---
# AAA Is Not the Goal for Every Visual Element
AAA text contrast is useful for primary reading text.

It is not necessary or desirable to force every UI surface, divider, muted label, and highlight to 7:1.

Doing so would undermine the low-luminance Night design.

The rules are role-specific:
```text
primary reading text
    → prefer very strong contrast

normal meaningful text
    → at least AA

large text
    → applicable large-text threshold

meaningful component boundaries
    → at least 3:1 where WCAG requires it

decorative boundaries
    → no artificial contrast target solely because they exist
```
---
# Contrast Is Pair-Specific
A token does not have an accessibility rating by itself.

For example:
```text
support-b-500
```
cannot be declared AA or AAA without identifying the background on which it is used.

The relevant unit is:
```text
foreground token
+
actual adjacent background token
+
text size / semantic role
```
Therefore palette testing must evaluate real component combinations.
---
# Avoid Pure White as the Night Default
The Night themes intentionally do not use:
```text
#ffffff
```
as the normal reading foreground on:
```text
#000000
```
or equivalent pure black.

This is a comfort/design choice, not a WCAG requirement.

WCAG defines minimum contrast, not an upper contrast limit.

The application chooses a softer reading foreground while remaining above its required contrast threshold.
---
# Dark Does Not Mean Low Contrast
Night reading mode must not be implemented by simply reducing text brightness until the screen appears comfortable.

That can make text inaccessible.

The correct goal is:
```text
low absolute luminance
+
sufficient relative luminance difference
```
not:
```text
low absolute luminance
+
low contrast
```
A near-black background and medium-light gray text can satisfy both goals.
---
# Accent Saturation
Night themes use restrained saturation.

Highly saturated colors on a near-black surface can appear disproportionately bright even when their measured luminance is moderate.

The palette therefore favors muted accents.

This applies especially to:
```text
primary controls
links
markup colors
highlight surfaces
support colors
```
The Night Colorblind theme may use somewhat greater separation than Night, but should still remain visually subdued.
---
# Theme Selection UI
The Settings definition exposes color themes through the `color-theme` select row.

The relevant stable options include:
```ts
{ id: 'night', label: 'Night', value: 'night' }
{ id: 'night-colorblind', label: 'Night Colorblind', value: 'night-colorblind' }
```
The generic Settings choice page renders these options. The UI should store only the stable theme value.

It should not directly set CSS variables.

Theme application remains owned by `SettingsService` and `app.css`.
---
# Adding a New Palette
A new palette should follow this process.
## 1. Choose a stable settings value
Example:
```text
sepia
```
## 2. Add the Settings option
```text
SEPIA
```
## 3. Add both selectors
```text
color-theme-sepia
color-theme-dark-sepia
```
## 4. Define the complete semantic token set
Do not define only the handful of colors visible in the screen currently being edited.

A theme is an application-wide contract.
## 5. Preserve scale semantics
The same utility should continue to represent the same semantic role in light and dark variants.
## 6. Check actual foreground/background pairs
At minimum inspect:
```text
body text
secondary text
headers
links/actions
buttons
inputs
pane boundaries
focus states
disabled states
highlight text
markup decorations
```
## 7. Check color-vision behavior
Do not evaluate the palette only with normal trichromatic vision.

Check at least common simulations for:
```text
protanopia
deuteranopia
tritanopia
```
## 8. Verify meaning without color
Where colors communicate state or category, verify that another visual cue exists when required.
---
# Tailwind Static Class Discovery
Tailwind must be able to discover utility class names statically in source before it can emit the corresponding CSS.

This matters when semantic application classes are selected dynamically through:
```text
resolver maps
computed class strings
stored Bible Text Markup classes
runtime configuration
```

A class may be semantically valid and backed by a theme token while still being absent from the generated stylesheet if its literal utility name never appears in statically discoverable source.

Examples include finite semantic families such as:
```text
text-vivid-*
text-support-*
text-highlight*
decoration-highlight*
```

When a finite set of classes is intentionally selected dynamically, it is acceptable to retain literal hidden references so Tailwind sees the complete class set.

For example:
```svelte
<!-- Tailwind must see these literal classes. Keep them in source/DOM. -->
<span class="text-highlighta hidden"></span>
<span class="text-highlightb hidden"></span>
<span class="text-highlightc hidden"></span>
<span class="text-highlightd hidden"></span>
<span class="text-highlighte hidden"></span>

<span class="decoration-highlighta hidden underline"></span>
<span class="decoration-highlightb hidden underline"></span>
<span class="decoration-highlightc hidden underline"></span>
<span class="decoration-highlightd hidden underline"></span>
<span class="decoration-highlighte hidden underline"></span>
```

The same technique may be used for other finite semantic color utilities when dynamic resolution prevents Tailwind from discovering their literal names.

This is a build-time class-discovery concern, not a reason to replace semantic tokens with hard-coded colors.

When an SVG uses:
```text
currentColor
```

and appears to ignore a semantic color, verify first that the expected Tailwind `text-*`, `fill-*`, or `decoration-*` utility was actually emitted in the generated CSS.

A missing generated utility can look like an SVG/currentColor bug even when the SVG is behaving correctly.

---
# Testing Strategy
Color themes need both structural and visual testing.
## Structural testing
Verify:
```text
Settings option exists
Settings value persists
correct data-theme attribute is applied
both light and dark selectors exist
complete token families are defined
```
## Contrast testing
Verify actual rendered pairs against their required thresholds.

Do not calculate only:
```text
palette color vs page background
```
if the color is actually rendered on another surface.
## Color-vision testing
Simulate at least:
```text
protanopia
deuteranopia
tritanopia
```
Pay particular attention to:
```text
highlight A-E
success/error-like colors
selected/unselected states
adjacent chart/category colors
small icons
thin borders
```
## Browser testing
Visual browser tests are appropriate for ensuring that:
```text
theme selection changes the root selector
dark mode selects the paired variant
critical surfaces use expected semantic tokens
```
Pixel-perfect screenshots should not become the only accessibility test.

Contrast and semantic checks should remain explicit.
---
# Theme Review Checklist
Before accepting a new theme, verify:
```text
[ ] complete semantic token families exist

[ ] light and dark selectors both exist

[ ] dark scales preserve semantic role

[ ] primary reading text meets its contrast target

[ ] meaningful normal text meets AA

[ ] meaningful UI boundaries meet applicable 3:1 requirements

[ ] accent colors remain visible on their real backgrounds

[ ] highlights preserve readable foreground text

[ ] critical meaning is not carried by hue alone

[ ] common color-vision simulations were reviewed

[ ] theme remains usable at supported font sizes

[ ] components did not gain theme-specific color branches
```
---
# Invariants
Preserve these rules:
```text
app.css owns application palette values.

Settings stores palette identity, not individual colors.

SettingsService applies theme identity.

Components consume semantic tokens.

Light/dark variants preserve semantic roles.

Dark mode may rebalance values rather than mechanically invert every number.

Night and Night Colorblind remain independent user-selectable themes.

Night prioritizes low-luminance reading comfort.

Night Colorblind additionally prioritizes accent/category separation.

Primary reading contrast must not be sacrificed merely to make the screen darker.

Color must not be the sole carrier of important meaning.

Accessibility is evaluated on real foreground/background pairs, not token names.
```
---
# Anti-Patterns
Do not:
```text
hard-code theme RGB/HSL values inside components

branch component code on "night" or "night-colorblind"
for ordinary coloring

overwrite Night when improving Night Colorblind

assume different hue values are distinguishable to every user

make dark-mode text faint merely to reduce screen brightness

claim application-level AA/AAA conformance because one palette pair passes

treat a color token itself as "AA" or "AAA" without its background/context

use highlight color alone when the category must remain identifiable
```
---
# Relationship to Bible Text Markup
Bible Text Markup stores generic presentation classes such as:
```text
bg-highlighta
text-highlighta
decoration-highlighta
underline
decoration-solid
```
The Domain object does not store the Night palette's concrete HSL values.

The relationship is:
```text
Bible Text Markup
    ↓
semantic class
    ↓
Tailwind/theme token
    ↓
active app.css palette
```
This keeps persisted markup independent from current visual theme choices.

It also allows a user to switch:
```text
NIGHT
    ↔
NIGHT COLORBLIND
```
without rewriting their stored markup.
---
# Summary
The KJVOnly.bible color system is a semantic token system.
```text
Settings
    ↓
theme identity
    ↓
app.css selector
    ↓
semantic color scale
    ↓
component utilities
```
The standard themes provide general palette choices.

Night adds a warm, low-luminance reading palette that avoids white-on-black presentation while retaining strong reading contrast.

Night Colorblind keeps the same reading surface but changes accent families and highlight luminance so distinctions are less dependent on hue perception.

The central implementation rules are:
```text
define palettes centrally
consume semantic roles
preserve contrast
separate accessibility concerns from Domain data
do not rely on color alone
```
