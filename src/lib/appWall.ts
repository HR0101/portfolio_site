// Apps セクション「アイコンの壁」の計算（画面に触れない純粋な関数だけ）．
//
// 17 本のアプリを，最初は同じ大きさのアイコンの壁として見せる．スクロールすると壁がほどけ，
// 1 本ずつ中央で大きな紹介パネルへ育つ．まだ見ていないアプリは右の山，見終えたアプリは左の山に，小さいまま並ぶ．
// 次へ進むときに動くのは，パネルから左の山へ戻るタイルと，右の山からパネルへ育つタイルの 2 つだけ．
// 最後まで見ると，もう一度，壁へ戻る．
//
// スクロールの位置は「停止位置」q（0〜count+1 の実数）で表す．整数のときに止まって読ませ，その間で動く．
//   q = 0 … 一覧の壁 q = i + 1 … i 番目のアプリが中央のパネル q = count + 1 … 一覧の壁（最後）
// 位置の計算は進み具合だけで決まるので，スクロールに 1:1 で連動し，戻せば同じ道をたどって戻る．

export interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// タイルが居る場所の種類
export type WallKey = 'overview' | 'right' | 'panel' | 'left';

export interface WallLayout {
  width: number;
  height: number;
  // 一覧の壁での位置（すべて同じ大きさの正方形．名前の見出しの分だけ行の間をあける）
  overview: WallRect[];
  // 右の山（まだ見ていないもの）の位置．0 番目は使わない（最初のアプリは壁から直接パネルへ育つ）
  right: WallRect[];
  // 左の山（見終えたもの）の位置
  left: WallRect[];
  // 中央の紹介パネル
  panel: WallRect;
  // 山の小さなタイルの一辺と，一覧のタイルの一辺
  small: number;
  overviewSize: number;
  // 山とパネルの間隔（パネルが広がりすぎないよう上限を設けるので，広い画面では WALL_PANEL_GAP より広くなる）
  panelGap: number;
}

// タイルどうしの間隔と，アプリが多いときの一覧の壁の 1 行の列数（少ないときは 2 行になるよう，列数を減らす）
export const WALL_GAP = 12;
export const WALL_COLUMNS = 6;
// この数までは，一覧の壁を 2 行に収める（6 本なら 3 列 × 2 行）
export const WALL_TWO_ROW_LIMIT = 8;
// 一覧のタイルの下に出す名前の高さ（行の間にこの分をあける）
export const WALL_CAPTION_HEIGHT = 28;
// 山とパネルの間隔
export const WALL_PANEL_GAP = 28;
// 一覧のタイルの一辺の上限
export const WALL_OVERVIEW_MAX = 200;
// 小さなタイルの一辺の候補（大きいほうから試し，パネルの幅が足りるものを選ぶ．アプリが少ないほど大きく選べる）
const SMALL_SIZES = [104, 96, 88, 80, 76, 72, 68, 64, 60, 56, 52, 48];
// パネルに最低限ほしい幅と，広がりすぎないための上限
export const WALL_MIN_PANEL_WIDTH = 520;
export const WALL_MAX_PANEL_WIDTH = 760;
// 山が壁の高さの何割より低いとき，山を縦の中央へ寄せるか（アプリが少ないとき，山がパネルの上端に張り付かないように）
const PILE_CENTER_RATIO = 0.7;
// 山の下に残しておく余白（左下に置く惑星と重ならないように）
export const WALL_PILE_CLEARANCE = 48;

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
const smoothstep = (value: number) => value * value * (3 - 2 * value);

