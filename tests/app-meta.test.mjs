import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

async function loadPure(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

const { getAppMeta } = await loadPure('../src/lib/appMeta.ts');
const { PUBLIC_REPOSITORY_NAMES } = await loadPure('../src/data/publicRepos.ts');
const sourceRepos = JSON.parse(await readFile(new URL('../docs/references/source-readmes/public-repos.json', import.meta.url), 'utf8'));
const appSource = await readFile(new URL('../src/data/apps.ts', import.meta.url), 'utf8');
const compiledApps = ts.transpileModule(appSource, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const appModule = { exports: {} };
new Function('require', 'module', 'exports', compiledApps)(createRequire(import.meta.url), appModule, appModule.exports);
const { SWIFT_APPS } = appModule.exports;

test('公開名の配列は調査済み JSON の名前だけを過不足なく写す', () => {
  assert.deepEqual(PUBLIC_REPOSITORY_NAMES, sourceRepos.map(repo => repo.name));
});

test('OS・時期・個人開発を返し，公開名は大文字小文字を区別しない', () => {
  const app = { platform: 'macos', year: '2025 – 2026', repositories: [{ name: 'SubGhost' }] };
  assert.deepEqual(getAppMeta(app, ['subghost']), {
    platform: 'macos', year: '2025 – 2026', role: '個人開発', sourceStatus: 'GitHub でソースコード公開',
  });
});

test('不一致・部分一致・空の参照は公開扱いにしない', () => {
  const base = { platform: 'ios', year: '2026' };
  for (const repositories of [[], [{ name: 'OldName' }], [{ name: 'Name' }], [{ name: 'subghost' }, { name: 'OldName' }]]) {
    assert.equal(getAppMeta({ ...base, repositories }, ['subghost', 'NewName', 'NameExtra']).sourceStatus, null);
  }
});

test('17作品のリポジトリ名を公開一覧と照合し，すべてに公開状態を表示できる', () => {
  assert.equal(SWIFT_APPS.length, 17);
  const unconfirmed = SWIFT_APPS.filter(app => !getAppMeta(app, PUBLIC_REPOSITORY_NAMES).sourceStatus);
  // 旧名のままのリポジトリが残ると，ここで検出される（Ark Server は ArkServer に改名済み）
  assert.deepEqual(unconfirmed.map(app => app.name), []);
  for (const app of SWIFT_APPS) {
    assert.equal(getAppMeta(app, PUBLIC_REPOSITORY_NAMES).year, app.year);
    assert.equal(getAppMeta(app, PUBLIC_REPOSITORY_NAMES).role, '個人開発');
  }
});

test('判定は入力の作品と公開名を変更しない', () => {
  const app = Object.freeze({ platform: 'both', year: '2026', repositories: Object.freeze([Object.freeze({ name: 'subghost' })]) });
  const names = Object.freeze(['SubGhost']);
  assert.deepEqual(getAppMeta(app, names), getAppMeta(app, names));
});
