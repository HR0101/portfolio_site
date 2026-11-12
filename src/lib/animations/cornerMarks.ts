// 画面の枠の四隅と上下の辺に置く「＋」の印の配置を求める純粋関数．
// 他のファイルを import しない自己完結のモジュールで，DOM にも触れない（単体テストは tests/anim-corner-marks.test.mjs）．
//
// 印は，枠の上辺と下辺を等分した点（両端 = 四隅を含む）に置く．
// 下辺の中央にラベルを置くときは，その位置の印を省く（ラベルが印の代わりになる）．
// 登場は，中央に近い印から外へ向かって，印ごとに少しずつ遅らせる．

// 上辺・下辺の等分数の既定値と，許す範囲
export const CORNER_MARK_DEFAULT_DIVISIONS = 4;
export const CORNER_MARK_MIN_DIVISIONS = 1;
export const CORNER_MARK_MAX_DIVISIONS = 8;
// 印ごとの登場の遅れ（ミリ秒）
export const CORNER_MARK_STAGGER_MS = 30;
// 印が所定の位置へ広がる時間（ミリ秒）．CSS の var(--dur-slow) と同じ値
export const CORNER_MARK_DURATION_MS = 420;
// 辺の中央（0〜1）．ラベルを置く位置
const EDGE_CENTER = 0.5;
// 位置を比べるときの許容差
const FRACTION_EPSILON = 1e-9;

export type CornerMarkEdge = 'top' | 'bottom';

export interface CornerMarkSpec {
  // 並びの中で安定したキー
  key: string;
  // 辺の上での位置（0 = 左端，1 = 右端）
  fraction: number;
  edge: CornerMarkEdge;
  // 枠の外へ向かう向き．左右は，左端で -1，右端で 1，途中は 0
  dx: -1 | 0 | 1;
  // 枠の外へ向かう向き．上辺で -1，下辺で 1
  dy: -1 | 1;
  // 登場の順番（0 から．中央に近い印が先）
  order: number;
}

// 等分数を，許す範囲の整数へ丸める（数でない値は既定値）
export function normalizeDivisions(value: number): number {
  if (!Number.isFinite(value)) {
    return CORNER_MARK_DEFAULT_DIVISIONS;
  }
  return Math.min(CORNER_MARK_MAX_DIVISIONS, Math.max(CORNER_MARK_MIN_DIVISIONS, Math.round(value)));
}

// 上辺と下辺に置く印の一覧を，登場の順番つきで返す．hasLabel が true のとき，下辺の中央の印は省く
export function getCornerMarkLayout(divisions: number, hasLabel: boolean): CornerMarkSpec[] {
  const count = normalizeDivisions(divisions);
  const marks: Omit<CornerMarkSpec, 'order'>[] = [];
  (['top', 'bottom'] as const).forEach((edge) => {
    for (let index = 0; index <= count; index += 1) {
      const fraction = index / count;
      const isLabelSpot = edge === 'bottom' && hasLabel && Math.abs(fraction - EDGE_CENTER) < FRACTION_EPSILON;
      if (isLabelSpot) continue;
      marks.push({
        key: `${edge}-${index}`,
        fraction,
        edge,
        dx: index === 0 ? -1 : index === count ? 1 : 0,
        dy: edge === 'top' ? -1 : 1,
      });
    }
  });
  // 中央に近い印から先に．同じ距離なら上辺が先，それも同じなら左が先
  const sorted = [...marks].sort((a, b) => {
    const distance = Math.abs(a.fraction - EDGE_CENTER) - Math.abs(b.fraction - EDGE_CENTER);
    if (Math.abs(distance) > FRACTION_EPSILON) return distance;
    if (a.edge !== b.edge) return a.edge === 'top' ? -1 : 1;
    return a.fraction - b.fraction;
  });
  return sorted.map((mark, order) => ({ ...mark, order }));
}

// 登場の順番から，遅れ（ミリ秒）を求める．baseMs は全体の遅れ
export function getCornerMarkDelay(order: number, baseMs = 0): number {
  const safeOrder = Number.isFinite(order) ? Math.max(0, Math.round(order)) : 0;
  const safeBase = Number.isFinite(baseMs) ? Math.max(0, baseMs) : 0;
  return safeBase + safeOrder * CORNER_MARK_STAGGER_MS;
}
