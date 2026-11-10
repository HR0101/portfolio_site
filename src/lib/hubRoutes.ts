// 図の座標と時間は展示用．実際の線路・所要時間・利用者の位置ではない．
export const hubDestination = { x: 240, y: 156, name: '新木場' };
export const hubRoutes = [
  { name: '東京', start: { x: 48, y: 52 }, control: { x: 156, y: 52 } },
  { name: '川崎', start: { x: 48, y: 208 }, control: { x: 156, y: 208 } },
  { name: '船橋', start: { x: 328, y: 52 }, control: { x: 328, y: 156 } },
] as const;
export const hubPhaseStarts = [0, 2000, 6500] as const;
export const hubManualTimes = [0, 4250, 6500] as const;
export const hubCycleMs = 12000;
export const hubRepresentativePhase = 2;
export const hubManualMoveMs = 400;
const hubMotionSegments = 32;

const stationLabelGap = 16;
export const hubResultLabels = { name: { x: 240, y: 192 }, caption: { x: 240, y: 211 } };

type HubRoute = { start: { x: number; y: number }; control: { x: number; y: number } };

export function getHubStationLabel(route: HubRoute) {
  return { x: route.start.x, y: route.start.y - stationLabelGap };
}

export function getHubPoint(route: HubRoute, progress: number) {
  const t = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const remaining = 1 - t;
  return {
    x: remaining * remaining * route.start.x + 2 * remaining * t * route.control.x + t * t * hubDestination.x,
    y: remaining * remaining * route.start.y + 2 * remaining * t * route.control.y + t * t * hubDestination.y,
  };
}

export function getHubFrame(elapsedMs: number) {
  const time = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) % hubCycleMs : 0;
  const phase = time < hubPhaseStarts[1] ? 0 : time < hubPhaseStarts[2] ? 1 : 2;
  const progress = phase === 0 ? 0 : phase === 2 ? 1 : (time - hubPhaseStarts[1]) / (hubPhaseStarts[2] - hubPhaseStarts[1]);
  return { phase, progress };
}

// WAAPI の全体イージング適用後の進み具合から，取消時の経路上の位置を戻す．
export function getHubInterruptedProgress(from: number, to: number, easedProgress: number | null) {
  const progress = easedProgress === null ? 0 : Number.isFinite(easedProgress) ? Math.min(1, Math.max(0, easedProgress)) : 0;
  return from + (to - from) * progress;
}

// 曲線を短い区間へ分ける．手動切替でも直線の近道をせず，既存の線をたどる．
export function getHubMotionFrames(route: HubRoute, from: number, to: number) {
  return Array.from({ length: hubMotionSegments + 1 }, (_, index) => {
    const point = getHubPoint(route, getHubInterruptedProgress(from, to, index / hubMotionSegments));
    return { transform: `translate(${point.x}px, ${point.y}px)` };
  });
}
