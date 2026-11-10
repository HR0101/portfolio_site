// 流体タブの計算（伸び・雫の変形・フィルタの係数）．画面に触れない純粋な関数だけを置く．
// 他のファイルを読み込まない（テストが TS をそのまま読み込めるようにするため）．

// 先頭の雫：速く，行き過ぎない（臨界減衰）
export const LIQUID_LEAD_RESPONSE_SEC = 0.28;
export const LIQUID_LEAD_DAMPING_RATIO = 1;
// 後続の雫：遅れて，ほんの少し行き過ぎながら追いつく
export const LIQUID_TRAIL_RESPONSE_SEC = 0.42;
export const LIQUID_TRAIL_DAMPING_RATIO = 0.85;
// 伸びの上限（0.35 なら，進む向きに最大 1.35 倍）
export const LIQUID_STRETCH_MAX = 0.35;
// 速さ（px/秒）をこの値で割った分だけ伸ばす
export const LIQUID_STRETCH_SPEED_DIVISOR = 2400;
// 雫をつなぐぼかしの強さと，アルファのしきい値（アルファ × 20 − 9）
export const LIQUID_BLUR_STD_DEVIATION = 6;
export const LIQUID_ALPHA_GAIN = 20;
export const LIQUID_ALPHA_OFFSET = -9;
// ぼかしがはみ出しても欠けないよう，雫の層を親より外へ広げる幅（px．ぼかしの 4 倍）
export const LIQUID_BLEED_PX = LIQUID_BLUR_STD_DEVIATION * 4;
// 止まったとみなす，位置・大きさの差（px）と速さ（px/秒）
export const LIQUID_REST_POSITION_PX = 0.05;
export const LIQUID_REST_VELOCITY_PX = 0.5;

export interface LiquidBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LiquidStretch {
  scaleX: number;
  scaleY: number;
}

export interface LiquidDropTransform {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
}

const finiteOr = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);

// 進む向きに伸び，直交する向きは面積が変わらないよう縮める．
// 速さに応じて scale = 1 + min(0.35, |v| / 2400)，直交は 1 / √scale．水平か垂直か，速いほうの向きで伸ばす
export function getLiquidStretch(velocityX: number, velocityY: number): LiquidStretch {
  const speedX = Math.abs(finiteOr(velocityX, 0));
  const speedY = Math.abs(finiteOr(velocityY, 0));
  const along = 1 + Math.min(LIQUID_STRETCH_MAX, Math.max(speedX, speedY) / LIQUID_STRETCH_SPEED_DIVISOR);
  const across = 1 / Math.sqrt(along);
  return speedY > speedX ? { scaleX: across, scaleY: along } : { scaleX: along, scaleY: across };
}

// 見た目の箱（x, y, w, h）を，基準の大きさ（base）の雫の translate と scale で表す．
// 雫の中心を基準に拡縮するので，見た目の中心は箱の中心と一致し，width / height は動かさずに済む．
// bleed は雫の層を親の外へ広げた幅（層の左上が親の左上から bleed だけ外にある）
export function getLiquidDropTransform(
  box: LiquidBox,
  base: { w: number; h: number },
  bleed: number,
  stretch: LiquidStretch = { scaleX: 1, scaleY: 1 },
): LiquidDropTransform {
  const baseWidth = base.w > 0 ? base.w : 1;
  const baseHeight = base.h > 0 ? base.h : 1;
  const width = Math.max(0, finiteOr(box.w, 0));
  const height = Math.max(0, finiteOr(box.h, 0));
  const centerX = finiteOr(box.x, 0) + width / 2 + bleed;
  const centerY = finiteOr(box.y, 0) + height / 2 + bleed;
  return {
    translateX: centerX - baseWidth / 2,
    translateY: centerY - baseHeight / 2,
    scaleX: (width / baseWidth) * stretch.scaleX,
    scaleY: (height / baseHeight) * stretch.scaleY,
  };
}

// SVG の feColorMatrix に渡す値．色はそのまま，アルファだけをしきい値で締めて，ぼかした雫を 1 つの面に見せる
export function getLiquidAlphaMatrix(): string {
  return `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${LIQUID_ALPHA_GAIN} ${LIQUID_ALPHA_OFFSET}`;
}
