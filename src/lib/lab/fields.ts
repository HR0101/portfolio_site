export interface FieldPoint { x: number; y: number }
export const TAU = Math.PI * 2;
const hash = (x: number, y: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
};
// 格子間を補間する連続ノイズです．乱数の状態や DOM を持ちません．
export function fieldNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u;
  const b = hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u;
  return a * (1 - v) + b * v;
}

export function wavePoint(x: number, y: number, time: number, pointer: FieldPoint | null) {
  const distance = pointer ? Math.hypot(x - pointer.x, y - pointer.y) : 3;
  const ripple = pointer ? Math.cos(distance * 34 - time * 4) * Math.exp(-distance * 5) : 0;
  const wave = Math.sin(x * 9 + time) * Math.cos(y * 7 + time * 0.6) + ripple;
  return { x, y: y + wave * 0.055, radius: 1.4 + (wave + 2) * 0.65 };
}

export function orbitPoint(x: number, y: number, time: number, pointer: FieldPoint | null, spread = 1): FieldPoint {
  const distance = pointer ? Math.hypot(x - pointer.x, y - pointer.y) : 2;
  const radius = 0.012 + Math.max(0, 1 - distance / 0.35) * 0.06 * spread;
  const angle = time + x * 5 + y * 4;
  return { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius };
}

export function spiralPoint(index: number, count: number, time: number): FieldPoint {
  const arms = 5;
  const radius = 0.43 * Math.sqrt(index / count);
  const angle = (index % arms) * TAU / arms + radius * 12 + time;
  return { x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius };
}

export function smokePoint(index: number, count: number, time: number, strength: number, center: FieldPoint): FieldPoint {
  const angle = index / count * TAU;
  const noise = fieldNoise(Math.cos(angle) * 2 + time * 0.2, Math.sin(angle) * 2 + time * 0.15);
  const radius = 0.29 + (noise - 0.5) * strength + Math.sin(angle * 3 + time) * 0.018;
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
}

export function metaballField(x: number, y: number, balls: readonly FieldPoint[], radius = 0.105): number {
  return balls.reduce((sum, ball) => sum + radius * radius / Math.max(0.0001, (x - ball.x) ** 2 + (y - ball.y) ** 2), 0);
}

export function flowAngle(x: number, y: number, time: number, direction: number, pointer: FieldPoint | null): number {
  let angle = fieldNoise(x * 3 + time * 0.05, y * 3) * TAU * 2 + (direction < 0 ? Math.PI : 0);
  if (pointer && Math.hypot(x - pointer.x, y - pointer.y) < 0.3) angle += Math.atan2(y - pointer.y, x - pointer.x) * 0.5;
  return angle;
}

export function lissajousPoint(progress: number, time: number, ratio: number): FieldPoint {
  return { x: 0.5 + Math.sin(progress * TAU * ratio + time * 0.2) * 0.4, y: 0.5 + Math.sin(progress * TAU * (ratio + 1)) * 0.4 };
}

export interface Ripple extends FieldPoint { born: number }
export function rippleHeight(x: number, y: number, time: number, ripples: readonly Ripple[]): number {
  return ripples.reduce((sum, ripple) => {
    const age = Math.max(0, time - ripple.born);
    const distance = Math.hypot(x - ripple.x, y - ripple.y);
    const wavefront = distance - age * 0.12;
    return sum + Math.sin(wavefront * 55) * Math.exp(-Math.abs(wavefront) * 8) * Math.exp(-age * 0.26);
  }, 0);
}

export interface StarSeed extends FieldPoint { phase: number }
export const MAX_STARS = 60;
export function createStarSeeds(random: () => number, count = MAX_STARS): StarSeed[] {
  return Array.from({ length: Math.min(MAX_STARS, Math.max(0, count)) }, () => ({ x: random(), y: random(), phase: random() * TAU }));
}
export function starPoint(point: StarSeed, timeMs: number): FieldPoint {
  return { x: 0.05 + point.x * 0.9 + Math.sin(timeMs * 0.0002 + point.phase) * 0.025, y: 0.05 + point.y * 0.9 + Math.cos(timeMs * 0.0002 + point.phase) * 0.025 };
}
export function metalBrightness(index: number, timeMs: number, pointerX: number, fine: boolean): number {
  const wave = Math.sin(index * (fine ? 0.38 : 0.19) + timeMs * 0.001 + pointerX * 6);
  return 0.1 + (wave + 1) * 0.42;
}
export function rayShape(index: number, count: number, timeMs: number, wide: boolean) {
  const spread = wide ? 2.5 : 1.5;
  const angle = Math.PI / 2 + (index / count - 0.5) * spread + Math.sin(timeMs * 0.0002 + index) * 0.05;
  return {
    start: { x: Math.cos(angle), y: Math.sin(angle) },
    end: { x: Math.cos(angle + 0.015), y: Math.sin(angle + 0.015) },
    alpha: 0.018 + (Math.sin(index * 1.7 + timeMs * 0.0005) + 1) * 0.025,
  };
}
