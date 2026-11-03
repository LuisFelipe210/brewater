---
name: Brewater (iPhone)
description: The SCA water chart as an identity; an espresso slab, a petrol-teal ideal zone, copper actions, rounded heavy numbers on native iOS.
colors:
  espresso: "#1e120c"
  crema: "#e9b98f"
  on-espresso: "#f3f5f2"
  on-espresso-muted: "rgba(243, 245, 242, 0.62)"
  zone: "#2bb3bd"
  zone-deep: "#0b7a83"
  zone-label: "#a6edf1"
  copper: "#b85f27"
  copper-dark: "#e39a62"
  ground: "#f3f5f2"
  ground-dark: "#0b0907"
  card: "#ffffff"
  card-dark: "#1a1512"
  ink: "#1e120c"
  ink-dark: "#f3f0ec"
  ink-muted: "rgba(30, 18, 12, 0.62)"
  ink-muted-dark: "rgba(243, 240, 236, 0.62)"
  ink-faint: "rgba(30, 18, 12, 0.36)"
  rule: "rgba(30, 18, 12, 0.12)"
  rule-dark: "rgba(243, 240, 236, 0.12)"
  ok: "#1f7a45"
  ok-dark: "#5fd892"
  ok-soft: "rgba(60, 200, 114, 0.16)"
  warn: "#8a5a00"
  warn-dark: "#f5c45e"
  warn-soft: "rgba(242, 179, 61, 0.22)"
  bad: "#b03a22"
  bad-dark: "#ff8a72"
  bad-soft: "rgba(240, 100, 74, 0.16)"
  verdict-excelente: "#3cc872"
  verdict-boa: "#a3d24e"
  verdict-regular: "#f2b33d"
  verdict-ruim: "#f0644a"
  verdict-insuficiente: "#a8a29e"
  boa-text: "#4c7410"
  boa-text-dark: "#b8e070"
typography:
  display:
    fontFamily: "ui-rounded, 'SF Pro Rounded', -apple-system, system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-2px"
    fontFeature: "tnum"
  large-title:
    fontFamily: "ui-rounded, 'SF Pro Rounded', -apple-system, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    letterSpacing: "0.2px"
  headline:
    fontFamily: "ui-rounded, 'SF Pro Rounded', -apple-system, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: "35px"
  title:
    fontFamily: "ui-rounded, 'SF Pro Rounded', -apple-system, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: "29px"
  score:
    fontFamily: "ui-rounded, 'SF Pro Rounded', -apple-system, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    letterSpacing: "-0.3px"
    fontFeature: "tnum"
  figure:
    fontFamily: "ui-rounded, 'SF Pro Rounded', -apple-system, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    fontFeature: "tnum"
  verdict:
    fontFamily: "-apple-system, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "22px"
  body:
    fontFamily: "-apple-system, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
  body-small:
    fontFamily: "-apple-system, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "-apple-system, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  chart-label:
    fontFamily: "-apple-system, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.4px"
  chart-tick:
    fontFamily: "ui-rounded, 'SF Pro Rounded', -apple-system, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  zone: "4px"
  control: "12px"
  tile: "13px"
  inset: "14px"
  slab: "28px"
  full: "9999px"
spacing:
  hairline: "1px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "14px"
  inset: "16px"
  slab-bottom: "18px"
