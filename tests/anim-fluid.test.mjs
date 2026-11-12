import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

// 流体カーソル（lib/animations/fluid.ts）の純粋な計算のテスト．
// 方式：1/4 解像度の「速度と重み」のバッファに筆（マウスの移動の線分）を足し，ぼかした写しで運び，指数的に薄れさせる．
const source = await readFile(new URL('../src/lib/animations/fluid.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const fluid = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const {
  FLUID_BLUR_DIVISOR_RATIO,
  FLUID_BRUSH_MAX_PX,
  FLUID_BRUSH_RADIUS_PER_PX,
  FLUID_FALLOFF_END,
  FLUID_FALLOFF_START,
  FLUID_INVISIBLE_LEVEL,
  FLUID_LAYER_FADE_MS,
  FLUID_LAYER_Z_INDEX,
  FLUID_MAX_JUMP_PX,
  FLUID_MAX_STEP_SEC,
  FLUID_MAX_VELOCITY,
  FLUID_MIN_DISPLAY_SCALE,
  FLUID_MIN_MOVE_PX,
  FLUID_MIN_STEP_SEC,
  FLUID_MIN_VIEWPORT_WIDTH_PX,
  FLUID_QUALITY_TIERS,
  FLUID_REFERENCE_FPS,
  FLUID_SHADE,
  FLUID_SLOW_FRAME_MS,
  FLUID_VELOCITY_DECAY,
  FLUID_VELOCITY_INERTIA,
  FLUID_VELOCITY_PER_PX_PER_SEC,
  FLUID_WEIGHT_A_DECAY,
  FLUID_WEIGHT_B_DECAY,
  advanceFluidVelocity,
  getFluidBrushRadiusPx,
  getFluidDisplaySize,
  getFluidFalloff,
  getFluidLayerOpacity,
  getFluidLook,
  getFluidScaledSize,
  getFluidSleepMs,
  getFluidStepSec,
  getFrameDecay,
  getNextQualityTier,
  isFluidAsleep,
  isFluidEnvironmentAllowed,
  isFluidPath,
  isFluidStroke,
  pickInitialQualityTier,
  shouldSkipFrame,
} = fluid;

const NEAR = 1e-9;

test('バッファは画面の 1/4，ぼかした写しはその 1/2（= 画面の 1/8）の大きさ', () => {
  const buffer = getFluidScaledSize(1440, 900, FLUID_QUALITY_TIERS[0].bufferDivisor);
  assert.deepEqual(buffer, { width: 360, height: 225 });
  assert.deepEqual(getFluidScaledSize(1440, 900, FLUID_QUALITY_TIERS[0].bufferDivisor * FLUID_BLUR_DIVISOR_RATIO), { width: 180, height: 113 });
  // 最高の段階は 1/4（参考どおり）
  assert.equal(FLUID_QUALITY_TIERS[0].bufferDivisor, 4);
  assert.equal(FLUID_BLUR_DIVISOR_RATIO, 2);
});

test('大きさの計算は，小さすぎる・不正な入力でも 1 以上の整数を返す', () => {
  assert.deepEqual(getFluidScaledSize(0, 0, 4), { width: 1, height: 1 });
  assert.deepEqual(getFluidScaledSize(Number.NaN, Number.NaN, Number.NaN), { width: 1, height: 1 });
  assert.deepEqual(getFluidScaledSize(2, 2, 100), { width: 1, height: 1 });
  const odd = getFluidScaledSize(1001, 777, 4);
  assert.ok(Number.isInteger(odd.width) && Number.isInteger(odd.height));
});

test('表示の canvas は画面の 1/2 以下で，端末の倍率には依らない', () => {
  assert.deepEqual(getFluidDisplaySize(1440, 900, 0.5), { width: 720, height: 450 });
  // 下限より粗くはしない．1 を超える倍率は 1 に収める．不正な値は既定の 1/2
  assert.deepEqual(getFluidDisplaySize(1440, 900, 0.01), { width: 360, height: 225 });
  assert.equal(FLUID_MIN_DISPLAY_SCALE, 0.25);
  assert.deepEqual(getFluidDisplaySize(1440, 900, 3), { width: 1440, height: 900 });
  assert.deepEqual(getFluidDisplaySize(1440, 900, Number.NaN), { width: 720, height: 450 });
  // どの品質の段階でも，画面の 1/2 以下
  assert.ok(FLUID_QUALITY_TIERS.every((tier) => tier.displayScale <= 0.5));
});

test('品質の段階は，細かい順に並び，段階が下がるほどバッファも canvas も粗くなる', () => {
  assert.ok(FLUID_QUALITY_TIERS.length >= 2);
  for (let index = 1; index < FLUID_QUALITY_TIERS.length; index += 1) {
    assert.ok(FLUID_QUALITY_TIERS[index].bufferDivisor > FLUID_QUALITY_TIERS[index - 1].bufferDivisor);
    assert.ok(FLUID_QUALITY_TIERS[index].displayScale < FLUID_QUALITY_TIERS[index - 1].displayScale);
  }
  assert.ok(FLUID_QUALITY_TIERS.every((tier) => tier.displayScale >= FLUID_MIN_DISPLAY_SCALE));
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

test('参考の薄れは，速度 0.975・重み 1 が 0.95・重み 2 が 0.8（60fps の 1 コマあたり）', () => {
  assert.equal(FLUID_REFERENCE_FPS, 60);
  assert.equal(FLUID_VELOCITY_DECAY, 0.975);
  assert.equal(FLUID_WEIGHT_A_DECAY, 0.95);
  assert.equal(FLUID_WEIGHT_B_DECAY, 0.8);
  // 重み 2 は重み 1 より速く，速度は重み 1 より遅く薄れる
  assert.ok(FLUID_WEIGHT_B_DECAY < FLUID_WEIGHT_A_DECAY && FLUID_WEIGHT_A_DECAY < FLUID_VELOCITY_DECAY);
});

test('薄れは経過時間で補正する：60fps の 1 コマでちょうど倍率になり，コマを割っても同じ時間なら同じ', () => {
  assert.ok(Math.abs(getFrameDecay(0.95, 1 / 60) - 0.95) < NEAR);
  assert.ok(Math.abs(getFrameDecay(0.95, 2 / 60) - 0.95 ** 2) < NEAR);
  assert.equal(getFrameDecay(0.95, 0), 1);
  // 1 秒ぶんは，何コマに割っても同じ
  for (const factor of [0.975, 0.95, 0.8]) {
    assert.ok(Math.abs(getFrameDecay(factor, 1 / 120) ** 120 - getFrameDecay(factor, 1)) < 1e-9);
    assert.ok(Math.abs(getFrameDecay(factor, 1 / 30) ** 30 - factor ** 60) < 1e-9);
  }
  // 倍率の範囲外・不正な値でも壊れない
  assert.equal(getFrameDecay(2, 1), 1);
  assert.equal(getFrameDecay(-1, 1), 0);
  assert.equal(getFrameDecay(0.95, Number.NaN), 1);
  assert.equal(getFrameDecay(Number.NaN, 1), 1);
});

test('筆の半径：止まっていれば 0，動いた距離に比例し，上限で止まる', () => {
  const frame = 1 / 60;
  assert.equal(getFluidBrushRadiusPx(0, frame), 0);
  assert.equal(getFluidBrushRadiusPx(FLUID_MIN_MOVE_PX - 0.01, frame), 0);
  const small = getFluidBrushRadiusPx(10, frame);
  const middle = getFluidBrushRadiusPx(20, frame);
  assert.ok(small > 0 && middle > small);
  // 比例（倍率はそのまま掛かる）
  assert.ok(Math.abs(middle - 20 * FLUID_BRUSH_RADIUS_PER_PX) < NEAR);
  assert.ok(Math.abs(middle / small - 2) < NEAR);
  // 上限
  assert.equal(getFluidBrushRadiusPx(5000, frame), FLUID_BRUSH_MAX_PX);
  assert.ok(getFluidBrushRadiusPx(FLUID_BRUSH_MAX_PX / FLUID_BRUSH_RADIUS_PER_PX, frame) <= FLUID_BRUSH_MAX_PX + NEAR);
  assert.equal(getFluidBrushRadiusPx(Number.NaN, frame), 0);
});

test('筆の半径は描画の速さによらない：30fps の 40px は 60fps の 20px と同じ太さ', () => {
  assert.ok(Math.abs(getFluidBrushRadiusPx(40, 1 / 30) - getFluidBrushRadiusPx(20, 1 / 60)) < NEAR);
  assert.ok(Math.abs(getFluidBrushRadiusPx(10, 1 / 120) - getFluidBrushRadiusPx(20, 1 / 60)) < NEAR);
  // 時間が 0・不正でも壊れない
  assert.ok(Number.isFinite(getFluidBrushRadiusPx(20, 0)));
  assert.ok(Number.isFinite(getFluidBrushRadiusPx(20, Number.NaN)));
});

test('筆の速度は慣性つき：動かすと目標へ近づき，止めると 0.8 倍ずつ収まる', () => {
  const frame = 1 / 60;
  // 秒速 1800px（1 コマ 30px）の目標
  const pxPerSec = 1800;
  const target = pxPerSec * FLUID_VELOCITY_PER_PX_PER_SEC;
  const first = advanceFluidVelocity({ x: 0, y: 0 }, 30, 0, frame);
  // 最初の 1 コマは，目標の (1 − 0.8) だけ
  assert.ok(Math.abs(first.x - target * (1 - FLUID_VELOCITY_INERTIA)) < NEAR);
  assert.equal(first.y, 0);
  let velocity = first;
  for (let index = 0; index < 60; index += 1) velocity = advanceFluidVelocity(velocity, 30, 0, frame);
  assert.ok(Math.abs(velocity.x - target) < 1e-4);
  // 止める（動かさない）と，0.8 倍ずつ小さくなる
  const stopped = advanceFluidVelocity({ x: 0.4, y: -0.2 }, 0, 0, frame);
  assert.ok(Math.abs(stopped.x - 0.4 * FLUID_VELOCITY_INERTIA) < NEAR);
  assert.ok(Math.abs(stopped.y + 0.2 * FLUID_VELOCITY_INERTIA) < NEAR);
});

test('筆の速度は ±0.5（バッファに書ける範囲）に収まり，描画の速さによらない', () => {
  let velocity = { x: 0, y: 0 };
  for (let index = 0; index < 400; index += 1) velocity = advanceFluidVelocity(velocity, 600, -600, 1 / 60);
  // 上限に張りつく（目標が上限を超えるので，慣性で近づく間に上限で止まる）
  assert.ok(Math.abs(velocity.x - FLUID_MAX_VELOCITY) < 1e-6 && velocity.x <= FLUID_MAX_VELOCITY);
  assert.ok(Math.abs(velocity.y + FLUID_MAX_VELOCITY) < 1e-6 && velocity.y >= -FLUID_MAX_VELOCITY);
  // 同じ速さ（秒速 1200px）で，1 コマを 2 つに割っても同じ結果
  const full = advanceFluidVelocity({ x: 0.1, y: 0 }, 20, 0, 1 / 60);
  let half = { x: 0.1, y: 0 };
  half = advanceFluidVelocity(half, 10, 0, 1 / 120);
  half = advanceFluidVelocity(half, 10, 0, 1 / 120);
  assert.ok(Math.abs(full.x - half.x) < NEAR);
  // 不正な入力でも壊れない
  const broken = advanceFluidVelocity({ x: Number.NaN, y: 0 }, Number.NaN, 0, Number.NaN);
  assert.ok(Number.isFinite(broken.x) && Number.isFinite(broken.y));
});

test('筆として使える動き：動いていて，ワープ（再入場など）ではないもの', () => {
  const at = { x: 300, y: 300 };
  assert.equal(isFluidStroke(at, at), false);
  assert.equal(isFluidStroke(at, { x: 300.2, y: 300 }), false);
  assert.equal(isFluidStroke(at, { x: 320, y: 300 }), true);
  assert.equal(isFluidStroke(at, { x: 300 + FLUID_MAX_JUMP_PX, y: 300 }), true);
  assert.equal(isFluidStroke(at, { x: 300 + FLUID_MAX_JUMP_PX + 1, y: 300 }), false);
  assert.equal(isFluidStroke(at, { x: Number.NaN, y: 300 }), false);
});

test('表示の減衰：重み 0.4 で 0，重みが小さいほど強い（始点 > 終点の逆向きの smoothstep）', () => {
  assert.equal(FLUID_FALLOFF_START, 0.4);
  assert.equal(FLUID_FALLOFF_END, -0.9);
  assert.equal(getFluidFalloff(FLUID_FALLOFF_START, FLUID_FALLOFF_END, 0.4), 0);
  assert.equal(getFluidFalloff(FLUID_FALLOFF_START, FLUID_FALLOFF_END, 1), 0);
  assert.equal(getFluidFalloff(FLUID_FALLOFF_START, FLUID_FALLOFF_END, -0.9), 1);
  // 重み 0 での値：t = 0.4 / 1.3 の smoothstep
  const t = 0.4 / 1.3;
  assert.ok(Math.abs(getFluidFalloff(FLUID_FALLOFF_START, FLUID_FALLOFF_END, 0) - t * t * (3 - 2 * t)) < NEAR);
  let previous = Number.POSITIVE_INFINITY;
  for (let weight = 0; weight <= 0.4; weight += 0.02) {
    const value = getFluidFalloff(FLUID_FALLOFF_START, FLUID_FALLOFF_END, weight);
    assert.ok(value <= previous + NEAR);
    previous = value;
  }
  // 始点と終点が同じでも壊れない
  assert.equal(getFluidFalloff(0.5, 0.5, 0.2), 0);
  assert.equal(getFluidFalloff(0.5, 0.5, 0.7), 1);
});

test('眠るまでの時間は，色の振れ幅の上限が見えなくなるまでの指数的な減衰で決まる', () => {
  const light = fluid.FLUID_LOOKS.light.colorMultiplier;
  const sleepMs = getFluidSleepMs(light);
  const ratio = FLUID_VELOCITY_DECAY * FLUID_WEIGHT_A_DECAY;
  const ceiling = FLUID_SHADE * getFluidFalloff(FLUID_FALLOFF_START, FLUID_FALLOFF_END, 0) * light * 0.5;
  const boundAt = (ms) => ceiling * ratio ** ((ms / 1000) * FLUID_REFERENCE_FPS);
  // 眠る時点で見えなくなり，その少し前（1 コマ前）はまだ見える
  assert.ok(boundAt(sleepMs) <= FLUID_INVISIBLE_LEVEL + 1e-12);
  assert.ok(boundAt(sleepMs - 1000 / 60 - 1) > FLUID_INVISIBLE_LEVEL);
  // 1〜3 秒でなだらかに薄れる（余韻が長すぎず，短すぎない）
  assert.ok(sleepMs > 1000 && sleepMs < 3000);
  // 強いほど長く，弱いほど短い．ほとんど見えない強さなら待たない
  assert.ok(getFluidSleepMs(60) > getFluidSleepMs(30));
  assert.ok(getFluidSleepMs(10) < getFluidSleepMs(30));
  assert.equal(getFluidSleepMs(0), 0);
  assert.equal(getFluidSleepMs(Number.NaN), 0);
  // 暗いテーマは強い分，少し長い
  assert.ok(getFluidSleepMs(fluid.FLUID_LOOKS.dark.colorMultiplier) >= sleepMs);
});

test('眠る判定は，最後に筆を置いてからの時間で決まる', () => {
  assert.equal(isFluidAsleep(1000, 1000, 1500), false);
  assert.equal(isFluidAsleep(2499, 1000, 1500), false);
  assert.equal(isFluidAsleep(2500, 1000, 1500), true);
  // まだ一度も置いていない（-Infinity）なら眠ったまま
  assert.equal(isFluidAsleep(1000, Number.NEGATIVE_INFINITY), true);
  // 既定の待ち時間は getFluidSleepMs
  assert.equal(isFluidAsleep(1000 + getFluidSleepMs() - 1, 1000), false);
  assert.equal(isFluidAsleep(1000 + getFluidSleepMs(), 1000), true);
});

test('層の不透明度：眠る直前までは 1，そこからなだらかに 0 へ（パッと消えない）', () => {
  const sleepMs = getFluidSleepMs();
  const fadeStart = sleepMs - FLUID_LAYER_FADE_MS;
  assert.equal(getFluidLayerOpacity(0, sleepMs), 1);
  assert.equal(getFluidLayerOpacity(fadeStart, sleepMs), 1);
  assert.equal(getFluidLayerOpacity(sleepMs, sleepMs), 0);
  assert.equal(getFluidLayerOpacity(sleepMs + 5000, sleepMs), 0);
  assert.equal(getFluidLayerOpacity(Number.NaN, sleepMs), 1);
  let previous = 1;
  for (let ms = 0; ms <= sleepMs; ms += 17) {
    const value = getFluidLayerOpacity(ms, sleepMs);
    // 単調に下がり，1 コマ（17ms）で 1 割も落ちない
    assert.ok(value <= previous + NEAR && previous - value < 0.08);
    previous = value;
  }
  // 薄れる時間は十分に長い
  assert.ok(FLUID_LAYER_FADE_MS >= 300);
});

test('テーマごとの強さ：暗いテーマは加算がよく見えるので別に持ち，彩度は 0 より大きく 1 以下', () => {
  const light = getFluidLook(false);
  const dark = getFluidLook(true);
  assert.ok(light.colorMultiplier > 0 && dark.colorMultiplier > 0);
  assert.notEqual(light.colorMultiplier, dark.colorMultiplier);
  for (const look of [light, dark]) assert.ok(look.saturation > 0 && look.saturation <= 1);
  // 明るい背景は，負の成分が作る淡い色の筋を主役にするので，彩度は落とさない
  assert.equal(light.saturation, 1);
  assert.ok(dark.saturation < 1);
});

test('層：本文（10）より上で，ナビ（50）より下', () => {
  assert.ok(FLUID_LAYER_Z_INDEX > 10 && FLUID_LAYER_Z_INDEX < 50);
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
