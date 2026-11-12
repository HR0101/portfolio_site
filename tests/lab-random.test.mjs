import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/lab/random.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { mulberry32 } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('同じ種で同じ乱数列になり，別の種では変わる', () => {
  const a = mulberry32(19); const b = mulberry32(19); const c = mulberry32(20);
  const values = Array.from({ length: 1000 }, () => a());
  assert.deepEqual(values, Array.from({ length: 1000 }, () => b()));
  assert.notDeepEqual(values, Array.from({ length: 1000 }, () => c()));
  assert.ok(values.every(value => value >= 0 && value < 1));
  assert.ok(new Set(values).size > 990);
});

test('種は32ビット整数へ正規化される', () => {
  assert.equal(mulberry32(-1)(), mulberry32(0xffffffff)());
  assert.equal(mulberry32(0)(), mulberry32(2 ** 32)());
});
