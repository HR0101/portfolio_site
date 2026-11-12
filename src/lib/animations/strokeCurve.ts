// 章の間を横切る太い曲線が，スクロールで描かれるときの計算（純粋関数）．
// 他のファイルを import しない自己完結のモジュールで，DOM にも触れない（単体テストは tests/anim-stroke-curve.test.mjs）．
//
// 流れ
//   帯の位置（画面の上端から帯の上端までの距離）→ getCurveProgress で 0〜1 の進み
//   → getCurveDash で stroke-dasharray / stroke-dashoffset（path に pathLength=1 を付けて使う）
// 曲線の形は，帯の実際の大きさ（px）から作る（getCurveSegments / buildCurvePath）．
// viewBox を帯の大きさに合わせるので，伸び縮みで線の太さが歪まない．

// 曲線の形．arc＝左から入って下へ大きく弧を描く，crest＝右から入って上へ弧を描く，wave＝S 字
export type StrokeCurveVariant = 'arc' | 'crest' | 'wave';
export const STROKE_CURVE_VARIANTS: readonly StrokeCurveVariant[] = ['arc', 'crest', 'wave'];

// 小さい画面とみなす幅（px）．これより狭いと線を細くする
export const CURVE_NARROW_VIEWPORT_PX = 761;
// 小さい画面での線の太さ（px）
export const CURVE_NARROW_STROKE_PX = 28;
// 広い画面での線の太さ（px）．帯の幅に比例させ，下限と上限の間に収める
export const CURVE_MIN_STROKE_PX = 40;
export const CURVE_MAX_STROKE_PX = 60;
export const CURVE_STROKE_PER_WIDTH = 0.04;
// 線の上下に残す余白（px）．帯からはみ出して切れないようにする
export const CURVE_VERTICAL_MARGIN_PX = 8;

// 帯の上端が画面の上からこの割合（画面の高さに対する割合）の位置に来たら，描き始める
export const CURVE_START_RATIO = 0.92;
// 帯の下端が画面の上からこの割合の位置に来たら，描き終わる
export const CURVE_END_RATIO = 0.42;

// pathLength=1 に正規化した線の，1 本ぶんの長さと，その後ろに空ける隙間．
// 隙間を 1 より大きくするのは，進みが 0 のとき丸い端点の「点」が残らないようにするため
export const CURVE_DASH_LENGTH = 1;
export const CURVE_DASH_GAP = 2;
const CURVE_DASH_PATTERN = `${CURVE_DASH_LENGTH} ${CURVE_DASH_GAP}`;
const CURVE_DASH_DIGITS = 4;

export interface CurveDash {
  // stroke-dasharray に書く値（描き終えたら 'none'）
  dashArray: string;
  // stroke-dashoffset に書く値
  dashOffset: number;
}

export interface CurvePoint {
  x: number;
  y: number;
}

// 3 次ベジェ曲線の 1 区間
export interface CurveSegment {
  p0: CurvePoint;
  p1: CurvePoint;
  p2: CurvePoint;
  p3: CurvePoint;
}

// 値を 0〜1 に丸める（数でないときは 0）
function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

// 帯が画面を通るあいだの進み（0〜1）．
// top＝画面の上端から帯の上端までの距離（px．帯が下から入ってくるあいだは大きい）
// 上端が画面の START 位置に来たとき 0，下端が END 位置に来たとき 1 になり，その間は 1:1 で進む
export function getCurveProgress(
  top: number,
  height: number,
  viewportHeight: number,
  startRatio: number = CURVE_START_RATIO,
  endRatio: number = CURVE_END_RATIO,
): number {
  if (!Number.isFinite(top) || !Number.isFinite(height) || !Number.isFinite(viewportHeight)) return 0;
  const startTop = viewportHeight * startRatio;
  // 下端が END 位置に来るときの上端の位置
  const endTop = viewportHeight * endRatio - Math.max(height, 0);
  const travel = startTop - endTop;
  if (travel <= 0) return top <= startTop ? 1 : 0;
  return clampUnit((startTop - top) / travel);
}

// 進みから，線を描く長さを決める値へ．
// 描き始める前は隙間の中（何も見えない），描き終えたら破線をやめて 1 本の線にする
export function getCurveDash(progress: number): CurveDash {
  const safe = clampUnit(progress);
  if (safe >= 1) return { dashArray: 'none', dashOffset: 0 };
  const offset = Number((CURVE_DASH_LENGTH - safe * CURVE_DASH_LENGTH).toFixed(CURVE_DASH_DIGITS));
  return { dashArray: CURVE_DASH_PATTERN, dashOffset: offset };
}

// 線の太さ（px）．小さい画面は細く，広い画面は帯の幅に比例して 40〜60px
export function getCurveStrokeWidth(bandWidth: number): number {
  if (!Number.isFinite(bandWidth) || bandWidth < CURVE_NARROW_VIEWPORT_PX) return CURVE_NARROW_STROKE_PX;
  const scaled = Math.round(bandWidth * CURVE_STROKE_PER_WIDTH);
  return Math.min(Math.max(scaled, CURVE_MIN_STROKE_PX), CURVE_MAX_STROKE_PX);
}