components:
  button-primary:
    backgroundColor: "{colors.copper}"
    textColor: "{colors.card}"
    rounded: "{rounded.full}"
    height: "48px"
  button-tonal:
    backgroundColor: "rgba(184, 95, 39, 0.15)"
    textColor: "{colors.copper}"
    rounded: "{rounded.full}"
    height: "48px"
  button-scan:
    backgroundColor: "rgba(184, 95, 39, 0.15)"
    textColor: "{colors.copper}"
    rounded: "{rounded.control}"
    padding: "10px 4px 9px"
  navbar-espresso:
    backgroundColor: "{colors.espresso}"
    textColor: "{colors.on-espresso}"
  navbar-espresso-button:
    backgroundColor: "rgba(243, 245, 242, 0.12)"
    textColor: "{colors.crema}"
    rounded: "{rounded.full}"
  espresso-slab:
    backgroundColor: "{colors.espresso}"
    textColor: "{colors.on-espresso}"
    rounded: "{rounded.slab}"
    padding: "4px 14px 18px"
  list-inset:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inset}"
  score-tile-excelente:
    backgroundColor: "{colors.ok-soft}"
    textColor: "{colors.ok}"
    typography: "{typography.score}"
    rounded: "{rounded.tile}"
    size: "46px"
  score-tile-boa:
    backgroundColor: "rgba(163, 210, 78, 0.22)"
    textColor: "{colors.boa-text}"
    typography: "{typography.score}"
    rounded: "{rounded.tile}"
    size: "46px"
  score-tile-regular:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    typography: "{typography.score}"
    rounded: "{rounded.tile}"
    size: "46px"
  score-tile-ruim:
    backgroundColor: "{colors.bad-soft}"
    textColor: "{colors.bad}"
    typography: "{typography.score}"
    rounded: "{rounded.tile}"
    size: "46px"
  score-tile-insuficiente:
    backgroundColor: "{colors.rule}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.score}"
    rounded: "{rounded.tile}"
    size: "46px"
  input-value:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body}"
  input-value-from-photo:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.ink}"
  status-pill:
    textColor: "{colors.ok}"
    typography: "{typography.label}"
---

# Design System: Brewater (iPhone)

## Overview

**Creative North Star: "The Water Chart on the Bar"**

Brewater's iPhone app is native iOS with a coffee voice. Framework7 in the iOS theme supplies the structure: large-title navbars, inset grouped lists, push sheets, action sheets, swipe-back and the iOS 26 glass bar buttons. The identity sits on top of that structure and nowhere else. A dark espresso slab carries the SCA water chart (hardness on x, alkalinity on y) with 1px hairline grid lines and a petrol-teal ideal zone, and every water is a dot on it. Below the slab the app is plain native: mineral-paper ground, white inset cards, SF Pro text.

Density is calm and one-handed. Each screen leads with a single big rounded number or the chart, then hands off to lists you read by scrolling. Color is semantic, not decorative. Copper means "you can act here", teal means "the SCA ideal", and green, amber and red mean verdict or parameter status. Nothing is colored just to fill space.

The world rejects the Settings-style grouped list with a progress ring that the previous version shipped. The chart, not a ring, is how a score is shown in space.

**Key Characteristics:**
- An espresso slab with the hairline SCA chart at the top of Home, Result and the editor preview
- Every water is a dot colored by its verdict; the ideal zone is the only teal shape
- SF Rounded heavy for scores and titles, SF Pro for everything else, tabular figures for every number
- Copper (crema on espresso) is reserved for actions and the fix route
- Below the slab the screen is native iOS inset lists, with no custom chrome

## Colors

A warm-dark espresso and paper pairing with one action metal (copper), one reference hue (petrol teal) and a traffic-light verdict scale.

### Primary
- **Copper** (`copper` / `copper-dark`): the action tint. It is the Framework7 theme color, so every link, button fill, tonal button, Save action, text caret and selection uses it. It also marks the "just edited" row flash (copper at 16%). In dark mode it lightens to keep contrast on near-black.
- **Crema** (`crema`): copper's voice on espresso. Navbar links and icons on the espresso bar (back, +, Editar), the animated fix-route line, the destination ring and the route caption. It is used only on the espresso surface.

### Secondary
- **Petrol Teal** (`zone` on espresso and in dark mode, `zone-deep` on light cards): the SCA ideal zone and nothing else. That means the zone rectangle on the chart (30% fill, 1px stroke), the acceptable band (8% fill), the ideal segment of each parameter range bar, and the partner-water series in a blend bar. The zone caption is light teal (`zone-label`).

