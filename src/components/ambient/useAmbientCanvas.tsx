"use client";

// 内部用フックです．draw にテーマ色・帯内のポインタを渡します．
// paused は統合側の共通停止操作用，themeKey は配色 props を変えた際の再読込用です．
// すべての Canvas は useCanvasLoop の画面内判定・時計・静止フレームを使います．
import { useEffect, useRef } from 'react';
import { useCanvasLoop, type CanvasFrame } from '../../hooks/useCanvasLoop';
import { subscribeToScroll } from '../../lib/scrollObserver';
import { bounded, type AmbientPointer } from '../../lib/ambient/fields';

export interface AmbientDecorationProps {
  className?: string;
  testId?: string;
  paused?: boolean;
}

export interface AmbientTheme {
  ink: string;
  surface: string;
  accent: string;
  colors: [string, string];
  fontFamily: string;
  dark: boolean;
}

type AmbientDraw = (context: CanvasRenderingContext2D, frame: CanvasFrame, theme: AmbientTheme, pointer: AmbientPointer) => void;
type PointerListener = (event: PointerEvent | null) => void;
const pointerListeners = new Set<PointerListener>();
const MAX_DPR = 1.5;
const MAX_FPS = 30;
const REPRESENTATIVE_TIME_MS = 5000;
const POINTER_SETTLE_MS = 180;
const defaultTheme: AmbientTheme = {
  ink: '#1d1d1f', surface: '#fff', accent: '#0066cc', colors: ['#1d1d1f', '#1d1d1f'],
  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', dark: false,
};

// Canvas は pointer-events:none のまま，共有する受動的な監視だけで反応します．
function dispatchPointer(event: PointerEvent) {
  pointerListeners.forEach(listener => listener(event.pointerType === 'mouse' ? event : null));
}
function clearPointer() { pointerListeners.forEach(listener => listener(null)); }
function pointerOut(event: PointerEvent) { if (!event.relatedTarget) clearPointer(); }

function subscribePointer(listener: PointerListener) {
  if (!pointerListeners.size) {
    window.addEventListener('pointermove', dispatchPointer, { passive: true });
    window.addEventListener('pointerout', pointerOut, { passive: true });
    window.addEventListener('blur', clearPointer);
  }
  pointerListeners.add(listener);
  return () => {
    pointerListeners.delete(listener);
    if (!pointerListeners.size) {
      window.removeEventListener('pointermove', dispatchPointer);
      window.removeEventListener('pointerout', pointerOut);
      window.removeEventListener('blur', clearPointer);
    }
  };
}

export function useAmbientCanvas(draw: AmbientDraw, { paused = false, pointer = false, themeKey = '' } = {}) {
  const themeRef = useRef<AmbientTheme>(defaultTheme);
  const pointerRef = useRef<AmbientPointer>({ x: 0.5, y: 0.5, strength: 0, startedAtMs: 0 });
  const targetStrength = useRef(0);
  const clockRef = useRef(0);
  const loop = useCanvasLoop({
    draw(context, frame) {
      clockRef.current = frame.timeMs;
      const blend = 1 - Math.exp(-frame.deltaMs / POINTER_SETTLE_MS);
      pointerRef.current.strength += (targetStrength.current - pointerRef.current.strength) * blend;
      draw(context, frame, themeRef.current, pointerRef.current);
    },
    paused,
    maxDpr: MAX_DPR,
    maxFps: MAX_FPS,
    reducedTimeMs: REPRESENTATIVE_TIME_MS,
  });
  const { canvasRef, redraw, available, reduced } = loop;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const readTheme = () => {
      const css = getComputedStyle(canvas);
      const dark = document.documentElement.classList.contains('dark');
      const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
      const ink = read('--site-ink', dark ? '#f5f5f7' : defaultTheme.ink);
      themeRef.current = {
        ink,
        surface: read('--site-surface', dark ? '#000' : defaultTheme.surface),
        accent: read('--site-accent', dark ? '#2997ff' : defaultTheme.accent),
        colors: [read('--ambient-color-one', ink), read('--ambient-color-two', ink)],
        fontFamily: css.fontFamily || defaultTheme.fontFamily,
        dark,
      };
      // 停止中の静止画もテーマを追います．画面外では色の記録だけを更新します．
      if (available) redraw();
    };
    readTheme();
    const observer = new MutationObserver(readTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => observer.disconnect();
  }, [canvasRef, redraw, available, themeKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    targetStrength.current = 0;
    if (!pointer || !canvas || !available || reduced || paused) {
      pointerRef.current.strength = 0;
      return;
    }
    const media = matchMedia('(hover: hover) and (pointer: fine)');
    let lastEvent: PointerEvent | null = null;
    const update = (event: PointerEvent | null) => {
      lastEvent = event;
      if (!event || !media.matches || document.hidden) { targetStrength.current = 0; return; }
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const inside = rect.width > 0 && rect.height > 0 && x >= 0 && x <= 1 && y >= 0 && y <= 1;
      targetStrength.current = inside ? 1 : 0;
      if (!inside) return;
      pointerRef.current.x = bounded(x, 0, 1);
      pointerRef.current.y = bounded(y, 0, 1);
      pointerRef.current.startedAtMs = clockRef.current;
    };
    const unsubscribePointer = subscribePointer(update);
    const unsubscribeScroll = subscribeToScroll(() => update(lastEvent));
    const updateMedia = () => update(lastEvent);
    media.addEventListener('change', updateMedia);
    return () => {
      unsubscribePointer();
      unsubscribeScroll();
      media.removeEventListener('change', updateMedia);
      targetStrength.current = 0;
    };
  }, [pointer, canvasRef, available, reduced, paused]);

  return loop;
}

// 低解像度の作業面です．Canvas 2D が使えない環境では装飾だけを省きます．
export function createAmbientBuffer() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  return context ? { canvas, context } : null;
}
