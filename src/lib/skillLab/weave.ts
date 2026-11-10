// 作品の処理時間ではなく，名前を説明する12秒の図解．完成を4秒保つ．
export const weavePhaseStarts = [0, 2500, 4500, 8000] as const;
export const weaveCycleMs = 12000;
export const weaveManualTimes = [2300, 4000, 6500, 8000] as const;
export const weaveLabels = ['断片が届く', '近いものが集まる', '経糸と緯糸が通る', 'カードとして読む'] as const;
// 位置は図解専用．布の生成処理ではなく，ラベルと線の移動だけを定義する．
export const weaveFragments = [
  { label: '記事の語', from: [28, 48], to: [100, 92] },
  { label: '要点', from: [430, 36], to: [220, 92] },
  { label: '出典', from: [72, 246], to: [100, 154] },
  { label: '参照先', from: [460, 136], to: [220, 154] },
  { label: '公開日', from: [12, 142], to: [100, 216] },
  { label: '更新日', from: [398, 260], to: [220, 216] },
] as const;
export const weaveLineCount = 6;
const arrivalWindowMs = 1000;
const arrivalDelayMs = 220;
const warpSweep = 2;
const weftSweep = 2.6;
const weftDelay = 0.7;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function getWeaveFrame(elapsedMs: number) {
  const time = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) % weaveCycleMs : 0;
  const phase = time < weavePhaseStarts[1] ? 0 : time < weavePhaseStarts[2] ? 1 : time < weavePhaseStarts[3] ? 2 : 3;
  const gather = Math.min(1, Math.max(0, (time - weavePhaseStarts[1]) / (weavePhaseStarts[2] - weavePhaseStarts[1])));
  const threads = Math.min(1, Math.max(0, (time - weavePhaseStarts[2]) / (weavePhaseStarts[3] - weavePhaseStarts[2])));
  const card = phase === 3 ? 1 : 0;
  return {
    phase, time, gather, threads, card,
    fragments: weaveFragments.map((fragment, index) => ({
      x: fragment.from[0] + (fragment.to[0] - fragment.from[0]) * gather,
      y: fragment.from[1] + (fragment.to[1] - fragment.from[1]) * gather,
      opacity: clamp((time - index * arrivalDelayMs) / arrivalWindowMs) * (1 - card),
    })),
    warp: Array.from({ length: weaveLineCount }, (_, index) => clamp(threads * warpSweep - index / weaveLineCount)),
    weft: Array.from({ length: weaveLineCount }, (_, index) => clamp(threads * weftSweep - weftDelay - index / weaveLineCount)),
  };
}
