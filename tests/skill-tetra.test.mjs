import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

// src/lib/skillTetra.ts を読み込む（他を import しない純粋なモジュール）
async function loadModule() {
  const source = await readFile(new URL('../src/lib/skillTetra.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

const lib = await loadModule();
const {
  SKILL_FIELD_GAP,
  SKILL_TETRA_MIN_SIZE,
  SKILL_TETRA_MAX_SIZE,
  SKILL_PRESS_MS,
  SKILL_PRESS_SCALE,
  SKILL_BURST_COUNT,
  SKILL_BURST_LIFE_MS,
  SKILL_PARALLAX_PX,
  approach,
  createSkillBurst,
  createSkillDrift,
  createSkillFieldLayout,
  findSkillNodeAt,
  getPressScale,
  getSkillBurstState,
  getSkillColumns,
  getSkillDriftPosition,
  getSkillNodeScale,
  getSkillParallax,
} = lib;

// Skills の技術の群れ（SKILL_TOOL_GROUPS の数：6・8・2）
const GROUP_SIZES = [6, 8, 2];
const WIDTH = 1104;
const HEIGHT = 220;

test('列の割り方は CSS の grid（1.2fr 1.2fr .7fr・gap 24px）と同じで，幅をちょうど使い切る', () => {
  const columns = getSkillColumns(WIDTH);
  assert.equal(columns.length, 3);
  assert.equal(columns[0].left, 0);
  assert.ok(Math.abs(columns[1].left - (columns[0].width + SKILL_FIELD_GAP)) < 1e-9);
  assert.ok(Math.abs(columns[0].width - columns[1].width) < 1e-9);
  assert.ok(Math.abs(columns[2].width / columns[0].width - 0.7 / 1.2) < 1e-9);
  const last = columns.at(-1);
  assert.ok(Math.abs(last.left + last.width - WIDTH) < 1e-9);
});

test('三角錐は技術の数だけ並び，自分の群れの列と描画面の中に収まり，同じ入力なら同じ配置になる', () => {
  const nodes = createSkillFieldLayout(GROUP_SIZES, WIDTH, HEIGHT);
  assert.equal(nodes.length, GROUP_SIZES.reduce((sum, value) => sum + value, 0));
  assert.deepEqual(createSkillFieldLayout(GROUP_SIZES, WIDTH, HEIGHT), nodes);
  const columns = getSkillColumns(WIDTH);
  for (const node of nodes) {
    const column = columns[node.group];
    assert.ok(node.x - node.size >= column.left - 1e-9 && node.x + node.size <= column.left + column.width + 1e-9, `列からはみ出す: ${JSON.stringify(node)}`);
    assert.ok(node.y - node.size >= 0 && node.y + node.size <= HEIGHT);
    assert.ok(node.size >= SKILL_TETRA_MIN_SIZE && node.size <= SKILL_TETRA_MAX_SIZE);
    assert.ok(node.depth >= 0 && node.depth < 1);
  }
  // 群れの中の番号は 0 から順に振られる
  GROUP_SIZES.forEach((size, group) => {
    assert.deepEqual(nodes.filter((node) => node.group === group).map((node) => node.index), Array.from({ length: size }, (_, index) => index));
  });
  assert.deepEqual(createSkillFieldLayout(GROUP_SIZES, 0, HEIGHT), []);
});

test('当たり判定はいちばん近い三角錐を選び，半径の外と押せない技術は -1', () => {
  const nodes = [{ x: 100, y: 100, size: 20 }, { x: 130, y: 100, size: 20 }];
  assert.equal(findSkillNodeAt(nodes, 104, 100), 0);
  assert.equal(findSkillNodeAt(nodes, 126, 100), 1);
  assert.equal(findSkillNodeAt(nodes, 300, 300), -1);
  assert.equal(findSkillNodeAt(nodes, 110, 100, (index) => index !== 0), 1);
  assert.equal(findSkillNodeAt(nodes, 104, 100, () => false), -1);
});

test('寄せ方はフレームの間隔によらず同じになり，間隔 0 では動かない', () => {
  const once = approach(0, 1, 32);
  const twice = approach(approach(0, 1, 16), 1, 16);
  assert.ok(Math.abs(once - twice) < 1e-12);
  assert.equal(approach(0.3, 1, 0), 0.3);
  assert.ok(approach(0, 1, 10_000) > 0.999);
});

test('押すと半分の時間で .95 まで沈み，120ms で元に戻る', () => {
  assert.equal(getPressScale(0), 1);
  assert.ok(Math.abs(getPressScale(SKILL_PRESS_MS / 2) - SKILL_PRESS_SCALE) < 1e-12);
  assert.equal(getPressScale(SKILL_PRESS_MS), 1);
  assert.equal(getPressScale(Number.NEGATIVE_INFINITY), 1);
  assert.equal(getPressScale(-5), 1);
  assert.equal(getSkillNodeScale(0, 0, Number.POSITIVE_INFINITY), 1);
  assert.ok(getSkillNodeScale(1, 0, Infinity) > 1);
  assert.ok(getSkillNodeScale(0, 1, Infinity) > getSkillNodeScale(1, 0, Infinity));
  // 範囲外の値は 0〜1 に収める
  assert.equal(getSkillNodeScale(5, 5, Infinity), getSkillNodeScale(1, 1, Infinity));
});

test('はじける三角錐は四方へ広がり，寿命の間に薄れて消える', () => {
  const burst = createSkillBurst(3);
  assert.equal(burst.length, SKILL_BURST_COUNT);
  assert.deepEqual(createSkillBurst(3), burst);
  const start = getSkillBurstState(burst[0], 0);
  assert.equal(start.alpha, 1);
  assert.equal(start.dx, 0);
  const middle = getSkillBurstState(burst[0], SKILL_BURST_LIFE_MS / 2);
  const late = getSkillBurstState(burst[0], SKILL_BURST_LIFE_MS * 0.9);
  assert.ok(Math.hypot(late.dx, late.dy) > Math.hypot(middle.dx, middle.dy));
  assert.ok(late.alpha < middle.alpha);
  assert.equal(getSkillBurstState(burst[0], SKILL_BURST_LIFE_MS), null);
  assert.equal(getSkillBurstState(burst[0], -1), null);
  // 向きは一周に散らばる（どの象限にも 1 つ以上）
  const quadrants = new Set(burst.map((particle) => {
    const { dx, dy } = getSkillBurstState(particle, SKILL_BURST_LIFE_MS / 2);
    return `${Math.sign(dx)}${Math.sign(dy)}`;
  }));
  assert.ok(quadrants.size >= 3);
});

test('漂う三角錐は面の中に散らばって揺れ，視差は奥行きとカーソルの位置で上限までずれる', () => {
  const drift = createSkillDrift(7);
  assert.deepEqual(createSkillDrift(7), drift);
  for (const particle of drift) {
    assert.ok(particle.x >= 0 && particle.x < 1 && particle.y >= 0 && particle.y < 1);
  }
  const a = getSkillDriftPosition(drift[0], 0, WIDTH, HEIGHT);
  const b = getSkillDriftPosition(drift[0], 2000, WIDTH, HEIGHT);
  assert.notDeepEqual(a, b);

  const near = getSkillParallax(1, -1, 1);
  const far = getSkillParallax(1, -1, 0);
  assert.equal(near.x, -SKILL_PARALLAX_PX);
  assert.equal(near.y, SKILL_PARALLAX_PX);
  assert.ok(Math.abs(far.x) < Math.abs(near.x));
  assert.deepEqual(getSkillParallax(9, Number.NaN, 1), { x: -SKILL_PARALLAX_PX, y: -0 });
});
