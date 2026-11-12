'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { LAB_EXPERIMENTS, type LabId } from '@/data/lab';
import { useCanvasLoop, type CanvasFrame } from '@/hooks/useCanvasLoop';
import styles from './ExperimentFrame.module.css';

export interface LabInteraction {
  x: number;
  y: number;
  active: boolean;
  down: boolean;
  action: number;
  ink: string;
  surface: string;
}
export type LabDraw = (context: CanvasRenderingContext2D, frame: CanvasFrame, interaction: LabInteraction) => void;
export interface ExperimentProps { compact?: boolean }
interface FrameProps extends ExperimentProps {
  id: LabId;
  draw: LabDraw;
  maxFps: number;
  maxDpr: number;
  children?: ReactNode;
  className?: string;
  manualStepMs?: number;
}
const MANUAL_STEP_MS = 100;
const KEYBOARD_DISTANCE = 0.06;
const COMPACT_MAX_FPS = 30;

export function ExperimentFrame({ id, draw, maxFps, maxDpr, compact = false, children, className, manualStepMs = MANUAL_STEP_MS }: FrameProps) {
  const experiment = LAB_EXPERIMENTS.find(item => item.id === id)!;
  const uniqueId = useId();
  const hintId = `${uniqueId}-hint`;
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const interaction = useRef<LabInteraction>({ x: 0.5, y: 0.5, active: false, down: false, action: 0, ink: '#1d1d1f', surface: '#fff' });
  const clock = useRef(0);
  const manualDelta = useRef(0);
  const loop = useCanvasLoop({
    paused: paused || failed,
    maxFps: compact ? Math.min(COMPACT_MAX_FPS, maxFps) : maxFps,
    maxDpr,
    reducedTimeMs: 1800,
    draw: (context, frame) => {
      clock.current = frame.timeMs;
      context.fillStyle = interaction.current.surface;
      context.fillRect(0, 0, frame.width, frame.height);
      context.fillStyle = interaction.current.ink;
      context.strokeStyle = interaction.current.ink;
      context.lineWidth = 1;
      context.globalAlpha = 1;
      try {
        draw(context, { ...frame, deltaMs: manualDelta.current || frame.deltaMs }, interaction.current);
      } catch {
        setFailed(true);
      } finally {
        manualDelta.current = 0;
        context.globalAlpha = 1;
      }
    },
  });
  const { canvasRef, redraw, seek, reduced } = loop;

  useEffect(() => {
    const readColors = () => {
      const colors = getComputedStyle(document.documentElement);
      interaction.current.ink = colors.getPropertyValue('--site-ink').trim() || '#1d1d1f';
      interaction.current.surface = colors.getPropertyValue('--site-surface').trim() || '#fff';
      redraw();
    };
    const observer = new MutationObserver(readColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    readColors();
    return () => observer.disconnect();
  }, [redraw]);

  useEffect(() => { redraw(); }, [draw, redraw]);

  const step = () => {
    manualDelta.current = manualStepMs;
    seek(clock.current + manualStepMs);
  };
  const movePointer = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    interaction.current.x = Math.max(0, Math.min(0.999, (event.clientX - rect.left) / rect.width));
    interaction.current.y = Math.max(0, Math.min(0.999, (event.clientY - rect.top) / rect.height));
    interaction.current.active = true;
    // 自動再生中はフレーム上限を守り，止めたときだけ入力で描き直します．
    if (!loop.playing) redraw();
  };
  const activate = () => { interaction.current.action += 1; interaction.current.active = true; };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (direction) {
      event.preventDefault();
      interaction.current.x = Math.max(0.02, Math.min(0.98, interaction.current.x + direction[0] * KEYBOARD_DISTANCE));
      interaction.current.y = Math.max(0.02, Math.min(0.98, interaction.current.y + direction[1] * KEYBOARD_DISTANCE));
      interaction.current.active = true;
      interaction.current.down = event.shiftKey;
      redraw();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      activate();
      interaction.current.down = true;
      step();
      interaction.current.down = false;
    } else if (event.key === ' ') {
      event.preventDefault();
      if (reduced) step(); else setPaused(value => !value);
    } else if (event.key === 'Escape') {
      interaction.current.active = false;
      interaction.current.down = false;
      redraw();
    }
  };

  return (
    <article id={compact ? undefined : id} className={`${styles.frame} ${className ?? ''}`} data-compact={compact} data-testid={`lab-experiment-${id}`} aria-labelledby={`${uniqueId}-title`}>
      <header className={styles.header}>
        <h2 id={`${uniqueId}-title`}>{experiment.title}</h2>
        <span className={styles.badge}>{experiment.state}</span>
      </header>
      <div className={styles.surface}>
        <canvas ref={canvasRef} tabIndex={0} role="img" aria-label={`${experiment.title}の操作できる実験`} aria-describedby={hintId}
          onPointerDown={event => {
            event.currentTarget.setPointerCapture(event.pointerId);
            interaction.current.down = true;
            activate();
            movePointer(event);
            if (paused || reduced) step();
          }}
          onPointerMove={movePointer}
          onPointerUp={event => {
            interaction.current.down = false;
            if (event.pointerType !== 'mouse') interaction.current.active = false;
            redraw();
          }}
          onPointerCancel={() => { interaction.current.down = false; interaction.current.active = false; redraw(); }}
          onPointerLeave={() => { if (!interaction.current.down) { interaction.current.active = false; redraw(); } }}
          onLostPointerCapture={() => { interaction.current.down = false; }}
          onBlur={() => { interaction.current.active = false; interaction.current.down = false; redraw(); }}
          onKeyDown={keyDown} onKeyUp={() => { interaction.current.down = false; }}>
          {experiment.summary} {experiment.hint}
        </canvas>
        {failed && <p role="status" className={styles.fallback}>描画を続けられませんでした．説明はこの下で読めます．</p>}
      </div>
      <div className={styles.body}>
        <div className={styles.controls}>
          {!reduced && <button type="button" className="press-effect" aria-label={`${experiment.title}を${paused ? '再開' : '一時停止'}`} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? '再開' : '一時停止'}</button>}
          <button type="button" className="press-effect" aria-label={`${experiment.title}を1ステップ動かす`} onClick={() => { setPaused(true); step(); }}>動かす<span className={styles.stepLabel}> +1</span></button>
          {children}
        </div>
        {reduced && <p className={styles.motionNote}>動きを減らす設定です．「動かす」で 1 ステップ進みます．</p>}
        {compact ? <details className={styles.details}>
          <summary>説明・操作方法</summary>
          <p className={styles.summary}>{experiment.summary}</p>
          <p id={hintId} className={styles.hint}>{experiment.hint}<span>矢印で位置，Enter で触る，Esc で離す．Space で{reduced ? '1 ステップ' : '停止・再開'}．</span></p>
        </details> : <>
          <p className={styles.summary}>{experiment.summary}</p>
          <p id={hintId} className={styles.hint}>{experiment.hint}<span>キーボード：矢印で位置，Enter で触る，Shift＋矢印でなぞる，Esc で離す．Space で{reduced ? '1 ステップ' : '停止・再開'}．</span></p>
        </>}
      </div>
    </article>
  );
}
