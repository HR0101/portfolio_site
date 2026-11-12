import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/zoomRegion.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { getZoomTransform, ZOOM_FILL, ZOOM_MAX_SCALE } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const image = { x: 90, y: 16, w: 120, h: 260 };
const frame = { x: 0, y: 0, w: 300, h: 292 };
const region = { x: 0.048, y: 0.695, w: 0.904, h: 0.192 };
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);

test('contain 表示の余白を含めて，選んだ領域が枠の中央に来る', () => {
  const zoom = getZoomTransform(image, frame, region);
  closeTo(image.x + zoom.translateX + image.w * (region.x + region.w / 2) * zoom.scale, frame.w / 2);
  closeTo(image.y + zoom.translateY + image.h * (region.y + region.h / 2) * zoom.scale, frame.h / 2);
});

test('領域は縦横とも余白を残して収まり，幅か高さが枠の94%になる', () => {
  assert.equal(ZOOM_FILL, 0.94);
  for (const target of [region, { x: 0.2, y: 0.1, w: 0.2, h: 0.8 }]) {
    const zoom = getZoomTransform(image, frame, target);
    const width = image.w * target.w * zoom.scale;
    const height = image.h * target.h * zoom.scale;
    assert.ok(width <= frame.w * ZOOM_FILL + 1e-9 && height <= frame.h * ZOOM_FILL + 1e-9);
    assert.ok(Math.abs(width - frame.w * ZOOM_FILL) < 1e-9 || Math.abs(height - frame.h * ZOOM_FILL) < 1e-9);
  }
});

test('小さい領域は4倍で頭打ちにし，枠の原点や領域の位置によらず中央へ置く', () => {
  assert.equal(ZOOM_MAX_SCALE, 4);
  const shifted = { ...frame, x: 24, y: 40 };
  for (const target of [{ x: 0.1, y: 0.2, w: 0.05, h: 0.05 }, { x: 0.85, y: 0.9, w: 0.1, h: 0.08 }]) {
    const zoom = getZoomTransform(image, shifted, target);
    assert.equal(zoom.scale, ZOOM_MAX_SCALE);
    closeTo(image.x + zoom.translateX + image.w * (target.x + target.w / 2) * zoom.scale, shifted.x + shifted.w / 2);
    closeTo(image.y + zoom.translateY + image.h * (target.y + target.h / 2) * zoom.scale, shifted.y + shifted.h / 2);
  }
});

test('枠が小さくても縮小せず，選んだ領域の中心を合わせる', () => {
  const smallFrame = { x: 10, y: 20, w: 40, h: 60 };
  const zoom = getZoomTransform(image, smallFrame, region);
  assert.equal(zoom.scale, 1);
  closeTo(image.x + zoom.translateX + image.w * (region.x + region.w / 2), smallFrame.x + smallFrame.w / 2);
  closeTo(image.y + zoom.translateY + image.h * (region.y + region.h / 2), smallFrame.y + smallFrame.h / 2);
});

test('全体表示は倍率 1・移動なしで元の位置へ戻る', () => {
  assert.deepEqual(getZoomTransform(image, frame, null), { scale: 1, translateX: 0, translateY: 0 });
  assert.deepEqual(getZoomTransform(image, frame, { x: 0, y: 0, w: 1, h: 1 }), { scale: 1, translateX: 0, translateY: 0 });
});

test('領域の端は画像の 0〜1 にクランプする', () => {
  assert.deepEqual(getZoomTransform(image, frame, { x: -1, y: -2, w: 2, h: 3 }), getZoomTransform(image, frame, { x: 0, y: 0, w: 1, h: 1 }));
  assert.deepEqual(getZoomTransform(image, frame, { x: 0.9, y: 0.8, w: 1, h: 1 }), getZoomTransform(image, frame, { x: 0.9, y: 0.8, w: 0.1, h: 0.2 }));
});

test('枠の原点が 0 でなくても領域を中央に置ける', () => {
  const shifted = { ...frame, x: 24, y: 40 };
  const zoom = getZoomTransform(image, shifted, region);
  closeTo(image.x + zoom.translateX + image.w * (region.x + region.w / 2) * zoom.scale, shifted.x + shifted.w / 2);
  closeTo(image.y + zoom.translateY + image.h * (region.y + region.h / 2) * zoom.scale, shifted.y + shifted.h / 2);
});

test('未測定・空領域・不正な値は安全に全体表示へ戻す', () => {
  for (const target of [{ ...region, w: 0 }, { ...region, x: 2 }, { ...region, h: -1 }, { ...region, y: NaN }]) {
    assert.deepEqual(getZoomTransform(image, frame, target), getZoomTransform(image, frame, null));
  }
  for (const field of ['w', 'h']) {
    for (const value of [0, -1]) {
      assert.deepEqual(getZoomTransform({ ...image, [field]: value }, frame, region), getZoomTransform(image, frame, null));
      assert.deepEqual(getZoomTransform(image, { ...frame, [field]: value }, region), getZoomTransform(image, frame, null));
    }
  }
});

test('画像・枠・領域の全座標について，非有限値や欠けた値は全体表示へ戻す', () => {
  for (const field of ['x', 'y', 'w', 'h']) {
    for (const value of [NaN, Infinity, -Infinity, undefined]) {
      const invalidRects = [
        [{ ...image, [field]: value }, frame, region],
        [image, { ...frame, [field]: value }, region],
        [image, frame, { ...region, [field]: value }],
      ];
      for (const args of invalidRects) {
        assert.deepEqual(getZoomTransform(...args), { scale: 1, translateX: 0, translateY: 0 });
      }
    }
  }
});

test('有限の入力から移動量が桁あふれしても，不正な変形を返さない', () => {
  const extremeFrame = { ...frame, x: Number.MAX_VALUE, w: Number.MAX_VALUE };
  assert.deepEqual(getZoomTransform(image, extremeFrame, region), { scale: 1, translateX: 0, translateY: 0 });
});
