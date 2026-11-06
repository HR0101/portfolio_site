"use client";

import { useEffect, type RefObject } from 'react';
import { createPointerSpring } from '../lib/pointerSpring';
import { clamp, subscribeToScroll } from '../lib/scrollObserver';

// Pointer, intro, and scroll each transform a different wrapper. The links
// remain ordinary links; there are no drag gestures or decorative hit areas.
export function useHeroPointer(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const hero = ref.current;
    const stage = hero?.querySelector<HTMLElement>('[data-hero-stage]');
    if (!hero || !stage) return;
    const enabled = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 761px) and (prefers-reduced-motion: no-preference)');
    let dispose = () => {};
    const setup = () => {
      dispose();
      if (!enabled.matches) return;
      const controller = new AbortController();
      const { signal } = controller;
      const layers = [...hero.querySelectorAll<HTMLElement>('[data-orbit-pointer]')];
      const core = hero.querySelector<HTMLElement>('[data-hero-pointer-core]')!;
      const previousStyles = [...layers, core].map(element => element.style.transform);
      let bounds: DOMRect | null = null;
      let centers: { x: number; y: number }[] = [];
      const spring = createPointerSpring((layers.length + 1) * 4, values => {
        [...layers, core].forEach((element, index) => {
          const offset = index * 4;
          element.style.transform = `translate3d(${values[offset]}px,${values[offset + 1]}px,0) rotateX(${values[offset + 2]}deg) rotateY(${values[offset + 3]}deg)`;
        });
      });
      const measure = () => {
        bounds = stage.getBoundingClientRect();
        centers = layers.map(layer => {
          const rect = layer.closest('[data-orbit-depth]')!.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        });
      };
      const release = () => { spring.to(Array((layers.length + 1) * 4).fill(0)); };
      stage.addEventListener('pointerenter', measure, { signal, passive: true });
      stage.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        if (!bounds) measure();
        const x = clamp((event.clientX - bounds!.left) / bounds!.width * 2 - 1, -1, 1);
        const y = clamp((event.clientY - bounds!.top) / bounds!.height * 2 - 1, -1, 1);
        const targets = layers.flatMap((_, index) => {
          const center = centers[index];
          const dx = event.clientX - center.x;
          const dy = event.clientY - center.y;
          const proximity = Math.exp(-(Math.hypot(dx, dy) ** 2) / (230 ** 2));
          const depth = [1, .7, 1.2, .5][index] ?? 1;
          return [x * 20 * depth + dx * proximity * .12, y * 14 * depth + dy * proximity * .12, -y * 8, x * 10];
        });
        targets.push(x * 9, y * 7, -y * 9, x * 12);
        spring.to(targets);
      }, { signal, passive: true });
      stage.addEventListener('pointerleave', release, { signal });
      stage.addEventListener('focusin', release, { signal });
      window.addEventListener('blur', () => spring.reset(), { signal });
      document.addEventListener('visibilitychange', () => { if (document.hidden) spring.reset(); }, { signal });
      const unsubscribe = subscribeToScroll(() => { bounds = null; spring.reset(); });
      const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) spring.reset(); });
      observer.observe(stage);
      hero.setAttribute('data-pointer-ready', '');
      dispose = () => {
        controller.abort(); unsubscribe(); observer.disconnect(); spring.dispose();
        hero.removeAttribute('data-pointer-ready');
        [...layers, core].forEach((element, index) => { element.style.transform = previousStyles[index]; });
      };
    };
    setup(); enabled.addEventListener('change', setup);
    return () => { dispose(); enabled.removeEventListener('change', setup); };
  }, [ref]);
}
