import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/animations/fluid.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const fluid = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const {
  FLUID_DENSITY_CAP,
  FLUID_DYE_RETENTION_PER_SEC,
  FLUID_LAYER_MODE,
  FLUID_LAYER_Z_INDEX,
  FLUID_MAX_ASPECT,
  FLUID_MAX_JUMP_PX,
  FLUID_MAX_SAMPLES,
  FLUID_MAX_SPEED,
  FLUID_MAX_STEP_SEC,
  FLUID_MIN_STEP_SEC,
  FLUID_MIN_VIEWPORT_WIDTH_PX,
  FLUID_QUALITY_TIERS,
  FLUID_SLOW_FRAME_MS,
  FLUID_VISIBLE_DENSITY,
  getDecayFactor,
  getDyeHue,
  getFluidColors,
  getFluidFadeMs,
  getFluidGridSize,
  getFluidSplatRadiusPx,
  getFluidSplatRadiusForMovePx,
  getFluidStepSec,
  getNextQualityTier,
  getPointerSplats,
  isFluidAsleep,
  isFluidEnvironmentAllowed,
  isFluidPath,
  parseCssColor,
  pickInitialQualityTier,
  shouldSkipFrame,
} = fluid;

const VIEWPORT = { width: 1440, height: 900 };

test('格子の大きさは，短辺を基準に画面の縦横比へ合わせる', () => {
  assert.deepEqual(getFluidGridSize(1440, 900, 512), { width: 819, height: 512 });
  assert.deepEqual(getFluidGridSize(900, 900, 128), { width: 128, height: 128 });
  // 縦長の画面は，短辺（幅）が基準になる
  assert.deepEqual(getFluidGridSize(900, 1440, 128), { width: 128, height: 205 });
});

test('格子の縦横比には上限があり，不正な入力でも壊れない', () => {
  const ultraWide = getFluidGridSize(10000, 500, 100);
  assert.equal(ultraWide.height, 100);
  assert.equal(ultraWide.width, 100 * FLUID_MAX_ASPECT);
  const fallback = getFluidGridSize(Number.NaN, Number.NaN, Number.NaN);
  assert.ok(fallback.width >= 1 && fallback.height >= 1);
  assert.deepEqual(getFluidGridSize(0, 0, 64), { width: 64, height: 64 });
});

test('品質の段階は，細かい順に並び，速度場より染料のほうが細かい', () => {
  assert.ok(FLUID_QUALITY_TIERS.length >= 2);
  for (let index = 0; index < FLUID_QUALITY_TIERS.length; index += 1) {
    const tier = FLUID_QUALITY_TIERS[index];
    assert.ok(tier.dyeCells > tier.velocityCells);
    if (index > 0) {
      const previous = FLUID_QUALITY_TIERS[index - 1];
      assert.ok(tier.velocityCells < previous.velocityCells);
      assert.ok(tier.dyeCells < previous.dyeCells);
      assert.ok(tier.jacobiIterations <= previous.jacobiIterations);
    }
  }
  // 最高の段階は，仕様の目安（速度場 128 前後・染料 512 前後）
  assert.equal(FLUID_QUALITY_TIERS[0].velocityCells, 128);
  assert.equal(FLUID_QUALITY_TIERS[0].dyeCells, 512);
});

test('最初の品質は端末の余力で決まる', () => {
  assert.equal(pickInitialQualityTier({ cores: 10, memoryGb: 8 }), 0);
  assert.equal(pickInitialQualityTier({}), 0);
  assert.equal(pickInitialQualityTier({ cores: 4, memoryGb: 8 }), 1);
  assert.equal(pickInitialQualityTier({ cores: 8, memoryGb: 2 }), FLUID_QUALITY_TIERS.length - 1);
  assert.equal(pickInitialQualityTier({ cores: 2, memoryGb: 8 }), FLUID_QUALITY_TIERS.length - 1);
});

test('描画が遅いときだけ 1 段階ずつ下げ，下限で止まり，上げ直さない', () => {
  const last = FLUID_QUALITY_TIERS.length - 1;
  assert.equal(getNextQualityTier(0, 16.7), 0);
  assert.equal(getNextQualityTier(0, FLUID_SLOW_FRAME_MS), 0);
  assert.equal(getNextQualityTier(0, FLUID_SLOW_FRAME_MS + 1), 1);
  assert.equal(getNextQualityTier(last, 100), last);
  assert.equal(getNextQualityTier(1, 5), 1);
  assert.equal(getNextQualityTier(0, Number.NaN), 0);
  assert.equal(getNextQualityTier(99, 5), last);
});

