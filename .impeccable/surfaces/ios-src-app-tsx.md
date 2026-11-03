---
version: 1
slug: "ios-src-app-tsx"
primary_target: "ios/src/app.tsx"
related_targets: []
---

# Brewater iPhone (PWA)

Scope: the whole iPhone app in `ios/` (home list, result, add/edit sheet, paste sheet). Mode: Operate. Users: home brewers and baristas choosing bottled water, often one-handed in a store. Built with Framework7 (iOS theme) + React for native gestures.

## Direction contract

THESIS: The water is a point on the SCA hardness × alkalinity chart; every screen shows that point and the route to the ideal zone. Refuses the Settings-style grouped list with a progress ring that the previous version shipped.

OWN-WORLD: Espresso shell (#1E120C) carrying a 1px hairline chart grid; the SCA ideal zone in petrol teal (#0B7A83 / #2BB3BD); copper tint (#B85F27 light, #E39A62 dark) for actions; mineral-paper ground (#F3F5F2) in light, near-black (#0B0907) in dark; SF Rounded heavy for scores and titles, SF Pro for UI; tabular figures everywhere; green/amber/red only for verdict and parameter status.

STORY: The visitor sees the score and verdict, sees where the water falls on the chart, sees the best fix as a route into the zone, then reads each parameter and the label data.

FIRST VIEWPORT: Home: espresso header with large title "Brewater", the chart with every registered water as a tappable dot and the teal ideal zone, + in the navbar; below it the ranked list (rounded score tile, name, verdict, GH/KH). Result: espresso header with the score in large SF Rounded, verdict line, and the chart focused on this water with the fix route drawn; parameters follow in inset lists. Signature interaction: the route animates the dot sliding into the zone; tapping a dot on the home chart opens that water.

FORM: SCA Water Chart, candidate 4 of 7 on the ordered list; seed: daa905808770a3db

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
