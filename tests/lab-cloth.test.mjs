import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/lab/cloth.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { createCloth, constrainCloth, stepCloth, clothWind, CLOTH_MAX_POINTS } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const error = cloth => cloth.links.reduce((sum, link) => sum + Math.abs(Math.hypot(cloth.points[link.a].x - cloth.points[link.b].x, cloth.points[link.a].y - cloth.points[link.b].y) - link.length), 0);

test('格子の点数に上限があり，上辺だけが固定される', () => {
  const cloth = createCloth(1000, 1000);
  assert.equal(cloth.points.length, CLOTH_MAX_POINTS);
  assert.equal(cloth.points.filter(point => point.fixed).length, 22);
});

test('拘束の反復で長さの誤差を減らし，入力は書き換えない', () => {
  const cloth = createCloth();
  cloth.points[180].x += 0.05;
  const original = structuredClone(cloth);
  const constrained = constrainCloth(cloth);
  assert.ok(error(constrained) < error(cloth) * 0.3);
  assert.deepEqual(cloth, original);
  assert.deepEqual(constrained.points.slice(0, 22), cloth.points.slice(0, 22));
  assert.deepEqual(constrainCloth(cloth, 100000), constrainCloth(cloth, 7));
});

test('時間と行が同じなら風は同じで，時間や行を変えると変わる', () => {
  assert.equal(clothWind(2000, 8), clothWind(2000, 8));
  assert.notEqual(clothWind(2000, 8), clothWind(3000, 8));
  assert.notEqual(clothWind(2000, 8), clothWind(2000, 9));
});

test('長時間動かしても固定点・有限値を保ち，停止時間は消化しない', () => {
  const initial = createCloth();
  let cloth = initial;
  for (let frame = 0; frame < 1000; frame += 1) cloth = stepCloth(cloth, frame * 33, 33, frame < 20 ? { x: 0.5, y: 0.6 } : null);
  assert.deepEqual(cloth.points.slice(0, 22), initial.points.slice(0, 22));
  assert.ok(cloth.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y) && Math.abs(point.x) < 2 && Math.abs(point.y) < 2));
  assert.equal(stepCloth(cloth, 100000, 0), cloth);
  assert.ok(error(cloth) / cloth.links.length < 0.005);
});
