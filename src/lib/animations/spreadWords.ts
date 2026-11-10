// 大きな文字が 1 語ずつ間隔を空けて広がる帯の計算（純粋関数）．
// 他のファイルを import しない自己完結のモジュールで，DOM にも触れない（単体テストは tests/anim-spread-words.test.mjs）．
//
// 考え方
//   語は CSS（flex の space-between）で，最初から「両端まで広がった」位置に置く．
//   進みが 0 のときは，その位置から「行の中央へ詰まった」位置まで translateX で戻しておき，
//   進みが 1 に近づくほど，戻す量（delta × (1 - 進み)）が 0 になって，広がった位置へ離れていく．
//   語の位置・幅は，描画のたびには測らず，大きさが変わったときだけ測って渡す．

// 語を詰めたときの，語と語の間（フォントサイズに対する割合）
export const SPREAD_COMPACT_GAP_EM = 0.28;
// 同じ行とみなす，語の上端のずれの許容（px）
export const SPREAD_LINE_TOLERANCE_PX = 4;
// 帯の上端が画面の上からこの割合の位置に来たら，広がり始める
// （帯が画面の下から入り，詰まった姿を見せてから広がり始めるよう，下端より少し上にしてある）
export const SPREAD_START_RATIO = 0.7;
// 帯の下端が画面の上からこの割合の位置に来たら，広がり切る
export const SPREAD_END_RATIO = 0.6;
// translateX の値を丸める桁数
const OFFSET_DIGITS = 2;

// 測った語 1 つぶんの箱（行の左端から数えた位置・幅・行の上端．単位はすべて px）
export interface SpreadWordBox {
  left: number;
  width: number;
  top: number;
}

// 値を 0〜1 に丸める（数でないときは 0）
function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

// 文を語に分ける．空白のある文は空白で，空白のない文（日本語など）は Intl.Segmenter で分ける．
// 句読点だけの語は，直前の語へつなげる
export function splitSpreadWords(text: string, locale = 'ja'): string[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  let rawWords: string[];
  if (/\s/.test(trimmed)) {
    rawWords = trimmed.split(/\s+/);
  } else if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
    rawWords = Array.from(segmenter.segment(trimmed), (part) => part.segment).filter(
      (word) => word.trim().length > 0,
    );
  } else {
    rawWords = [trimmed];
  }

  const words: string[] = [];
  rawWords.forEach((word) => {
    const isPunctuationOnly = /^[\p{P}\p{S}]+$/u.test(word);
    if (isPunctuationOnly && words.length > 0) {
      words[words.length - 1] += word;
      return;
    }
    words.push(word);
  });
  return words;
}

// 語を，上端がそろう行ごとにまとめる（語の番号の配列．左から右，上から下の順）
export function groupWordsIntoLines(
  boxes: readonly SpreadWordBox[],
  tolerance: number = SPREAD_LINE_TOLERANCE_PX,
): number[][] {
  const lines: { top: number; indices: number[] }[] = [];
  boxes.forEach((box, index) => {
    const line = lines.find((candidate) => Math.abs(candidate.top - box.top) <= tolerance);
    if (line) {
      line.indices.push(index);
    } else {
      lines.push({ top: box.top, indices: [index] });
    }
  });
  lines.sort((a, b) => a.top - b.top);
  return lines.map((line) => line.indices.sort((a, b) => boxes[a].left - boxes[b].left));
}

// 語が 1 つだけの行のうち，上から数えて 2 番目・4 番目…の行の語の番号．
// 狭い画面で 1 行に 1 語しか入らないとき，これらを行末へ寄せて，行頭と行末が交互になる（ジグザグの）配置にする
export function getEndAlignedIndices(
  boxes: readonly SpreadWordBox[],
  tolerance: number = SPREAD_LINE_TOLERANCE_PX,
): number[] {
  const result: number[] = [];
  groupWordsIntoLines(boxes, tolerance).forEach((indices, lineIndex) => {
    if (indices.length === 1 && lineIndex % 2 === 1) {
      result.push(indices[0]);
    }
  });
  return result;
}

// 語ごとの「詰めた位置 - 広がった位置」（px）．進み 0 のときの translateX になる．
// 行の語を，行の幅の中央へ，詰めた間隔（フォントサイズ × SPREAD_COMPACT_GAP_EM）で寄せる．
// 広がった位置の間隔のほうが狭い行は，その間隔を上限にする（広がるときに逆向きへ動かないように）
export function computeSpreadDeltas(
  boxes: readonly SpreadWordBox[],
  containerWidth: number,
  fontSize: number,
  tolerance: number = SPREAD_LINE_TOLERANCE_PX,
): number[] {
  const deltas = boxes.map(() => 0);
  if (!Number.isFinite(containerWidth) || !Number.isFinite(fontSize) || containerWidth <= 0) return deltas;

  const compactGap = Math.max(fontSize, 0) * SPREAD_COMPACT_GAP_EM;
  groupWordsIntoLines(boxes, tolerance).forEach((indices) => {
    const wordsWidth = indices.reduce((sum, index) => sum + boxes[index].width, 0);
    const last = boxes[indices[indices.length - 1]];
    const first = boxes[indices[0]];
    // 広がった位置での，語と語の間の平均（語が 1 つのときは，行の幅の余り全体）
    const spreadGap = indices.length > 1
      ? (last.left + last.width - first.left - wordsWidth) / (indices.length - 1)
      : containerWidth - wordsWidth;
    const gap = Math.min(compactGap, Math.max(spreadGap, 0));
    const compactWidth = wordsWidth + gap * (indices.length - 1);
    let cursor = (containerWidth - compactWidth) / 2;
    indices.forEach((index) => {
      deltas[index] = cursor - boxes[index].left;
      cursor += boxes[index].width + gap;
    });
  });
  return deltas;
}

// 進みに合わせた translateX（px）．進み 0 で delta（詰めた位置），1 で 0（広がった位置）
export function getSpreadOffset(delta: number, progress: number): number {
  if (!Number.isFinite(delta)) return 0;
  const offset = delta * (1 - clampUnit(progress));
  // 小数の誤差で -0 や 1e-17 が style へ書かれないようにする
  return Number(offset.toFixed(OFFSET_DIGITS)) + 0;
}

// 帯が画面を通るあいだの進み（0〜1）．
// top＝画面の上端から帯の上端までの距離（px）．上端が START 位置に来たとき 0，下端が END 位置に来たとき 1
export function getSpreadProgress(
  top: number,
  height: number,
  viewportHeight: number,
  startRatio: number = SPREAD_START_RATIO,
  endRatio: number = SPREAD_END_RATIO,
): number {
  if (!Number.isFinite(top) || !Number.isFinite(height) || !Number.isFinite(viewportHeight)) return 0;
  const startTop = viewportHeight * startRatio;
  const endTop = viewportHeight * endRatio - Math.max(height, 0);
  const travel = startTop - endTop;
  if (travel <= 0) return top <= startTop ? 1 : 0;
  return clampUnit((startTop - top) / travel);
}

// style.transform に書く値
export function toSpreadTransform(offsetPx: number): string {
  if (!Number.isFinite(offsetPx) || offsetPx === 0) return 'none';
  return `translate3d(${offsetPx}px, 0, 0)`;
}
