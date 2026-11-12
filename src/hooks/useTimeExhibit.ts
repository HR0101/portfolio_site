"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceExhibitClock } from '../lib/exhibitClock';

type ExhibitFrame = { phase: number };
const visibilityThreshold = 0.15;

// 時間だけを動力にする．非表示の時間は加算せず，描画は工程の境目だけ React に渡す．
export function useTimeExhibit<T extends ExhibitFrame>(
  frameAt: (elapsedMs: number) => T,
  phaseStarts: readonly number[],
  representativePhase: number,
  paint?: (frame: T) => void,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elapsed = useRef(phaseStarts[representativePhase]);
  const frameId = useRef(0);
  const phaseRef = useRef(representativePhase);
  const touched = useRef(false);
  const [phase, setPhase] = useState(representativePhase);
  const [requested, setRequested] = useState(false);
  const [available, setAvailable] = useState(false);
  const [reduced, setReduced] = useState(true);
  const playing = requested && available && !reduced;

  const renderFrame = useCallback(() => {
    const frame = frameAt(elapsed.current);
    paint?.(frame);
    if (phaseRef.current !== frame.phase) {
      phaseRef.current = frame.phase;
      setPhase(frame.phase);
    }
  }, [frameAt, paint]);

  const pause = useCallback(() => {
    cancelAnimationFrame(frameId.current);
    touched.current = true;
    setRequested(false);
  }, []);

  const select = useCallback((nextPhase: number) => {
    if (phaseStarts[nextPhase] === undefined) return;
    pause();
    elapsed.current = phaseStarts[nextPhase];
    renderFrame();
  }, [pause, phaseStarts, renderFrame]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let inView = false;
    const updateVisibility = () => setAvailable(inView && !document.hidden);
    const updateMotion = () => {
      setReduced(media.matches);
      if (media.matches) {
        cancelAnimationFrame(frameId.current);
        setRequested(false);
        if (!touched.current) {
          elapsed.current = phaseStarts[representativePhase];
          renderFrame();
        }
      } else if (!touched.current) {
        elapsed.current = 0;
        renderFrame();
        setRequested(true);
      }
    };
    const observer = new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= visibilityThreshold);
      if (!inView) cancelAnimationFrame(frameId.current);
      updateVisibility();
    }, { threshold: [0, visibilityThreshold] });
    observer.observe(node);
    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(frameId.current);
      updateVisibility();
    };
    updateMotion();
    document.addEventListener('visibilitychange', onVisibility);
    media.addEventListener('change', updateMotion);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      media.removeEventListener('change', updateMotion);
      cancelAnimationFrame(frameId.current);
    };
  }, [phaseStarts, representativePhase, renderFrame]);

  useEffect(() => {
    renderFrame();
    if (!playing) return;
    let previous: number | null = null;
    const tick = (now: number) => {
      elapsed.current = advanceExhibitClock(elapsed.current, now, previous);
      previous = now;
      renderFrame();
      frameId.current = requestAnimationFrame(tick);
    };
    frameId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId.current);
  }, [playing, renderFrame]);

  const toggle = () => {
    if (requested) pause();
    else if (!reduced) { touched.current = true; setRequested(true); }
  };

  return { containerRef, phase, playing, requested, reduced, available, select, toggle };
}
