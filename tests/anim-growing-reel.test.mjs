import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/animations/growingReel.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const {
  REEL_START_SCALE,
  REEL_GROW_HOLD_RATIO,
  REEL_RADIUS_START_PX,
  REEL_RADIUS_END_PX,
  REEL_BEZEL_PX,
  REEL_PLAY_FADE_IN_START,
  REEL_PLAY_FADE_OUT_END,
  REEL_PLAY_MAX_OPACITY,
  clampUnit,
  easeOutPower,
  getReelProgress,
  getScrollForPlay,
  getReelState,
  toReelTransform,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const FRAME = { width: 333, height: 712 };
const GROW = 630;
const PLAY = 2160;
const EPSILON = 1e-9;

// 底（下端）の位置．中央を原点にした scale と translateY から求める
function bottomEdge(state, frame) {
  return (frame.height * state.scale) / 2 + state.translateY;
}

test('固定される前は育つ進みも再生の進みも 0，終わると両方 1', () => {
  assert.deepEqual(getReelProgress(-500, GROW, PLAY), { grow: 0, play: 0 });
  assert.deepEqual(getReelProgress(0, GROW, PLAY), { grow: 0, play: 0 });
  assert.deepEqual(getReelProgress(GROW + PLAY, GROW, PLAY), { grow: 1, play: 1 });
  assert.deepEqual(getReelProgress(GROW + PLAY + 800, GROW, PLAY), { grow: 1, play: 1 });
});

test('育つ区間のあいだは再生が進まず，育ち切ってから再生が進み始める', () => {
  for (let into = 0; into <= GROW; into += 30) {
    assert.equal(getReelProgress(into, GROW, PLAY).play, 0);
  }
  const middle = getReelProgress(GROW + PLAY / 2, GROW, PLAY);
  assert.equal(middle.grow, 1);
  assert.ok(Math.abs(middle.play - 0.5) < EPSILON);
});

test('育つ区間の終わりは育ち切ったまま保たれる', () => {
  const activeEnd = GROW * (1 - REEL_GROW_HOLD_RATIO);
  assert.ok(getReelProgress(activeEnd - 10, GROW, PLAY).grow < 1);
  assert.equal(getReelProgress(activeEnd, GROW, PLAY).grow, 1);
  assert.equal(getReelProgress(GROW - 1, GROW, PLAY).grow, 1);
});

test('育つ区間がなければ，これまでの場面と同じく再生の進みだけが 0→1 になる', () => {
  assert.equal(getReelProgress(-50, 0, 1000).play, 0);
  assert.equal(getReelProgress(250, 0, 1000).play, 0.25);
  assert.equal(getReelProgress(1000, 0, 1000).play, 1);
  // 再生の距離がないときは 0（これまでの「distance が 0 以下なら 0」と同じ）
  assert.equal(getReelProgress(500, 0, 0).play, 0);
  assert.equal(getReelProgress(500, 0, -20).play, 0);
});

test('スクロール量が進むほど，育つ進みと再生の進みは単調に増える', () => {
  let previous = getReelProgress(-100, GROW, PLAY);
  for (let into = -100; into <= GROW + PLAY + 100; into += 17) {
    const current = getReelProgress(into, GROW, PLAY);
    assert.ok(current.grow >= previous.grow);
    assert.ok(current.play >= previous.play);
    previous = current;
  }
});

test('再生の進みからスクロール量を求める計算は，進みの計算の逆になる', () => {
  for (const play of [0, 0.1, 0.4, 0.77, 1]) {
    const into = getScrollForPlay(play, GROW, PLAY);
    const progress = getReelProgress(into, GROW, PLAY);
    assert.equal(progress.grow, 1);
    assert.ok(Math.abs(progress.play - play) < EPSILON);
  }
  // 育つ区間がないときは，これまでの式（進み × 距離）と同じ
  assert.equal(getScrollForPlay(0.5, 0, 1000), 500);
  // 範囲外・不正な値は丸める
  assert.equal(getScrollForPlay(2, GROW, PLAY), GROW + PLAY);
  assert.equal(getScrollForPlay(-1, GROW, PLAY), GROW);
  assert.equal(getScrollForPlay(Number.NaN, GROW, PLAY), GROW);
});

test('不正な入力では 0 や既定値に倒れ，例外にならない', () => {
  assert.deepEqual(getReelProgress(Number.NaN, GROW, PLAY), { grow: 0, play: 0 });
  assert.deepEqual(getReelProgress(100, Number.NaN, Number.NaN), { grow: 1, play: 0 });
  assert.equal(clampUnit(Number.NaN), 0);
  assert.equal(clampUnit(-3), 0);
  assert.equal(clampUnit(3), 1);
  const broken = getReelState({ grow: Number.NaN, play: Number.NaN, frame: { width: Number.NaN, height: Number.NaN } });
  for (const value of Object.values(broken)) {
    assert.ok(Number.isFinite(value));
  }
  assert.equal(broken.scale, REEL_START_SCALE);
});

test('育ち始めは小さく，育ち切ると元の大きさ・位置・角丸になる', () => {
  const start = getReelState({ grow: 0, play: 0, frame: FRAME });
  assert.equal(start.scale, REEL_START_SCALE);
  assert.ok(start.scale >= 0.3 && start.scale <= 0.4);
  assert.ok(start.translateY > 0);
  assert.equal(start.translateX, 0);
  assert.equal(start.playOpacity, 0);

  const end = getReelState({ grow: 1, play: 0, frame: FRAME });
  assert.equal(end.scale, 1);
  assert.equal(end.translateX, 0);
  assert.ok(Math.abs(end.translateY) < EPSILON);
  assert.ok(Math.abs(end.borderRadius - REEL_RADIUS_END_PX) < EPSILON);
  assert.ok(Math.abs(end.innerRadius - (REEL_RADIUS_END_PX - REEL_BEZEL_PX)) < EPSILON);
  assert.equal(toReelTransform(end), 'none');
});

test('育つあいだ，枠の下端は動かず，大きさは単調に増える', () => {
  const startBottom = bottomEdge(getReelState({ grow: 0, play: 0, frame: FRAME }), FRAME);
  let previousScale = 0;
  for (let grow = 0; grow <= 1.0001; grow += 0.05) {
    const state = getReelState({ grow, play: 0, frame: FRAME });
    assert.ok(Math.abs(bottomEdge(state, FRAME) - startBottom) < 1e-6);
    assert.ok(state.scale >= previousScale);
    previousScale = state.scale;
  }
});

test('育ち方は ease-out で，最初に大きく動き，終わりにゆるやかに止まる', () => {
  assert.equal(easeOutPower(0), 0);
  assert.equal(easeOutPower(1), 1);
  assert.ok(easeOutPower(0.5) > 0.5);
  const firstHalf = easeOutPower(0.5) - easeOutPower(0);
  const secondHalf = easeOutPower(1) - easeOutPower(0.5);
  assert.ok(firstHalf > secondHalf);
});

test('枠の寸法に応じて移動量が決まる（寸法が 0 なら移動しない）', () => {
  const small = getReelState({ grow: 0, play: 0, frame: { width: 200, height: 400 } });
  const large = getReelState({ grow: 0, play: 0, frame: { width: 400, height: 800 } });
  assert.ok(Math.abs(large.translateY - small.translateY * 2) < EPSILON);
  assert.equal(getReelState({ grow: 0, play: 0, frame: { width: 0, height: 0 } }).translateY, 0);
});

test('育ち始めの横のずれは，育つにつれて 0 へ戻る', () => {
  const start = getReelState({ grow: 0, play: 0, frame: FRAME, startOffsetX: 40 });
  const middle = getReelState({ grow: 0.5, play: 0, frame: FRAME, startOffsetX: 40 });
  const end = getReelState({ grow: 1, play: 0, frame: FRAME, startOffsetX: 40 });
  assert.equal(start.translateX, 40);
  assert.ok(middle.translateX > 0 && middle.translateX < 40);
  assert.equal(end.translateX, 0);
});

test('角丸は，scale の逆数で補われ，見た目の角丸が少しずつ大きくなる', () => {
  let previousVisual = 0;
  for (let grow = 0; grow <= 1.0001; grow += 0.05) {
    const state = getReelState({ grow, play: 0, frame: FRAME });
    const visual = state.borderRadius * state.scale;
    assert.ok(visual >= REEL_RADIUS_START_PX - 1e-6 && visual <= REEL_RADIUS_END_PX + 1e-6);
    assert.ok(visual >= previousVisual - 1e-9);
    previousVisual = visual;
    // 内側の動画の角丸は，外側から縁の分だけ小さい
    assert.ok(Math.abs(state.borderRadius - state.innerRadius - REEL_BEZEL_PX) < 1e-6);
  }
});

test('再生の表示は，育ち切る手前で現れ，育ち切ると最も濃く，再生が進み始めると消える', () => {
  const opacityAt = (grow, play) => getReelState({ grow, play, frame: FRAME }).playOpacity;
  assert.equal(opacityAt(0, 0), 0);
  assert.equal(opacityAt(REEL_PLAY_FADE_IN_START, 0), 0);
  const halfway = opacityAt((REEL_PLAY_FADE_IN_START + 1) / 2, 0);
  assert.ok(halfway > 0 && halfway < REEL_PLAY_MAX_OPACITY);
  assert.ok(Math.abs(opacityAt(1, 0) - REEL_PLAY_MAX_OPACITY) < EPSILON);
  // 再生が進むにつれて薄れ，進み切る前に消える
  assert.ok(opacityAt(1, REEL_PLAY_FADE_OUT_END / 2) < opacityAt(1, 0));
  assert.equal(opacityAt(1, REEL_PLAY_FADE_OUT_END), 0);
  assert.equal(opacityAt(1, 0.5), 0);
  // どの組み合わせでも 0〜最大の濃さに収まる
  for (let grow = 0; grow <= 1.0001; grow += 0.1) {
    for (let play = 0; play <= 1.0001; play += 0.01) {
      const value = opacityAt(grow, play);
      assert.ok(value >= 0 && value <= REEL_PLAY_MAX_OPACITY + EPSILON);
    }
  }
});

test('transform の文字列は，移動と倍率を固定の桁数で並べる', () => {
  const state = getReelState({ grow: 0, play: 0, frame: FRAME });
  const transform = toReelTransform(state);
  assert.match(transform, /^translate3d\(0\.00px, \d+\.\d{2}px, 0\) scale\(0\.3800\)$/);
  const expectedY = (FRAME.height * (1 - REEL_START_SCALE)) / 2;
  assert.ok(transform.includes(`${expectedY.toFixed(2)}px`));
});
