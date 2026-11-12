"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

// Canvas 展示の共通ループ．時間だけを動力にし，次の約束を 1 か所で守る：
// - 画面内（一部でも見えている）かつタブが見えている間だけ描く．戻ったとき，止まっていた時間を一気に消化しない．
// - prefers-reduced-motion では動かさず，代表フレーム（reducedTimeMs の時刻）を 1 枚だけ描く．
// - 描画の細かさ（devicePixelRatio）は maxDpr で頭打ちにする．
// - 毎フレームの React state 更新はしない（描画は draw の中で Canvas に直接）．

export interface CanvasFrame {
  // 描画面の CSS ピクセルの大きさ
  width: number;
  height: number;
  dpr: number;
  // 動いた時間の累計（ミリ秒）．一時停止・画面外の間は進まない
  timeMs: number;
  // 直前のフレームからの経過（ミリ秒．上限あり）．最初と再開直後は 0
  deltaMs: number;
  // 描いたフレーム数（0 から）
  frame: number;
}

export interface CanvasLoopOptions {
  draw: (context: CanvasRenderingContext2D, frame: CanvasFrame) => void;
  // true の間は時間を進めない（一時停止．見た目はそのまま残る）
  paused?: boolean;
  // devicePixelRatio の上限（既定 2）
  maxDpr?: number;
  // reduced-motion のとき描く代表フレームの時刻（既定 0）
  reducedTimeMs?: number;
  // 1 秒あたりの描画の上限（既定 60．重い展示は下げる）
  maxFps?: number;
  // 画面内とみなす割合（既定 0.1）
  visibilityThreshold?: number;
}

const defaultMaxDpr = 2;
const defaultMaxFps = 60;
const defaultVisibilityThreshold = 0.1;
// 長いタブ切り替えなどの後に，1 フレームで大きく進まないための上限（ミリ秒）
const maxDeltaMs = 100;

export function useCanvasLoop(options: CanvasLoopOptions) {
  const { draw, paused = false, maxDpr = defaultMaxDpr, reducedTimeMs = 0, maxFps = defaultMaxFps, visibilityThreshold = defaultVisibilityThreshold } = options;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  const timeRef = useRef(0);
  const frameRef = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const [available, setAvailable] = useState(false);
  const [reduced, setReduced] = useState(true);

  useEffect(() => { drawRef.current = draw; }, [draw]);

  // 現在の時刻のまま 1 枚描き直す（一時停止中に，操作で見た目を更新するときに使う）
  const redraw = useCallback((deltaMs = 0) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const { width, height, dpr } = sizeRef.current;
    if (!canvas || !context || width <= 0 || height <= 0) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    drawRef.current(context, { width, height, dpr, timeMs: timeRef.current, deltaMs, frame: frameRef.current });
    frameRef.current += 1;
  }, []);

  // 時刻を指定して 1 枚描く（巻き戻し・先送りなどの手動操作用）
  const seek = useCallback((timeMs: number) => {
    timeRef.current = Number.isFinite(timeMs) ? Math.max(0, timeMs) : 0;
    redraw(0);
  }, [redraw]);

  // 大きさの追従と，画面内・タブ・動きの設定の監視
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let inView = false;
    const updateAvailability = () => setAvailable(inView && !document.hidden);
    const updateMotion = () => setReduced(media.matches);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
      const width = Math.max(0, Math.round(rect.width));
      const height = Math.max(0, Math.round(rect.height));
      sizeRef.current = { width, height, dpr };
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      redraw(0);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersection = new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= visibilityThreshold);
      updateAvailability();
    }, { threshold: [0, visibilityThreshold] });
    intersection.observe(canvas);
    const onVisibility = () => updateAvailability();
    updateMotion();
    resize();
    document.addEventListener('visibilitychange', onVisibility);
    media.addEventListener('change', updateMotion);
    return () => {
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      media.removeEventListener('change', updateMotion);
    };
  }, [maxDpr, visibilityThreshold, redraw]);

  // reduced-motion は代表フレームを 1 枚だけ描く
  useEffect(() => {
    if (!reduced) return;
    timeRef.current = reducedTimeMs;
    redraw(0);
  }, [reduced, reducedTimeMs, redraw]);

  const playing = available && !reduced && !paused;

  useEffect(() => {
    if (!playing) return;
    let frameId = 0;
    let previous: number | null = null;
    const minInterval = 1000 / Math.max(1, maxFps);
    const tick = (now: number) => {
      frameId = requestAnimationFrame(tick);
      if (previous !== null && now - previous < minInterval - 1) return;
      const deltaMs = previous === null ? 0 : Math.min(maxDeltaMs, now - previous);
      previous = now;
      timeRef.current += deltaMs;
      redraw(deltaMs);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [playing, maxFps, redraw]);

  return { canvasRef, playing, reduced, available, redraw, seek };
}
