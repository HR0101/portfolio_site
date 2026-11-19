// 自己紹介の「点の図形」の計算（src/lib/aboutFigures.ts）のテスト
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// TypeScript の実装を，その場で JavaScript にして読み込む（ほかの単体テストと同じやり方）
const source = await readFile(new URL('../src/lib/aboutFigures.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const {
  ANCHOR_HOLD_EDGE,
  CHAPTER_FIGURE_X,
  COPY_FADE_SPAN,
  CRUMBLE_FALL_DURATION,
  CRUMBLE_REFORM_START,
  CRUMBLE_WAVE_SPAN,
  FIGURE_POINT_COUNT,
  createAboutFigure,
  createPointTraits,
  EMERGE_SHARE,
  getAboutPhase,
  getAboutState,
  getAnchoredAboutPhase,
  getCameraParallax,
  getCrumbleCloudPoint,
  getCrumbleDelay,
  getCrumbleWeights,
  getDustParallax,
  getFigureCenterX,
  getReformDelay,
  getScrollReveal,
  rotatePoint,
  toTrackProgress,
  getChapterFill,
  getCopyReveal,
  getPointLift,
  getPointScatter,
  projectTetra,
  TETRA_EDGES,
  getPointMix,
  getProgressForChapter,
  mixPoint,
  projectPoint,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const KINDS = ['learn', 'apps', 'hardware', 'trust'];
const COUNT = KINDS.length;
// 図形が収まるべき箱（-1〜1）からの，揺らぎのぶんの余裕
const BOX_MARGIN = 1.08;

describe('自己紹介の点の図形', () => {
  it('どの図形も同じ数の粒を持ち，箱の中に収まる', () => {
    for (const kind of KINDS) {
      const figure = createAboutFigure(kind);
      assert.equal(figure.points.length, FIGURE_POINT_COUNT * 3, kind);
      assert.equal(figure.normals.length, FIGURE_POINT_COUNT * 3, kind);
      for (const value of figure.points) assert.ok(Number.isFinite(value) && Math.abs(value) <= BOX_MARGIN, `${kind}: ${value}`);
    }
  });

  it('同じ入力からは同じ図形になり，図形どうしは違う', () => {
    for (const kind of KINDS) assert.deepEqual(createAboutFigure(kind).points, createAboutFigure(kind).points);
    assert.notDeepEqual(createAboutFigure('apps').points, createAboutFigure('hardware').points);
  });

  it('面の向きは長さ 1 で，立体には奥行きがある', () => {
    for (const kind of KINDS) {
      const { points, normals } = createAboutFigure(kind);
      let depth = 0;
      for (let index = 0; index < FIGURE_POINT_COUNT; index += 1) {
        const length = Math.hypot(normals[index * 3], normals[index * 3 + 1], normals[index * 3 + 2]);
        assert.ok(Math.abs(length - 1) < 1e-3, `${kind}: ${length}`);
        depth = Math.max(depth, Math.abs(points[index * 3 + 2]));
      }
      assert.ok(depth > 0.05, `${kind}: ${depth}`);
    }
  });

  it('粒の数を変えても，合計がちょうどその数になる', () => {
    for (const count of [1, 7, 333]) {
      for (const kind of KINDS) assert.equal(createAboutFigure(kind, count).points.length, count * 3);
    }
  });

  it('脳の形は前頭葉の下より側頭葉が張り出し，脳幹が下へ抜け，4 色の分布を持つ', () => {
    const { points, tones } = createAboutFigure('learn');
    let frontalBottom = -Infinity;
    let temporalBottom = -Infinity;
    let occipitalRight = -Infinity;
    let cerebellumRight = -Infinity;
    let stemBottom = -Infinity;
    let crownCleftTop = Infinity;
    let crownLobeTop = Infinity;
    const buckets = [0, 0, 0, 0];
    for (let index = 0; index < FIGURE_POINT_COUNT; index += 1) {
      const x = points[index * 3], y = points[index * 3 + 1], z = points[index * 3 + 2];
      if (x < -0.62) frontalBottom = Math.max(frontalBottom, y);
      if (x >= -0.4 && x <= 0.02) temporalBottom = Math.max(temporalBottom, y);
      if (y < 0.35) occipitalRight = Math.max(occipitalRight, x);
      if (x > 0.28 && y >= 0.4 && y <= 0.7) cerebellumRight = Math.max(cerebellumRight, x);
      if (x > 0.02 && x < 0.25) stemBottom = Math.max(stemBottom, y);
      if (x >= -0.3 && x <= 0.3 && y < -0.3) {
        if (Math.abs(z) < 0.045) crownCleftTop = Math.min(crownCleftTop, y);
        if (Math.abs(z) >= 0.16 && Math.abs(z) <= 0.34) crownLobeTop = Math.min(crownLobeTop, y);
      }
      const t = tones[index];
      buckets[t < 0.3 ? 0 : t < 0.58 ? 1 : t < 0.82 ? 2 : 3] += 1;
    }
    assert.ok(temporalBottom > frontalBottom + 0.12, `側頭葉(${temporalBottom})が前頭葉底(${frontalBottom})より下へ張り出す`);
    assert.ok(occipitalRight > cerebellumRight + 0.05, `後頭葉(${occipitalRight})が小脳(${cerebellumRight})より後ろへ張り出す`);
    assert.ok(stemBottom > temporalBottom + 0.1, `脳幹(${stemBottom})が側頭葉(${temporalBottom})より下へ抜ける`);
    assert.ok(crownCleftTop > crownLobeTop + 0.06, `頭頂の真ん中(${crownCleftTop})が左右の半球(${crownLobeTop})よりへこんで2つに分かれる`);
    for (const count of buckets) assert.ok(count > 50, `4 色の分布が偏りすぎていないこと: ${buckets}`);
  });

  it('点ごとの性質は決定論的で，範囲に収まる', () => {
    const a = createPointTraits(), b = createPointTraits();
    assert.deepEqual(a.delays, b.delays);
    for (const value of a.delays) assert.ok(value >= 0 && value < 1);
    for (const value of a.sizes) assert.ok(value >= 0 && value < 1);
    for (const value of a.depths) assert.ok(value >= -1 && value < 1);
  });
});

describe('自己紹介のスクロールの進み', () => {
  it('最初と最後は，最初と最後の章がそろっている', () => {
    assert.deepEqual(getAboutState(0, COUNT), { position: 0, active: 0, from: 0, to: 1, mix: 0 });
    const end = getAboutState(1, COUNT);
    assert.equal(end.position, COUNT - 1);
    assert.equal(end.active, COUNT - 1);
    assert.equal(end.mix, 0);
  });

  it('進むにつれて，位置は戻らない', () => {
    let previous = -1;
    for (let step = 0; step <= 400; step += 1) {
      const { position } = getAboutState(step / 400, COUNT);
      assert.ok(position >= previous - 1e-9, `${step}: ${position} < ${previous}`);
      assert.ok(position >= 0 && position <= COUNT - 1);
      previous = position;
    }
  });

  it('章を読ませる位置では，その章がそろっている', () => {
    for (let index = 0; index < COUNT; index += 1) {
      const state = getAboutState(getProgressForChapter(index, COUNT), COUNT);
      assert.equal(state.position, index);
      assert.equal(state.active, index);
    }
  });

  it('範囲の外・数でない値でも壊れない', () => {
    assert.equal(getAboutState(-1, COUNT).position, 0);
    assert.equal(getAboutState(2, COUNT).position, COUNT - 1);
    assert.equal(getAboutState(Number.NaN, COUNT).position, 0);
    assert.equal(getAboutState(0.5, 1).position, 0);
    assert.equal(getProgressForChapter(99, COUNT), getProgressForChapter(COUNT - 1, COUNT));
  });

  it('下の目盛りは，前の章が満ちてから次が進む', () => {
    assert.equal(getChapterFill(0, 0, COUNT), 0);
    assert.ok(Math.abs(getChapterFill(1, COUNT - 1, COUNT) - 1) < 1e-9);
    const middle = getProgressForChapter(1, COUNT);
    assert.equal(getChapterFill(middle, 0, COUNT), 1);
    assert.ok(getChapterFill(middle, 1, COUNT) > 0 && getChapterFill(middle, 1, COUNT) < 1);
    assert.equal(getChapterFill(middle, 2, COUNT), 0);
  });

  it('文章は，その章で読め，離れると消える', () => {
    assert.deepEqual(getCopyReveal(1, 1), { reveal: 1, side: 0 });
    assert.equal(getCopyReveal(1, 2).reveal, 0);
    assert.equal(getCopyReveal(1 + COPY_FADE_SPAN / 2, 1).reveal, 0.5);
    assert.equal(getCopyReveal(0.9, 1).side, 1);
    assert.equal(getCopyReveal(1.1, 1).side, -1);
  });
});

describe('自己紹介の点の位置', () => {
  it('並び替えは，遅れがあっても 0 から始まり 1 で終わる', () => {
    for (const delay of [0, 0.5, 1]) {
      assert.equal(getPointMix(0, delay), 0);
      assert.equal(getPointMix(1, delay), 1);
    }
    assert.ok(getPointMix(0.3, 0) > getPointMix(0.3, 1));
  });

  it('両端では元と先の位置に一致し，途中は横へふくらむ', () => {
    assert.deepEqual(mixPoint(0, 0, 1, 0, 0), [0, 0]);
    const [endX, endY] = mixPoint(0, 0, 1, 0, 1);
    assert.ok(Math.abs(endX - 1) < 1e-9 && Math.abs(endY) < 1e-9);
    const [, middleY] = mixPoint(0, 0, 1, 0, 0.5);
    assert.ok(Math.abs(middleY) > 0.1);
  });

  it('傾けないときは，位置も大きさも変わらない', () => {
    assert.deepEqual(projectPoint(0.4, -0.3, 0, 0, 0), { x: 0.4, y: -0.3, scale: 1, depth: 0 });
  });

  it('手前の点ほど大きく見え，視点を越えても裏返らない', () => {
    assert.ok(projectPoint(0.5, 0, 0.6, 0, 0).scale > 1);
    assert.ok(projectPoint(0.5, 0, -0.6, 0, 0).scale < 1);
    const beyond = projectPoint(0.5, 0, 99, 0, 0);
    assert.ok(Number.isFinite(beyond.scale) && beyond.scale > 0);
    // 左右へ回すと，右の点が奥へ行く
    assert.ok(projectPoint(0.8, 0, 0, 0, 0.3).depth < projectPoint(-0.8, 0, 0, 0, 0.3).depth);
  });

  it('点が浮くのは並び替えの途中だけ', () => {
    assert.equal(getPointLift(0, 1), 0);
    assert.ok(Math.abs(getPointLift(1, 1)) < 1e-9);
    assert.ok(getPointLift(0.5, 1) > 0 && getPointLift(0.5, -1) < 0);
    assert.equal(getPointLift(0.5, 0), 0);
  });

  it('点が散るのは並び替えの途中だけで，大きい点ほど遠くへ散る', () => {
    assert.deepEqual(getPointScatter(0, 1, 1), [0, 0]);
    const [endX, endY] = getPointScatter(1, 1, 1);
    assert.ok(Math.hypot(endX, endY) < 1e-9);
    assert.ok(Math.hypot(...getPointScatter(0.5, 0, 1)) > Math.hypot(...getPointScatter(0.5, 0, 0)));
  });

  it('正四面体は 6 本の辺を持ち，回しても頂点は中心から 1 以内にある', () => {
    assert.equal(TETRA_EDGES.length, 6);
    for (const [spin, pitch] of [[0, 0], [1.1, 0.4], [3, -2]]) {
      const points = projectTetra(spin, pitch, []);
      assert.equal(points.length, 8);
      for (let index = 0; index < 4; index += 1) assert.ok(Math.hypot(points[index * 2], points[index * 2 + 1]) <= 1 + 1e-9);
    }
  });

  it('最初と最後は粒が惑星の点の上にあり，その間は図形になり切っている', () => {
    assert.deepEqual(getAboutPhase(0), { emerge: 0, chapters: 0 });
    assert.deepEqual(getAboutPhase(1), { emerge: 0, chapters: 1 });
    assert.equal(getAboutPhase(0.5).emerge, 1);
    assert.equal(getAboutPhase(EMERGE_SHARE / 2).emerge, 0.5);
    assert.equal(getAboutPhase(EMERGE_SHARE).chapters, 0);
    assert.ok(Math.abs(getAboutPhase(toTrackProgress(0.3)).chapters - 0.3) < 1e-9);
    assert.equal(getAboutPhase(Number.NaN).emerge, 0);
  });

  it('章のスクロール位置に同期して背景立体が左右へ滑らかに切り替わる', () => {
    const anchors = [0.18, 0.42, 0.66, 0.88];
    assert.equal(getAnchoredAboutPhase(0, anchors).emerge, 0);
    assert.equal(getAnchoredAboutPhase(1, anchors).emerge, 0);
    anchors.forEach((anchor, index) => {
      const phase = getAnchoredAboutPhase(anchor, anchors);
      assert.equal(phase.emerge, 1);
      assert.equal(phase.state.position, index);
      assert.equal(phase.state.active, index);
    });
    const holdEnd = anchors[0] + (anchors[1] - anchors[0]) * (ANCHOR_HOLD_EDGE * 0.5);
    assert.equal(getAnchoredAboutPhase(holdEnd, anchors).state.mix, 0);
    let previous = 0;
    for (let step = 0; step <= 200; step += 1) {
      const { state } = getAnchoredAboutPhase(step / 200, anchors);
      assert.ok(state.position >= previous - 1e-9);
      previous = state.position;
    }
    const invalid = getAnchoredAboutPhase(0.5, []);
    assert.equal(invalid.emerge, 1);
    assert.equal(getAnchoredAboutPhase(Number.NaN, anchors).emerge, 0);

    assert.equal(getFigureCenterX({ position: 0, active: 0, from: 0, to: 1, mix: 0 }), CHAPTER_FIGURE_X[0]);
    assert.equal(getFigureCenterX({ position: 1, active: 1, from: 1, to: 2, mix: 0 }), CHAPTER_FIGURE_X[1]);
    assert.equal(getFigureCenterX({ position: 0.5, active: 1, from: 0, to: 1, mix: 0.5 }), 0.5);
    assert.equal(getFigureCenterX({ position: 0, active: 0, from: 0, to: 1, mix: 0 }, []), 0.5);

    assert.equal(getScrollReveal(900, 900), 0);
    assert.ok(getScrollReveal(700, 900) > 0 && getScrollReveal(700, 900) < 1);
    assert.equal(getScrollReveal(450, 900), 1);
    assert.equal(getScrollReveal(-200, 900), 1);
    assert.equal(getScrollReveal(Number.NaN, 0), 1);
  });

  it('下から崩れて 3D 空間へ広がり，星雲状に次の立体へ集まる', () => {
    assert.ok(Math.abs(CRUMBLE_REFORM_START + CRUMBLE_WAVE_SPAN + CRUMBLE_FALL_DURATION - 1) < 1e-9);
    const bottomDelay = getCrumbleDelay(0.7, 0.5, 0);
    const topDelay = getCrumbleDelay(-0.65, 0.5, 0);
    assert.ok(bottomDelay < topDelay, `bottom(${bottomDelay}) < top(${topDelay})`);

    const reformLow = getReformDelay(0, 0.1, 0);
    const reformHigh = getReformDelay(0, 0.9, 0);
    assert.ok(reformLow >= 0 && reformLow <= 1 && reformHigh >= 0 && reformHigh <= 1);
    assert.ok(reformHigh > reformLow, `reformHigh(${reformHigh}) > reformLow(${reformLow})`);

    assert.deepEqual(getCrumbleWeights(0, 0.1, 0.9), { from: 1, sea: 0, to: 0 });
    assert.deepEqual(getCrumbleWeights(1, 0.1, 0.9), { from: 0, sea: 0, to: 1 });

    for (const fromDelay of [0, 0.25, 0.7, 1]) {
      for (const toDelay of [0, 0.3, 0.8, 1]) {
        for (let step = 0; step <= 40; step += 1) {
          const w = getCrumbleWeights(step / 40, fromDelay, toDelay);
          assert.ok(w.from >= -1e-9 && w.sea >= -1e-9 && w.to >= -1e-9);
          assert.ok(Math.abs(w.from + w.sea + w.to - 1) < 1e-9);
        }
      }
    }

    const earlyBottom = getCrumbleWeights(0.24, 0.05, 0.85);
    const earlyTop = getCrumbleWeights(0.24, 0.85, 0.05);
    assert.ok(earlyBottom.sea > 0.7 && earlyBottom.from < 0.2, JSON.stringify(earlyBottom));
    assert.deepEqual(earlyTop, { from: 1, sea: 0, to: 0 });

    const riseTop = getCrumbleWeights(0.76, 0.85, 0.05);
    const riseBottom = getCrumbleWeights(0.76, 0.05, 0.85);
    assert.equal(riseTop.to, 1);
    assert.ok(riseBottom.sea > 0.7, JSON.stringify(riseBottom));

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < 60; i += 1) {
      const p = getCrumbleCloudPoint(0, 0, i * 0.73, (i % 10) / 10, (i / 59) * 2 - 1, 0);
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
    }
    assert.ok(minX < -2 && maxX > 2 && minY < -1.5 && maxY > 1.5 && maxZ - minZ > 4);
    const far = getCrumbleCloudPoint(0, 0, 1.2, 0.5, -1, 0);
    const near = getCrumbleCloudPoint(0, 0, 1.2, 0.5, 1, 0);
    assert.ok(near.z > far.z);
    const safe = getCrumbleCloudPoint(Number.NaN, Number.NaN, Number.NaN, Number.NaN, Number.NaN, Number.NaN, Number.NaN);
    for (const value of [safe.x, safe.y, safe.z]) assert.ok(Number.isFinite(value));
    assert.deepEqual(rotatePoint(0.4, -0.3, 0.2, 0, 0), { x: 0.4, y: -0.3, z: 0.2 });
  });

  it('マウス位置に応じて 3D 視点と背景三角が奥行きに応じた視差で動く', () => {
    const center = getCameraParallax(0, 0);
    assert.ok(center.yaw === 0 && center.pitch === 0 && center.panX === 0 && center.panY === 0);
    const dustCenter = getDustParallax(0, 0, 0.8);
    assert.ok(dustCenter.x === 0 && dustCenter.y === 0);

    const left = getCameraParallax(-1, 0);
    const right = getCameraParallax(1, 0);
    assert.ok(left.yaw > 0 && left.panX > 0);
    assert.equal(right.yaw, -left.yaw);
    assert.equal(right.panX, -left.panX);

    const top = getCameraParallax(0, -1);
    const bottom = getCameraParallax(0, 1);
    assert.ok(top.pitch < 0 && top.panY > 0);
    assert.equal(bottom.pitch, -top.pitch);
    assert.equal(bottom.panY, -top.panY);

    const dustFar = getDustParallax(-1, -1, 0);
    const dustNear = getDustParallax(-1, -1, 1);
    assert.ok(dustNear.x > 0 && dustNear.y > 0);
    assert.ok(dustNear.x > dustFar.x * 5 && dustNear.y > dustFar.y * 5);
    assert.equal(getDustParallax(1, 1, 1).x, -dustNear.x);

    assert.deepEqual(getCameraParallax(-99, 99), getCameraParallax(-1, 1));
    assert.deepEqual(getDustParallax(99, -99, 2), getDustParallax(1, -1, 1));
    const safeCam = getCameraParallax(Number.NaN, Number.NaN);
    const safeDust = getDustParallax(Number.NaN, Number.NaN, Number.NaN);
    for (const v of [safeCam.yaw, safeCam.pitch, safeCam.panX, safeCam.panY, safeDust.x, safeDust.y]) {
      assert.ok(Number.isFinite(v) && v === 0);
    }
  });
});
