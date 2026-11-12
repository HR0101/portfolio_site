import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/animations/scrollBend.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const {
  BEND_MAX_SKEW_DEG,
  BEND_MAX_SCALE_Y,
  BEND_SPRING_RESPONSE_SEC,
  BEND_MIN_SAMPLE_MS,
  BEND_MAX_SAMPLE_MS,
  getBendAmount,
  getBendFromAmount,
  getBend,
  stepBendSpring,
  isBendSettled,
  getScrollVelocity,
  toBendTransform,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

// ばねを，一定のフレーム間隔で繰り返し進める
function simulate(initial, target, seconds, frameSec = 1 / 60) {
  const states = [initial];
  let state = initial;
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += frameSec) {
    state = stepBendSpring(state, target, frameSec);
    states.push(state);
  }
  return states;
}

test('速さ 0 のときは，傾きも伸びもない', () => {
  assert.deepEqual(getBend(0), { skewDeg: 0, scaleY: 1 });
  assert.deepEqual(getBend(-0), { skewDeg: 0, scaleY: 1 });
});

test('傾きの向きは進行方向に従い，正負で対称になる', () => {
  const down = getBend(1800);
  const up = getBend(-1800);
  assert.ok(down.skewDeg > 0);
  assert.ok(up.skewDeg < 0);
  assert.equal(down.skewDeg, -up.skewDeg);
  // 伸びは向きによらず同じ
  assert.equal(down.scaleY, up.scaleY);
  assert.ok(down.scaleY > 1);
});

test('速いほど大きく曲がり，どんなに速くても上限を超えない', () => {
  const speeds = [0, 100, 400, 1200, 2400, 6000, 20000, 1e9];
  let previous = getBend(speeds[0]);
  for (const speed of speeds.slice(1)) {
    const current = getBend(speed);
    assert.ok(current.skewDeg > previous.skewDeg, `${speed}px/s で傾きが増えていません`);
    assert.ok(current.scaleY >= previous.scaleY);
    assert.ok(current.skewDeg <= BEND_MAX_SKEW_DEG);
    assert.ok(current.scaleY <= BEND_MAX_SCALE_Y);
    previous = current;
  }
  // 無限大でも上限ちょうどで止まる
  assert.deepEqual(getBend(Infinity), { skewDeg: BEND_MAX_SKEW_DEG, scaleY: BEND_MAX_SCALE_Y });
  assert.deepEqual(getBend(-Infinity), { skewDeg: -BEND_MAX_SKEW_DEG, scaleY: BEND_MAX_SCALE_Y });
  assert.equal(BEND_MAX_SKEW_DEG, 4);
  assert.equal(BEND_MAX_SCALE_Y, 1.04);
});

test('しなり量は -1〜1 に収まり，範囲外や数でない値は安全に倒れる', () => {
  assert.equal(getBendAmount(Number.NaN), 0);
  assert.ok(getBendAmount(1e12) <= 1);
  assert.ok(getBendAmount(-1e12) >= -1);
  assert.deepEqual(getBendFromAmount(Number.NaN), { skewDeg: 0, scaleY: 1 });
  assert.deepEqual(getBendFromAmount(5), { skewDeg: BEND_MAX_SKEW_DEG, scaleY: BEND_MAX_SCALE_Y });
  assert.deepEqual(getBendFromAmount(-5), { skewDeg: -BEND_MAX_SKEW_DEG, scaleY: BEND_MAX_SCALE_Y });
  assert.deepEqual(getBend(Number.NaN), { skewDeg: 0, scaleY: 1 });
});

test('ばねは，目標へ向かって単調に近づき，行き過ぎない', () => {
  const states = simulate({ value: 1, velocity: 0 }, 0, 1.5);
  for (let index = 1; index < states.length; index++) {
    assert.ok(states[index].value <= states[index - 1].value + 1e-12, `${index} 番目で戻りが逆向きです`);
    assert.ok(states[index].value >= 0, `${index} 番目で 0 を行き過ぎています`);
  }
  // 反対側へ向かうときも，目標を超えない
  const reversed = simulate({ value: -0.7, velocity: 0 }, 0.4, 1.5);
  assert.ok(reversed.every((state) => state.value <= 0.4 + 1e-12));
});

