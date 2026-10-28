"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { subscribeToScroll } from '../lib/scrollObserver';
import styles from './CursorRing.module.css';

// One sleeping rAF loop owns cursor and magnetic links, including dynamic cards.
export function CursorRing() {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const cursor = ref.current;
    if (!cursor) return;
    const enabled = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 761px) and (prefers-reduced-motion: no-preference)');
    let dispose = () => {};
    const setup = () => {
      dispose();
      if (!enabled.matches) return;
      const controller = new AbortController();
      const { signal } = controller;
      type Magnet = { x: number; y: number; original: string };
      const magnets = new Map<HTMLElement, Magnet>();
      let magnetic: HTMLElement | null = null;
      let card: HTMLElement | null = null;
      let px = 0, py = 0, x = 0, y = 0, visible = false;
      let frame = 0, previousTime = 0;
      const request = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(tick); };
      const resetCard = () => {
        card?.style.removeProperty('--motion-parallax-x');
        card?.style.removeProperty('--motion-parallax-y');
        card = null;
      };
      function tick(now: number) {
        frame = 0;
        const dt = previousTime ? Math.min(now - previousTime, 48) : 16.67;
        previousTime = now;
        const alpha = 1 - Math.exp(-dt / 75);
        const magnet = magnetic ? magnets.get(magnetic) : undefined;
        const bounds = magnetic?.getBoundingClientRect();
        const imageBounds = card?.getBoundingClientRect();
        const tx = bounds ? px * .65 + (bounds.left + bounds.width / 2) * .35 : px;
        const ty = bounds ? py * .65 + (bounds.top + bounds.height / 2) * .35 : py;
        x += (tx - x) * alpha;
        y += (ty - y) * alpha;
        let moving = visible && Math.hypot(tx - x, ty - y) > .15;
        const mx = bounds && magnet ? Math.max(-1, Math.min(1, (px - (bounds.left + bounds.width / 2 - magnet.x)) / (bounds.width / 2))) * 12 : 0;
        const my = bounds && magnet ? Math.max(-1, Math.min(1, (py - (bounds.top + bounds.height / 2 - magnet.y)) / (bounds.height / 2))) * 12 : 0;
        cursor!.style.transform = `translate3d(${x}px,${y}px,0)`;
        if (visible) cursor!.style.opacity = '1';
        magnets.forEach((item, element) => {
          const ax = element === magnetic ? mx : 0;
          const ay = element === magnetic ? my : 0;
          item.x += (ax - item.x) * alpha;
          item.y += (ay - item.y) * alpha;
          moving ||= Math.abs(ax - item.x) + Math.abs(ay - item.y) > .03;
          element.style.transform = `translate3d(${item.x}px,${item.y}px,0)`;
        });
        if (card && imageBounds) {
          card.style.setProperty('--motion-parallax-x', `${((px - imageBounds.left) / imageBounds.width - .5) * 28}px`);
          card.style.setProperty('--motion-parallax-y', `${((py - imageBounds.top) / imageBounds.height - .5) * 28}px`);
        }
        if (moving) request();
        else previousTime = 0;
      }
      const clear = () => { magnetic = null; resetCard(); cursor.removeAttribute('data-mode'); request(); };
      const leave = () => { visible = false; cursor.style.opacity = '0'; clear(); };
      window.addEventListener('pointermove', event => {
        if (event.pointerType === 'touch') return;
        px = event.clientX; py = event.clientY;
        if (!visible) { x = px; y = py; }
        visible = true;
        request();
      }, { signal, passive: true });
      document.addEventListener('pointerover', event => {
        if (event.pointerType === 'touch') return;
        const target = event.target instanceof Element ? event.target : null;
        const nextCard = target?.closest<HTMLElement>('[data-motion-work]') ?? null;
        if (nextCard !== card) { resetCard(); card = nextCard; }
        magnetic = target?.closest<HTMLElement>('[data-magnetic]') ?? null;
        if (magnetic && !magnets.has(magnetic)) magnets.set(magnetic, { x: 0, y: 0, original: magnetic.style.transform });
        cursor.dataset.mode = card ? 'work' : target?.closest('a,button,input,textarea,[role="tab"],summary') ? 'link' : '';
        request();
      }, { signal, passive: true });
      document.documentElement.addEventListener('pointerleave', leave, { signal });
      window.addEventListener('blur', leave, { signal });
      const unsubscribe = subscribeToScroll(clear);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; leave(); }
      }, { signal });
      dispose = () => {
        controller.abort(); unsubscribe(); cancelAnimationFrame(frame); resetCard();
        magnets.forEach((item, element) => { element.style.transform = item.original; });
        cursor.style.opacity = '0'; cursor.removeAttribute('data-mode');
      };
    };
    setup();
    enabled.addEventListener('change', setup);
    return () => { dispose(); enabled.removeEventListener('change', setup); };
  }, [pathname]);
  return <div ref={ref} data-motion-cursor className={styles.cursor} aria-hidden="true"><div className={styles.ring} /><span>VIEW</span></div>;
}
