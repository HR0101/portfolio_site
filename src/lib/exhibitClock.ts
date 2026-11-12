// 再開直後は前の時刻を持たないので，非表示だった時間を加算しない．
export function advanceExhibitClock(elapsedMs: number, nowMs: number, previousMs: number | null) {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  if (previousMs === null || !Number.isFinite(previousMs) || !Number.isFinite(nowMs)) return elapsed;
  return elapsed + Math.max(0, nowMs - previousMs);
}
