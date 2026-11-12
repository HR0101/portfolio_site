// 環境演出の純粋計算です．DOM・外部 import・非決定的な乱数を使いません．
export const AMBIENT_MAX_DOTS = 4000;
export const AMBIENT_MAX_RAYS = 12;
export const AMBIENT_MAX_OPACITY = 0.35;
export const AMBIENT_PERIOD_MS = 20000;
const TAU = Math.PI * 2;
const GRID_SPACING = 10;
const GRID_MARGIN = 0.16;
const RIPPLE_LIFETIME_MS = 2400;

export type AmbientSeed = number | string;
export type WaveVariant = 'swell' | 'ripple' | 'rain';
export interface AmbientPoint { x: number; y: number }
export interface AmbientPointer extends AmbientPoint { strength: number; startedAtMs: number }
export interface FieldDot extends AmbientPoint { phase: number; radius: number }

export function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function bounded(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, finite(value, minimum)));
}

export function seedNumber(seed: AmbientSeed): number {
  if (typeof seed === 'number') return finite(seed) >>> 0;
  let result = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    result = Math.imul(result ^ seed.charCodeAt(index), 16777619);
  }
  return result >>> 0;
}

export function seededRandom(seed: AmbientSeed): () => number {
  let state = seedNumber(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// 整数の境目でも滑らかにつながる，-1〜1 の値ノイズです．
export function smoothNoise(position: number, seed: AmbientSeed = 0): number {
  const coordinate = finite(position);
  const cell = Math.floor(coordinate);
  const fraction = coordinate - cell;
  const blend = fraction * fraction * (3 - 2 * fraction);
  const hash = (value: number) => seededRandom((seedNumber(seed) ^ Math.imul(value, 374761393)) >>> 0)() * 2 - 1;
  return hash(cell) * (1 - blend) + hash(cell + 1) * blend;
}

export function gridShape(width: number, height: number, density = 1) {
  const w = Math.max(0, finite(width));
  const h = Math.max(0, finite(height));
  if (!w || !h) return { columns: 0, rows: 0, count: 0 };
  const spacing = GRID_SPACING / Math.sqrt(bounded(density, 0.25, 2));
  // 掛け算の前にも上限を置き，極端なサイズでも有限にします．
  let columns = Math.min(AMBIENT_MAX_DOTS, Math.max(1, Math.floor(w / spacing)));
  let rows = Math.min(AMBIENT_MAX_DOTS, Math.max(1, Math.floor(h / spacing)));
  if (columns * rows > AMBIENT_MAX_DOTS) {
    const scale = Math.sqrt(AMBIENT_MAX_DOTS / (columns * rows));
    columns = Math.max(1, Math.floor(columns * scale));
    rows = Math.max(1, Math.min(Math.floor(rows * scale), Math.floor(AMBIENT_MAX_DOTS / columns)));
  }
  return { columns, rows, count: columns * rows };
}

export function createDotGrid(width: number, height: number, density = 1, seed: AmbientSeed = 0): FieldDot[] {
  const { columns, rows } = gridShape(width, height, density);
  const random = seededRandom(seed);
  const result: FieldDot[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      result.push({
        x: (column + 0.5) / columns,
        y: GRID_MARGIN + (row + 0.5) / rows * (1 - GRID_MARGIN * 2),
        phase: random(),
        radius: 1.05 + random() * 0.85,
      });
    }
  }
  return result;
}

export function pointerWave(point: AmbientPoint, timeMs: number, pointer?: AmbientPointer): number {
  if (!pointer || pointer.strength <= 0) return 0;
  const age = bounded(timeMs - pointer.startedAtMs, 0, RIPPLE_LIFETIME_MS);
  const distance = Math.hypot(point.x - pointer.x, (point.y - pointer.y) * 0.3);
  const envelope = Math.exp(-distance * 8) * (1 - age / RIPPLE_LIFETIME_MS);
  return Math.sin(distance * 35 - age / 180) * envelope * bounded(pointer.strength, 0, 1);
}

export function wavePoint(dot: FieldDot, timeMs: number, variant: WaveVariant, seed: AmbientSeed = 0, pointer?: AmbientPointer) {
  const phase = (Math.max(0, finite(timeMs)) % AMBIENT_PERIOD_MS) / AMBIENT_PERIOD_MS * TAU;
  const offset = seededRandom(seed)() * TAU;
  const swell = Math.sin(dot.x * TAU + phase + offset) * Math.cos(dot.y * Math.PI + offset * 0.25) * 0.09;
  const distance = Math.hypot((dot.x - 0.5) * 1.5, dot.y - 0.5);
  const ripple = Math.sin(distance * 18 - phase + offset) * 0.08;
  const rainProgress = ((phase / TAU + dot.phase) % 1 + 1) % 1;
  const y = variant === 'rain' ? GRID_MARGIN + rainProgress * (1 - GRID_MARGIN * 2) : dot.y + (variant === 'ripple' ? ripple : swell);
  const edge = Math.sin(dot.x * Math.PI) ** 0.6;
  return {
    x: dot.x,
    y: bounded(y + pointerWave(dot, timeMs, pointer) * 0.065, 0.04, 0.96),
    opacity: bounded(edge * (variant === 'rain' ? Math.sin(rainProgress * Math.PI) ** 2 : 0.55 + 0.3 * Math.sin(phase + dot.y * Math.PI)), 0, 1),
    radius: dot.radius * (variant === 'rain' ? 0.65 + Math.sin(rainProgress * Math.PI) * 0.35 : 1 + swell * 2),
  };
}

// 色の塊は端に寄せ，中央にある文章の領域を空けます．
export function meshOrbit(index: number, timeMs: number, seed: AmbientSeed = 'mesh') {
  const random = seededRandom(seedNumber(seed) + index);
  const offset = random() * TAU;
  const time = Math.max(0, finite(timeMs)) / 42000 * TAU;
  return {
    x: bounded((index % 2 ? 0.85 : 0.15) + Math.sin(time + offset) * 0.14, 0, 1),
    y: bounded((index < 2 ? 0.2 : 0.8) + Math.cos(time * 0.7 + offset) * 0.16, 0, 1),
    radius: 0.42 + smoothNoise(time * 0.2 + index, seed) * 0.08,
  };
}

export function bufferSize(width: number, height: number, maxEdge = 320) {
  const w = Math.max(1, finite(width, 1));
  const h = Math.max(1, finite(height, 1));
  const ratio = Math.min(1, bounded(maxEdge, 1, 640) / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * ratio)), height: Math.max(1, Math.round(h * ratio)) };
}