// 壁の寸法とアプリの数から，一覧・左右の山・中央のパネルの位置を求める
export function createWallLayout(width: number, height: number, count: number): WallLayout {
  const total = Math.max(1, Math.floor(count));

  // 一覧の壁：列数ぶんの正方形を並べ，最後の行は中央へ寄せる．少ないときは 2 行になるよう列数を決める
  const columns = total <= 3 ? total : total <= WALL_TWO_ROW_LIMIT ? Math.ceil(total / 2) : WALL_COLUMNS;
  const rows = Math.ceil(total / columns);
  const byWidth = (width - (columns - 1) * WALL_GAP) / columns;
  const byHeight = (height - (rows - 1) * WALL_GAP) / rows - WALL_CAPTION_HEIGHT;
  const overviewSize = Math.max(40, Math.floor(Math.min(byWidth, byHeight, WALL_OVERVIEW_MAX)));
  const gridWidth = columns * overviewSize + (columns - 1) * WALL_GAP;
  const gridHeight = rows * (overviewSize + WALL_CAPTION_HEIGHT) + (rows - 1) * WALL_GAP;
  const originX = (width - gridWidth) / 2;
  const originY = Math.max(0, (height - gridHeight) / 2);
  const overview: WallRect[] = Array.from({ length: total }, (_, index) => {
    const row = Math.floor(index / columns);
    const inRow = Math.min(columns, total - row * columns);
    const shift = ((columns - inRow) * (overviewSize + WALL_GAP)) / 2;
    return {
      x: originX + shift + (index % columns) * (overviewSize + WALL_GAP),
      y: originY + row * (overviewSize + WALL_CAPTION_HEIGHT + WALL_GAP),
      w: overviewSize,
      h: overviewSize,
    };
  });

  // 左右の山：パネルの幅が足りるいちばん大きなタイルの大きさを選ぶ
  const pileCount = Math.max(1, total - 1);
  const budget = Math.max(0, height - WALL_PILE_CLEARANCE);
  let small = SMALL_SIZES[SMALL_SIZES.length - 1];
  let pileRows = 1;
  let pileColumns = pileCount;
  for (const candidate of SMALL_SIZES) {
    const fitRows = Math.max(1, Math.floor((budget + WALL_GAP) / (candidate + WALL_GAP)));
    const candidateColumns = Math.ceil(pileCount / fitRows);
    // 列ごとの数がそろうよう，行数を必要な分まで減らす（5 本を 2 列に分けるなら，4 + 1 ではなく 3 + 2）
    const candidateRows = Math.ceil(pileCount / candidateColumns);
    const pileWidth = candidateColumns * (candidate + WALL_GAP) - WALL_GAP;
    small = candidate;
    pileRows = candidateRows;
    pileColumns = candidateColumns;
    if (width - 2 * pileWidth - 2 * WALL_PANEL_GAP >= WALL_MIN_PANEL_WIDTH) break;
  }
  const pileWidth = pileColumns * (small + WALL_GAP) - WALL_GAP;
  const panelWidth = Math.min(WALL_MAX_PANEL_WIDTH, Math.max(280, width - 2 * pileWidth - 2 * WALL_PANEL_GAP));
  // パネルに上限があるぶん余った幅は，山とパネルの間にあける（山は左右の端に置く）
  const panelGap = Math.max(WALL_PANEL_GAP, (width - 2 * pileWidth - panelWidth) / 2);
  const panel: WallRect = { x: pileWidth + panelGap, y: 0, w: panelWidth, h: height };
  const rightOrigin = panel.x + panelWidth + panelGap;
  // 山が低いときは，パネルの縦の中央に寄せる（山の下の余白は，惑星のドックのために残してある）
  const pileHeight = Math.min(pileRows, pileCount) * (small + WALL_GAP) - WALL_GAP;
  const pileTop = pileHeight < height * PILE_CENTER_RATIO ? Math.max(0, (budget - pileHeight) / 2) : 0;

  // 山の席は，パネルに近い列から順に，上から下へ埋める（列ごとに fill）
  const leftSlot = (slot: number): WallRect => ({
    x: pileWidth - small - Math.floor(slot / pileRows) * (small + WALL_GAP),
    y: pileTop + (slot % pileRows) * (small + WALL_GAP),
    w: small,
    h: small,
  });
  const rightSlot = (slot: number): WallRect => ({
    x: rightOrigin + Math.floor(slot / pileRows) * (small + WALL_GAP),
    y: pileTop + (slot % pileRows) * (small + WALL_GAP),
    w: small,
    h: small,
  });

  return {
    width,
    height,
    overview,
    // 右の山：1 番目のアプリが 0 番の席．0 番目のアプリは山を通らないので，同じ席で代用する
    right: Array.from({ length: total }, (_, index) => rightSlot(Math.max(0, index - 1))),
    left: Array.from({ length: total }, (_, index) => leftSlot(index)),
    panel,
    small,
    overviewSize,
    panelGap,
  };
}

// 停止位置の数：一覧（最初）・アプリの数だけのパネル・一覧（最後）
export function getWallStops(count: number): number {
  return Math.max(1, Math.floor(count)) + 2;
}

// 停止位置のあいだの，実際に動いている割合．残りはその場で止まって読ませる
export const WALL_FLIP_SHARE = 0.55;

