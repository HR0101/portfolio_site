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

const { findAppsByCapability } = await loadPure('../src/lib/capabilities.ts');
const { CAPABILITIES } = await loadPure('../src/data/capabilities.ts');
const appSource = await readFile(new URL('../src/data/apps.ts', import.meta.url), 'utf8');
const compiledApps = ts.transpileModule(appSource, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const appModule = { exports: {} };
new Function('require', 'module', 'exports', compiledApps)(createRequire(import.meta.url), appModule, appModule.exports);
const { SWIFT_APPS, OTHER_APPS } = appModule.exports;
const find = id => findAppsByCapability(SWIFT_APPS, CAPABILITIES.find(capability => capability.id === id));

test('索引の全根拠語が実際のタグか説明にあり，0件の項目がない', () => {
  assert.equal(SWIFT_APPS.length, 17);
  assert.equal(new Set(CAPABILITIES.map(capability => capability.id)).size, CAPABILITIES.length);
  for (const capability of CAPABILITIES) {
    assert.ok(capability.match.length > 0);
    for (const term of capability.match) {
      assert.ok(term.trim());
      assert.ok(SWIFT_APPS.some(app => [...app.tags, app.description].some(text => text.toLowerCase().includes(term.toLowerCase()))), `${capability.id}: ${term}`);
    }
    assert.ok(findAppsByCapability(SWIFT_APPS, capability).length > 0, capability.id);
  }
});

test('具体的な機能はその根拠を持つ作品へつながる', () => {
  for (const id of ['widgets', 'live-activity', 'app-intents']) assert.deepEqual(find(id).map(app => app.name), ['BusTimeApp']);
  assert.deepEqual(find('pose').map(app => app.name), ['Fomura']);
  assert.deepEqual(find('article').map(app => app.name), ['Tsumugi']);
});

test('壁にない作品も全17本から探し，元の掲載順を保つ', () => {
  assert.deepEqual(find('local-network').map(app => app.name), ['Ark Server × VideoPlayer', 'TeleDeck', 'Glance × GlanceHost', 'WiFiKeyboard']);
  assert.deepEqual(find('screen-sharing').map(app => app.name), ['Glance × GlanceHost']);
  assert.deepEqual(find('menu-bar').map(app => app.name), ['MenuDock', 'BarPocket']);
  assert.ok(find('screen-sharing').every(app => OTHER_APPS.includes(app)));
});

test('タグ・説明・キャッチコピーだけを照合し，名前だけの一致を根拠にしない', () => {
  // 以下は照合範囲を確かめるためだけの架空の作品．
  const apps = [
    { name: 'LAN', tags: [], description: '', tagline: '' },
    { name: 'タグ', tags: ['lan'], description: '', tagline: '' },
    { name: '説明', tags: [], description: 'LAN 経由', tagline: '' },
    { name: '見出し', tags: [], description: '', tagline: 'LAN 接続' },
  ];
  assert.deepEqual(findAppsByCapability(apps, { match: ['LAN'] }).map(app => app.name), ['タグ', '説明', '見出し']);
  assert.deepEqual(findAppsByCapability(apps, { match: ['', ' '] }), []);
  assert.deepEqual(findAppsByCapability(apps, { match: ['見つからない語'] }), []);
  assert.deepEqual(findAppsByCapability([], { match: ['LAN'] }), []);
});

test('複数の根拠で一致しても重複せず，入力を変更しない', () => {
  const apps = Object.freeze([Object.freeze({ tags: Object.freeze(['LAN', 'Bonjour']), description: 'LAN', tagline: 'Bonjour' })]);
  const capability = Object.freeze({ match: Object.freeze(['LAN', 'Bonjour']) });
  assert.deepEqual(findAppsByCapability(apps, capability), [apps[0]]);
  assert.equal(findAppsByCapability(apps, capability)[0], apps[0]);
});
