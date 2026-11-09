import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/showcaseStory.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const { getShowcaseScrollState, getShowcaseChapterOffset, getFlipPosition, getFlipFaces, getFlipPresence, getFlipLight, getShuffledLabel }
  = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const at = progress => getShowcaseScrollState(64 - progress * 1600, 2336, 736, 64, 3);

test('スクロール区間の3分割でアプリを順番に選び、最下端も最後のアプリに留める', () => {
  assert.equal(at(0).index, 0);
  assert.equal(at(0.32).index, 0);
  assert.equal(at(0.34).index, 1);
  assert.equal(at(0.66).index, 1);
  assert.equal(at(0.68).index, 2);
  assert.equal(at(1).index, 2);
  assert.equal(at(1).chapterProgress, 1);
});

test('区間の前後では進捗が0〜1を越えず、存在しないアプリを参照しない', () => {
  assert.equal(at(-4).progress, 0);
  assert.equal(at(-4).index, 0);
  assert.equal(at(4).progress, 1);
  assert.equal(at(4).index, 2);
});

test('逆スクロール・高速な飛び越し・途中からの表示でも現在位置だけで同じ章へ戻る', () => {
  const positions = [0, 0.5, 0.95, 0.45, 0.1, 1, 0.5];
  assert.deepEqual(positions.map(position => at(position).index), [0, 1, 2, 1, 0, 2, 1]);
});

test('直接選択は各画面の章の中へ着地し、直後のスクロール監視で別の章に戻されない', () => {
  for (const viewportHeight of [700, 815, 1000]) {
    const trackHeight = viewportHeight * 3;
    const stageHeight = viewportHeight - 64;
    const travel = trackHeight - stageHeight;
    for (let index = 0; index < 3; index++) {
      const offset = getShowcaseChapterOffset(index, 3, travel);
      const state = getShowcaseScrollState(64 - offset, trackHeight, stageHeight, 64, 3);
      assert.equal(state.index, index);
      assert.ok(state.chapterProgress > 0.1 && state.chapterProgress < 0.9);
    }
  }
});

test('固定区間を使わないレイアウトや1件だけの内容でも、有限の状態を返す', () => {
  const state = getShowcaseScrollState(-100, 500, 800, 64, 1);
  assert.equal(state.progress, 0);
  assert.equal(state.index, 0);
  assert.equal(state.travel, 0);
  assert.equal(getShowcaseChapterOffset(4, 1, -100), 0);
});

test('回転カードは各章の中心で正面に止まり，章の境目でちょうど半回転の途中になる', () => {
  for (const count of [2, 3, 4]) {
    for (let chapter = 0; chapter < count; chapter++) {
      assert.equal(getFlipPosition((chapter + 0.5) / count, count), chapter);
    }
    for (let boundary = 1; boundary < count; boundary++) {
      assert.ok(Math.abs(getFlipPosition(boundary / count, count) - (boundary - 0.5)) < 1e-9);
    }
  }
});

test('回転カードの位置はスクロールに対して減らず，範囲の外へ出ない．両端では止まる', () => {
  let previous = -1;
  for (let step = -10; step <= 1010; step++) {
    const position = getFlipPosition(step / 1000, 4);
    assert.ok(position >= previous && position >= 0 && position <= 3);
    previous = position;
  }
  assert.equal(getFlipPosition(0, 4), 0);
  assert.equal(getFlipPosition(1, 4), 3);
  assert.equal(getFlipPosition(0.9, 1), 0);
});

test('見えている面には，どの位置でも正面のカードが載っている', () => {
  for (const count of [1, 2, 3, 4]) {
    for (let step = 0; step <= 300; step++) {
      const position = step / 100 * (count - 1) / 3;
      const faces = getFlipFaces(position, count);
      const nearest = Math.min(count - 1, Math.max(0, Math.round(position)));
      const visible = nearest % 2 === 0 ? faces.front : faces.back;
      assert.equal(visible, nearest);
    }
  }
});

