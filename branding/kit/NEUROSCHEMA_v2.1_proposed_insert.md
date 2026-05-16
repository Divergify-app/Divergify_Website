# NEUROSCHEMA v2.1 — proposed insert (paste into the canonical .docx / .odt by hand)

The canonical brand spec is a binary Word/ODT file and must not be machine-edited.
Apply this change in Word/LibreOffice yourself so formatting stays intact.

## 1. Version line
Change:
`Status: Immutable Source Code // v2.0`
to:
`Status: Immutable Source Code // v2.1 (v2.1 adds The Proportion Protocol)`

## 2. New subsection — add to SECTION 2: VISUAL SPECS, immediately after "The Modes" block and before SECTION 3

**The Proportion Protocol (The Grid)**

The Constant: Every layout, space, type size, corner radius, and motion duration derives from φ (phi = 1.618). No arbitrary pixels. The interface runs on one ratio the way the philosophy runs on one metaphor.

The Reason: The brain parses proportion before it parses content. A consistent φ rhythm is lower-bandwidth to render — it stops the UI from adding its own lag spike when the user is already running hot.

The Spec: Spacing base 8px, type base 16px; every step scales by φ. Spacing (px): 2, 3, 5, 8, 13, 21, 34, 55. Type (px): 10, 13, 16, 20, 26, 33, 42. Line height: 1.2 / 1.5 / 1.618.

Compatibility Note: This is a layout discipline, not a medical claim. It does not override the Shades Mode protocol — when overload hits, reduced sensory input wins over proportional polish.

Source of Truth: divergify-hub `tokens.ts` exports the ratio and the scales; `branding/brand.json` carries the structured copy. Anything off this grid without a written reason is a compatibility error.

## 3. Files already synced automatically (no action needed)
- `Divergify_Website/branding/BRAND_GUIDE.md` — added "## Proportion system (the golden ratio filter)"
- `Divergify_Website/branding/brand.json` — added `brand.proportion`
- `/home/jessibelle/Divergify/branding/THE NEUROSCHEMA (The Specs).txt` — plain-text copy updated to v2.1

## 4. Still needs your hand (binary, not auto-editable)
- `Divergify_Website/branding/kit/THE NEUROSCHEMA (The Specs).docx`  ← canonical
- `Divergify_Website/branding/kit/THE NEUROSCHEMA (The Specs).odt`
- `/home/jessibelle/Divergify/branding/THE NEUROSCHEMA (The Specs).docx` (easy-access copy)
