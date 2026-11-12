import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/nextProduct.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { getNextReason } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('共通タグは掲載順で一つ選び，OS の違いより先に理由にする', () => {
  assert.equal(getNextReason({ tags: ['SwiftUI', 'Bonjour'], platform: 'macos' }, { tags: ['Bonjour', 'swiftui'], platform: 'ios' }), 'どちらも SwiftUI を使っています');
  assert.equal(getNextReason({ tags: [' ', 'AVFoundation'] }, { tags: [' ', 'AVFoundation'] }), 'どちらも AVFoundation を使っています');
});

test('共通タグがなければ次の OS を案内する', () => {
  assert.equal(getNextReason({ tags: [], platform: 'ios' }, { tags: [], platform: 'macos' }), '次は Mac のアプリです');
  assert.equal(getNextReason({ tags: [], platform: 'macos' }, { tags: [], platform: 'ios' }), '次は iPhone のアプリです');
  assert.equal(getNextReason({ tags: [], platform: 'both' }, { tags: [], platform: 'ios' }), '次は iPhone のアプリです');
});

test('Web の作品はデータの種別を根拠に案内する', () => {
  assert.equal(getNextReason({ tags: ['TypeScript'] }, { tags: ['TypeScript'], kind: 'web' }), '次は Web サービスです');
});

test('共通語や案内できる違いがなければ理由を作らない', () => {
  assert.equal(getNextReason({ tags: ['Swift'], platform: 'ios' }, { tags: ['SwiftUI'], platform: 'ios' }), null);
  assert.equal(getNextReason({ tags: [], platform: 'macos' }, { tags: [], platform: 'both' }), null);
  assert.equal(getNextReason({ tags: [] }, { tags: [], kind: 'game' }), null);
});

test('実データの次の作品の関係を説明し，カタログの順序を変更しない', async () => {
  const require = createRequire(import.meta.url);
  const loadData = async path => {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', compiled)(require, module, module.exports);
    return module.exports;
  };
  const { SWIFT_APPS } = await loadData('../src/data/apps.ts');
  const { WEB_WORKS } = await loadData('../src/data/works.ts');
  const pages = [...SWIFT_APPS, ...WEB_WORKS].filter(product => product.detailHref);
  assert.deepEqual(pages.map(product => product.detailHref), ['/apps/subghost', '/apps/bustimeapp', '/apps/arkserver', '/apps/tsumugi', '/apps/ekihub']);
  const before = JSON.stringify(pages);
  const reasons = pages.map((product, index) => getNextReason(product, pages[(index + 1) % pages.length]));
  assert.deepEqual(reasons, ['どちらも SwiftUI を使っています', 'どちらも SwiftUI を使っています', 'どちらも SwiftUI を使っています', '次は Web サービスです', '次は Mac のアプリです']);
  assert.equal(JSON.stringify(pages), before);
});