test('描画の間引きは 60fps を上限にし，ちょうどの間隔の描画は通す', () => {
  assert.equal(shouldSkipFrame(1000 / 60, 0), false);
  assert.equal(shouldSkipFrame(1016.7, 1000), false);
  // 120Hz の描画間隔（8.3ms）は間引く
  assert.equal(shouldSkipFrame(1008.3, 1000), true);
  assert.equal(shouldSkipFrame(1005, 1000, 30), true);
  assert.equal(shouldSkipFrame(1000, Number.NaN), false);
});

test('1 コマで進める時間は，上限と下限の間に丸める', () => {
  assert.equal(getFluidStepSec(16), 0.016);
  assert.equal(getFluidStepSec(5000), FLUID_MAX_STEP_SEC);
  assert.equal(getFluidStepSec(0), FLUID_MIN_STEP_SEC);
  assert.equal(getFluidStepSec(Number.NaN), 1 / 60);
});

test('薄れの係数は，1 秒で retention になり，時間が長いほど小さい', () => {
  assert.equal(getDecayFactor(1, 0.45), 0.45);
  assert.equal(getDecayFactor(0, 0.45), 1);
  assert.ok(getDecayFactor(0.5, 0.45) > getDecayFactor(1, 0.45));
  assert.ok(Math.abs(getDecayFactor(0.5, 0.25) - 0.5) < 1e-12);
  assert.equal(getDecayFactor(1, 2), 1);
  assert.equal(getDecayFactor(1, -1), 0);
  assert.equal(getDecayFactor(Number.NaN, 0.5), 1);
});

test('眠るまでの時間は，最大の濃さが見えなくなるまでの減衰で決まる', () => {
  const fadeMs = getFluidFadeMs();
  // 見えなくなる時点の濃さが，しきい値以下になっている（余裕の分だけ長い）
  const remaining = FLUID_DENSITY_CAP * FLUID_DYE_RETENTION_PER_SEC ** (fadeMs / 1000);
  assert.ok(remaining < FLUID_VISIBLE_DENSITY);
  // 長すぎない（数秒．ゆっくり薄れて消える）
  assert.ok(fadeMs > 2000 && fadeMs < 10000);
  // 濃いほど長く，残る割合が大きいほど長い
  assert.ok(getFluidFadeMs(2, 0.45, 0.02) > getFluidFadeMs(1, 0.45, 0.02));
  assert.ok(getFluidFadeMs(1, 0.7, 0.02) > getFluidFadeMs(1, 0.45, 0.02));
  // もともと見えない濃さなら待たない．見積もれないときは上限の既定値
  assert.equal(getFluidFadeMs(0.01, 0.45, 0.02), 0);
  assert.ok(getFluidFadeMs(1, 1, 0.02) > 0);
  assert.ok(getFluidFadeMs(1, 0, 0.02) > 0);
});

test('眠る判定は，最後に染料を置いてからの時間で決まる', () => {
  assert.equal(isFluidAsleep(1000, 1000, 5000), false);
  assert.equal(isFluidAsleep(5999, 1000, 5000), false);
  assert.equal(isFluidAsleep(6000, 1000, 5000), true);
  // まだ一度も置いていない（-Infinity）なら眠ったまま
  assert.equal(isFluidAsleep(1000, Number.NEGATIVE_INFINITY), true);
  // 既定の待ち時間は getFluidFadeMs
  assert.equal(isFluidAsleep(1000 + getFluidFadeMs() - 1, 1000), false);
  assert.equal(isFluidAsleep(1000 + getFluidFadeMs(), 1000), true);
});

test('動かなかった・飛んだ・不正な入力では，何も置かない', () => {
  const at = { x: 300, y: 300 };
  assert.deepEqual(getPointerSplats(at, at, 1 / 60, VIEWPORT, 0.5), []);
  assert.deepEqual(getPointerSplats(at, { x: 300.2, y: 300 }, 1 / 60, VIEWPORT, 0.5), []);
  // ワープ（再入場など）は線にしない
  assert.deepEqual(getPointerSplats(at, { x: 300 + FLUID_MAX_JUMP_PX + 1, y: 300 }, 1 / 60, VIEWPORT, 0.5), []);
  assert.deepEqual(getPointerSplats(at, { x: Number.NaN, y: 300 }, 1 / 60, VIEWPORT, 0.5), []);
  assert.deepEqual(getPointerSplats(at, { x: 400, y: 300 }, 1 / 60, { width: 0, height: 900 }, 0.5), []);
});

