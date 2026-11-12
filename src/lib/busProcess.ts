// 展示の時間配分．実際のアプリの処理時間を表すものではない．
export const busPhaseStarts = [0, 2500, 5000] as const;
export const busCycleMs = 10000;
export const busRepresentativePhase = 2;

export function getBusFrame(elapsedMs: number) {
  const time = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) % busCycleMs : 0;
  const phase = time < busPhaseStarts[1] ? 0 : time < busPhaseStarts[2] ? 1 : 2;
  return { phase, time };
}