test('面の中身は，その面が裏側を向いて見えていないあいだにしか入れ替わらない', () => {
  let previous = getFlipFaces(0, 4);
  for (let step = 1; step <= 300; step++) {
    const position = step / 100;
    const faces = getFlipFaces(position, 4);
    const nearest = Math.round(position);
    if (faces.front !== previous.front) assert.equal(nearest % 2, 1, `位置 ${position} で表が入れ替わった`);
    if (faces.back !== previous.back) assert.equal(nearest % 2, 0, `位置 ${position} で裏が入れ替わった`);
    previous = faces;
  }
});

test('核は正面で最も濃く，横向きでは消え，その間はなめらかに変わる', () => {
  assert.equal(getFlipPresence(2), 1);
  assert.equal(getFlipPresence(1.5), 0);
  assert.equal(getFlipPresence(0.04), 1);
  let previous = 1;
  for (let step = 0; step <= 50; step++) {
    const presence = getFlipPresence(1 + step / 100);
    assert.ok(presence <= previous + 1e-12);
    previous = presence;
  }
});

test('一文の区切りは，対応するカードへ向かって灯り，通り過ぎたあとは灯ったままになる', () => {
  assert.equal(getFlipLight(0, 0), 1);
  assert.equal(getFlipLight(0, 1), 0);
  assert.equal(getFlipLight(0.5, 1), 0.5);
  assert.equal(getFlipLight(1, 1), 1);
  assert.equal(getFlipLight(3, 1), 1);
  assert.equal(getFlipLight(1.5, 3), 0);
  assert.equal(getFlipLight(2.5, 3), 0.5);
  assert.equal(getFlipLight(3, 3), 1);
});

test('一文は，カードが回る間に対応する区切りだけが灯る', () => {
  // 位置 0.5（1 枚目から 2 枚目へ回っている最中）では，2 番目の区切りだけが途中
  const lights = [0, 1, 2, 3].map(segment => getFlipLight(0.5, segment));
  assert.deepEqual(lights, [1, 0.5, 0, 0]);
});

const LABELS = ['LEARNING', 'APP DEVELOPMENT', 'HARDWARE', 'GUIDING PRINCIPLE'];
const sorted = text => Array.from(text).sort().join('');

test('ラベルは，戻った割合が 1 なら元の文字列，0 なら同じ文字を並べ替えた別の並びになる', () => {
  for (const label of LABELS) {
    assert.equal(getShuffledLabel(label, 1), label);
    assert.equal(getShuffledLabel(label, 2), label);
    const scrambled = getShuffledLabel(label, 0);
    assert.notEqual(scrambled, label);
    assert.equal(sorted(scrambled), sorted(label));
  }
});

test('ラベルは，どの割合でも文字の集まりと空白の位置が変わらず，戻った分は左から元のまま残る', () => {
  for (const label of LABELS) {
    for (let step = 0; step <= 20; step++) {
      const resolved = step / 20;
      const shown = getShuffledLabel(label, resolved);
      assert.equal(sorted(shown), sorted(label));
      assert.deepEqual(
        Array.from(shown).flatMap((letter, index) => (letter === ' ' ? [index] : [])),
        Array.from(label).flatMap((letter, index) => (letter === ' ' ? [index] : [])),
      );
      const settled = Math.floor(resolved * label.replaceAll(' ', '').length);
      let kept = 0;
      for (let index = 0; kept < settled; index++) {
        if (label[index] === ' ') continue;
        assert.equal(shown[index], label[index]);
        kept++;
      }
    }
  }
});

test('ラベルの並びは同じ入力なら必ず同じで，戻る文字が増えるほど元に近づく（ちらつかない）', () => {
  for (const label of LABELS) {
    for (const resolved of [0, 0.3, 0.6, 0.9]) {
      assert.equal(getShuffledLabel(label, resolved), getShuffledLabel(label, resolved));
    }
  }
  assert.equal(getShuffledLabel('', 0.5), '');
  assert.equal(getShuffledLabel('A', 0), 'A');
});
