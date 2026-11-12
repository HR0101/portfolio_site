import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/hubRoutes.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { hubRoutes, hubDestination, hubPhaseStarts, hubManualTimes, hubCycleMs, hubManualMoveMs, getHubPoint, getHubFrame, getHubStationLabel, getHubMotionFrames, getHubInterruptedProgress } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('全経路で出発点・中点・集合点が図の二次曲線に一致する', () => {
  for (const route of hubRoutes) {
    assert.deepEqual(getHubPoint(route, 0), route.start);
    assert.equal(getHubStationLabel(route).x, route.start.x);
    assert.ok(getHubStationLabel(route).y < route.start.y);
    assert.deepEqual(getHubPoint(route, 1), { x: hubDestination.x, y: hubDestination.y });
    assert.deepEqual(getHubPoint(route, 0.5), {
      x: route.start.x / 4 + route.control.x / 2 + hubDestination.x / 4,
      y: route.start.y / 4 + route.control.y / 2 + hubDestination.y / 4,
    });
    for (const invalid of [-1, NaN, Infinity]) assert.deepEqual(getHubPoint(route, invalid), route.start);
    assert.deepEqual(getHubPoint(route, 2), getHubPoint(route, 1));
  }
});

test('出発2秒・移動4.5秒・結果5.5秒の12秒周期になる', () => {
  assert.equal(hubCycleMs, 12000);
  assert.deepEqual(hubPhaseStarts, [0, 2000, 6500]);
  for (const [time, phase, progress] of [[0, 0, 0], [1999, 0, 0], [2000, 1, 0], [4250, 1, 0.5], [6500, 2, 1], [11999, 2, 1], [12000, 0, 0]]) {
    assert.deepEqual(getHubFrame(time), { phase, progress });
    assert.deepEqual(getHubFrame(time + hubCycleMs * 3), { phase, progress });
  }
  hubManualTimes.forEach((time, phase) => assert.equal(getHubFrame(time).phase, phase));
});

test('移動区間は単調に進み，不正な時間は出発へ戻る', () => {
  let previous = 0;
  for (let time = 2000; time <= 6500; time += 50) {
    const { progress } = getHubFrame(time);
    assert.ok(progress >= previous && progress <= 1);
    previous = progress;
  }
  for (const time of [-1, NaN, Infinity, -Infinity]) assert.deepEqual(getHubFrame(time), { phase: 0, progress: 0 });
});

test('手動移動は400msで，途中の点も曲線をたどり，戻ると同じ経路になる', () => {
  assert.equal(hubManualMoveMs, 400);
  for (const route of hubRoutes) {
    const forward = getHubMotionFrames(route, 0, 1);
    const backward = getHubMotionFrames(route, 1, 0);
    assert.deepEqual(backward, [...forward].reverse());
    forward.forEach((frame, index) => {
      const point = getHubPoint(route, index / (forward.length - 1));
      assert.equal(frame.transform, `translate(${point.x}px, ${point.y}px)`);
    });
  }
});

test('連打で取り消した移動は，イージング適用後の現在位置を次の開始点にする', () => {
  const interrupted = getHubInterruptedProgress(0.2, 1, 0.5);
  assert.ok(Math.abs(interrupted - 0.6) < 1e-9);
  assert.equal(getHubInterruptedProgress(interrupted, 0, 0), interrupted);
  assert.equal(getHubInterruptedProgress(interrupted, 0, 1), 0);
  assert.equal(getHubInterruptedProgress(0.2, 1, null), 0.2);
  assert.equal(getHubInterruptedProgress(0.2, 1, -1), 0.2);
  assert.equal(getHubInterruptedProgress(0.2, 1, 2), 1);
  assert.equal(getHubInterruptedProgress(0.2, 1, NaN), 0.2);
});
