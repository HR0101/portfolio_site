import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/choreography.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { staggerDelay, diagonalDelay, splitGraphemes, STAGGER_STEP_MS, STAGGER_CAP_MS } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('段階表示の遅れは項目ごとに一定の間隔で増え，上限で頭打ちになる', () => {
  assert.equal(staggerDelay(0), 0);
  assert.equal(staggerDelay(3), 3 * STAGGER_STEP_MS);
  assert.equal(staggerDelay(1000), STAGGER_CAP_MS);
  assert.equal(staggerDelay(4, { stepMs: 30, startMs: 100 }), 220);
  assert.equal(staggerDelay(100, { stepMs: 30, startMs: 100, capMs: 300 }), 300);
});

test('不正な入力では 0 や既定値に倒れ，例外にならない', () => {
  assert.equal(staggerDelay(Number.NaN), 0);
  assert.equal(staggerDelay(-5), 0);
  assert.equal(staggerDelay(2, { stepMs: Number.NaN }), 2 * STAGGER_STEP_MS);
  assert.equal(staggerDelay(2, { capMs: Number.NaN }), 2 * STAGGER_STEP_MS);
  // 上限が開始より小さいときは，開始を下回らない
  assert.equal(staggerDelay(5, { startMs: 200, capMs: 50 }), 200);
});

test('斜めの波は，行と列の和に応じて左上から右下へ広がる', () => {
  assert.equal(diagonalDelay(0, 3), 0);
  assert.equal(diagonalDelay(1, 3), STAGGER_STEP_MS);
  assert.equal(diagonalDelay(3, 3), STAGGER_STEP_MS);
  assert.equal(diagonalDelay(4, 3), 2 * STAGGER_STEP_MS);
  assert.equal(diagonalDelay(5, 0), staggerDelay(5));
});

test('文字の分割は，結合文字や絵文字を壊さない', () => {
  assert.deepEqual(splitGraphemes('信頼'), ['信', '頼']);
  assert.equal(splitGraphemes('👨‍👩‍👧').length, 1);
  assert.deepEqual(splitGraphemes(''), []);
});
