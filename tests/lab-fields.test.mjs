import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/lab/fields.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { fieldNoise, wavePoint, orbitPoint, spiralPoint, smokePoint, metaballField, flowAngle, lissajousPoint, rippleHeight, createStarSeeds, starPoint, MAX_STARS, metalBrightness, rayShape } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('ノイズは決定論的かつ連続で，値域に収まる', () => {
  for (let index = -100; index < 100; index += 1) {
    const x = index / 7;
    const value = fieldNoise(x, 0.3);
    assert.equal(value, fieldNoise(x, 0.3));
    assert.ok(value >= 0 && value <= 1);
    assert.ok(Math.abs(value - fieldNoise(x + 0.00001, 0.3)) < 0.001);
  }
});

test('波はポインタで変わり，軌道は近い点だけ広がる', () => {
  const center = { x: 0.5, y: 0.5 };
  assert.notDeepEqual(wavePoint(0.5, 0.5, 1, null), wavePoint(0.5, 0.5, 1, center));
  const radius = point => Math.hypot(point.x - 0.5, point.y - 0.5);
  assert.ok(radius(orbitPoint(0.5, 0.5, 0, center)) > radius(orbitPoint(0.5, 0.5, 0, null)));
});

test('場の和で塊の間がつながり，流れの反転がπになる', () => {
  const a = { x: 0.4, y: 0.5 }; const b = { x: 0.6, y: 0.5 };
  assert.ok(metaballField(0.5, 0.5, [a, b]) > metaballField(0.5, 0.5, [a]));
  assert.ok(Math.abs(flowAngle(0.3, 0.4, 1, -1, null) - flowAngle(0.3, 0.4, 1, 1, null) - Math.PI) < 1e-12);
});

test('渦・環・リサジュー・波紋は同じ入力で同じ有限値を返す', () => {
  for (let index = 0; index < 100; index += 1) {
    for (const point of [spiralPoint(index, 100, 2), smokePoint(index, 100, 2, 0.2, { x: 0.5, y: 0.5 }), lissajousPoint(index / 100, 2, 3)]) assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
  }
  const ripples = [{ x: 0.5, y: 0.5, born: 0 }];
  assert.equal(rippleHeight(0.4, 0.5, 2, ripples), rippleHeight(0.4, 0.5, 2, ripples));
  assert.notEqual(rippleHeight(0.4, 0.5, 2, ripples), rippleHeight(0.4, 0.5, 3, ripples));
});


test('星の生成に上限があり，座標が時間で変化する', () => {
  const stars = createStarSeeds(() => 0.5, 1000);
  assert.equal(stars.length, MAX_STARS);
  assert.deepEqual(stars, createStarSeeds(() => 0.5, 1000));
  assert.notDeepEqual(starPoint(stars[0], 0), starPoint(stars[0], 1000));
});

test('金属の縞と光線は時間・入力で変わり，濃さが範囲内に収まる', () => {
  assert.notEqual(metalBrightness(2, 0, 0.5, false), metalBrightness(2, 1000, 0.5, false));
  assert.notEqual(metalBrightness(2, 0, 0.5, false), metalBrightness(2, 0, 0.2, false));
  for (let index = 0; index < 64; index += 1) {
    const metal = metalBrightness(index, 2000, 0.5, true);
    assert.ok(metal >= 0 && metal <= 1);
    const ray = rayShape(index, 64, 2000, false);
    assert.ok(ray.alpha > 0 && ray.alpha < 1);
    assert.ok(Math.abs(Math.hypot(ray.start.x, ray.start.y) - 1) < 1e-12);
    assert.notDeepEqual(ray, rayShape(index, 64, 3000, true));
  }
});
