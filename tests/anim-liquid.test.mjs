import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/animations/liquid.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const {
  getLiquidStretch, getLiquidDropTransform, getLiquidAlphaMatrix,
  LIQUID_STRETCH_MAX, LIQUID_BLUR_STD_DEVIATION, LIQUID_BLEED_PX,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('止まっているときは伸びない', () => {
  assert.deepEqual(getLiquidStretch(0, 0), { scaleX: 1, scaleY: 1 });
});

test('速さに応じて，進む向きに |v| / 2400 だけ伸び，直交する向きは 1 / √scale で縮む', () => {
  const stretch = getLiquidStretch(1200, 0);
  assert.ok(stretch.scaleX <= 1 + LIQUID_STRETCH_MAX + 1e-12, '上限を超えない');
  const slow = getLiquidStretch(240, 0);
  assert.ok(Math.abs(slow.scaleX - 1.1) < 1e-12);
  assert.ok(Math.abs(slow.scaleY - 1 / Math.sqrt(1.1)) < 1e-12);
  // 面積は，伸びても大きくは変わらない（scaleX × scaleY = √scaleX）
  assert.ok(Math.abs(slow.scaleX * slow.scaleY - Math.sqrt(1.1)) < 1e-12);
});

test('伸びは 1.35 倍で頭打ちになり，向きに関わらず速さの符号は無関係', () => {
  const fast = getLiquidStretch(100000, 0);
  assert.ok(Math.abs(fast.scaleX - (1 + LIQUID_STRETCH_MAX)) < 1e-12);
  assert.deepEqual(getLiquidStretch(-100000, 0), fast);
  assert.ok(fast.scaleY < 1 && fast.scaleY > 0.8);
});

test('縦の動きは，縦へ伸びる', () => {
  const vertical = getLiquidStretch(0, 600);
  assert.ok(vertical.scaleY > 1);
  assert.ok(vertical.scaleX < 1);
  assert.ok(Math.abs(vertical.scaleY - 1.25) < 1e-12);
});

test('不正な速さでは伸びない', () => {
  assert.deepEqual(getLiquidStretch(Number.NaN, Number.POSITIVE_INFINITY), { scaleX: 1, scaleY: 1 });
  assert.deepEqual(getLiquidStretch(Number.NaN, 0), { scaleX: 1, scaleY: 1 });
});

test('雫の変形は，見た目の中心を箱の中心に合わせ，大きさを基準との比で表す', () => {
  const base = { w: 100, h: 40 };
  const rest = getLiquidDropTransform({ x: 10, y: 4, w: 100, h: 40 }, base, 0);
  assert.deepEqual(rest, { translateX: 10, translateY: 4, scaleX: 1, scaleY: 1 });
  // 幅が違う箱：中心は変わらず，scaleX だけが変わる
  const wide = getLiquidDropTransform({ x: 10, y: 4, w: 150, h: 40 }, base, 0);
  assert.equal(wide.scaleX, 1.5);
  assert.equal(wide.scaleY, 1);
  assert.equal(wide.translateX + base.w / 2, 10 + 150 / 2);
  // 層を外へ広げた幅（bleed）の分だけ，座標が内側へずれる
  const bled = getLiquidDropTransform({ x: 10, y: 4, w: 100, h: 40 }, base, 24);
  assert.equal(bled.translateX, 34);
  assert.equal(bled.translateY, 28);
});

test('伸びを掛けても中心は動かない', () => {
  const stretch = getLiquidStretch(2400, 0);
  const result = getLiquidDropTransform({ x: 0, y: 0, w: 100, h: 40 }, { w: 100, h: 40 }, 0, stretch);
  assert.ok(Math.abs(result.scaleX - 1.35) < 1e-12);
  assert.equal(result.translateX + 50, 50);
  assert.equal(result.translateY + 20, 20);
});

test('基準の大きさが 0 や不正でも，無限大や NaN にならない', () => {
  const result = getLiquidDropTransform({ x: Number.NaN, y: 0, w: 50, h: 20 }, { w: 0, h: 0 }, 0);
  for (const value of Object.values(result)) assert.ok(Number.isFinite(value));
});

test('フィルタの係数：ぼかしは 6，アルファは × 20 − 9，広げる幅はぼかしの 4 倍', () => {
  assert.equal(LIQUID_BLUR_STD_DEVIATION, 6);
  assert.equal(getLiquidAlphaMatrix(), '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9');
  assert.equal(LIQUID_BLEED_PX, 24);
});