// 曲線を作るときの枠
interface CurveFrame {
  width: number;
  left: number;
  right: number;
  fx: (ratio: number) => number;
  fy: (ratio: number) => number;
}

// 帯の幅・高さ・線の太さから，曲線を作る枠を求める．
// 線は左右の外側（太さぶん）から始まって外側で終わり，上下は太さの半分＋余白の内側に収まる
function createFrame(width: number, height: number, strokeWidth: number): CurveFrame {
  const safeWidth = Math.max(Number.isFinite(width) ? width : 0, 1);
  const safeHeight = Math.max(Number.isFinite(height) ? height : 0, 1);
  const inset = Math.ceil(strokeWidth / 2) + CURVE_VERTICAL_MARGIN_PX;
  const usable = Math.max(safeHeight - inset * 2, 1);
  return {
    width: safeWidth,
    left: -strokeWidth,
    right: safeWidth + strokeWidth,
    fx: (ratio) => safeWidth * ratio,
    fy: (ratio) => inset + usable * ratio,
  };
}

function segment(p0: CurvePoint, p1: CurvePoint, p2: CurvePoint, p3: CurvePoint): CurveSegment {
  return { p0, p1, p2, p3 };
}

// 形ごとの区間．座標は枠の割合で書き，端だけ画面の外側（left / right）に置く．
// flip＝true なら，左右を反転する（左から入る形が右から入り，描かれる向きも逆になる）
export function getCurveSegments(
  variant: StrokeCurveVariant,
  width: number,
  height: number,
  strokeWidth: number,
  flip = false,
): CurveSegment[] {
  const segments = createSegments(variant, width, height, strokeWidth);
  if (!flip) return segments;
  const safeWidth = Math.max(Number.isFinite(width) ? width : 0, 1);
  const mirror = (point: CurvePoint): CurvePoint => ({ x: safeWidth - point.x, y: point.y });
  return segments.map((item) => segment(mirror(item.p0), mirror(item.p1), mirror(item.p2), mirror(item.p3)));
}

function createSegments(
  variant: StrokeCurveVariant,
  width: number,
  height: number,
  strokeWidth: number,
): CurveSegment[] {
  const { left, right, fx, fy } = createFrame(width, height, strokeWidth);

  if (variant === 'crest') {
    // 右から入り，上へ大きく盛り上がって，左へ抜ける
    return [
      segment(
        { x: right, y: fy(0.9) },
        { x: fx(0.82), y: fy(-0.14) },
        { x: fx(0.36), y: fy(-0.14) },
        { x: left, y: fy(1) },
      ),
    ];
  }

  if (variant === 'wave') {
    // 左から入り，いったん下がって上がる S 字．2 区間のつなぎ目で向きがそろっている
    return [
      segment(
        { x: left, y: fy(0.28) },
        { x: fx(0.3), y: fy(0.28) },
        { x: fx(0.3), y: fy(0.9) },
        { x: fx(0.5), y: fy(0.62) },
      ),
      segment(
        { x: fx(0.5), y: fy(0.62) },
        { x: fx(0.7), y: fy(0.34) },
        { x: fx(0.7), y: fy(0.08) },
        { x: right, y: fy(0.12) },
      ),
    ];
  }

  // arc: 左から入り，下へ大きく弧を描いて，右の上へ抜ける
  return [
    segment(
      { x: left, y: fy(0.12) },
      { x: fx(0.22), y: fy(1.12) },
      { x: fx(0.64), y: fy(1.12) },
      { x: right, y: fy(0.04) },
    ),
  ];
}

// 小数 1 桁へ丸めた文字列にする（path の d を短くする）
function formatNumber(value: number): string {
  return Number(value.toFixed(1)).toString();
}

function formatPoint(point: CurvePoint): string {
  return `${formatNumber(point.x)} ${formatNumber(point.y)}`;
}

// 曲線の path の d 属性
export function buildCurvePath(
  variant: StrokeCurveVariant,
  width: number,
  height: number,
  strokeWidth: number,
  flip = false,
): string {
  const segments = getCurveSegments(variant, width, height, strokeWidth, flip);
  const commands = [`M ${formatPoint(segments[0].p0)}`];
  segments.forEach((item) => {
    commands.push(`C ${formatPoint(item.p1)} ${formatPoint(item.p2)} ${formatPoint(item.p3)}`);
  });
  return commands.join(' ');
}

// 3 次ベジェ曲線の，媒介変数 t（0〜1）での点
export function sampleSegment(item: CurveSegment, t: number): CurvePoint {
  const inverse = 1 - t;
  const a = inverse * inverse * inverse;
  const b = 3 * inverse * inverse * t;
  const c = 3 * inverse * t * t;
  const d = t * t * t;
  return {
    x: a * item.p0.x + b * item.p1.x + c * item.p2.x + d * item.p3.x,
    y: a * item.p0.y + b * item.p1.y + c * item.p2.y + d * item.p3.y,
  };
}