### Tertiary (verdict and status)
- **Verdict solids** (`verdict-excelente`, `verdict-boa`, `verdict-regular`, `verdict-ruim`, `verdict-insuficiente`): bright saturated fills for chart dots, the focus halo, the arriving route dot and the big verdict score on espresso. They are tuned to read against espresso, not against paper.
- **Status inks** (`ok`, `warn`, `bad`, plus their `-dark` lifts and `boa-text`): darker forms used as text on paper. They color score-tile numerals, status pills, the improved score in a blend ("31 → **96**"), error labels and the "from photo" marker.
- **Status soft fills** (`ok-soft`, `warn-soft`, `bad-soft`): 16–22% tints behind score tiles. `warn-soft` also fills value rows that were read from the photo and need review.

### Neutral
- **Espresso** (`espresso`): the slab, the espresso navbar and the PWA theme-color. It is the same hue as `ink`, so light-mode text and the slab read as one material.
- **On-espresso** (`on-espresso`, `on-espresso-muted`): titles and captions on the slab. Chart grid lines are on-espresso at 9%, axes at 40% and ticks at 55%.
- **Mineral Paper** (`ground`): the light page ground. It is a cool, faintly green off-white, not iOS's default grey.
- **Card** (`card` / `card-dark`): inset list and block surfaces.
- **Ink** (`ink`, `ink-muted`, `ink-faint`, `rule`): text at 100 / 62 / 36%, plus a 12% hairline for dividers, range tracks and the neutral "this water" series in a blend bar.
- **Dark ground** (`ground-dark`, `card-dark`): a warm near-black ground with warm cards, not iOS true black. The dark tokens are declared on `.ios.dark` so they win over Framework7's own dark cascade.

### Named Rules
**The Copper Is a Verb Rule.** Copper (and crema on espresso) appears only where a tap does something, or along the route that shows how to fix the water. Data series, decoration and status never use it. Even the blend bar keeps "this water" neutral so copper stays an action.

**The One Teal Rule.** Teal means "inside the SCA ideal". It marks the zone, the ideal segment of a range, and the partner water that moves this one toward the zone. Anything that is not about the ideal does not get teal.

**The Solid vs Ink Rule.** Saturated verdict solids go on espresso (dots, the big score). Darker status inks go on paper (tiles, pills, numbers). Never put a solid as text on a white card.

## Typography

**Display Font:** SF Pro Rounded via `ui-rounded` (falling back to -apple-system / system-ui)
**Body Font:** SF Pro via -apple-system / system-ui
**Label/Mono Font:** SF Mono (`ui-monospace`) only in the paste-label textarea

**Character:** Heavy rounded numerals give the scores a soft, confident, almost bottle-cap weight. SF Pro keeps everything else unmistakably iOS. SF is the platform's own face, chosen because the product must feel native.

### Hierarchy
- **Display** (800, 64px, 0.9 line-height, −2px tracking): the verdict score on the Result slab, tinted with its verdict solid.
- **Large title** (800 rounded, 34px): the espresso navbar's large title ("Brewater").
- **Headline** (800 rounded, 30/35px): the water's name at the top of the Result slab. It hands off to the 17px rounded 700 navbar title once it scrolls under the bar.
- **Title** (800 rounded, 24/29px): the first-run empty-state question.
- **Score / Figure** (800 or 700 rounded, 20px): numerals in score tiles and parameter values. Units drop to 12px SF Pro in muted ink.
- **Verdict** (700, 18/22px): the verdict line next to the big score.
- **Body** (400, 17px): list titles (600 for water names and parameter names) and value inputs.
- **Body small** (400, 15/20px): parameter explanations, observations, criteria text and slab captions.
- **Label** (400–600, 13/18px): origins ("Ca 70 × 2,497…"), ranges, pills, legends and hints.
- **Chart label / tick** (11px): axis names in 700 with 0.4px tracking; ticks in rounded tabular figures.

### Named Rules
**The Tabular Rule.** Every number is set in tabular figures: scores, GH/KH, values, percentages and chart ticks. Columns of numbers must not jitter as values change.

**The Rounded Numbers Rule.** Rounded heavy is for scores, numeric values and titles. Running text, list titles and labels stay in SF Pro.

## Layout

