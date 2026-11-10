import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

async function loadModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

const { NOTES, NOTES_PATH } = await loadModule('../src/data/notes.ts');
const { NOTE_CONTENT } = await loadModule('../src/sections/notes/content.ts');

test('制作ノートは6本以上あり，slugと図の種類が重複しない', () => {
  assert.equal(NOTES_PATH, '/notes');
  assert.ok(NOTES.length >= 6);
  assert.equal(new Set(NOTES.map(note => note.slug)).size, NOTES.length);
  assert.equal(new Set(NOTES.map(note => note.figure)).size, NOTES.length);
  assert.deepEqual(Object.keys(NOTE_CONTENT).sort(), NOTES.map(note => note.slug).sort());
  for (const note of NOTES) assert.match(note.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

test('日付は確認元を持ち，年月または実在する年月日の形式になる', () => {
  for (const note of NOTES) {
    assert.match(note.date, /^\d{4}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/);
    if (note.date.length === 10) assert.equal(new Date(note.date).toISOString().slice(0, 10), note.date);
    assert.ok(note.sources.includes(note.dateSource), `${note.slug}の日付の出典`);
  }
});

test('すべての記事に根拠があり，列挙したファイルが実在する', async () => {
  for (const note of NOTES) {
    assert.ok(note.sources.length > 0);
    assert.equal(new Set(note.sources).size, note.sources.length);
    for (const source of note.sources) {
      assert.ok(!source.startsWith('/') && !source.split('/').includes('..'));
      await access(new URL(`../${source}`, import.meta.url));
    }
  }
});

test('タグ・読了目安・作品への導線がすべての記事にある', () => {
  for (const note of NOTES) {
    assert.ok(note.title.trim() && note.summary.trim());
    assert.ok(note.tags.length >= 2);
    assert.equal(new Set(note.tags).size, note.tags.length);
    for (const tag of note.tags) assert.ok(tag.trim() === tag && tag.length > 0);
    assert.ok(Number.isInteger(note.readingMinutes) && note.readingMinutes > 0);
    assert.ok(note.productHref.startsWith('/') && note.productHref.endsWith('/'));
    assert.match(note.repository, /^https:\/\/github\.com\/HR0101\/[A-Za-z0-9_-]+$/);
  }
});

test('すべての本文に課題・制約・判断・確かめたことがあり，コード抜粋は実ファイルと一致する', async () => {
  for (const note of NOTES) {
    const content = NOTE_CONTENT[note.slug];
    for (const section of ['problem', 'constraints', 'decision', 'verified']) {
      assert.ok(content[section].length > 0, `${note.slug}の${section}`);
      for (const paragraph of content[section]) assert.ok(paragraph.trim().length > 0);
    }
    if (content.snippet) {
      assert.ok(note.sources.includes(content.snippet.source));
      const source = await readFile(new URL(`../${content.snippet.source}`, import.meta.url), 'utf8');
      assert.ok(source.includes(content.snippet.code), `${note.slug}の抜粋が原文と一致する`);
    }
  }
});
