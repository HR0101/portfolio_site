import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/animations/spring.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { springFromResponse, stepSpring, isSpringAtRest, MAX_SUBSTEP_SEC } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const FRAME_SEC = 1 / 60;

// 一定のフレーム間隔で，止まるまで進める．各フレームの状態を返す
function simulate(state, target, config, { seconds = 4, dt = FRAME_SEC } = {}) {
  const frames = [state];
  for (let elapsed = 0; elapsed < seconds; elapsed += dt) {
    state = stepSpring(state, target, config, dt);
    frames.push(state);
  }
  return frames;
}

test('応答時間から，剛性 k = (2π/T)² と減衰 c = 2ζ√k を求める', () => {
  const config = springFromResponse(0.4);
  assert.ok(Math.abs(config.stiffness - (2 * Math.PI / 0.4) ** 2) < 1e-9);
  assert.ok(Math.abs(config.stiffness - 246.74) < 0.01);
  assert.ok(Math.abs(config.damping - 2 * Math.sqrt(config.stiffness)) < 1e-9);
  assert.ok(Math.abs(config.damping - 31.4) < 0.05);
  const loose = springFromResponse(0.42, 0.85);
  assert.ok(Math.abs(loose.damping - 2 * 0.85 * Math.sqrt(loose.stiffness)) < 1e-9);
});

test('不正な入力では既定値へ倒れ，例外にならない', () => {
  assert.deepEqual(springFromResponse(Number.NaN), springFromResponse(0.4));
  assert.deepEqual(springFromResponse(-1), springFromResponse(0.4));
  assert.deepEqual(springFromResponse(0.4, Number.NaN), springFromResponse(0.4, 1));
  const config = springFromResponse(0.4);
  assert.deepEqual(stepSpring({ value: 1, velocity: 2 }, 0, config, 0), { value: 1, velocity: 2 });
  assert.deepEqual(stepSpring({ value: 1, velocity: 2 }, 0, config, Number.NaN), { value: 1, velocity: 2 });
  assert.deepEqual(stepSpring({ value: Number.NaN, velocity: 0 }, 3, config, FRAME_SEC), { value: 3, velocity: 0 });
});

test('臨界減衰のばねは，目標を行き過ぎずに近づく', () => {
  const frames = simulate({ value: 0, velocity: 0 }, 1, springFromResponse(0.4, 1));
  for (const frame of frames) assert.ok(frame.value <= 1 + 1e-12, `行き過ぎた: ${frame.value}`);
  // 単調に増える
  for (let index = 1; index < frames.length; index++) assert.ok(frames[index].value >= frames[index - 1].value - 1e-12);
  assert.ok(isSpringAtRest(frames.at(-1), 1));
});

test('下向きの目標でも行き過ぎない（初速がある場合は目標へ向かって減速する）', () => {
  const frames = simulate({ value: 1, velocity: 0 }, 0, springFromResponse(0.4, 1));
  for (const frame of frames) assert.ok(frame.value >= -1e-12, `行き過ぎた: ${frame.value}`);
});

test('減衰比 0.85 は少し行き過ぎてから収まる．減衰比 2 は行き過ぎない', () => {
  const loose = simulate({ value: 0, velocity: 0 }, 1, springFromResponse(0.42, 0.85));
  const peak = Math.max(...loose.map(frame => frame.value));
  assert.ok(peak > 1 && peak < 1.02, `行き過ぎの大きさ: ${peak}`);
  assert.ok(isSpringAtRest(loose.at(-1), 1));
  const heavy = simulate({ value: 0, velocity: 0 }, 1, springFromResponse(0.4, 2));
  assert.ok(Math.max(...heavy.map(frame => frame.value)) <= 1 + 1e-12);
  assert.ok(isSpringAtRest(heavy.at(-1), 1, { position: 0.01, velocity: 0.1 }));
});

test('途中で目標を変えても，値と速度は途切れずに続く', () => {
  const config = springFromResponse(0.4, 1);
  let state = { value: 0, velocity: 0 };
  for (let index = 0; index < 12; index++) state = stepSpring(state, 1, config, FRAME_SEC);
  assert.ok(state.velocity > 0);
  // 目標を 0 へ戻した直後の 1 ステップでは，値も速度も，直前の状態から微小にしか動かない
  const next = stepSpring(state, 0, config, 0.001);
  assert.ok(Math.abs(next.value - state.value) < 0.01);
  assert.ok(Math.abs(next.velocity - state.velocity) < 0.5);
  // そのまま逆向きに進み，0 へ収まる．途中で 0 を下回らない
  const frames = simulate(next, 0, config);
  for (const frame of frames) assert.ok(frame.value >= -1e-9, `行き過ぎた: ${frame.value}`);
  assert.ok(isSpringAtRest(frames.at(-1), 0));
});

test('フレームの刻みが違っても，同じ時間なら同じ結果になる（解析解で進めるため）', () => {
  const config = springFromResponse(0.28, 1);
  const start = { value: 0, velocity: 0 };
  const coarse = stepSpring(start, 100, config, 0.2);
  let fine = start;
  for (let index = 0; index < 200; index++) fine = stepSpring(fine, 100, config, 0.001);
  assert.ok(Math.abs(coarse.value - fine.value) < 1e-6);
  assert.ok(Math.abs(coarse.velocity - fine.velocity) < 1e-5);
  // 1 区間が 8ms を超える長いフレームも，分割して進むので発散しない
  assert.ok(MAX_SUBSTEP_SEC <= 0.008);
  const long = stepSpring(start, 100, config, 5);
  assert.ok(Math.abs(long.value - 100) < 1e-6);
});

test('停止条件は，目標との差 0.001 未満かつ速さ 0.01 未満', () => {
  assert.equal(isSpringAtRest({ value: 0.9995, velocity: 0.005 }, 1), true);
  assert.equal(isSpringAtRest({ value: 0.998, velocity: 0 }, 1), false);
  assert.equal(isSpringAtRest({ value: 1, velocity: 0.02 }, 1), false);
  assert.equal(isSpringAtRest({ value: 0.99, velocity: 0.3 }, 1, { position: 0.05, velocity: 0.5 }), true);
});

test('進みの応答時間 0.4 秒では，約 1 秒で停止条件に達する', () => {
  const frames = simulate({ value: 0, velocity: 0 }, 1, springFromResponse(0.4, 1), { seconds: 2 });
  const restIndex = frames.findIndex(frame => isSpringAtRest(frame, 1));
  assert.ok(restIndex > 0);
  assert.ok(restIndex * FRAME_SEC < 1.6, `停止まで ${restIndex * FRAME_SEC} 秒`);
});
