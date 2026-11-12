import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/lab/boids.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { createBoids, stepBoids, MAX_BOIDS } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const random = () => { let seed = 17; return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; };

test('群れの点数を制限し，決定論的に初期化する', () => {
  const flock = createBoids(random(), 999);
  assert.equal(flock.length, MAX_BOIDS);
  assert.deepEqual(flock, createBoids(random(), 999));
  assert.deepEqual(stepBoids(flock, 0, null), flock);
});

test('集めると12列のカードへ収束し，元の群れを書き換えない', () => {
  const initial = createBoids(random());
  const copy = structuredClone(initial);
  let flock = initial;
  for (let index = 0; index < 600; index += 1) flock = stepBoids(flock, 33, { x: 0.5, y: 0.5 });
  flock.forEach((boid, index) => {
    const targetX = 0.5 + ((index % 12) - 5.5) * 0.035;
    const targetY = 0.5 + (Math.floor(index / 12) - 2.5) * 0.042;
    assert.ok(Math.hypot(boid.x - targetX, boid.y - targetY) < 0.01);
  });
  assert.deepEqual(initial, copy);
  const scattered = stepBoids(flock, 33, null);
  assert.notDeepEqual(scattered, flock);
  assert.ok(scattered.every(boid => boid.x >= 0 && boid.x < 1 && boid.y >= 0 && boid.y < 1));
});
