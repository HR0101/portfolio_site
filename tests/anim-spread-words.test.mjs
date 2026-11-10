import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/animations/spreadWords.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const {
  SPREAD_COMPACT_GAP_EM,
  SPREAD_START_RATIO,
  SPREAD_END_RATIO,
  splitSpreadWords,
  groupWordsIntoLines,
  getEndAlignedIndices,
  computeSpreadDeltas,
  getSpreadOffset,
  getSpreadProgress,
  toSpreadTransform,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const CONTAINER = 1000;
const FONT_SIZE = 100;
const COMPACT_GAP = FONT_SIZE * SPREAD_COMPACT_GAP_EM;

// 1 行に 3 語．幅 100・200・100 を，space-between で 1000 の幅へ広げた位置（左 0・400・900）
const THREE_WORDS = [
  { left: 0, width: 100, top: 0 },
  { left: 400, width: 200, top: 0 },
  { left: 900, width: 100, top: 0 },
];

test('空白のある文は空白で語に分け，句読点だけの語は直前の語へつなげる', () => {
  assert.deepEqual(splitSpreadWords("Let's build something"), ["Let's", 'build', 'something']);
  assert.deepEqual(splitSpreadWords('  a   b  '), ['a', 'b']);
  assert.deepEqual(splitSpreadWords('Hello , world'), ['Hello,', 'world']);
  assert.deepEqual(splitSpreadWords(''), []);
  assert.deepEqual(splitSpreadWords('   '), []);
});

test('空白のない文（日本語）は Intl.Segmenter があれば語に分け，なければ 1 語として返す', () => {
  const words = splitSpreadWords('自分の手で形にする．');
  assert.ok(words.length >= 1);
  // 語をつなぎ直すと元の文になる（文字を落とさない）
  assert.equal(words.join(''), '自分の手で形にする．');
  // 句点だけの語は残らない
  assert.ok(words.every((word) => !/^[．。]+$/u.test(word)));
});

test('語は上端がそろう行ごとにまとまり，行の中は左から右の順になる', () => {
  const boxes = [
    { left: 500, width: 100, top: 0 },
    { left: 0, width: 100, top: 1 },
    { left: 0, width: 100, top: 120 },
    { left: 700, width: 100, top: 119 },
  ];
  assert.deepEqual(groupWordsIntoLines(boxes), [[1, 0], [2, 3]]);
  assert.deepEqual(groupWordsIntoLines([]), []);
});

test('1 行に 1 語しか入らないとき，2 番目・4 番目の行の語だけを行末へ寄せる（ジグザグになる）', () => {
  const stacked = [
    { left: 0, width: 166, top: 0 },
    { left: 0, width: 176, top: 40 },
    { left: 0, width: 192, top: 81 },
    { left: 0, width: 140, top: 121 },
  ];
  assert.deepEqual(getEndAlignedIndices(stacked), [1, 3]);
  // 2 語以上の行は，寄せない（space-between がそのまま使える）
  const mixed = [
    { left: 0, width: 100, top: 0 },
    { left: 900, width: 100, top: 0 },
    { left: 0, width: 100, top: 100 },
    { left: 0, width: 100, top: 200 },
  ];
  assert.deepEqual(getEndAlignedIndices(mixed), [2]);
  assert.deepEqual(getEndAlignedIndices(THREE_WORDS), []);
  assert.deepEqual(getEndAlignedIndices([]), []);
});

test('行末へ寄せた語は，中央から行末の位置へ動く（行頭の語と逆向き）', () => {
  const zigzag = [
    { left: 0, width: 166, top: 0 },
    { left: CONTAINER - 176, width: 176, top: 40 },
  ];
  const deltas = computeSpreadDeltas(zigzag, CONTAINER, FONT_SIZE);
  assert.ok(deltas[0] > 0);
  assert.ok(deltas[1] < 0);
  assert.ok(Math.abs(zigzag[1].left + deltas[1] - (CONTAINER - 176) / 2) < 1e-9);
});

test('詰めた姿では，行の語が行の中央に，一定の間隔で並ぶ', () => {
  const deltas = computeSpreadDeltas(THREE_WORDS, CONTAINER, FONT_SIZE);
  const compactLefts = THREE_WORDS.map((box, index) => box.left + deltas[index]);

  assert.ok(Math.abs(compactLefts[1] - (compactLefts[0] + 100 + COMPACT_GAP)) < 1e-9);
  assert.ok(Math.abs(compactLefts[2] - (compactLefts[1] + 200 + COMPACT_GAP)) < 1e-9);

  const compactWidth = 100 + 200 + 100 + COMPACT_GAP * 2;
  const centerOfCluster = compactLefts[0] + compactWidth / 2;
  assert.ok(Math.abs(centerOfCluster - CONTAINER / 2) < 1e-9);
});

test('左の語は右へ，右の語は左へ戻され，中央の語は大きく動かない', () => {
  const deltas = computeSpreadDeltas(THREE_WORDS, CONTAINER, FONT_SIZE);
  assert.ok(deltas[0] > 0);
  assert.ok(deltas[2] < 0);
  assert.ok(Math.abs(deltas[1]) < Math.abs(deltas[0]));
});

test('進み 0 で詰めた位置，進み 1 で広がった位置（0），途中は 1:1 で変わる', () => {
  const deltas = computeSpreadDeltas(THREE_WORDS, CONTAINER, FONT_SIZE);
  assert.equal(getSpreadOffset(deltas[0], 1), 0);
  assert.equal(getSpreadOffset(deltas[0], 0), Number(deltas[0].toFixed(2)));
  assert.ok(Math.abs(getSpreadOffset(deltas[0], 0.5) - deltas[0] / 2) < 0.01);
  // 範囲外・不正な進みは端へ丸める
  assert.equal(getSpreadOffset(deltas[0], 5), 0);
  assert.equal(getSpreadOffset(deltas[0], -5), Number(deltas[0].toFixed(2)));
  assert.equal(getSpreadOffset(deltas[0], Number.NaN), Number(deltas[0].toFixed(2)));
  assert.equal(getSpreadOffset(Number.NaN, 0.3), 0);
});

test('語どうしの間隔は，進みが増えるほど単調に開いていく', () => {
  const deltas = computeSpreadDeltas(THREE_WORDS, CONTAINER, FONT_SIZE);
  let previousGap = -Infinity;
  for (let progress = 0; progress <= 1.0001; progress += 0.05) {
    const lefts = THREE_WORDS.map((box, index) => box.left + getSpreadOffset(deltas[index], progress));
    const gap = lefts[2] - (lefts[1] + 200);
    assert.ok(gap >= previousGap - 1e-9, `進み ${progress} で間隔が縮みました`);
    previousGap = gap;
    // 語が重ならない
    assert.ok(lefts[1] >= lefts[0] + 100 - 1e-9);
  }
  // 広がり切ったときの間隔は，広がった位置の間隔（300）
  assert.ok(Math.abs(previousGap - 300) < 0.1);
});

test('語が 1 つだけの行は，中央から行頭の位置へ動く', () => {
  const boxes = [{ left: 0, width: 300, top: 0 }];
  const [delta] = computeSpreadDeltas(boxes, CONTAINER, FONT_SIZE);
  assert.ok(Math.abs(delta - (CONTAINER - 300) / 2) < 1e-9);
  assert.equal(getSpreadOffset(delta, 1), 0);
});

test('広がった位置の間隔が詰めた間隔より狭い行は，逆向きに動かない', () => {
  // 幅 495 の 2 語が幅 1000 の行にあり，広がった位置の間隔は 10（詰めた間隔 28 より狭い）
  const narrowGap = [
    { left: 0, width: 495, top: 0 },
    { left: 505, width: 495, top: 0 },
  ];
  const deltas = computeSpreadDeltas(narrowGap, CONTAINER, FONT_SIZE);
  // 詰めた間隔が 10 に抑えられるので，語は動かない（逆向きの動きを作らない）
  assert.ok(deltas.every((delta) => Math.abs(delta) < 1e-9), JSON.stringify(deltas));
});

test('複数行の語は，行ごとに別々の中央へ寄る', () => {
  const boxes = [
    { left: 0, width: 200, top: 0 },
    { left: 800, width: 200, top: 0 },
    { left: 0, width: 300, top: 110 },
    { left: 700, width: 300, top: 110 },
  ];
  const deltas = computeSpreadDeltas(boxes, CONTAINER, FONT_SIZE);
  const firstRowCompactWidth = 200 + 200 + COMPACT_GAP;
  const secondRowCompactWidth = 300 + 300 + COMPACT_GAP;
  assert.ok(Math.abs(boxes[0].left + deltas[0] - (CONTAINER - firstRowCompactWidth) / 2) < 1e-9);
  assert.ok(Math.abs(boxes[2].left + deltas[2] - (CONTAINER - secondRowCompactWidth) / 2) < 1e-9);
});

test('不正な入力では動かさない（delta が 0）', () => {
  assert.deepEqual(computeSpreadDeltas(THREE_WORDS, 0, FONT_SIZE), [0, 0, 0]);
  assert.deepEqual(computeSpreadDeltas(THREE_WORDS, Number.NaN, FONT_SIZE), [0, 0, 0]);
  assert.deepEqual(computeSpreadDeltas(THREE_WORDS, CONTAINER, Number.NaN), [0, 0, 0]);
  assert.deepEqual(computeSpreadDeltas([], CONTAINER, FONT_SIZE), []);
});

test('帯が画面の下から入る前は 0，通り過ぎたあとは 1 で，その間は 1:1 で増える', () => {
  const viewport = 900;
  const height = 480;
  assert.equal(getSpreadProgress(viewport, height, viewport), 0);
  assert.equal(getSpreadProgress(-3000, height, viewport), 1);
  const startTop = viewport * SPREAD_START_RATIO;
  const endTop = viewport * SPREAD_END_RATIO - height;
  assert.equal(getSpreadProgress(startTop, height, viewport), 0);
  assert.ok(Math.abs(getSpreadProgress(endTop, height, viewport) - 1) < 1e-12);
  assert.ok(Math.abs(getSpreadProgress((startTop + endTop) / 2, height, viewport) - 0.5) < 1e-12);
  assert.equal(getSpreadProgress(Number.NaN, height, viewport), 0);
});

test('広がり切る位置は，帯が画面の中ほどに入ったあと（読める位置）にある', () => {
  const viewport = 900;
  const height = 480;
  const endTop = viewport * SPREAD_END_RATIO - height;
  // 広がり切るとき，帯の上端は画面の中にあり，下端は画面の下半分より上にある
  assert.ok(endTop >= 0);
  assert.ok(endTop + height <= viewport);
});

test('transform は 0 のとき none，それ以外は translate3d', () => {
  assert.equal(toSpreadTransform(0), 'none');
  assert.equal(toSpreadTransform(Number.NaN), 'none');
  assert.equal(toSpreadTransform(-12.5), 'translate3d(-12.5px, 0, 0)');
});
