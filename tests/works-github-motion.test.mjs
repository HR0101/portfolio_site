import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

async function importPureModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

const { contributionCellDelay, CONTRIBUTION_ENTER_MS } = await importPureModule('../src/lib/worksGithubMotion.ts');
const { diagonalDelay, staggerDelay } = await importPureModule('../src/lib/choreography.ts');

test('リポジトリの波は画面幅ごとの 3・2・1 列に沿う', () => {
  const delays = columns => Array.from({ length: 6 }, (_, index) => diagonalDelay(index, columns));
  assert.deepEqual(delays(3), [0, 50, 100, 50, 100, 150]);
  assert.deepEqual(delays(2), [0, 50, 50, 100, 100, 150]);
  assert.deepEqual(delays(1), [0, 50, 100, 150, 200, 250]);
  for (const columns of [1, 2, 3]) assert.ok(diagonalDelay(1000, columns) <= 480);
});

test('展開した追加カードは 30ms 間隔で入り，最終カードも 300ms 以内に到着する', () => {
  const delay = index => staggerDelay(index, { stepMs: 30, capMs: 180 });
  assert.deepEqual([0, 1, 2, 3].map(delay), [0, 30, 60, 90]);
  for (const count of [1, 6, 30, 1000]) assert.ok(delay(count - 1) + 120 <= 300);
});

test('草は左の週から 14ms ずつ，濃いマスは同じ週の薄いマスより後に灯る', () => {
  for (let week = 0; week < 20; week += 1) {
    assert.equal(contributionCellDelay(week + 1, 0) - contributionCellDelay(week, 0), 14);
    for (let level = 1; level <= 4; level += 1) {
      assert.ok(contributionCellDelay(week, level) > contributionCellDelay(week, level - 1));
    }
  }
});

test('52・53・54 週でも，全マスの登場が 600ms 以内に完了する', () => {
  for (const weeks of [1, 52, 53, 54, 1000]) {
    let previousDelay = 0;
    for (let week = 0; week < weeks; week += 1) {
      const delay = contributionCellDelay(week, 4);
      assert.ok(delay >= previousDelay);
      assert.ok(delay + CONTRIBUTION_ENTER_MS <= 600);
      previousDelay = delay;
    }
  }
});

test('草の不正な入力は安全な範囲に丸める', () => {
  assert.equal(contributionCellDelay(-1, -4), 0);
  assert.equal(contributionCellDelay(Number.NaN, Number.POSITIVE_INFINITY), 0);
  assert.equal(contributionCellDelay(2.9, 1.9), contributionCellDelay(2, 1));
  assert.equal(contributionCellDelay(10000, 100), contributionCellDelay(10000, 4));
});
