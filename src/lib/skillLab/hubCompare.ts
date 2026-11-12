// すべて説明用の固定値．経路検索・実際の所要時間を表さない．
export const sampleOrigins = ['東京', '川崎', '船橋'] as const;
export const sampleCandidates = [
  { name: '新木場', times: [20, 35, 30] },
  { name: '東京', times: [0, 32, 35] },
  { name: '川崎', times: [20, 0, 50] },
] as const;
export const sampleTimeMax = 50;

export function rankHubCandidates(origins: readonly string[]) {
  const selected = sampleOrigins.filter(origin => origins.includes(origin));
  if (selected.length === 0) return [];
  return sampleCandidates.map((candidate, index) => {
    const journeys = selected.map(origin => ({ origin, minutes: candidate.times[sampleOrigins.indexOf(origin)] }));
    const values = journeys.map(journey => journey.minutes);
    return { name: candidate.name, journeys, spread: Math.max(...values) - Math.min(...values), index };
  }).sort((a, b) => a.spread - b.spread || a.index - b.index);
}
