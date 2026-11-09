import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/planetTail.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const {
  DOCK_MARGIN, DOCK_SIZE, DOCK_SIZE_SMALL, MERGE_PLANET_FADE, SPOT_ARRIVED, SPOT_MIN_FLIGHT_RATIO, getDockFrame, getMergeLook, getSpotScrollRange, getTailState,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const HELD = { left: 1000, top: 700, size: 220 };
const SPOT = { left: 900, top: 420, size: 150 };
const base = { endScroll: 6000, held: HELD, viewportWidth: 1440, viewportHeight: 900, spot: null, spotStart: 20000, spotEnd: 24000 };

test('ドックは画面の左下の端に置かれ，狭い画面では小さくなる', () => {
  assert.deepEqual(getDockFrame(1440, 900), { left: DOCK_MARGIN, top: 900 - DOCK_MARGIN - DOCK_SIZE, size: DOCK_SIZE });
  assert.equal(getDockFrame(500, 800).size, DOCK_SIZE_SMALL);
});

test('自己紹介の固定表示が終わる位置では，惑星は引き継いだ枠のまま（継ぎ目がない）', () => {
  const state = getTailState({ ...base, scrollY: 6000 });
  assert.deepEqual(state.frame, HELD);
  assert.equal(state.arrived, false);
});

test('固定表示が終わってからドックへ向かい，十分に進むとドックに留まる', () => {
  const dock = getDockFrame(1440, 900);
  const middle = getTailState({ ...base, scrollY: 6000 + 900 * 0.4 });
  assert.ok(middle.frame.left < HELD.left && middle.frame.left > dock.left);
  assert.ok(middle.frame.size < HELD.size && middle.frame.size > dock.size);
  for (const scrollY of [6000 + 900, 9000, 15000]) {
    const state = getTailState({ ...base, scrollY });
    assert.deepEqual(state.frame, dock);
  }
});

test('ドックへの動きはスクロールに対して滑らかに単調で，戻せば同じ枠に戻る', () => {
  let previous = HELD.left;
  for (let step = 0; step <= 100; step++) {
    const state = getTailState({ ...base, scrollY: 6000 + step * 10 });
    assert.ok(state.frame.left <= previous + 1e-9);
    previous = state.frame.left;
  }
  assert.deepEqual(getTailState({ ...base, scrollY: 6300 }), getTailState({ ...base, scrollY: 6300 }));
});

test('名前の場所へは，向かい始める位置から最後のスクロール位置までで着き，着いたらその枠に重なる', () => {
  const withSpot = { ...base, spot: SPOT, scrollY: 0 };
  const before = getTailState({ ...withSpot, scrollY: 19000 });
  assert.deepEqual(before.frame, getDockFrame(1440, 900));
  assert.equal(before.arrived, false);
  const halfway = getTailState({ ...withSpot, scrollY: 22000 });
  assert.ok(halfway.frame.left > 20 && halfway.frame.left < SPOT.left);
  const end = getTailState({ ...withSpot, scrollY: 24000 });
  assert.deepEqual(end.frame, SPOT);
  assert.equal(end.arrived, true);
  assert.ok(SPOT_ARRIVED < 1);
});

test('名前の場所へ向かう範囲は，ページの最後で必ず着くよう決まり，最後が近すぎても急に飛ばない', () => {
  // 通常：名前の場所が画面の下端近くに現れるときから，ページの最後まで
  const normal = getSpotScrollRange(23500, 900, 24000);
  assert.equal(normal.end, 24000);
  assert.ok(normal.start < normal.end);
  assert.ok(Math.abs(normal.start - (23500 - 900 * 0.92)) < 1e-9);
  // ページの最後がすぐ近い（フッターが最初から見えている）ときも，一定のスクロール量をかける
  const near = getSpotScrollRange(2000, 900, 1200);
  assert.ok(Math.abs((near.end - near.start) - 900 * SPOT_MIN_FLIGHT_RATIO) < 1e-9);
  assert.equal(getSpotScrollRange(500, 900, -50).end, 0);
});

test('ほどけ始めは惑星のまま（濃く，回り，名前は隠れている）で，進むと惑星が薄れ，文字になり終えると名前が現れる', () => {
  const start = getMergeLook(0);
  assert.equal(start.planetOpacity, 1);
  assert.equal(start.rotating, true);
  assert.equal(start.nameHidden, true);
  assert.equal(getMergeLook(MERGE_PLANET_FADE).planetOpacity, 0);
  assert.equal(getMergeLook(0.99).nameHidden, true);
  const done = getMergeLook(1);
  assert.equal(done.rotating, false);
  assert.equal(done.planetOpacity, 0);
  assert.equal(done.nameHidden, false);
  let previous = 1;
  for (let step = 0; step <= 40; step++) {
    const opacity = getMergeLook(step / 40).planetOpacity;
    assert.ok(opacity <= previous + 1e-12 && opacity >= 0 && opacity <= 1);
    previous = opacity;
  }
});

test('名前の場所へ向かう進み具合は，向かい始めで 0，最後で 1 になり，その間は単調に増える', () => {
  const withSpot = { ...base, spot: SPOT };
  assert.equal(getTailState({ ...withSpot, scrollY: 19000 }).arrival, 0);
  assert.equal(getTailState({ ...withSpot, scrollY: 24000 }).arrival, 1);
  assert.equal(getTailState({ ...withSpot, scrollY: 22000 }).arrival, 0.5);
  let previous = 0;
  for (let step = 0; step <= 40; step++) {
    const arrival = getTailState({ ...withSpot, scrollY: 20000 + step * 100 }).arrival;
    assert.ok(arrival >= previous - 1e-12 && arrival <= 1);
    previous = arrival;
  }
  assert.equal(getTailState({ ...base, scrollY: 22000 }).arrival, 0);
});