The app is a single-column phone layout inside Framework7's iOS page model. Each screen stacks two zones. The **espresso slab** runs full-bleed under the navbar, with 4px top, 14px side and 18px bottom padding and an 8px gap below. The chart fills its width through a fixed 340-unit viewBox (220 tall, 136 when compact). The **native body** follows: block titles and inset grouped lists with 16px side margins.

Order on every screen follows the product story. Home: chart, then the ranked list. Result: name, score and verdict, the chart with its route, then "Como melhorar", parameters, observations, label data, criteria and delete. Editor: scan card, brand, preview (verdict tile plus compact chart) and values. Parameter rows use 14px vertical and 16px horizontal padding. Spacing elsewhere follows a 4/8/12/14/16 rhythm, and hairlines are 0.5–1px.

The chart uses a fixed scale (GH 0–200, KH 0–120) so the ideal zone is always the same size. An off-scale water is pinned just inside the edge with a dashed stroke rather than squashing the others. Chart taps resolve to the nearest dot within roughly 44pt.

## Elevation & Depth

Depth is mostly tonal: a dark slab against a light ground, and white cards on paper. The few shadows are functional:
- **Glass bar buttons:** on espresso, a 12% on-espresso fill with a 0.5px inset ring (the iOS 26 glass button tinted espresso instead of white).
- **Sheet navbar glass:** in the editor and paste sheets, the bar is the ground at 94% with an 18px blur, 160% saturation and a 0.5px rule underline, so content slides under it as in native sheets.
- **Range dot lift:** a 1px/3px soft espresso shadow plus a 2.5px card-colored ring lifts the value dot off the range track.
- **Dark slab edge:** in dark mode the slab gets a 0.5px light hairline under it, because espresso nearly merges with the near-black ground.

**The Flat Slab Rule.** The espresso slab never casts a shadow. It is separated from the body only by tone, its 28px bottom corners and, in dark mode, a hairline.

## Shapes

Corners are soft and continuous, in the iOS idiom. The slab has 28px bottom corners only, so it reads as a tray hanging from the navbar. Inset lists and the scan card use 14px. Score tiles use 13px on a 46px square, and scan buttons 12px. Chart zones use a tight 4px radius so they stay plotted rectangles. Dots, pills, glass bar buttons and primary buttons are fully round. Range bars are 2px hairlines with a 6px ideal segment. Blend bars are 8px tall with 4px ends and 3px gaps.

When the compact chart sits inside an inset list (editor preview), it inherits the list's 14px bottom corners and becomes the bottom of that card.

## Components

### Buttons
- **Shape:** fully round pills at 48px (Framework7 iOS large).
- **Primary:** copper fill with white label, used for the first-run "Fotografar rótulo" call to action. One primary per screen.
- **Tonal:** copper at 15% (25% pressed) with a copper label, for the secondary capture choices.
- **Scan buttons:** three equal tonal tiles (12px radius) in the editor's scan card, each with a 24px Framework7 icon over a 13px 600 label (Câmera, Fotos, Colar texto).
- **Navbar text actions:** "Salvar" and "Usar" are copper 600, and disabled actions drop to 35% opacity. On espresso, actions sit in crema inside glass circles or capsules.
- **Destructive:** "Excluir água" is a list button, confirmed through an iOS action sheet.

### Cards / Containers
- **Espresso slab:** the signature container (see below).
- **Inset lists:** card surface, 14px corners, 16px margins, hairline dividers inset 16px, with muted block titles above.

### Score Tile
A 46px rounded square (13px radius) holding a heavy rounded score on its verdict's soft tint. It is the list's leading media on Home and the preview anchor in the editor.

### Parameter Row
Name (600) and value (rounded 700, 20px, with a small muted unit) on one baseline. Below them come the origin formula in muted 13px, a range bar, a status pill (7px dot plus a 600 label in status ink) with the ideal range at the right, and a 15/20 explanation.

### Range Bar
A 2px track in `rule`, the acceptable band in teal at 35%, and the ideal band as a 6px segment in deep teal (bright teal in dark mode). A 14px status-colored dot with a card ring and soft shadow sits at the value, clamped so it is never cut off.

