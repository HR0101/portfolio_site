import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

// ページ遷移の「押した画面が育って紹介ページになる」動き（transitionEffects.ts）の時間配分と判定の単体テスト．
// DOM を使わない純粋な関数だけを確かめる
const source = await readFile(new URL('../src/lib/transitionEffects.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const {
  PRODUCT_MORPH_DURATION_MS, PRODUCT_MORPH_EASING, viewportTiming, viewportFrames, isOpaqueColor, isTransparentColor,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('主役の画面が育つ時間は 420〜520ms で，曲線は design-tokens.css の --ease-in-out と同じ', async () => {
  assert.ok(PRODUCT_MORPH_DURATION_MS >= 420 && PRODUCT_MORPH_DURATION_MS <= 520);
  const tokens = await readFile(new URL('../src/app/design-tokens.css', import.meta.url), 'utf8');
  assert.match(tokens, new RegExp(`--ease-in-out:\\s*${PRODUCT_MORPH_EASING.replace(/[().]/g, '\\$&')}`));
  // CSS 側（group の UA アニメーション）の時間も同じ値にそろっている
  const motion = await readFile(new URL('../src/app/motion.css', import.meta.url), 'utf8');
  assert.match(motion, new RegExp(`--morph-duration:\\s*${PRODUCT_MORPH_DURATION_MS}ms`));
});

test('紹介ページへ移るとき，古い面は主役の前半で短く退き，新しい面は主役が着くころに現れる', () => {
  const out = viewportTiming('shared', false);
  const enter = viewportTiming('shared', true);
  assert.ok(out.duration <= 200 && out.delay === 0);
  assert.ok(out.duration <= PRODUCT_MORPH_DURATION_MS / 2);
  // 新しい面は，古い面が退いたあと・主役が着き終わる前に出始め，主役が着いてまもなく出きる
  assert.ok(enter.delay >= out.duration && enter.delay < PRODUCT_MORPH_DURATION_MS);
  assert.ok(enter.delay + enter.duration > PRODUCT_MORPH_DURATION_MS);
  assert.ok(enter.delay + enter.duration <= PRODUCT_MORPH_DURATION_MS * 1.5);
  // 規約：登場・退場は ease-out．ease-in は使わない
  for (const timing of [out, enter]) assert.ok(!/ease-in(?!-out)/.test(timing.easing));
});

test('主役以外の面の動き：古い面は少し縮んで薄れ，新しい面は下から現れる', () => {
  const [outFrom, outTo] = viewportFrames('shared', false);
  assert.equal(outFrom.opacity, 1);
  assert.equal(outTo.opacity, 0);
  assert.equal(outTo.transform, 'scale(0.98)');
  const [enterFrom, enterTo] = viewportFrames('shared', true);
  assert.equal(enterFrom.opacity, 0);
  assert.match(enterFrom.transform, /^translateY\(/);
  assert.equal(enterTo.opacity, 1);
  assert.equal(enterTo.transform, 'none');
});

test('ほかの遷移（fade・slide・scale・wipe・morph）の時間配分は変わらない', () => {
  assert.deepEqual(viewportTiming('fade', true), { duration: 900, delay: 90, easing: 'cubic-bezier(.22, 1, .36, 1)' });
  assert.deepEqual(viewportTiming('wipe', true), { duration: 1050, delay: 150, easing: 'cubic-bezier(.22, 1, .36, 1)' });
  assert.deepEqual(viewportTiming('scale', true), { duration: 1050, delay: 90, easing: 'cubic-bezier(.22, 1, .36, 1)' });
  assert.deepEqual(viewportTiming('morph', false), { duration: 540, delay: 0, easing: 'cubic-bezier(.22, 1, .36, 1)' });
});

test('背景色の判定：rgb は不透明（成分をアルファと取り違えない），透明は不透明でない', () => {
  assert.equal(isOpaqueColor('rgb(255, 255, 255)'), true);
  assert.equal(isOpaqueColor('rgb(0, 0, 0)'), true);
  assert.equal(isOpaqueColor('rgba(0, 0, 0, 0)'), false);
  assert.equal(isOpaqueColor('rgba(255, 255, 255, 0.8)'), false);
  assert.equal(isOpaqueColor('rgba(10, 20, 30, 1)'), true);
  assert.equal(isOpaqueColor('rgb(0 0 0 / 50%)'), false);
  assert.equal(isOpaqueColor('rgb(0 0 0 / 100%)'), true);
  assert.equal(isOpaqueColor('transparent'), false);
  assert.equal(isOpaqueColor(''), false);
  assert.equal(isTransparentColor('rgba(0, 0, 0, 0)'), true);
  assert.equal(isTransparentColor('transparent'), true);
  assert.equal(isTransparentColor('rgb(255, 255, 255)'), false);
  assert.equal(isTransparentColor('rgba(255, 255, 255, 0.5)'), false);
});
