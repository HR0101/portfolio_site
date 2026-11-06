# Ark Server — unslop pass

Method: [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky (@heydamir), CC BY 4.0.

## Approved direction
- Product: play the Mac's video/photo library on devices on the same Wi-Fi.
- Character: calm, exact, approachable.
- World: coastal light and the personal media library.
- Moments: the ocean scene and real application screenshots.
- Signature: one quiet connection-status dot.

## Audit and changes, in pass order
1. Spacing: unified section padding (96/64px desktop/mobile), card padding (24/20px), control spacing, and stat alignment. Requirements moved into a quiet line outside the hero action stack.
2. Color: neutral ink palette, three text roles, one blue-grey control accent. Removed gold button gradients, heading gradients, spotlight overlays, color washes and decorative shadows from rendered UI.
3. Icons: kept Lucide and the original application mark; controls use 18px / 1.5 stroke. Replaced colored icon tiles with quiet aligned icons.
4. Copy: changed uppercase English section labels to direct Japanese. Removed periods from page headings and tour titles. Kept features, evidence-based specifications and section order.
5. Type: kept system San Francisco/Hiragino fonts for Japanese readability. Hero 52px max / 36px mobile, section headings 28–40px, normal 500 weight, single-color text, no italic emphasis.
6. Layout: retained asymmetric hero but consolidated the product preview into a large Mac screenshot plus a smaller attached mobile view. Removed the competing schematic ship decoration. Existing six-feature default and expand/category behavior preserved.
7. Details: 8px controls, 12–16px cards/panels, hairline borders, no pill stack. Actual connection status uses a small static dot. The site logo/name remain unchanged.
8. Visuals: reused dawn/night photographic ocean WebPs and genuine product screenshots. No new image generation or paid image service used in this pass. Removed the duplicated ocean scene from the closing CTA so the hero remains the primary scene.
9. Motion: removed page-wide MotionDirector, ScrollFadeOut, parallax, TiltCard, SpotlightCard, RollLabel, character waves and repeated section entrances from the rendered page. One 400ms hero fade/rise remains. Explanatory variant playback, PIN flow, conversion progress, interactive wipe and deliberate tour controls remain.

## Verification
- Whole-repository lint and production webpack build pass.
- Runtime screenshot/mobile/reduced-motion review cannot currently run: the browser access host is unavailable. No visual QA success is claimed for this revision.
- Final production E2E: 50 passed, 0 failed. All twelve revised section labels were checked in generated HTML.

Existing user changes outside the Ark Server work are preserved. No publication or deployment was performed.

## Character refinement (user feedback)
The first pass became too anonymous. Keep the same approved direction and neutral chrome, and restore product-specific craft only in the content moments:
- Hero: an original code-native, static server-ark pedestal derived from the existing Ark Server mark, carrying the actual Mac screen. The nearby mobile screen retains its functional role. No generated asset or paid service added.
- Type: Japanese Mincho for the hero and closing headings, system sans for all body/UI text. This adds a coastal editorial voice without italic or gradient emphasis.
- Figures: the genuine 9-video simultaneous playback limit leads the specification row; other figures stay compact and legible.
- Closing: a restrained return of the same coastal scene and original app mark. No extra subject or decorative animation.
- Visual runtime review remains unavailable because the browser access host is not connected. Local dev server is left untouched; build validation uses /private/tmp/ark-character-niae63dt.
- Refinement verification: whole-repository lint, production webpack build, and all 50 production E2E checks pass.

## Polish pass (2026-11-02, after the character refinement)
Direction unchanged (calm, exact, approachable; coastal light). Polish mode: only what the audit found, palette/type/layout/visual kept.
- Hero: the "配信中・同じ Wi-Fi" text that sat on the water (dark ink on dark water, unreadable) is merged into the single status label above the Mac screen ("● Mac · 配信中（同じ Wi‑Fi 内）"), so there is one connection dot. The phone sits 24px lower so it no longer cuts the PIN panel's caption. The lead wraps by phrase (`.phrase`) instead of splitting "ライブ／ラリ", and its punctuation follows the site (「，」「．」).
- Tiles: the four demo tiles now use the same icon box, title and action parts as the other tiles (icon column 32px, equal heights).
- Closing: the back link sits on the same quiet surface as the hero caption so it reads over the photo.
- Type/spacing: weights 400/500/600 only (650/700/750 → 600), text under 11px raised where it is not a miniature UI, padding/margin/gap snapped to the 4px grid (52 values), red glow on the scene playhead removed, the dead gradient-text rule and its variables removed.
- Code: removed unused components (`ark-ship`, `voyage`, `ocean-surface`, `motion-director`), 144 unused rules, 15 unused keyframes, 359 declarations shadowed by later rules and 6 unused variables. `product.module.css` went from 4,198 to about 2,880 lines. Before/after full-page pixel diffs (light, dark, 390px; reduced motion) differ only in the running flow packets and the footer clock.
- Not changed: the ocean photographs (provenance is not recorded), the radial scrim behind the hero copy and the closing text (needed for text over a photo), and the explanatory loops (flow rail, discovery rings, shared-clock demo).
