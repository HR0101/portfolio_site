'use client';
import { useRef, useState } from 'react';
import { createRhLife, nextLife, lifeIsSettled, shouldReseedLife, paintLife, LIFE_COLUMNS, LIFE_ROWS } from '@/lib/lab/life';
import { ExperimentFrame, type ExperimentProps } from './ExperimentFrame';
import styles from './Life.module.css';
const LIMITS = { maxDpr: 1, maxFps: 30, generationsPerFrame: 1 };
const SPEEDS = [180, 90, 45] as const;
const makeModel = () => ({ cells: createRhLife(), older: undefined as Uint8Array | undefined, accumulator: 0, settledMs: 0, settled: false, reseeds: 0, lastPaint: null as { x: number; y: number } | null });
export function Life({ compact }: ExperimentProps) {
  const model = useRef(makeModel());
  const [speed, setSpeed] = useState(0);
  const [reset, setReset] = useState(0);
  return <ExperimentFrame id="life" compact={compact} className={styles.experiment} manualStepMs={SPEEDS[speed]} {...LIMITS} draw={(ctx, frame, input) => {
    const current = model.current;
    if (input.down) {
      const cell = { x: Math.floor(input.x * LIFE_COLUMNS), y: Math.floor(input.y * LIFE_ROWS) };
      current.cells = paintLife(current.cells, LIFE_COLUMNS, LIFE_ROWS, current.lastPaint ?? cell, cell);
      current.lastPaint = cell;
      current.settled = false; current.settledMs = 0;
    } else current.lastPaint = null;
    current.accumulator += frame.deltaMs;
    if (current.settled) current.settledMs += frame.deltaMs;
    if (shouldReseedLife(current.settledMs)) {
      current.reseeds += 1;
      current.cells = createRhLife(LIFE_COLUMNS, LIFE_ROWS, current.reseeds % 9 - 4);
      current.older = undefined; current.settled = false; current.settledMs = 0;
    }
    if (!input.down && current.accumulator >= SPEEDS[speed]) {
      current.accumulator = 0;
      const next = nextLife(current.cells, LIFE_COLUMNS, LIFE_ROWS);
      current.settled = lifeIsSettled(current.cells, next, current.older);
      if (!current.settled) current.settledMs = 0;
      current.older = current.cells; current.cells = next;
    }
    const cellWidth = frame.width / LIFE_COLUMNS;
    const cellHeight = frame.height / LIFE_ROWS;
    for (let index = 0; index < current.cells.length; index += 1) {
      ctx.globalAlpha = current.cells[index] ? 0.92 : 0.07;
      ctx.fillRect((index % LIFE_COLUMNS) * cellWidth + 1, Math.floor(index / LIFE_COLUMNS) * cellHeight + 1, Math.max(1, cellWidth - 2), Math.max(1, cellHeight - 2));
    }
  }}>
    <label>世代の速さ<select aria-label="世代の速さ" value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value="0">ゆっくり</option><option value="1">ふつう</option><option value="2">はやい</option></select></label>
    <button type="button" className="press-effect" onClick={() => { model.current = makeModel(); setReset(reset + 1); }}>RH にリセット</button>
  </ExperimentFrame>;
}
