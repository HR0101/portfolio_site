import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/animations/cornerMarks.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const {
  CORNER_MARK_DEFAULT_DIVISIONS,
  CORNER_MARK_MAX_DIVISIONS,
  CORNER_MARK_MIN_DIVISIONS,
  CORNER_MARK_STAGGER_MS,
  getCornerMarkDelay,
  getCornerMarkLayout,
  normalizeDivisions,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('等分数は許す範囲の整数へ丸められ，数でない値は既定値になる', () => {
  assert.equal(normalizeDivisions(4), 4);
  assert.equal(normalizeDivisions(2.6), 3);
  assert.equal(normalizeDivisions(0), CORNER_MARK_MIN_DIVISIONS);
  assert.equal(normalizeDivisions(-3), CORNER_MARK_MIN_DIVISIONS);
  assert.equal(normalizeDivisions(99), CORNER_MARK_MAX_DIVISIONS);
  assert.equal(normalizeDivisions(Number.NaN), CORNER_MARK_DEFAULT_DIVISIONS);
  assert.equal(normalizeDivisions(Number.POSITIVE_INFINITY), CORNER_MARK_DEFAULT_DIVISIONS);
});

test('印は上辺と下辺の等分点（両端を含む）に置かれる', () => {
  const marks = getCornerMarkLayout(2, false);
  assert.equal(marks.length, 6);
  const top = marks.filter((mark) => mark.edge === 'top').map((mark) => mark.fraction).sort((a, b) => a - b);
  const bottom = marks.filter((mark) => mark.edge === 'bottom').map((mark) => mark.fraction).sort((a, b) => a - b);
  assert.deepEqual(top, [0, 0.5, 1]);
  assert.deepEqual(bottom, [0, 0.5, 1]);
  assert.equal(getCornerMarkLayout(4, false).length, 10);
});

test('四隅の印は，枠の外へ斜めに，辺の途中の印は真上・真下に向く', () => {
  const marks = getCornerMarkLayout(4, false);
  const byKey = Object.fromEntries(marks.map((mark) => [mark.key, mark]));
  assert.deepEqual([byKey['top-0'].dx, byKey['top-0'].dy], [-1, -1]);
  assert.deepEqual([byKey['top-4'].dx, byKey['top-4'].dy], [1, -1]);
  assert.deepEqual([byKey['bottom-0'].dx, byKey['bottom-0'].dy], [-1, 1]);
  assert.deepEqual([byKey['bottom-4'].dx, byKey['bottom-4'].dy], [1, 1]);
  assert.deepEqual([byKey['top-2'].dx, byKey['top-2'].dy], [0, -1]);
  assert.deepEqual([byKey['bottom-1'].dx, byKey['bottom-1'].dy], [0, 1]);
});

test('等分数が 1 のときは，四隅だけになる', () => {
  const marks = getCornerMarkLayout(1, false);
  assert.equal(marks.length, 4);
  assert.ok(marks.every((mark) => mark.dx !== 0));
});

test('ラベルを置くときは，下辺の中央の印だけが省かれる', () => {
  const withLabel = getCornerMarkLayout(4, true);
  const withoutLabel = getCornerMarkLayout(4, false);
  assert.equal(withLabel.length, withoutLabel.length - 1);
  assert.ok(!withLabel.some((mark) => mark.edge === 'bottom' && mark.fraction === 0.5));
  assert.ok(withLabel.some((mark) => mark.edge === 'top' && mark.fraction === 0.5));
  // 中央に印が無い等分数（3）では，何も省かない
  assert.equal(getCornerMarkLayout(3, true).length, getCornerMarkLayout(3, false).length);
});

test('登場の順番は 0 から途切れず，中央に近い印が先になる', () => {
  const marks = getCornerMarkLayout(4, true);
  assert.deepEqual(marks.map((mark) => mark.order), marks.map((_, index) => index));
  const distances = marks.map((mark) => Math.abs(mark.fraction - 0.5));
  for (let index = 1; index < distances.length; index += 1) {
    assert.ok(distances[index] >= distances[index - 1] - 1e-9, '中央から外へ向かう順になっていません');
  }
  // 同じ距離なら，上辺が先
  assert.equal(marks[0].edge, 'top');
  assert.equal(marks[0].fraction, 0.5);
});

test('キーは重複しない', () => {
  const keys = getCornerMarkLayout(8, false).map((mark) => mark.key);
  assert.equal(new Set(keys).size, keys.length);
});

test('遅れは，順番ごとに 30ms ずつ増え，全体の遅れが足される', () => {
  assert.equal(CORNER_MARK_STAGGER_MS, 30);
  assert.equal(getCornerMarkDelay(0), 0);
  assert.equal(getCornerMarkDelay(3), 90);
  assert.equal(getCornerMarkDelay(3, 120), 210);
  assert.equal(getCornerMarkDelay(-2, 50), 50);
  assert.equal(getCornerMarkDelay(Number.NaN, Number.NaN), 0);
});
