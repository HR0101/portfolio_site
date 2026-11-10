// 段階表示（stagger）の遅れを求める純粋関数．DOM に依存しない．
// 例：項目 i の遅れ = staggerDelay(i, { count })．合計が長くなりすぎないよう，上限で頭打ちにする．

export const STAGGER_STEP_MS = 50;
// 全体の遅れの上限（これを超える項目は同時に出る．読む前に待たせないため）
export const STAGGER_CAP_MS = 480;

export interface StaggerOptions {
  // 1 つあたりの遅れ（ミリ秒）
  stepMs?: number;
  // 最初の項目の遅れ（ミリ秒）
  startMs?: number;
  // 遅れの上限（ミリ秒）
  capMs?: number;
}

export function staggerDelay(index: number, options: StaggerOptions = {}): number {
  const { stepMs = STAGGER_STEP_MS, startMs = 0, capMs = STAGGER_CAP_MS } = options;
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  const safeStep = Number.isFinite(stepMs) ? Math.max(0, stepMs) : STAGGER_STEP_MS;
  const safeStart = Number.isFinite(startMs) ? Math.max(0, startMs) : 0;
  const safeCap = Number.isFinite(capMs) ? Math.max(safeStart, capMs) : STAGGER_CAP_MS;
  return Math.min(safeCap, safeStart + safeIndex * safeStep);
}

// 格子（列数 columns）に並ぶ項目の，斜めの波の遅れ．左上から右下へ広がる
export function diagonalDelay(index: number, columns: number, options: StaggerOptions = {}): number {
  const safeColumns = Number.isFinite(columns) ? Math.max(1, Math.floor(columns)) : 1;
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  const row = Math.floor(safeIndex / safeColumns);
  const column = safeIndex % safeColumns;
  return staggerDelay(row + column, options);
}

// 文字列を，数えられる単位（書記素）に分ける．絵文字・結合文字を壊さない
export function splitGraphemes(text: string): string[] {
  const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('ja', { granularity: 'grapheme' })
    : null;
  if (!segmenter) return Array.from(text);
  return Array.from(segmenter.segment(text), part => part.segment);
}