### Blend Bar
An 8px split bar with a matching dot legend. This water is shown in muted ink, a partner water in teal, and distilled water as a `rule` fill with a faint inset outline. The score delta reads "antes → **depois**", with the "after" score in ok ink. A row with a partner water is tappable and opens that water.

### Inputs / Fields
- **Value rows:** label on the left, a right-aligned tabular number in muted ink that turns full ink on focus, with a copper caret, in Settings style.
- **From photo:** OCR-filled rows get a `warn-soft` background and a "· da foto" suffix in warn 600 until the user reviews them.
- **Error:** the field label and underline turn `bad`, with a 13/17 message.
- **Paste box:** SF Mono 15px, at least 170px tall.

### Navigation
- **Espresso navbar:** espresso at 94% translucency with no border, a large rounded 800 title, on-espresso text and crema links. On Result, the small title fades in (0.2s) only once the large name scrolls under the bar.
- **Sheet navbar:** a glass bar over the ground color (see Elevation) with Cancel, a title and a copper Save.
- **Action sheets:** native iOS actions for "add water" (photo, library, paste, type) and destructive confirmations.

### Espresso Chart Slab (signature)
The SCA water chart drawn on espresso. Axes are GH (hardness) on x and KH (alkalinity) on y, in mg/L CaCO₃.
- **Grid:** 1px hairlines at 9% on-espresso, 1px axes at 40%, rounded tabular ticks at 55%, and axis names in 11px 700.
- **Zones:** the acceptable rectangle is teal at 8% with a 30% stroke; the ideal rectangle is teal at 30% with a full-teal 1px stroke and the caption "ideal SCA" in light teal. The caption moves inside the zone when a focused dot would collide with it.
- **Dots:** 6.5px radius (8px when focused), filled with the verdict solid and stroked 2px in espresso so they cut out of the grid. A focused dot gets a 13px halo ring in its verdict color at 55%, and other dots dim to 35%. Off-scale dots get a 2/2 dashed stroke and a "fora da escala" note.
- **Route:** the best fix is drawn as a 2px crema line from the water to a 2.5px crema-ringed target. The target fills with the fixed water's verdict color as it arrives. A blend partner is shown as a small espresso dot with a crema ring and a faint ghost line.
- **Compact variant:** 136 units tall with no numbered ticks, used inside the editor preview card.

### Motion
- **Route slide:** after a 350ms delay, the target slides along the route over 1100ms with an ease-out-quart curve, and its verdict color fades in as it arrives. It plays once per route.
- **Reorder:** when an edit changes the ranking, rows FLIP from their old position over 520ms with `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Changed row:** the edited row holds a copper 16% wash for 55% of 2.6s, then fades out.
- **Small transitions:** dot dimming 0.3s, navbar title 0.2s. Everything else is Framework7's native page, sheet and action transitions.
- **Reduced motion:** the route jumps straight to its end, FLIP is skipped, and the changed row shows a static copper 12% wash.

## Do's and Don'ts

### Do:
- **Do** put the chart on the espresso slab at the top of any screen that is about a water's position, and plot every water as a verdict-colored dot.
- **Do** keep copper (crema on espresso) for taps and the fix route only.
- **Do** use teal only for the SCA ideal zone, ideal range segments and the partner-water series.
- **Do** use verdict solids on espresso and status inks on paper.
- **Do** set every number in tabular figures, and scores and values in SF Rounded heavy.
- **Do** use native Framework7 iOS lists, sheets, action sheets and glass bar buttons below the slab.
- **Do** honor reduced motion by showing the end state of every animation.

### Don't:
- **Don't** go back to the Settings-style grouped list with a progress ring to show a score; the chart is the score's place.
- **Don't** color data series or decoration in copper. Even "this water" in a blend bar stays neutral.
- **Don't** put a saturated verdict solid as text on a white card; use its ink.
- **Don't** rescale the chart to fit outliers; pin them at the edge with a dashed stroke.
- **Don't** give the espresso slab a drop shadow.
