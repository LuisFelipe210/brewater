# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

The iPhone version is a PWA (`ios/`) installed from Safari to the home screen; it should feel like a native iOS app (gestures, sheets, navigation). The Android version (`app/`) is a separate native Kotlin/Compose app and is out of scope for web design work.

## Users

Two groups, same job: people who brew coffee at home (V60, Aeropress, espresso) choosing which bottled mineral water to buy, and baristas or coffee shops comparing waters for the bar or the espresso machine. Typical scene: standing in a supermarket aisle or at the counter, phone in one hand, bottle in the other, reading the composition table on the label.

## Product Purpose

Tell, in seconds, whether a Brazilian mineral water is good for specialty coffee, and how to make it better. The user photographs (or pastes, or types) the label's composition table; the app converts calcium/magnesium into hardness (GH) and bicarbonate into alkalinity (KH), compares with the SCA water standard, gives a 0–100 score with an explanation per parameter, and suggests the best dilution with distilled water or the best blend with other waters already registered.

## Positioning

Reads the actual Brazilian label format (Portuguese names, comma decimals, OCR mistakes such as "Sufato" or "O,956") and turns it into SCA-based advice plus concrete fixes (dilution percentage, blend between two registered brands). Works offline; the photo never leaves the phone.

## Operating Context

- Input: photo of the label's composition table (OCR on device with Tesseract), text copied with iOS Live Text and pasted, or manual entry.
- Values the user reviews and corrects after OCR before saving.
- A personal list of registered waters ranked best to worst; each opens a result with score, parameters, improvements, observations, label data and photo.
- Used one-handed, often outdoors or in stores; also at home while brewing.

## Capabilities and Constraints

- Offline-first PWA on GitHub Pages (`https://luisfelipe210.github.io/brewater/`), auto-updates through the service worker.
- Data lives only on the device (IndexedDB); no accounts, no backend, no sync.
- Safari does not expose Apple's OCR to web pages; Live Text copy/paste is the workaround.
- Stack: Vite + TypeScript; UI moving to Framework7 (iOS theme) + React for native gestures (swipe back, draggable sheets).
- Domain logic and label parser are ports of the Kotlin app and must stay in sync with it (same tests).
- Language: Brazilian Portuguese.

## Brand Commitments

- Name: Brewater (brew + water).
- Icon: a water drop with the crease of a coffee bean, coffee-brown ground (`ios/public/icons/icon.svg`, shared with Android).
- Must feel like a native iOS app with a strong brand of its own (confirmed by the user): iOS gestures and components, but color, type and the result screen carry a coffee personality. Not a generic Settings-style app.

## Evidence on Hand

- SCA water standard ranges and weights encoded in `ios/src/domain/evaluator.ts`.
- Real OCR fixtures of two labels (Petrópolis, Dias d'Ávila) in `ios/test/fixtures.ts`.
- No real user testimonials, partner cafés or brand photography exist; do not invent them.

## Product Principles

1. The verdict comes first: score and one-line meaning before any chemistry.
2. Every number is explainable: show where GH, KH and TDS came from.
3. Always offer a way forward (dilute, blend, add minerals), not just a grade.
4. Trust the user to correct the OCR; make reviewing fast, never silent.
5. Works in the aisle: one hand, bad light, no signal.