// 縞の位置と向きだけが変わり，文字の輪郭は動きません．
export function metalStripe(x: number, index: number, timeMs: number, pointer?: AmbientPointer): number {
  const angle = pointer ? (bounded(pointer.x, 0, 1) - 0.5) * bounded(pointer.strength, 0, 1) * 0.18 : 0;
  const phase = Math.max(0, finite(timeMs)) / 18000 * TAU;
  return index * 0.085 + Math.sin(x * 4 + phase + index * 0.4) * 0.045 + (x - 0.5) * (0.3 + angle);
}

export function rayCount(count: number): number {
  return Math.round(bounded(count, 1, AMBIENT_MAX_RAYS));
}

export function rayGeometry(index: number, timeMs: number, origin: AmbientPoint) {
  const random = seededRandom(index + 870);
  const phase = Math.max(0, finite(timeMs)) / 28000 * TAU;
  const offset = random();
  const spread = (offset - 0.5) * 1.8;
  return {
    topX: bounded(origin.x, 0, 1),
    topY: bounded(origin.y, -0.5, 0.25),
    bottomX: bounded(origin.x, 0, 1) + spread + Math.sin(phase + offset * TAU) * 0.08 + smoothNoise(phase * 0.2 + index, 'rays') * 0.025,
    width: 0.008 + random() * 0.022,
    opacity: 0.35 + (Math.sin(phase + offset * TAU) + 1) * 0.2,
  };
}
