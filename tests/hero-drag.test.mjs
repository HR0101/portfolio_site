import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/heroDrag.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { createHeroDragRotation, setHeroDragRotation, stepHeroDragReturn, resetHeroDragRotation }
  = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('大きくドラッグしても角度を制限し、操作中は復元力で指示位置を動かさない', () => {
  const state = createHeroDragRotation();
  setHeroDragRotation(state, 100, -100);
  assert.equal(state.pitch, 0.55);
  assert.equal(state.yaw, -1.1);
  const held = { ...state };
  assert.equal(stepHeroDragReturn(state, 1 / 60), false);
  assert.deepEqual(state, held);
});

test('離すと有限の角度を保ちながら元の向きへ収束し、描画を停止できる', () => {
  const state = createHeroDragRotation();
  setHeroDragRotation(state, 0.55, 1.1);
  state.active = false;
  let moving = true;
  for (let frame = 0; frame < 360 && moving; frame++) {
    moving = stepHeroDragReturn(state, 1 / 60);
    assert.ok(Number.isFinite(state.pitch) && Number.isFinite(state.yaw));
    assert.ok(Math.abs(state.pitch) <= 0.55 && Math.abs(state.yaw) <= 1.1);
  }
  assert.equal(moving, false);
  assert.deepEqual(state, createHeroDragRotation());
});

test('復元途中でつかみ直しても角度が飛ばず、その位置から再操作できる', () => {
  const state = createHeroDragRotation();
  setHeroDragRotation(state, 0.4, 0.9);
  state.active = false;
  for (let frame = 0; frame < 8; frame++) stepHeroDragReturn(state, 1 / 60);
  const { pitch, yaw } = state;
  setHeroDragRotation(state, pitch, yaw);
  assert.equal(state.pitch, pitch);
  assert.equal(state.yaw, yaw);
  assert.equal(state.pitchVelocity, 0);
  assert.equal(state.yawVelocity, 0);
  setHeroDragRotation(state, pitch - 0.1, yaw + 0.1);
  assert.ok(Math.abs(state.pitch - (pitch - 0.1)) < 1e-12);
  assert.ok(Math.abs(state.yaw - (yaw + 0.1)) < 1e-12);
});

test('60Hzと120Hzで同じ時間後の復元角度が一致する', () => {
  const run = hz => {
    const state = createHeroDragRotation();
    setHeroDragRotation(state, -0.5, 1);
    state.active = false;
    for (let frame = 0; frame < hz / 2; frame++) stepHeroDragReturn(state, 1 / hz);
    return state;
  };
  const slow = run(60), fast = run(120);
  assert.ok(Math.hypot(slow.pitch - fast.pitch, slow.yaw - fast.yaw) < 0.00001);
});

test('非表示・操作中断時は角度と速度を即座にリセットする', () => {
  const state = createHeroDragRotation();
  setHeroDragRotation(state, 0.4, -0.9);
  resetHeroDragRotation(state);
  assert.deepEqual(state, createHeroDragRotation());
  assert.equal(stepHeroDragReturn(state, 1 / 60), false);
});
