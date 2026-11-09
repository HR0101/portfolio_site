import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/wordmarkParticles.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { stepWordmarkParticles, resetWordmarkParticles } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const point = (x = 0, y = 0) => ({ originX: x, originY: y, x, y, vx: 0, vy: 0, accent: false });

test('カーソルと完全に重なった点も有限の位置へ反発し，遠い点は字形を保つ', () => {
  const points = [point(), point(300, 300)];
  assert.equal(stepWordmarkParticles(points, { x: 0, y: 0, radius: 70 }, 1 / 60), true);
  assert.ok(points[0].x > 0);
  assert.ok([points[0].x, points[0].y, points[0].vx, points[0].vy].every(Number.isFinite));
  assert.deepEqual(points[1], point(300, 300));
});

test('繰り返しなぞっても変位は有界で，離れると厳密に元の名前へ収束する', () => {
  const points = [point(12, 18)];
  for (let frame = 0; frame < 120; frame++) {
    stepWordmarkParticles(points, { x: points[0].x - 1, y: points[0].y, radius: 70 }, 1 / 60);
    assert.ok(Math.hypot(points[0].x - 12, points[0].y - 18) <= 96.0001);
  }
  let moving = true;
  for (let frame = 0; frame < 240 && moving; frame++) {
    moving = stepWordmarkParticles(points, null, 1 / 60);
  }
  assert.equal(moving, false);
  assert.deepEqual(points[0], point(12, 18));
});

test('60Hzと120Hzで同じ入力時間なら，反発と復元の位置が一致する', () => {
  const run = hz => {
    const points = [point(10, 20)];
    for (let frame = 0; frame < hz; frame++) {
      stepWordmarkParticles(points, frame < hz / 10 ? { x: 0, y: 0, radius: 70 } : null, 1 / hz);
    }
    return points[0];
  };
  const slow = run(60);
  const fast = run(120);
  assert.ok(Math.hypot(slow.x - fast.x, slow.y - fast.y) < 0.05);
});

test('非表示時のリセットで位置と速度を戻せる', () => {
  const points = [{ ...point(12, 18), x: 40, y: 55, vx: 300, vy: -200 }];
  resetWordmarkParticles(points);
  assert.deepEqual(points[0], point(12, 18));
});

test('高速で通過して両端が文字の外でも，途中の点を取りこぼさず反発させる', () => {
  const points = [point(), point(0, 200)];
  stepWordmarkParticles(points, { x: 200, y: 0, previousX: -200, previousY: 0, radius: 80 }, 1 / 60);
  assert.ok(Math.hypot(points[0].x, points[0].y) > 3);
  assert.deepEqual(points[1], point(0, 200));
  for (let frame = 0; frame < 240; frame++) stepWordmarkParticles(points, null, 1 / 60);
  assert.deepEqual(points[0], point());
});

test('高速の一度の通過による衝撃は60Hzでも120Hzでも同じ強さになる', () => {
  const run = hz => {
    const points = [point()];
    stepWordmarkParticles(points, { x: 200, y: 0, previousX: -200, previousY: 0, radius: 80 }, 1 / hz);
    for (let frame = 1; frame < hz / 2; frame++) stepWordmarkParticles(points, null, 1 / hz);
    return points[0];
  };
  const slow = run(60);
  const fast = run(120);
  assert.ok(Math.hypot(slow.x - fast.x, slow.y - fast.y) < 0.05);
});
