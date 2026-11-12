import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/recordingPlayback.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { recordingHoldMs, getRecordingPolicy, getRemainingRecordingHold } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const base = { pinned: true, open: true, inView: true, hidden: false, reduced: false, intent: 'auto' };

test('壁の開いたパネルだけが画面内で自動再生される', () => {
  assert.deepEqual(getRecordingPolicy(base), { shouldPlay: true, shouldReset: false });
  assert.deepEqual(getRecordingPolicy({ ...base, open: false }), { shouldPlay: false, shouldReset: true });
  for (const change of [{ inView: false }, { hidden: true }, { reduced: true }, { intent: 'pause' }]) {
    assert.equal(getRecordingPolicy({ ...base, ...change }).shouldPlay, false);
  }
  assert.equal(recordingHoldMs, 5000);
});

test('一覧と動きを減らす設定では明示した再生だけを許す', () => {
  for (const reduced of [false, true]) {
    const grid = { ...base, pinned: false, open: false, reduced };
    assert.deepEqual(getRecordingPolicy(grid), { shouldPlay: false, shouldReset: false });
    assert.equal(getRecordingPolicy({ ...grid, intent: 'play' }).shouldPlay, true);
    assert.equal(getRecordingPolicy({ ...base, reduced, intent: 'play' }).shouldPlay, true);
  }
});

test('手動再生でも閉じたパネル・画面外・非表示タブでは進めない', () => {
  for (const change of [{ open: false }, { inView: false }, { hidden: true }]) {
    assert.equal(getRecordingPolicy({ ...base, intent: 'play', ...change }).shouldPlay, false);
  }
  for (const hidden of [false, true]) {
    for (const inView of [false, true]) {
      assert.equal(getRecordingPolicy({ ...base, pinned: false, intent: 'play', hidden, inView }).shouldPlay, !hidden && inView);
    }
  }
});

test('静止時間は表示中に経過した分だけ減り，0を下回らない', () => {
  const remaining = getRemainingRecordingHold(recordingHoldMs, 1800);
  assert.equal(remaining, 3200);
  assert.equal(getRemainingRecordingHold(remaining, 0), 3200);
  assert.equal(getRemainingRecordingHold(remaining, 3200), 0);
  assert.equal(getRemainingRecordingHold(remaining, 6000), 0);
  assert.equal(getRemainingRecordingHold(remaining, -10), 3200);
  assert.equal(getRemainingRecordingHold(remaining, NaN), 3200);
  assert.equal(getRemainingRecordingHold(NaN, 0), recordingHoldMs);
});

test('見どころの拡大中は一時停止し，閉じた後は元の再生条件に従う', () => {
  for (const conditions of [base, { ...base, intent: 'pause' }, { ...base, hidden: true }, { ...base, inView: false }, { ...base, open: false }, { ...base, reduced: true }, { ...base, pinned: false }, { ...base, pinned: false, intent: 'play' }]) {
    assert.equal(getRecordingPolicy({ ...conditions, suspended: true }).shouldPlay, false);
    assert.equal(getRecordingPolicy({ ...conditions, suspended: true }).shouldReset, getRecordingPolicy(conditions).shouldReset);
    assert.deepEqual(getRecordingPolicy({ ...conditions, suspended: false }), getRecordingPolicy(conditions));
  }
});
