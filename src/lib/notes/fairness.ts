// すべて説明用の固定値（分）です．実際の経路検索や製品の評価式ではありません．
export const SAMPLE_ORIGINS = ['東京', '川崎', '船橋', '横浜'] as const;
export type SampleOrigin = typeof SAMPLE_ORIGINS[number];
export const SAMPLE_CANDIDATES = [
  { name: '新木場', times: { 東京: 18, 川崎: 42, 船橋: 32, 横浜: 54 } },
  { name: '東京', times: { 東京: 0, 川崎: 24, 船橋: 28, 横浜: 32 } },
  { name: '品川', times: { 東京: 12, 川崎: 10, 船橋: 42, 横浜: 22 } },
] as const;
export const DEFAULT_ORIGINS: SampleOrigin[] = ['東京', '川崎', '船橋'];
export const SAMPLE_BAR_MAX = 60;

export function isSampleOrigin(value: string): value is SampleOrigin {
  return SAMPLE_ORIGINS.some(origin => origin === value);
}

export function getTimeSpread(times: readonly number[]) {
  const valid = times.filter(time => Number.isFinite(time) && time >= 0);
  if (valid.length === 0) return { min: 0, max: 0, spread: 0, total: 0 };
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  return { min, max, spread: max - min, total: valid.reduce((sum, time) => sum + time, 0) };
}

export function compareSampleCandidates(origins: readonly SampleOrigin[]) {
  return SAMPLE_CANDIDATES.map(candidate => {
    const times = origins.map(origin => candidate.times[origin]);
    return { name: candidate.name, times, ...getTimeSpread(times) };
  }).sort((a, b) => a.spread - b.spread || a.total - b.total);
}
