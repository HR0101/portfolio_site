export const CLOTH_COLUMNS = 22;
export const CLOTH_ROWS = 16;
export const CLOTH_MAX_POINTS = CLOTH_COLUMNS * CLOTH_ROWS;
export const CLOTH_ITERATIONS = 7;
const CLOTH_DAMPING = 0.975;
export interface ClothPoint { x: number; y: number; previousX: number; previousY: number; fixed: boolean }
export interface ClothLink { a: number; b: number; length: number }
export interface Cloth { points: ClothPoint[]; links: ClothLink[]; columns: number; rows: number }

export function createCloth(columns = CLOTH_COLUMNS, rows = CLOTH_ROWS): Cloth {
  columns = Math.min(CLOTH_COLUMNS, Math.max(2, Math.floor(columns)));
  rows = Math.min(CLOTH_ROWS, Math.max(2, Math.floor(rows)));
  const points = Array.from({ length: columns * rows }, (_, index) => {
    const x = 0.14 + (index % columns) / (columns - 1) * 0.72;
    const y = 0.1 + Math.floor(index / columns) / (rows - 1) * 0.66;
    return { x, y, previousX: x, previousY: y, fixed: index < columns };
  });
  const links: ClothLink[] = [];
  points.forEach((point, index) => {
    for (const other of [index % columns ? index - 1 : -1, index >= columns ? index - columns : -1]) {
      if (other >= 0) links.push({ a: index, b: other, length: Math.hypot(point.x - points[other].x, point.y - points[other].y) });
    }
  });
  return { points, links, columns, rows };
}

export function clothWind(timeMs: number, row: number): number {
  return Math.sin(timeMs * 0.0007 + row * 0.22) * 0.00017 + Math.sin(timeMs * 0.0013 + row * 0.41) * 0.00008;
}

export function constrainCloth(cloth: Cloth, iterations = CLOTH_ITERATIONS): Cloth {
  const points = cloth.points.map(point => ({ ...point }));
  for (let pass = 0; pass < Math.min(CLOTH_ITERATIONS, Math.max(0, iterations)); pass += 1) {
    for (const link of cloth.links) {
      const a = points[link.a];
      const b = points[link.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 1;
      const weight = a.fixed || b.fixed ? 1 : 0.5;
      const correction = (distance - link.length) / distance * weight;
      if (!a.fixed) { a.x += dx * correction; a.y += dy * correction; }
      if (!b.fixed) { b.x -= dx * correction; b.y -= dy * correction; }
    }
  }
  return { ...cloth, points };
}

export function stepCloth(cloth: Cloth, timeMs: number, deltaMs: number, pointer: { x: number; y: number } | null = null): Cloth {
  const step = Math.min(2, Math.max(0, deltaMs / (1000 / 60)));
  if (step === 0) return cloth;
  const points = cloth.points.map((point, index) => {
    if (point.fixed) return { ...point };
    let x = point.x + (point.x - point.previousX) * CLOTH_DAMPING + clothWind(timeMs, Math.floor(index / cloth.columns)) * step * step;
    let y = point.y + (point.y - point.previousY) * CLOTH_DAMPING + 0.00006 * step * step;
    if (pointer) {
      const dx = point.x - pointer.x;
      const dy = point.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      const push = Math.max(0, 1 - distance / 0.16) * 0.014;
      x += (dx / (distance || 1)) * push;
      y += (dy / (distance || 1)) * push + push * 0.4;
    }
    return { ...point, x, y, previousX: point.x, previousY: point.y };
  });
  return constrainCloth({ ...cloth, points });
}
