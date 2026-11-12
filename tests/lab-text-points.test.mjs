import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/lab/textPoints.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { sampleTextMask, textCycle, morphTextPoint } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('透過マスクをDOMなしで点へ変換し，座標・個数を制限する', () => {
  const mask = new Uint8ClampedArray(8 * 8 * 4);
  for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) if (x === y || x === 0) mask[(y * 8 + x) * 4 + 3] = 255;
  const points = sampleTextMask(mask, 8, 8, 1);
  assert.equal(points.length, 15);
  assert.ok(points.every(point => point.x === point.y || point.x === 0));
  assert.deepEqual(sampleTextMask(mask, 8, 8, 1, 4), sampleTextMask(mask, 8, 8, 1, 4));
  assert.equal(sampleTextMask(mask, 8, 8, 1, 4).length, 4);
  assert.deepEqual(sampleTextMask(mask, 8, 8, 0), []);
  assert.deepEqual(sampleTextMask(new Uint8Array(4 * 8 * 8), 8, 8), []);
});

test('文字を読む静止時間のあとに変形し，3語で周回する', () => {
  assert.deepEqual(textCycle(0), { from: 0, to: 1, mix: 0 });
  assert.equal(textCycle(3000).mix, 0);
  assert.ok(textCycle(4100).mix > 0 && textCycle(4100).mix < 1);
  assert.deepEqual(textCycle(15000), textCycle(0));
  assert.deepEqual(textCycle(-100), textCycle(0));
});

test('変形の両端が一致し，散らしたあとポインタを離すと戻る', () => {
  const a = { x: 0.2, y: 0.3 }; const b = { x: 0.8, y: 0.7 };
  assert.deepEqual(morphTextPoint(a, b, 0, null, 0), a);
  assert.deepEqual(morphTextPoint(a, b, 1, null, 0), b);
  const dispersed = morphTextPoint(a, b, 0, a, 0);
  assert.notDeepEqual(dispersed, a);
  assert.ok(Number.isFinite(dispersed.x) && Number.isFinite(dispersed.y));
  assert.deepEqual(morphTextPoint(a, b, 0, null, 0), a);
});
