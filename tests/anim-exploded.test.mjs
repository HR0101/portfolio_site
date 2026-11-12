import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/animations/exploded.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const {
  getExplodedPose, getExplodedGap, getSpecularIntensity, getCalloutPlacements,
  GLARE_MAX_OPACITY, EXPLODED_LAYER_COUNT, CALLOUT_HEIGHT_PX, CALLOUT_EDGE_MARGIN_PX,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const base = { pointerX: 0, pointerY: 0, width: 400, layerCount: 4 };
const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} は ${expected} に近いはず`);

test('層の間隔は画面の幅の 9% を 28〜56px に収める', () => {
  near(getExplodedGap(400), 36);
  assert.equal(getExplodedGap(100), 28);
  assert.equal(getExplodedGap(2000), 56);
  assert.equal(getExplodedGap(Number.NaN), 28);
});

test('進みが 0 のとき，奥行きはすべて 0 で，傾きもない', () => {
  const pose = getExplodedPose({ ...base, progress: 0 });
  assert.equal(pose.layers.length, EXPLODED_LAYER_COUNT);
  for (const layer of pose.layers) assert.equal(layer.z, 0);
  assert.equal(pose.rotX, 0);
  assert.equal(pose.rotY, 0);
  assert.equal(pose.scale, 1);
});

test('進みが 0 のとき，枠と格子は見えず，背面の板も見えず，実画面だけが見える', () => {
  const pose = getExplodedPose({ ...base, progress: 0 });
  assert.deepEqual(pose.layers.map(layer => layer.opacity), [0, 1, 0, 0]);
});

test('進みが 0 の影は，もともとの実画面の影（3px 5px・不透明度 0.22）と同じ', () => {
  const pose = getExplodedPose({ ...base, progress: 0 });
  assert.deepEqual(pose.shadow, { x: 3, y: 5, opacity: 0.22 });
});

test('進みが 1 のとき，奥行きは −1.5・−0.5・+0.5・+1.5 の間隔で，傾きは X 14 度・Y −22 度', () => {
  const pose = getExplodedPose({ ...base, progress: 1 });
  const gap = getExplodedGap(base.width);
  assert.deepEqual(pose.layers.map(layer => layer.z), [-1.5 * gap, -0.5 * gap, 0.5 * gap, 1.5 * gap]);
  near(pose.rotX, 14);
  near(pose.rotY, -22);
  assert.deepEqual(pose.layers.map(layer => layer.opacity), [1, 1, 1, 1]);
  near(pose.shadow.opacity, 0.22 * (1 - 0.4));
});

test('層の深さの合計は，どの進みでも 0（中央の層を基準に対称）', () => {
  for (const progress of [0, 0.1, 0.37, 0.5, 0.82, 1]) {
    for (const layerCount of [1, 2, 3, 4, 5, 7]) {
      const pose = getExplodedPose({ ...base, progress, layerCount });
      near(pose.layers.reduce((sum, layer) => sum + layer.z, 0), 0, 1e-9);
      assert.equal(pose.layers.length, layerCount);
    }
  }
});

test('深さは手前の層ほど大きく，進みに比例する', () => {
  const half = getExplodedPose({ ...base, progress: 0.5 });
  const full = getExplodedPose({ ...base, progress: 1 });
  for (let index = 0; index < 4; index++) near(half.layers[index].z * 2, full.layers[index].z);
  for (let index = 1; index < 4; index++) assert.ok(full.layers[index].z > full.layers[index - 1].z);
});

test('カーソルの傾き：止まっているときは 4 度，分解し切ると 8 度．向きは符号で決まる', () => {
  const rest = getExplodedPose({ ...base, progress: 0, pointerX: 1, pointerY: 1 });
  near(rest.rotY, 4);
  near(rest.rotX, -4);
  const exploded = getExplodedPose({ ...base, progress: 1, pointerX: 1, pointerY: 1 });
  near(exploded.rotY, -22 + 8);
  near(exploded.rotX, 14 - 8);
  const opposite = getExplodedPose({ ...base, progress: 0, pointerX: -1, pointerY: -1 });
  near(opposite.rotY, -4);
  near(opposite.rotX, 4);
});

test('カーソルの位置は −1〜1 に収める．不正な値は 0 として扱う', () => {
  const outside = getExplodedPose({ ...base, progress: 0, pointerX: 9, pointerY: -9 });
  near(outside.rotY, 4);
  near(outside.rotX, 4);
  const broken = getExplodedPose({ ...base, progress: Number.NaN, pointerX: Number.NaN, pointerY: Number.NaN, width: Number.NaN });
  assert.equal(broken.rotX, 0);
  assert.equal(broken.rotY, 0);
  for (const layer of broken.layers) assert.ok(Number.isFinite(layer.z) && Number.isFinite(layer.opacity));
});

test('進みの範囲外は，0〜1 に収める', () => {
  const over = getExplodedPose({ ...base, progress: 3 });
  const under = getExplodedPose({ ...base, progress: -3 });
  assert.deepEqual(over, getExplodedPose({ ...base, progress: 1 }));
  assert.deepEqual(under, getExplodedPose({ ...base, progress: 0 }));
});

test('鏡面反射の強さは 0〜1．光の向き（左上手前）へ面を傾けるほど強い', () => {
  const front = getSpecularIntensity(0, 0);
  const towardLight = getSpecularIntensity(14, -22);
  const awayFromLight = getSpecularIntensity(-14, 22);
  assert.ok(front > 0 && front < 1);
  assert.ok(towardLight > front);
  assert.ok(awayFromLight < front);
  for (const [x, y] of [[0, 0], [14, -22], [-40, 40], [90, 90], [-90, -90]]) {
    const value = getSpecularIntensity(x, y);
    assert.ok(value >= 0 && value <= 1, `${x},${y} → ${value}`);
  }
  assert.equal(getSpecularIntensity(Number.NaN, Number.NaN), front);
});

test('グレアの不透明度は，0 〜 0.28 の範囲に収まる', () => {
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    for (const pointer of [-1, -0.4, 0, 0.4, 1]) {
      const pose = getExplodedPose({ ...base, progress, pointerX: pointer, pointerY: -pointer });
      assert.ok(pose.glare >= 0 && pose.glare <= GLARE_MAX_OPACITY + 1e-12, `${progress},${pointer} → ${pose.glare}`);
    }
  }
  const exploded = getExplodedPose({ ...base, progress: 1 });
  near(exploded.glare, 0.28 * getSpecularIntensity(14, -22));
  assert.ok(exploded.glare > 0.15, `分解し切ったときのグレア ${exploded.glare}`);
});

test('影は，浮くほど右下へ遠ざかり，薄くなる（光は左上にあるので，影は反対向き）', () => {
  const rest = getExplodedPose({ ...base, progress: 0 });
  const half = getExplodedPose({ ...base, progress: 0.5 });
  const full = getExplodedPose({ ...base, progress: 1 });
  assert.ok(half.shadow.x > rest.shadow.x && full.shadow.x > half.shadow.x);
  assert.ok(half.shadow.y > rest.shadow.y && full.shadow.y > half.shadow.y);
  assert.ok(full.shadow.y > full.shadow.x, '光が上寄りなので，縦のずれのほうが大きい');
  assert.ok(half.shadow.opacity < rest.shadow.opacity && full.shadow.opacity < half.shadow.opacity);
});

test('全体の縮小は，進みに比例して 16% まで', () => {
  near(getExplodedPose({ ...base, progress: 0.5 }).scale, 0.92);
  near(getExplodedPose({ ...base, progress: 1 }).scale, 0.84);
});

// ===== 引き出し線つきのラベルの配置 =====

const frame = { x: 0, y: 0, w: 290, h: 420 };
const image = { x: 57, y: 18, w: 176, h: 384 };
const busRegions = [
  { id: 'route', region: { x: 0.536, y: 0.244, w: 0.361, h: 0.056 } },
  { id: 'when', region: { x: 0.083, y: 0.392, w: 0.417, h: 0.124 } },
  { id: 'result', region: { x: 0.090, y: 0.600, w: 0.469, h: 0.056 } },
  { id: 'next', region: { x: 0.090, y: 0.770, w: 0.300, h: 0.082 } },
];

test('ラベルは，領域に近いほうの側へ置かれ，入力と同じ順で返る', () => {
  const placements = getCalloutPlacements(image, frame, busRegions);
  assert.deepEqual(placements.map(item => item.id), ['route', 'when', 'result', 'next']);
  assert.deepEqual(placements.map(item => item.side), ['right', 'left', 'left', 'left']);
});

test('同じ側のラベルは縦に重ならず，枠の中に収まる', () => {
  const crowded = [0.30, 0.31, 0.32, 0.33, 0.34].map((y, index) => ({ id: `r${index}`, region: { x: 0.04, y, w: 0.3, h: 0.05 } }));
  for (const regions of [busRegions, crowded]) {
    const placements = getCalloutPlacements(image, frame, regions);
    for (const side of ['left', 'right']) {
      const column = placements.filter(item => item.side === side).sort((a, b) => a.chipY - b.chipY);
      for (let index = 1; index < column.length; index++) {
        assert.ok(column[index].chipY >= column[index - 1].chipY + CALLOUT_HEIGHT_PX, `${side} のラベルが重なった`);
      }
    }
    for (const item of placements) {
      assert.ok(item.chipY >= frame.y + CALLOUT_EDGE_MARGIN_PX - 1e-9, `${item.id} の上端`);
      assert.ok(item.chipY + item.chipHeight <= frame.y + frame.h - CALLOUT_EDGE_MARGIN_PX + 1e-9, `${item.id} の下端`);
      assert.ok(item.chipX >= frame.x + CALLOUT_EDGE_MARGIN_PX - 1e-9 && item.chipX + item.chipWidth <= frame.x + frame.w - CALLOUT_EDGE_MARGIN_PX + 1e-9, `${item.id} の左右`);
    }
  }
});

test('引き出し線は，領域の枠の縁の中央から，ラベルの内側の縁の中央へ引く', () => {
  const [route, when] = getCalloutPlacements(image, frame, busRegions);
  // 右側：領域の右の縁 → ラベルの左の縁
  near(route.anchorX, image.x + image.w * (0.536 + 0.361));
  near(route.anchorY, image.y + image.h * (0.244 + 0.056 / 2));
  assert.equal(route.tipX, route.chipX);
  near(route.tipY, route.chipY + CALLOUT_HEIGHT_PX / 2);
  // 左側：領域の左の縁 → ラベルの右の縁
  near(when.anchorX, image.x + image.w * 0.083);
  assert.equal(when.tipX, when.chipX + when.chipWidth);
});

test('ラベルは，余白の外側（画像に重ならない側）に置かれる', () => {
  const placements = getCalloutPlacements(image, frame, busRegions);
  for (const item of placements) {
    if (item.side === 'left') assert.ok(item.chipX + item.chipWidth <= image.x, `${item.id}`);
    else assert.ok(item.chipX >= image.x + image.w, `${item.id}`);
  }
});

test('不正な寸法では，空の配置を返す', () => {
  assert.deepEqual(getCalloutPlacements({ x: 0, y: 0, w: 0, h: 0 }, frame, busRegions), []);
  assert.deepEqual(getCalloutPlacements(image, { x: 0, y: 0, w: Number.NaN, h: 10 }, busRegions), []);
  assert.deepEqual(getCalloutPlacements(image, frame, []), []);
});