test('右へ動かすと，右向きの速度と，動きに沿った染料が置かれる', () => {
  const from = { x: 300, y: 450 };
  const to = { x: 360, y: 450 };
  const splats = getPointerSplats(from, to, 1 / 60, VIEWPORT, 0.25);
  assert.ok(splats.length >= 2);
  const speed = 60 / 900 / (1 / 60);
  for (const splat of splats) {
    assert.ok(Math.abs(splat.velocityX - speed) < 1e-9);
    assert.ok(Math.abs(splat.velocityY) < 1e-12);
    assert.equal(splat.hue, 0.25);
    assert.ok(splat.density > 0);
  }
  // 位置は from から to へ並び，最後が to
  for (let index = 1; index < splats.length; index += 1) assert.ok(splats[index].x > splats[index - 1].x);
  const last = splats[splats.length - 1];
  assert.ok(Math.abs(last.x - 360 / 1440) < 1e-9);
  assert.ok(Math.abs(last.y - 0.5) < 1e-9);
});

test('画面の上へ動かすと，上向き（y が正）の速度になる（座標の向きを反転）', () => {
  const [splat] = getPointerSplats({ x: 500, y: 300 }, { x: 500, y: 260 }, 1 / 60, VIEWPORT, 0);
  assert.ok(Math.abs(splat.velocityX) < 1e-12);
  assert.ok(splat.velocityY > 0);
  // 画面の上半分（y が 450 より小さい）は，GL の座標では y が 0.5 より大きい
  assert.ok(splat.y > 0.5);
});

test('速さには上限があり，染料の数と量も上限を超えない', () => {
  const fast = getPointerSplats({ x: 100, y: 100 }, { x: 100 + FLUID_MAX_JUMP_PX, y: 100 }, 1 / 1000, VIEWPORT, 0);
  assert.ok(fast.length <= FLUID_MAX_SAMPLES);
  assert.ok(fast.every((splat) => splat.velocityX <= FLUID_MAX_SPEED + 1e-9));
  assert.ok(fast.every((splat) => splat.density <= 0.35 + 1e-9));
  // dt が 0 でも 0 割りにならない
  const instant = getPointerSplats({ x: 100, y: 100 }, { x: 140, y: 100 }, 0, VIEWPORT, 0);
  assert.ok(instant.every((splat) => Number.isFinite(splat.velocityX) && splat.velocityX <= FLUID_MAX_SPEED + 1e-9));
});

test('染料の量は，動いた距離に比例し，ゆっくり動かすと薄く，速く動かすと濃くなる', () => {
  const total = (splats) => splats.reduce((sum, splat) => sum + splat.density, 0);
  const slow = total(getPointerSplats({ x: 100, y: 100 }, { x: 104, y: 100 }, 1 / 60, VIEWPORT, 0));
  const fast = total(getPointerSplats({ x: 100, y: 100 }, { x: 160, y: 100 }, 1 / 60, VIEWPORT, 0));
  assert.ok(slow > 0 && fast > slow);
});

test('染料の置き場所は，画面の内側（0〜1）に収まる', () => {
  const splats = getPointerSplats({ x: 5, y: 5 }, { x: -50, y: -50 }, 1 / 60, VIEWPORT, 2);
  for (const splat of splats) {
    assert.ok(splat.x >= 0 && splat.x <= 1 && splat.y >= 0 && splat.y <= 1);
    // 色相は 0〜1 に収める
    assert.equal(splat.hue, 1);
  }
});

test('染料の広がりは短辺の割合で決まる', () => {
  assert.ok(Math.abs(getFluidSplatRadiusPx(VIEWPORT) - 900 * 0.02) < 1e-9);
  assert.ok(Math.abs(getFluidSplatRadiusPx({ width: 800, height: 1200 }) - 800 * 0.02) < 1e-9);
});

test('色相は 0〜1 の間をゆるやかに行き来する', () => {
  for (let time = 0; time < 30; time += 0.37) {
    const hue = getDyeHue(time);
    assert.ok(hue >= 0 && hue <= 1);
  }
  assert.equal(getDyeHue(0), 0.5);
  assert.equal(getDyeHue(Number.NaN), 0.5);
});

test('CSS の色を読める（#rgb・#rrggbb・rgb()）．読めなければ null', () => {
  assert.deepEqual(parseCssColor('#0066cc'), [0, 0x66 / 255, 0xcc / 255]);
  assert.deepEqual(parseCssColor(' #FFF '), [1, 1, 1]);
  assert.deepEqual(parseCssColor('rgb(0, 102, 204)'), [0, 102 / 255, 204 / 255]);
  assert.deepEqual(parseCssColor('rgb(41 151 255 / 50%)'), [41 / 255, 151 / 255, 1]);
  assert.equal(parseCssColor(''), null);
  assert.equal(parseCssColor('blue'), null);
  assert.equal(parseCssColor('#12'), null);
  assert.equal(parseCssColor(undefined), null);
});

