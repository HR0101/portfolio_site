import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/motionFoundation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { HEADING_MOTION, NAV_MOTION, headingTiming, navLinkDelay, revealDelay, decaySkew } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('長い見出しも600ms以内で完了し，説明はタイトルの60%から重なる', () => {
  for (const count of [0, 1, 2, 6, 32, 64, 1000]) {
    const timing = headingTiming(count);
    assert.ok(timing.titleDurationMs <= 600);
    assert.ok(timing.stepMs <= HEADING_MOTION.characterStepMs);
    assert.equal(timing.descriptionDelayMs, HEADING_MOTION.titleMs + timing.titleDurationMs * 0.6);
    assert.ok(timing.lastCharacterIndex <= 31);
  }
  assert.ok(HEADING_MOTION.labelMs < HEADING_MOTION.lineMs);
  assert.ok(HEADING_MOTION.lineMs < HEADING_MOTION.titleMs);
});

test('ナビの段階表示は25msずつ，8件目以降は175msで止まる', () => {
  assert.equal(navLinkDelay(0), 0);
  assert.equal(navLinkDelay(3), 75);
  assert.equal(navLinkDelay(7), 175);
  assert.equal(navLinkDelay(100), 175);
  assert.equal(NAV_MOTION.openIntentMs, 80);
  assert.equal(NAV_MOTION.closeIntentMs, 120);
});

test('Revealは既存カードの遅れを保ち，上限と不正入力を処理する', () => {
  assert.equal(revealDelay(100, true), 140);
  assert.equal(revealDelay(1000, true), 420);
  assert.equal(revealDelay(1000, false), 480);
  for (const value of [-1, Number.NaN, Infinity]) {
    assert.equal(revealDelay(value, false), 0);
    assert.equal(navLinkDelay(value), 0);
    assert.ok(Number.isFinite(headingTiming(value).stepMs));
  }
});

test('マーキーの戻りはフレームレートによらず同じ時間で減衰する', () => {
  const at60fps = decaySkew(decaySkew(12, 1000 / 60), 1000 / 60);
  const at30fps = decaySkew(12, 1000 / 30);
  assert.ok(Math.abs(at60fps - at30fps) < 1e-10);
  assert.equal(decaySkew(-12, 0), -12);
  assert.ok(decaySkew(-12, 100) > -12);
  assert.ok(decaySkew(12, 100) < 12);
});
