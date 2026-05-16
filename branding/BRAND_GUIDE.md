# Divergify Brand Guide (Derived Index)

Source of truth:
- `branding/kit/THE NEUROSCHEMA (The Specs).docx`

Supporting reference:
- `branding/brand.json`

If there is any conflict, follow the specs doc first, then the brand JSON values.
All other branding guides are recycled and non-authoritative.

## Core philosophy
- The system is legacy software. Divergent minds are different operating specs.
- We are a bridge and buffer, not a fixer.
- We replace shame with compatibility and clarity.

## Voice and tone
- Speak "tech specs," not pathology.
- Blunt, calm, and personal. No toxic positivity.
- No shame language. No "try harder" framing.
- Give one clear next step when possible.

## Visual identity
- Wordmark: "Divergify" in Cream (#F9EED2). Clean, sans-serif.
- Constellation: network pattern that represents dot-connecting.
- North Star (Takota): 8-point geometric star (compass style).
  - Safety rule: never use a 5-point star.
  - Behavior: steady, grounding, never flashing.
  - Icon usage: use North Star or Wordmark only.

## Color system (from Brand.json)
Standard mode:
- bg_primary: #232147
- text_primary: #F9EED2
- accent_periwinkle: #918FA2
- accent_gold: #CDA977

Shades mode (low-stim / overload):
- bg_primary: #151426
- text_primary: #C8C6D1
- accent_periwinkle: #5E5C6B
- accent_gold: #8C7A5E
- motion: none

## Modes
- Standard mode: "late night genius hour" vibe.
- Shades mode: zero motion, reduced contrast, lower sensory load.

## Proportion system (the golden ratio filter)
- Spec rule: every layout, spacing, type size, radius, and motion duration derives from φ (phi = 1.618). No arbitrary pixel values.
- Why it is a spec, not a style: the brain parses proportion before content. Consistent φ rhythm lowers the parsing load when the system is already running hot.
- Base units: spacing base = 8px, type base = 16px. Steps scale by φ.
- Spacing scale (px): xxs 2, xs 3, sm 5, md 8, lg 13, xl 21, xxl 34, xxxl 55.
- Type scale (px): xs 10, sm 13, md 16, lg 20, xl 26, xxl 33, xxxl 42.
- Line height: tight 1.2, normal 1.5, loose 1.618.
- Radius (px): sm 5, md 8, lg 13, xl 21, pill 9999. Motion (ms): fast 120, base 200, slow 324.
- Reference implementation (source of these values): `divergify-hub/apps/divergify-hub-app/src/design/tokens.ts` (exports `PHI` + the scales). Structured copy: `branding/brand.json` → `brand.proportion`.
- Filter check: any new screen or page is non-compliant if it introduces spacing/type/radius values outside this scale without a documented reason.

## Safety and accessibility rules
- No flashing or strobing effects.
- In Shades mode: reduce motion and contrast.
- Keep layouts calm and predictable.

## Merch rules (from Specs)
- Analog glitch aesthetic only (static).
- No tags. Screen-printed labels only.
- High cotton, no noisy synthetics.

## Assets in this repo
- `assets/brand/wordmark.png`
- `assets/brand/wordmark-transparent.png`
- `assets/brand/divergify-constellation-logo.png`
- `assets/brand/divergify-logo-transparent.png`
- `assets/brand/divergify-icon-braincompass.svg` (North Star icon)
- `branding/kit/THE NEUROSCHEMA (The Specs).docx`

## Recycled guides
- `branding/kit/recycled/Brand.json.docx`
- `divergify-hub/recycled/divergify_universal_brand_guide.pdf`
- `divergify-hub/branding/recycled/divergify_universal_brand_guide.pdf`
