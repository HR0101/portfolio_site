import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/animations/strokeCurve.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const {
  STROKE_CURVE_VARIANTS,
  CURVE_NARROW_VIEWPORT_PX,
  CURVE_NARROW_STROKE_PX,
  CURVE_MIN_STROKE_PX,
  CURVE_MAX_STROKE_PX,
  CURVE_VERTICAL_MARGIN_PX,
  CURVE_START_RATIO,
  CURVE_END_RATIO,
  CURVE_DASH_GAP,
  getCurveProgress,
  getCurveDash,
  getCurveStrokeWidth,
  getCurveSegments,
  buildCurvePath,
  sampleSegment,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const VIEWPORT_HEIGHT = 900;
const BAND_HEIGHT = 440;

test('帯が画面の下から入ってくる前は 0，通り過ぎたあとは 1 で，その間は 1:1 で増える', () => {
  assert.equal(getCurveProgress(VIEWPORT_HEIGHT, BAND_HEIGHT, VIEWPORT_HEIGHT), 0);
  assert.equal(getCurveProgress(-2000, BAND_HEIGHT, VIEWPORT_HEIGHT), 1);

  // 上端が START の位置に来たとき 0，下端が END の位置に来たとき 1
  const startTop = VIEWPORT_HEIGHT * CURVE_START_RATIO;
  const endTop = VIEWPORT_HEIGHT * CURVE_END_RATIO - BAND_HEIGHT;
  assert.equal(getCurveProgress(startTop, BAND_HEIGHT, VIEWPORT_HEIGHT), 0);
  assert.ok(Math.abs(getCurveProgress(endTop, BAND_HEIGHT, VIEWPORT_HEIGHT) - 1) < 1e-12);

  // 中間は，スクロール量に比例する
  const half = (startTop + endTop) / 2;
  assert.ok(Math.abs(getCurveProgress(half, BAND_HEIGHT, VIEWPORT_HEIGHT) - 0.5) < 1e-12);
  const quarterStep = (startTop - endTop) / 4;
  assert.ok(Math.abs(getCurveProgress(startTop - quarterStep, BAND_HEIGHT, VIEWPORT_HEIGHT) - 0.25) < 1e-12);
});

test('進みは下へスクロールするほど増え，戻せば同じ値へ戻る（位置だけで決まる）', () => {
  let previous = -1;
  for (let top = VIEWPORT_HEIGHT; top >= -BAND_HEIGHT; top -= 25) {
    const progress = getCurveProgress(top, BAND_HEIGHT, VIEWPORT_HEIGHT);
    assert.ok(progress >= previous, `top=${top} で進みが戻っています`);
    previous = progress;
  }
  const forward = getCurveProgress(300, BAND_HEIGHT, VIEWPORT_HEIGHT);
  getCurveProgress(-500, BAND_HEIGHT, VIEWPORT_HEIGHT);
  assert.equal(getCurveProgress(300, BAND_HEIGHT, VIEWPORT_HEIGHT), forward);
});

test('不正な入力では 0 に倒れ，例外にならない', () => {
  assert.equal(getCurveProgress(Number.NaN, BAND_HEIGHT, VIEWPORT_HEIGHT), 0);
  assert.equal(getCurveProgress(100, Number.NaN, VIEWPORT_HEIGHT), 0);
  assert.equal(getCurveProgress(100, BAND_HEIGHT, Number.POSITIVE_INFINITY), 0);
  assert.equal(getCurveProgress(100, -50, VIEWPORT_HEIGHT) >= 0, true);
  // 画面の高さが 0 でも例外にならない
  assert.ok(Number.isFinite(getCurveProgress(0, BAND_HEIGHT, 0)));
});

test('stroke-dashoffset は進み 0 で 1（隠れる），1 で破線をやめた静止の線になる', () => {
  assert.deepEqual(getCurveDash(0), { dashArray: `1 ${CURVE_DASH_GAP}`, dashOffset: 1 });
  assert.deepEqual(getCurveDash(1), { dashArray: 'none', dashOffset: 0 });
  assert.equal(getCurveDash(0.5).dashOffset, 0.5);
  assert.equal(getCurveDash(0.25).dashOffset, 0.75);
  // 範囲外・不正な値は端へ丸める
  assert.equal(getCurveDash(-3).dashOffset, 1);
  assert.equal(getCurveDash(7).dashArray, 'none');
  assert.equal(getCurveDash(Number.NaN).dashOffset, 1);
});

test('隠れているときは，丸い端点の点が線の終わりに残らない（隙間が 1 より大きい）', () => {
  // 破線は 1 本ぶんの長さ 1 と隙間 CURVE_DASH_GAP．offset=1 のとき，線全体（0〜1）は隙間（1〜1+GAP）の内側に入る
  assert.ok(CURVE_DASH_GAP > 1);
  const hidden = getCurveDash(0);
  const period = 1 + CURVE_DASH_GAP;
  for (let position = 0; position <= 1; position += 0.05) {
    const phase = (position + hidden.dashOffset) % period;
    assert.ok(phase >= 1 - 1e-9 || position + hidden.dashOffset === period, `位置 ${position} が破線の中にあります`);
    assert.ok(phase < period);
  }
  // 位置 1（線の終わり）の位相は，次の破線の始まり（period）にならない
  assert.ok((1 + hidden.dashOffset) % period !== 0);
});

test('線の太さは，小さい画面で細く，広い画面で 40〜60px に収まる', () => {
  assert.equal(getCurveStrokeWidth(CURVE_NARROW_VIEWPORT_PX - 1), CURVE_NARROW_STROKE_PX);
  assert.equal(getCurveStrokeWidth(390), CURVE_NARROW_STROKE_PX);
  assert.equal(getCurveStrokeWidth(Number.NaN), CURVE_NARROW_STROKE_PX);
  assert.equal(getCurveStrokeWidth(CURVE_NARROW_VIEWPORT_PX), CURVE_MIN_STROKE_PX);
  assert.equal(getCurveStrokeWidth(5000), CURVE_MAX_STROKE_PX);
  for (let width = CURVE_NARROW_VIEWPORT_PX; width <= 3000; width += 100) {
    const strokeWidth = getCurveStrokeWidth(width);
    assert.ok(strokeWidth >= CURVE_MIN_STROKE_PX && strokeWidth <= CURVE_MAX_STROKE_PX);
  }
  assert.ok(CURVE_NARROW_STROKE_PX < CURVE_MIN_STROKE_PX);
});

test('どの形も，左右の外側から始まって外側で終わり，帯の上下からはみ出さない', () => {
  for (const variant of STROKE_CURVE_VARIANTS) {
    for (const [width, height] of [[390, 260], [761, 292], [1440, 480], [1920, 480]]) {
      const strokeWidth = getCurveStrokeWidth(width);
      const segments = getCurveSegments(variant, width, height, strokeWidth);
      assert.ok(segments.length >= 1);

      const first = segments[0].p0;
      const last = segments[segments.length - 1].p3;
      const xs = [first.x, last.x];
      assert.ok(xs.some((x) => x <= -strokeWidth + 1e-9), `${variant} ${width}: 左の外側から始まりません`);
      assert.ok(xs.some((x) => x >= width + strokeWidth - 1e-9), `${variant} ${width}: 右の外側で終わりません`);

      // 区間のつなぎ目が連続している
      for (let index = 1; index < segments.length; index += 1) {
        assert.deepEqual(segments[index].p0, segments[index - 1].p3);
      }

      // 曲線上の全ての点で，線の太さの半分を足しても帯の上下に収まる
      const half = strokeWidth / 2;
      segments.forEach((segment) => {
        for (let t = 0; t <= 1; t += 0.01) {
          const point = sampleSegment(segment, t);
          assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
          assert.ok(point.y - half >= -1e-6, `${variant} ${width}x${height}: 上へはみ出します（y=${point.y}）`);
          assert.ok(point.y + half <= height + 1e-6, `${variant} ${width}x${height}: 下へはみ出します（y=${point.y}）`);
        }
      });
    }
  }
  assert.ok(CURVE_VERTICAL_MARGIN_PX > 0);
});

test('3 つの形はそれぞれ違う曲線で，向きは arc と wave が左から，crest が右から入る', () => {
  const [width, height, strokeWidth] = [1440, 480, 58];
  const paths = STROKE_CURVE_VARIANTS.map((variant) => buildCurvePath(variant, width, height, strokeWidth));
  assert.equal(new Set(paths).size, STROKE_CURVE_VARIANTS.length);

  const startX = (variant) => getCurveSegments(variant, width, height, strokeWidth)[0].p0.x;
  assert.ok(startX('arc') < 0);
  assert.ok(startX('wave') < 0);
  assert.ok(startX('crest') > width);
});

test('path の d は M で始まり，区間ごとに C が 1 つ付き，有限の数だけでできている', () => {
  for (const variant of STROKE_CURVE_VARIANTS) {
    const d = buildCurvePath(variant, 1280, 400, 51);
    const segments = getCurveSegments(variant, 1280, 400, 51);
    assert.match(d, /^M /);
    assert.equal((d.match(/C /g) ?? []).length, segments.length);
    assert.ok(!/NaN|Infinity|undefined/.test(d), d);
  }
});

test('帯の大きさが 0 や不正でも，path は有限の数のまま作れる（例外にならない）', () => {
  for (const [width, height] of [[0, 0], [Number.NaN, 300], [500, Number.NaN], [-100, -100]]) {
    const d = buildCurvePath('arc', width, height, CURVE_NARROW_STROKE_PX);
    assert.ok(!/NaN|Infinity|undefined/.test(d), `${width}x${height}: ${d}`);
  }
});
