import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/ambient/statement.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { statementWords, statementOpacity, STATEMENT_EXAMPLES } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('語の区切りだけを外し，空の区切りは除き，事実の本文を保存する', () => {
  assert.deepEqual(statementWords('ソースコードを/GitHub に/公開しています．'), ['ソースコードを', 'GitHub に', '公開しています．']);
  assert.deepEqual(statementWords('//個人開発です．/'), ['個人開発です．']);
  assert.deepEqual(statementWords(''), []);
});

test('単語は順に濃くなり，スクロールを戻すと同じ明度に戻る', () => {
  const at = progress => [0, 1, 2].map(index => statementOpacity(index, 3, progress));
  assert.ok(at(0.3)[0] > at(0.3)[1]);
  assert.ok(at(0.6)[1] > at(0.3)[1]);
  assert.deepEqual(at(1), [1, 1, 1]);
  const middle = at(0.5);
  at(0.9);
  assert.deepEqual(at(0.5), middle);
  for (const progress of [-10, NaN, 0, 0.5, 1, 10]) {
    for (const opacity of at(progress)) assert.ok(opacity >= 0.62 && opacity <= 1);
  }
});

test('例文の本数は呼び出し側の値に追従し，全作品の公開ソースを保証しない', () => {
  assert.equal(STATEMENT_EXAMPLES.apps(17), '17 のアプリ．/個人開発です．');
  assert.equal(STATEMENT_EXAMPLES.apps(18), '18 のアプリ．/個人開発です．');
  assert.equal(STATEMENT_EXAMPLES.works(4), 'Web とゲーム，/4 の作品．');
  assert.equal(STATEMENT_EXAMPLES.apps(NaN), '0 のアプリ．/個人開発です．');
  assert.ok(!STATEMENT_EXAMPLES.source.includes('すべて'));
});
