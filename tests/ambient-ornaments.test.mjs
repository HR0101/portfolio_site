import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/ambient/ornaments.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { ORNAMENT_CHAPTERS, ornamentPoints, ornamentOffset } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('7章は異なる固定の点図形を持ち，100点未満で小さな面に収まる', () => {
  const shapes = new Set();
  assert.equal(Object.keys(ORNAMENT_CHAPTERS).length, 7);
  for (const section of Object.keys(ORNAMENT_CHAPTERS)) {
    const points = ornamentPoints(section);
    assert.deepEqual(points, ornamentPoints(section));
    assert.ok(points.length >= 40 && points.length < 100);
    for (const dot of points) {
      assert.ok(dot.x > 0 && dot.x < 1 && dot.y > 0 && dot.y < 1);
      assert.ok(dot.opacity >= 0.2 && dot.opacity <= 1);
    }
    shapes.add(JSON.stringify(points));
  }
  assert.equal(shapes.size, 7);
  assert.equal(ORNAMENT_CHAPTERS.profile, '06');
  assert.equal(ORNAMENT_CHAPTERS.contact, '07');
});

test('Profileは円，Appsは三つの四角，GitHubは7行の固定格子になる', () => {
  for (const dot of ornamentPoints('profile')) assert.ok(Math.abs(Math.hypot(dot.x - 0.5, dot.y - 0.5) - 0.34) < 1e-9);
  assert.equal(ornamentPoints('apps').length, 72);
  assert.equal(ornamentPoints('github').length, 70);
  assert.equal(ornamentPoints('skills').length, 49);
});

test('ポインタによる移動は面の4.5%以下で，無効な入力と停止時は静止する', () => {
  assert.deepEqual(ornamentOffset(0.5, 0.5, 0.7, 0.7, 0), { x: 0, y: 0 });
  assert.deepEqual(ornamentOffset(NaN, 0.5, 0.7, 0.7, 1), { x: 0, y: 0 });
  const moved = ornamentOffset(0.4, 0.4, 0.8, 0.8, 1);
  assert.ok(moved.x > 0 && moved.y > 0);
  for (const x of [0, 0.2, 0.5, 1]) {
    for (const y of [0, 0.2, 0.5, 1]) {
      const offset = ornamentOffset(x, y, 0.8, 0.3, 100);
      assert.ok(Math.abs(offset.x) <= 0.045 && Math.abs(offset.y) <= 0.045);
    }
  }
});
