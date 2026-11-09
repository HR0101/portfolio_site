# Ark Server implementation audit — 2026-11-02

Goal source: /Users/Rhara/.codex/attachments/737d914b-ede0-4350-bbfa-d6726955246b/pasted-text-1.txt
Target has been renamed from /apps/allserverformac to /apps/arkserver, with redirects. Preserve existing user changes outside this page.

## Accepted scope changes
- User explicitly said 「素材はなしでいいよ」: actual screen recordings are waived. Keep real screenshots; no recording scaffolding remains.
- Visual ship/ocean theme retained, but copy and controls now use direct functional terminology.
- Sea/sky are generated photographic dawn/night WebP assets, approx 130 KB each.
- Feature list defaults to 6 (one per category), expands to 39, category filter shows category items. Plain uniform cards replace striped containers. Descriptions open on click.
- Other sections simplified: clean 8-tab grid, real browser screenshot primary, responsive illustration in details, care diagrams in details, quiet stats and technical table.
- Latest request adds animation across all 12 sections, reduced-motion support and offscreen pauses.

## Requirement evidence
- AppearanceWipe: range-controlled clipping of identical library dark/light screens; browser verified Home 0%, End 100% in prior turns.
- TourCallouts: dashboard start/stop -> QR -> PIN coordinates inspected against real image; timer follows tour and stops on manual/reduced mode. Latest fix nests image+callouts inside padding so coordinates align.
- BrowserPreview: drag/slider/presets; <=900px bottom tabs, >900px side rail matches app source. Prior browser test verified 900 vs 902.
- SplitTextReveal gradient accent, RollLabel links, SpotlightCard stats/care/features, TiltCard iPhone, ScrollFadeOut hero are wired in page/components.
- CareDiagram: all 8 protections; backup generations/quarantine, second launch save-free exit, explicit delete branches.
- FeatureDemo: duration 5/10/15/30, channel arrows, duplicate grouping, proxy conversion -> playback. All four exercised in prior browser session.
- TechTimeline: scroll-linked line/nodes; reduced mode forces fill.
- MotionDirector: intersection state + shared scroll subscriber + pointer tilt. Latest fix cancels pending pointer frame on leave/preference change, preventing stale tilt after reset.

## Validation
- Fresh staged snapshot /private/tmp/ark-final-t3ys3gvs: full typecheck, full lint, production webpack build, 50/50 E2E passed.
- The earlier E2E startup failure was sandbox EPERM binding port 3111. Rerun with approved npm test escalation resolved it.
- After final two fixes: workspace typecheck, scoped lint, git diff --check, root production webpack build passed.
- Workspace final E2E session 71881 completed successfully: 50/50 passed, 0 failed.
- Browser tool session reset: current getBrowser reports 'browser access host unavailable'. No current browser connection. Async user request pending to reconnect.
- Remaining completion gate: responsive/mobile and prefers-reduced-motion runtime QA (not proven by static checks). Do not mark goal complete until verified. Browser unavailability first blocking audit turn; meaningful progress this turn includes tests and two fixes.
- localhost:3001 not currently serving (curl connection refused); there was no live dev server at final observation. Do not assume old browser tab still exists.

## Browser gate revalidation — second consecutive goal turn
- Retried cua.getBrowser for the local Ark Server page: browser access host remains unavailable.
- Reviewed current source and latest 50/50 passing production E2E evidence. No new required implementation work found that can replace the missing mobile/reduced-motion browser QA.
- This turn is no progress toward the remaining gate (no live job being waited on); prior turn made test/fix progress but encountered the same blocker. Keep goal active at this second occurrence. Reconnection request is already pending; do not repeat the question. If the same blocker recurs on the next goal turn and no other meaningful work exists, mark blocked under the three-turn rule.

## Browser gate — third consecutive occurrence
- cua.getBrowser again returned 'The browser access host is unavailable'.
- No live browser or process handle exists for the missing mobile/reduced-motion QA; no further independent implementation work remains from the audited scope.
- Same external blocker now confirmed on three consecutive goal turns. Goal set to blocked, pending browser reconnection. Build/lint/typecheck and 50 E2E tests remain verified; final browser QA remains explicitly incomplete.


## Superseding user request — unslop
User installed unslop, reviewed the audit/direction, then explicitly approved applying it. The earlier request to maximize decorative animation is superseded. See docs/design/arkserver-unslop.md for the nine-pass report and attribution. Rendered page no longer uses MotionDirector, character wave/headings, parallax, RollLabel, TiltCard, SpotlightCard or the schematic ship hero/closing. Photo sea, actual Mac/mobile views and functional demos remain. Labels are Japanese and plain, chrome neutral, one small connection dot. MoreGrid still defaults to six and retains all filters/expansion.
Final new revision: full lint, production webpack build, 50/50 E2E and git diff --check passed. Browser access host still unavailable, so new visual/mobile/reduced-motion runtime QA remains unverified. No deployment performed.
