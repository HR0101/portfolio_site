# Portfolio — spacing only

Method: [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky (@heydamir), CC BY 4.0.

The user narrowed this pass to spacing only. Baseline: `d045d75`, before PR #7.

## Retained changes

- Margin, padding and gap adjustments around sections, headings, cards, controls, navigation and the footer: 92 declaration values, primarily aligned to a 4px rhythm.
- Shared section padding: `clamp(80px, 8vw, 112px)`. Its selector now applies the spacing consistently instead of losing to utility classes.

## Restored to baseline

All other changes from this pass are reverted: colors, gradients, shadows, borders, corner radii, icons, text content/casing, font sizes/weights/tracking, element dimensions and decorative positions. The terminal retains its original black background. All motion, transition timing and interaction behavior remain as before the pass.

## Scope verification

The 16 scoped source files in this PR were compared with the baseline. After excluding margin, padding, gap and the shared section-padding rule, they match exactly. Unrelated local work is outside this PR.

TypeScript, ESLint, the Next.js production build and all 50 E2E tests pass in an isolated workspace containing this PR's source.