test('染料の色はテーマで変わり，サイトのアクセントには引っ張られない', () => {
  const light = getFluidColors(false, '#0066cc');
  const dark = getFluidColors(true, '#2997ff');
  assert.deepEqual(light.primary, getFluidColors(false, '#ff0000').primary);
  assert.deepEqual(dark.primary, getFluidColors(true).primary);
  assert.notDeepEqual(light.primary, parseCssColor('#0066cc'));
  assert.notDeepEqual(light.secondary, dark.secondary);
  // 控えめ（最大でも半分以下）．暗い面の上のほうが，少し濃くないと見えにくい
  assert.ok(light.maxAlpha > 0 && light.maxAlpha <= 0.5);
  assert.ok(dark.maxAlpha > 0 && dark.maxAlpha <= 0.5);
  assert.ok(dark.maxAlpha > light.maxAlpha);
  // 読めない値・未指定でも同じ色
  assert.deepEqual(getFluidColors(false, 'not-a-color').primary, light.primary);
  // 濃さは，本文に重なる層（overlay）のほうが控えめ
  assert.ok(getFluidColors(false, '#0066cc', 'overlay').maxAlpha < getFluidColors(false, '#0066cc', 'behind').maxAlpha);
  assert.ok(getFluidColors(true, '#2997ff', 'overlay').maxAlpha < getFluidColors(true, '#2997ff', 'behind').maxAlpha);
});

test('層の設定：背後は負，本文の上は本文（10）より上でナビ（50）より下', () => {
  assert.ok(['behind', 'overlay'].includes(FLUID_LAYER_MODE));
  assert.ok(FLUID_LAYER_Z_INDEX.behind < 0);
  assert.ok(FLUID_LAYER_Z_INDEX.overlay > 10 && FLUID_LAYER_Z_INDEX.overlay < 50);
});

test('出す条件：スイッチ・動きを減らす設定・タッチ端末・幅・読み込み画面・ページのすべてがそろったときだけ', () => {
  const allowed = {
    featureEnabled: true,
    reducedMotion: false,
    hoverFine: true,
    viewportWidth: 1440,
    preloading: false,
    pathAllowed: true,
  };
  assert.equal(isFluidEnvironmentAllowed(allowed), true);
  assert.equal(isFluidEnvironmentAllowed({ ...allowed, featureEnabled: false }), false);
  assert.equal(isFluidEnvironmentAllowed({ ...allowed, reducedMotion: true }), false);
  assert.equal(isFluidEnvironmentAllowed({ ...allowed, hoverFine: false }), false);
  assert.equal(isFluidEnvironmentAllowed({ ...allowed, preloading: true }), false);
  assert.equal(isFluidEnvironmentAllowed({ ...allowed, pathAllowed: false }), false);
  assert.equal(isFluidEnvironmentAllowed({ ...allowed, viewportWidth: FLUID_MIN_VIEWPORT_WIDTH_PX - 1 }), false);
  assert.equal(isFluidEnvironmentAllowed({ ...allowed, viewportWidth: FLUID_MIN_VIEWPORT_WIDTH_PX }), true);
  assert.equal(isFluidEnvironmentAllowed({ ...allowed, viewportWidth: Number.NaN }), false);
});

test('出すページ：共通レイアウトのページだけ．紹介ページ（/apps/<app>/）は出さない', () => {
  assert.equal(isFluidPath('/'), true);
  assert.equal(isFluidPath(''), true);
  assert.equal(isFluidPath('/games'), true);
  assert.equal(isFluidPath('/apps/others'), true);
  assert.equal(isFluidPath('/apps/others/'), true);
  assert.equal(isFluidPath('/apps/bustimeapp'), false);
  assert.equal(isFluidPath('/apps/tsumugi/'), false);
  assert.equal(isFluidPath('/apps/arkserver'), false);
  // 前方一致で巻き込まない
  assert.equal(isFluidPath('/applications'), true);
  assert.equal(isFluidPath('/apps-old'), true);
});

test('染料の広がりは動きに比例し，下限と上限で止まる', () => {
  const slow = getFluidSplatRadiusForMovePx(VIEWPORT, 1);
  const middle = getFluidSplatRadiusForMovePx(VIEWPORT, 20);
  const fast = getFluidSplatRadiusForMovePx(VIEWPORT, 5000);
  assert.ok(slow > 0 && slow < middle && middle < fast);
  assert.equal(fast, getFluidSplatRadiusPx(VIEWPORT));
  const [splat] = getPointerSplats({ x: 100, y: 100 }, { x: 120, y: 100 }, 1 / 60, VIEWPORT, 0);
  assert.equal(splat.radiusPx, middle);
});
