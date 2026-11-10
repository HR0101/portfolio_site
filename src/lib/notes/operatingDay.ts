export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
export const OPERATING_DAY_BOUNDARY = 4 * MINUTES_PER_HOUR;
export const TIMELINE_END = 28 * MINUTES_PER_HOUR;

// 説明用の固定時刻表です．BusTimeApp の実データではありません．
export const SAMPLE_DEPARTURES = [240, 420, 720, 1080, 1430, 1500, 1620] as const;

// 基準日の0時からの分数を受け取り，参照する運行日の相対日（前日=-1）を返します．
export function getOperatingDay(minutes: number): number {
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
  return Math.floor((safeMinutes - OPERATING_DAY_BOUNDARY) / MINUTES_PER_DAY);
}

export function formatMinutes(minutes: number): string {
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  const hours = Math.floor(safeMinutes / MINUTES_PER_HOUR);
  return `${hours}:${String(safeMinutes % MINUTES_PER_HOUR).padStart(2, '0')}`;
}

export function getOperatingDaySample(minutes: number) {
  const safeMinutes = Number.isFinite(minutes) ? Math.min(TIMELINE_END, Math.max(0, Math.floor(minutes))) : 0;
  const day = getOperatingDay(safeMinutes);
  const timetableMinutes = safeMinutes - day * MINUTES_PER_DAY;
  const remaining = SAMPLE_DEPARTURES.filter(departure => departure >= timetableMinutes);
  return { day, timetableMinutes, remaining };
}