test('ばねは応答時間のあいだに，目標との差を 2% 以下まで縮める', () => {
  const states = simulate({ value: 1, velocity: 0 }, 0, BEND_SPRING_RESPONSE_SEC);
  assert.ok(Math.abs(states.at(-1).value) < 0.02, `${states.at(-1).value} が大きすぎます`);
  // 数フレームのうちは，まだ半分以上残っている（急に戻らない）
  assert.ok(states[3].value > 0.5);
});

test('ばねは 1 回の大きなステップでも，細かい刻みでも，同じ位置へ着く（フレーム間隔によらない）', () => {
  const coarse = stepBendSpring({ value: 1, velocity: 0.4 }, 0.2, 0.12);
  let fine = { value: 1, velocity: 0.4 };
  for (let step = 0; step < 12; step++) {
    fine = stepBendSpring(fine, 0.2, 0.01);
  }
  assert.ok(Math.abs(coarse.value - fine.value) < 1e-9);
  assert.ok(Math.abs(coarse.velocity - fine.velocity) < 1e-9);
});

test('ばねは，長い時間が経っても不安定にならず，目標に収まる', () => {
  const settled = stepBendSpring({ value: 3, velocity: -8 }, 0, 60);
  assert.ok(Math.abs(settled.value) < 1e-9);
  assert.ok(Number.isFinite(settled.velocity));
  assert.ok(isBendSettled(settled, 0));
});

test('時間が進まない・不正なときは，状態をそのまま返す', () => {
  const state = { value: 0.3, velocity: -0.2 };
  assert.deepEqual(stepBendSpring(state, 0, 0), state);
  assert.deepEqual(stepBendSpring(state, 0, -1), state);
  assert.deepEqual(stepBendSpring(state, 0, Number.NaN), state);
  // 応答時間が不正なときは，既定値で進む
  const withBadResponse = stepBendSpring(state, 0, 0.1, 0);
  const withDefault = stepBendSpring(state, 0, 0.1, BEND_SPRING_RESPONSE_SEC);
  assert.deepEqual(withBadResponse, withDefault);
});

test('止まったかどうかは，目標との差と速さの両方で決まる', () => {
  assert.equal(isBendSettled({ value: 0, velocity: 0 }, 0), true);
  assert.equal(isBendSettled({ value: 0.5, velocity: 0 }, 0), false);
  assert.equal(isBendSettled({ value: 0, velocity: 0.5 }, 0), false);
});

test('スクロールの速さは，移動量を経過時間で割り，時間の下限と上限で丸める', () => {
  // 16ms で 30px ＝ 1875px/秒
  assert.equal(getScrollVelocity(30, 16), 1875);
  assert.equal(getScrollVelocity(-30, 16), -1875);
  assert.equal(getScrollVelocity(0, 16), 0);
  // 間隔が 0 でも無限大にならない
  assert.equal(getScrollVelocity(8, 0), (8 / BEND_MIN_SAMPLE_MS) * 1000);
  // 間隔が長すぎるときは，上限で測る
  assert.equal(getScrollVelocity(10, 5000), (10 / BEND_MAX_SAMPLE_MS) * 1000);
  assert.equal(getScrollVelocity(Number.NaN, 16), 0);
  assert.equal(getScrollVelocity(10, Number.NaN), (10 / BEND_MIN_SAMPLE_MS) * 1000);
});

test('transform の文字列は，ほぼ変化がないときは none になり，上限でも決まった形になる', () => {
  assert.equal(toBendTransform({ skewDeg: 0, scaleY: 1 }), 'none');
  assert.equal(toBendTransform({ skewDeg: 0.0004, scaleY: 1.00001 }), 'none');
  assert.equal(
    toBendTransform({ skewDeg: BEND_MAX_SKEW_DEG, scaleY: BEND_MAX_SCALE_Y }),
    'skewY(4.000deg) scaleY(1.0400)',
  );
  assert.equal(toBendTransform({ skewDeg: -1.5, scaleY: 1.015 }), 'skewY(-1.500deg) scaleY(1.0150)');
  assert.equal(toBendTransform({ skewDeg: Number.NaN, scaleY: Number.NaN }), 'none');
});
