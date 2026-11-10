// 領域を枠の 94% に収め，周囲に余白を残す．
export const ZOOM_FILL = 0.94;
// 元画像の粗さが目立ちすぎないよう，元の表示からの拡大を制限する．
export const ZOOM_MAX_SCALE = 4;

export type ZoomRect = { x: number; y: number; w: number; h: number };
export type ZoomTransform = { scale: number; translateX: number; translateY: number };

const identity: ZoomTransform = { scale: 1, translateX: 0, translateY: 0 };
const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

// 枠と画像は同じ座標系．画像の左上を原点とする translate → scale に使う．
// 領域を余白つきで収め，上限でも中心は枠の中央へ置く．周囲の画像は枠で切れてよい．
// 未選択時は元の contain 表示を保つ．
export function getZoomTransform(image: ZoomRect, frame: ZoomRect, region: ZoomRect | null): ZoomTransform {
  if (!region || ![image, frame, region].every(rect => [rect.x, rect.y, rect.w, rect.h].every(Number.isFinite))) return { ...identity };
  if (image.w <= 0 || image.h <= 0 || frame.w <= 0 || frame.h <= 0) return { ...identity };
  const x = clampUnit(region.x);
  const y = clampUnit(region.y);
  const w = Math.min(1 - x, Math.max(0, region.w));
  const h = Math.min(1 - y, Math.max(0, region.h));
  if (w <= 0 || h <= 0) return { ...identity };
  if (x === 0 && y === 0 && w === 1 && h === 1) return { ...identity };
  const scale = Math.max(1, Math.min(ZOOM_MAX_SCALE, frame.w * ZOOM_FILL / (image.w * w), frame.h * ZOOM_FILL / (image.h * h)));
  const transform = {
    scale,
    translateX: frame.x + frame.w / 2 - image.x - image.w * (x + w / 2) * scale,
    translateY: frame.y + frame.h / 2 - image.y - image.h * (y + h / 2) * scale,
  };
  // 有限の入力でも，極端な値の演算で桁あふれした場合は元に戻す．
  return Object.values(transform).every(Number.isFinite) ? transform : { ...identity };
}
