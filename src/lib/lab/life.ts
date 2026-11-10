export const LIFE_COLUMNS = 48;
export const LIFE_ROWS = 32;
export const LIFE_RESEED_MS = 3200;
export const RH_CELLS = ['11110010001', '10001010001', '10001010001', '11110011111', '10100010001', '10010010001', '10001010001'] as const;

export function createRhLife(columns = LIFE_COLUMNS, rows = LIFE_ROWS, offset = 0): Uint8Array {
  const cells = new Uint8Array(columns * rows);
  const left = Math.floor((columns - RH_CELLS[0].length) / 2) + offset;
  const top = Math.floor((rows - RH_CELLS.length) / 2);
  RH_CELLS.forEach((line, y) => [...line].forEach((cell, x) => {
    if (cell === '1') cells[((top + y + rows) % rows) * columns + ((left + x + columns) % columns)] = 1;
  }));
  return cells;
}

export function nextLife(cells: Uint8Array, columns: number, rows: number): Uint8Array {
  const next = new Uint8Array(columns * rows);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          neighbors += cells[((y + dy + rows) % rows) * columns + (x + dx + columns) % columns];
        }
      }
      const index = y * columns + x;
      next[index] = neighbors === 3 || (cells[index] === 1 && neighbors === 2) ? 1 : 0;
    }
  }
  return next;
}

export function lifeIsSettled(current: Uint8Array, next: Uint8Array, older?: Uint8Array): boolean {
  return !next.some(Boolean) || next.every((cell, i) => cell === current[i]) || !!older && next.every((cell, i) => cell === older[i]);
}

export function shouldReseedLife(settledMs: number): boolean {
  return Number.isFinite(settledMs) && settledMs >= LIFE_RESEED_MS;
}

export function paintLife(cells: Uint8Array, columns: number, rows: number, from: { x: number; y: number }, to: { x: number; y: number }): Uint8Array {
  const painted = cells.slice();
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y), 1);
  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(from.x + (to.x - from.x) * step / steps);
    const y = Math.round(from.y + (to.y - from.y) * step / steps);
    if (x >= 0 && x < columns && y >= 0 && y < rows) painted[y * columns + x] = 1;
  }
  return painted;
}
