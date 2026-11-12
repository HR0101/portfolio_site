import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/busProcess.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { busPhaseStarts, busCycleMs, busRepresentativePhase, getBusFrame } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('入力・判断・結果が順に進み，結果は5秒間静止する', () => {
  assert.deepEqual(busPhaseStarts, [0, 2500, 5000]);
  assert.equal(busCycleMs, 10000);
  for (const [time, phase] of [[0, 0], [2499, 0], [2500, 1], [4999, 1], [5000, 2], [9999, 2]]) {
    assert.equal(getBusFrame(time).phase, phase);
  }
  assert.equal(busCycleMs - busPhaseStarts[busRepresentativePhase], 5000);
});

test('周回の継ぎ目と複数周の同じ時刻は同じ工程になる', () => {
  assert.deepEqual(getBusFrame(busCycleMs), getBusFrame(0));
  for (const time of [0, 2500, 5000, 9999]) {
    assert.deepEqual(getBusFrame(busCycleMs * 5 + time), getBusFrame(time));
  }
});

test('負の時間と不正な時間は入力工程に戻す', () => {
  for (const time of [-1, NaN, Infinity, -Infinity]) assert.deepEqual(getBusFrame(time), { phase: 0, time: 0 });
});

const clockSource = await readFile(new URL('../src/lib/exhibitClock.ts', import.meta.url), 'utf8');
const clockCompiled = ts.transpileModule(clockSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { advanceExhibitClock } = await import(`data:text/javascript;base64,${Buffer.from(clockCompiled).toString('base64')}`);

test('再開直後は非表示だった時間を消化せず，次のフレームから経過時間を加算する', () => {
  const resumed = advanceExhibitClock(4000, 90000, null);
  assert.equal(resumed, 4000);
  assert.equal(advanceExhibitClock(resumed, 90016, 90000), 4016);
  assert.equal(advanceExhibitClock(resumed, 90000, 90016), 4000);
  assert.equal(advanceExhibitClock(resumed, NaN, 90016), 4000);
  assert.equal(advanceExhibitClock(NaN, 90000, null), 0);
});
