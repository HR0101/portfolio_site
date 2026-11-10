import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/lab/life.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { nextLife, createRhLife, lifeIsSettled, shouldReseedLife, paintLife, RH_CELLS, LIFE_RESEED_MS } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const board = coordinates => { const cells = new Uint8Array(25); coordinates.forEach(([x, y]) => { cells[y * 5 + x] = 1; }); return cells; };

test('3セルの振動子が次世代で縦になり，2世代で元へ戻る', () => {
  const initial = board([[1, 2], [2, 2], [3, 2]]);
  const copy = initial.slice();
  const next = nextLife(initial, 5, 5);
  assert.deepEqual(next, board([[2, 1], [2, 2], [2, 3]]));
  assert.deepEqual(nextLife(next, 5, 5), initial);
  assert.deepEqual(initial, copy);
});

test('左右の端，かつ上下の端をまたぐ隣接セルを数える', () => {
  const initial = board([[4, 0], [0, 0], [1, 0]]);
  assert.deepEqual(nextLife(initial, 5, 5), board([[0, 4], [0, 0], [0, 1]]));
});

test('静止・消滅・2周期の検知と再投入までの待機', () => {
  const block = board([[1, 1], [2, 1], [1, 2], [2, 2]]);
  assert.equal(lifeIsSettled(block, nextLife(block, 5, 5)), true);
  const single = board([[2, 2]]);
  assert.equal(lifeIsSettled(single, nextLife(single, 5, 5)), true);
  const horizontal = board([[1, 2], [2, 2], [3, 2]]);
  const vertical = nextLife(horizontal, 5, 5);
  assert.equal(lifeIsSettled(horizontal, vertical), false);
  assert.equal(lifeIsSettled(vertical, horizontal, horizontal), true);
  assert.equal(shouldReseedLife(LIFE_RESEED_MS - 1), false);
  assert.equal(shouldReseedLife(LIFE_RESEED_MS), true);
  assert.equal(shouldReseedLife(NaN), false);
});

test('RHの文字形を中央へ置き，ずらしてもセル数は変わらない', () => {
  const cells = createRhLife(48, 32);
  const count = RH_CELLS.join('').split('').filter(cell => cell === '1').length;
  assert.equal(cells.reduce((sum, cell) => sum + cell, 0), count);
  RH_CELLS.forEach((row, y) => [...row].forEach((cell, x) => assert.equal(cells[(12 + y) * 48 + 18 + x], Number(cell))));
  assert.equal(createRhLife(48, 32, 4).reduce((sum, cell) => sum + cell, 0), count);
});

test('速いドラッグを補間してセルを連続して描く', () => {
  const empty = new Uint8Array(25);
  const painted = paintLife(empty, 5, 5, { x: 0, y: 0 }, { x: 4, y: 4 });
  for (let index = 0; index < 5; index += 1) assert.equal(painted[index * 5 + index], 1);
  assert.equal(empty.some(Boolean), false);
});
