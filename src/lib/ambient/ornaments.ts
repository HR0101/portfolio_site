// 章の記号の固定座標です．草の濃さは装飾であり，GitHub の実績値ではありません．
export type OrnamentSection = 'about' | 'skills' | 'apps' | 'works' | 'github' | 'profile' | 'contact';
export interface OrnamentDot { x: number; y: number; opacity: number }
const TAU = Math.PI * 2;
const GRID_SIZE = 7;
const CIRCLE_DOTS = 48;

export const ORNAMENT_CHAPTERS: Record<OrnamentSection, string> = {
  about: '01', skills: '02', apps: '03', works: '04', github: '05', profile: '06', contact: '07',
};

export function ornamentPoints(section: OrnamentSection): OrnamentDot[] {
  const dots: OrnamentDot[] = [];
  const add = (x: number, y: number, opacity = 0.8) => dots.push({ x, y, opacity });
  if (section === 'about') {
    for (let index = 0; index < 16; index += 1) {
      const angle = index / 16 * TAU;
      add(0.5 + Math.cos(angle) * 0.12, 0.23 + Math.sin(angle) * 0.12);
    }
    for (let index = 0; index <= 12; index += 1) {
      const t = index / 12;
      add(0.5, 0.4 + t * 0.28);
      add(0.5 + (t - 0.5) * 0.56, 0.48);
      add(0.5 - t * 0.18, 0.68 + t * 0.22);
      add(0.5 + t * 0.18, 0.68 + t * 0.22);
    }
  } else if (section === 'skills' || section === 'github') {
    const columns = section === 'github' ? 10 : GRID_SIZE;
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        add(0.12 + column / (columns - 1) * 0.76, 0.18 + row / (GRID_SIZE - 1) * 0.64,
          section === 'github' ? 0.2 + ((column * 7 + row * 11) % 5) * 0.15 : 0.75);
      }
    }
  } else if (section === 'apps') {
    for (let tile = 0; tile < 3; tile += 1) {
      for (let index = 0; index < 6; index += 1) {
        const t = index / 5;
        const left = 0.08 + tile * 0.3;
        add(left + t * 0.23, 0.36); add(left + t * 0.23, 0.64);
        add(left, 0.36 + t * 0.28); add(left + 0.23, 0.36 + t * 0.28);
      }
    }
  } else if (section === 'works') {
    for (let line = 0; line < 3; line += 1) {
      for (let index = 0; index < 18; index += 1) {
        const t = index / 17;
        add(0.12 + t * 0.76, 0.3 + line * 0.19 - t * 0.14);
      }
    }
  } else if (section === 'profile') {
    for (let index = 0; index < CIRCLE_DOTS; index += 1) {
      const angle = index / CIRCLE_DOTS * TAU;
      add(0.5 + Math.cos(angle) * 0.34, 0.5 + Math.sin(angle) * 0.34);
    }
  } else {
    for (let line = 0; line < 3; line += 1) {
      for (let index = 0; index < 24; index += 1) {
        const t = index / 23;
        add(0.1 + t * 0.8, 0.3 + line * 0.19 + Math.sin(t * TAU) * 0.07);
      }
    }
  }
  return dots;
}

export function ornamentOffset(x: number, y: number, pointerX: number, pointerY: number, strength: number) {
  const valid = [x, y, pointerX, pointerY, strength].every(Number.isFinite);
  if (!valid) return { x: 0, y: 0 };
  const influence = Math.exp(-Math.hypot(x - pointerX, y - pointerY) * 3) * Math.max(0, Math.min(1, strength));
  const limit = 0.045;
  return { x: Math.max(-limit, Math.min(limit, (pointerX - x) * influence * 0.16)), y: Math.max(-limit, Math.min(limit, (pointerY - y) * influence * 0.16)) };
}
