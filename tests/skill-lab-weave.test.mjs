import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/skillLab/weave.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { getWeaveFrame, weaveCycleMs, weavePhaseStarts, weaveManualTimes, weaveFragments } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('到着→集合→織り→完成が12秒周期で進み，完成を4秒保つ', () => {
  assert.equal(weaveCycleMs, 12000);
  for (const [time, phase] of [[0, 0], [2499, 0], [2500, 1], [4499, 1], [4500, 2], [7999, 2], [8000, 3], [11999, 3], [12000, 0]]) {
    assert.equal(getWeaveFrame(time).phase, phase);
  }
  assert.equal(weaveCycleMs - weavePhaseStarts[3], 4000);
  weaveManualTimes.forEach((time, phase) => assert.equal(getWeaveFrame(time).phase, phase));
  for (let time = 8000; time < 12000; time += 100) {
    const { gather, threads, card } = getWeaveFrame(time);
    assert.deepEqual({ gather, threads, card }, { gather: 1, threads: 1, card: 1 });
    const frame = getWeaveFrame(time);
    assert.ok(frame.fragments.every(fragment => fragment.opacity === 0));
    assert.ok([...frame.warp, ...frame.weft].every(amount => amount === 1));
  }
});

test('断片の到着と集合は決められた席に収まり，糸の前に集合が完了する', () => {
  assert.ok(getWeaveFrame(0).fragments.every(fragment => fragment.opacity === 0));
  const grouped = getWeaveFrame(4500);
  grouped.fragments.forEach((fragment, index) => {
    assert.equal(fragment.x, weaveFragments[index].to[0]);
    assert.equal(fragment.y, weaveFragments[index].to[1]);
    assert.equal(fragment.opacity, 1);
  });
  assert.ok([...grouped.warp, ...grouped.weft].every(amount => amount === 0));
});

test('集合と糸の進捗は0〜1で単調に進む', () => {
  let previous = { gather: 0, threads: 0 };
  for (let time = 0; time < weaveCycleMs; time += 50) {
    const frame = getWeaveFrame(time);
    assert.ok(frame.gather >= previous.gather && frame.gather <= 1);
    assert.ok(frame.threads >= previous.threads && frame.threads <= 1);
    previous = frame;
  }
});

test('同じ時間は決定論的で，複数周・不正な時刻でも安定する', () => {
  for (const time of [0, 2500, 4500, 6500, 8000, 11999]) assert.deepEqual(getWeaveFrame(time), getWeaveFrame(time + weaveCycleMs * 10));
  for (const time of [-1, NaN, Infinity, -Infinity]) assert.deepEqual(getWeaveFrame(time), getWeaveFrame(0));
});
