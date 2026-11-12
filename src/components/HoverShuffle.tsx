"use client";

import { useEffect, useRef, type PointerEvent } from 'react';

// A short permutation of the original letters, with a stable accessible label.
export function HoverShuffle({ text }: { text: string }) {
  const displayRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef(0);

  const restore = () => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    if (displayRef.current) displayRef.current.textContent = text;
  };

  useEffect(() => {
    const display = displayRef.current;
    if (display) display.textContent = text;
    return () => cancelAnimationFrame(frameRef.current);
  }, [text]);

  const shuffle = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType === 'touch'
      || !matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
    restore();
    const letters = Array.from(text);
    const started = performance.now();
    let previousStep = -1;
    const tick = (now: number) => {
      const progress = Math.min((now - started) / 240, 1);
      if (progress === 1 || document.hidden) { restore(); return; }
      const step = Math.floor(progress * 6);
      if (step !== previousStep && displayRef.current) {
        previousStep = step;
        const settled = Math.floor(progress * letters.length);
        const tail = letters.slice(settled).filter(letter => letter !== ' ');
        for (let index = tail.length - 1; index > 0; index--) {
          const other = Math.floor(Math.random() * (index + 1));
          [tail[index], tail[other]] = [tail[other], tail[index]];
        }
        let index = 0;
        displayRef.current.textContent = letters.map((letter, position) => (
          position < settled || letter === ' ' ? letter : tail[index++]
        )).join('');
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    tick(started);
  };

  return (
    <span className="hover-shuffle" onPointerEnter={shuffle} onPointerLeave={restore} onPointerCancel={restore}>
      <span className="hover-shuffle-measure" aria-hidden="true">{text}</span>
      <span className="sr-only">{text}</span>
      <span ref={displayRef} className="hover-shuffle-display" aria-hidden="true">{text}</span>
    </span>
  );
}