// スクロール全体の進み具合（0〜1）から停止位置 q を求める．各停止位置の中心で止まり，境目をまたいで次へ動く
export function getWallPosition(progress: number, count: number, share: number = WALL_FLIP_SHARE): number {
  const stops = getWallStops(count);
  const last = stops - 1;
  const distance = clamp(progress) * stops - 0.5;
  if (distance <= 0) return 0;
  if (distance >= last) return last;
  const base = Math.floor(distance);
  const hold = (1 - share) / 2;
  return base + smoothstep(clamp((distance - base - hold) / share));
}

// 一覧の壁の「濃さ」：一覧のとき 1，パネルが出ているあいだ 0（名前の見出しと山の席の枠に使う）
export function getWallBlend(q: number, count: number): number {
  const total = Math.max(1, Math.floor(count));
  if (q <= 0) return 1;
  if (q < 1) return 1 - q;
  if (q >= total + 1) return 1;
  if (q > total) return q - total;
  return 0;
}

// いまいちばん近いアプリの番号（一覧のときも，近いほうの端のアプリを返す）
export function getWallActive(q: number, count: number): number {
  const total = Math.max(1, Math.floor(count));
  return Math.min(total - 1, Math.max(0, Math.round(q) - 1));
}

// 一覧の壁（最初か最後）にいるか
export function isWallOverview(q: number, count: number): boolean {
  const total = Math.max(1, Math.floor(count));
  return q < 0.5 || q > total + 0.5;
}

export interface WallKeyframe {
  q: number;
  key: WallKey;
}

// index 番目のアプリのタイルが通る場所と，その停止位置．q は厳密に増える
//   一覧 → 右の山（待つ）→ パネル → 左の山（待つ）→ 一覧．最初のアプリは右の山を通らず，最後のアプリは左の山を通らない
export function getTileKeyframes(index: number, count: number): WallKeyframe[] {
  const total = Math.max(1, Math.floor(count));
  const focus = index + 1;
  const frames: WallKeyframe[] = [{ q: 0, key: 'overview' }];
  if (index > 0) {
    frames.push({ q: 1, key: 'right' });
    if (focus - 1 > 1) frames.push({ q: focus - 1, key: 'right' });
  }
  frames.push({ q: focus, key: 'panel' });
  if (focus + 1 <= total) {
    frames.push({ q: focus + 1, key: 'left' });
    if (total > focus + 1) frames.push({ q: total, key: 'left' });
  }
  frames.push({ q: total + 1, key: 'overview' });
  return frames;
}

// パネルへ育つタイルは，出ていくタイルが退いてから動き出す．パネルから出るタイルは先に縮む（2 つが同じ場所で重なり続けないように）
const IN_DELAY = 0.3;
const OPEN_DELAY = 0.15;
const OUT_SHARE = 0.7;

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

function lerpRect(from: WallRect, to: WallRect, amount: number): WallRect {
  return { x: lerp(from.x, to.x, amount), y: lerp(from.y, to.y, amount), w: lerp(from.w, to.w, amount), h: lerp(from.h, to.h, amount) };
}

function rectOf(layout: WallLayout, key: WallKey, index: number): WallRect {
  if (key === 'overview') return layout.overview[index];
  if (key === 'right') return layout.right[index];
  if (key === 'left') return layout.left[index];
  return layout.panel;
}

// 停止位置 q での，index 番目のタイルの位置と大きさ
export function getTileRect(layout: WallLayout, index: number, q: number, count: number): WallRect {
  const frames = getTileKeyframes(index, count);
  const position = clamp(q, 0, frames[frames.length - 1].q);
  let segment = 0;
  while (segment < frames.length - 2 && position > frames[segment + 1].q) segment += 1;
  const start = frames[segment];
  const end = frames[segment + 1];
  const from = rectOf(layout, start.key, index);
  const to = rectOf(layout, end.key, index);
  if (start.key === end.key) return { ...from };
  const raw = clamp((position - start.q) / (end.q - start.q));
  let amount = raw;
  if (end.key === 'panel') {
    const delay = start.key === 'overview' ? OPEN_DELAY : IN_DELAY;
    amount = clamp((raw - delay) / (1 - delay));
  } else if (start.key === 'panel') {
    amount = clamp(raw / OUT_SHARE);
  }
  return lerpRect(from, to, amount);
}

// タイルの「育ち具合」：小さな山のタイルで 0，パネルの大きさで 1（紹介の中身の出し入れに使う）
export function getTileGrowth(layout: WallLayout, rect: WallRect): number {
  const byWidth = (rect.w - layout.small) / Math.max(1, layout.panel.w - layout.small);
  const byHeight = (rect.h - layout.small) / Math.max(1, layout.panel.h - layout.small);
  return clamp(Math.min(byWidth, byHeight));
}
