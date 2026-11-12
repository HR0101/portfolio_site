import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/data/devLog.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { devLog } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('最近の制作記録は3件に絞られている', () => {
  assert.equal(devLog.length, 3);
});

test('表示用の日付は YYYY-MM-DD で，新しい順に並ぶ', () => {
  for (const [index, entry] of devLog.entries()) {
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/);
    if (index > 0) assert.ok(devLog[index - 1].date >= entry.date);
  }
});

test('必須項目と，設定した関連リンクは空でない', () => {
  for (const entry of devLog) {
    for (const field of ['id', 'date', 'title', 'change', 'benefit']) {
      assert.equal(typeof entry[field], 'string');
      assert.ok(entry[field].trim(), `${entry.id} の ${field} が空です`);
    }
    if (entry.link) {
      assert.ok(entry.link.label.trim());
      assert.match(entry.link.href, /^\/(?!\/)/);
    }
  }
});
