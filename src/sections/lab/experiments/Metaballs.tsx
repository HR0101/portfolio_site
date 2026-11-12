'use client';
import { metaballField } from '@/lib/lab/fields';
import { ExperimentFrame, type ExperimentProps } from './ExperimentFrame';
import styles from './Metaballs.module.css';
const LIMITS = { cells: 72, balls: 4, maxDpr: 1, maxFps: 24 };
export function Metaballs({ compact }: ExperimentProps) {
  return <ExperimentFrame id="metaballs" compact={compact} className={styles.experiment} {...LIMITS} draw={(ctx, frame, input) => {
    const time = frame.timeMs * 0.0006;
    const balls = Array.from({ length: LIMITS.balls }, (_, index) => ({ x: 0.5 + Math.cos(time + index * 1.9) * 0.23, y: 0.5 + Math.sin(time * 0.8 + index * 2.1) * 0.22 }));
    if (input.active) balls[0] = { x: input.x, y: input.y };
    const columns = compact ? 48 : LIMITS.cells;
    const rows = Math.min(LIMITS.cells, Math.max(1, Math.round(columns * frame.height / frame.width)));
    const cellWidth = frame.width / columns;
    const cellHeight = frame.height / rows;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const field = metaballField(x / columns, y / rows, balls);
        if (field < 0.8) continue;
        ctx.globalAlpha = field > 2.4 ? 1 : field > 1.6 ? 0.65 : field > 1.1 ? 0.35 : 0.12;
        ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth + 0.5, cellHeight + 0.5);
      }
    }
  }} />;
}
