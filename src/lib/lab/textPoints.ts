export interface TextPoint { x: number; y: number }
export const MAX_TEXT_POINTS = 700;
// Canvas のピクセル列だけを受け取り，DOM に依存せず座標へ変換します．
export function sampleTextMask(rgba: ArrayLike<number>, width: number, height: number, spacing = 4, limit = MAX_TEXT_POINTS): TextPoint[] {
  if (width < 1 || height < 1 || !Number.isFinite(spacing) || spacing < 1 || !Number.isFinite(limit) || limit < 1) return [];
  const candidates: TextPoint[] = [];
  const stride = Math.max(1, Math.floor(spacing));
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      if (rgba[(y * width + x) * 4 + 3] > 128) candidates.push({ x: x / width, y: y / height });
    }
  }
  const count = Math.min(candidates.length, Math.floor(limit));
  return Array.from({ length: count }, (_, i) => candidates[Math.floor(i * candidates.length / count)]);
}

export function textCycle(timeMs: number, durationMs = 5000) {
  const safeTime = Number.isFinite(timeMs) ? Math.max(0, timeMs) : 0;
  const phase = safeTime / durationMs;
  const transition = Math.max(0, Math.min(1, (phase % 1 - 0.64) / 0.36));
  return { from: Math.floor(phase) % 3, to: (Math.floor(phase) + 1) % 3, mix: transition * transition * (3 - 2 * transition) };
}

export function morphTextPoint(from: TextPoint, to: TextPoint, mix: number, pointer: TextPoint | null, index: number): TextPoint {
  const x = from.x + (to.x - from.x) * mix;
  const y = from.y + (to.y - from.y) * mix;
  if (!pointer) return { x, y };
  const dx = x - pointer.x;
  const dy = y - pointer.y;
  const distance = Math.hypot(dx, dy);
  const force = Math.max(0, 1 - distance / 0.22) * 0.16;
  const angle = distance > 0.001 ? Math.atan2(dy, dx) : index * 2.399;
  return { x: x + Math.cos(angle) * force, y: y + Math.sin(angle) * force };
}
