"use client";

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { createPointerSpring } from '../lib/pointerSpring';
import { getCursorPreviewPosition } from '../lib/cursorPreview';
import { subscribeToScroll } from '../lib/scrollObserver';
import './AppCursorPreview.css';

export interface AppPreviewItem { id: string; name: string; src: string; portrait: boolean }

export function AppCursorPreview({ items, children }: { items: AppPreviewItem[]; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const root = rootRef.current;
    const preview = previewRef.current;
    if (!mounted || !root || !preview) return;
    const media = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px) and (prefers-reduced-motion: no-preference)');
    const controller = new AbortController();
    const { signal } = controller;
    const figures = new Map(Array.from(preview.querySelectorAll<HTMLElement>('[data-preview-id]'))
      .map(figure => [figure.dataset.previewId!, figure]));
    let active: string | null = null;
    let baseX = 0, baseY = 0;
    let limits = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const spring = createPointerSpring(2, ([x, y]) => {
      if (!active) return;
      const left = Math.min(limits.maxX, Math.max(limits.minX, baseX + x));
      const top = Math.min(limits.maxY, Math.max(limits.minY, baseY + y));
      preview.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    });
    const hide = () => {
      active = null;
      preview.dataset.visible = 'false';
      spring.reset();
    };
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType === 'touch') { hide(); return; }
      const target = event.target instanceof Element ? event.target : null;
      const card = target?.closest<HTMLElement>('[data-app-preview]');
      const id = card?.dataset.appPreview;
      // Links remain unobscured. The preview belongs to the non-interactive summary.
      if (!card || !id || !root.contains(card) || target?.closest('a,button,input,textarea') || !figures.has(id)) {
        hide(); return;
      }
      const entering = active === null;
      if (id !== active) {
        figures.forEach((figure, key) => { figure.hidden = key !== id; });
        const figure = figures.get(id)!;
        const image = figure.querySelector('img');
        if (image) {
          image.loading = 'eager';
          if (image.complete && image.naturalWidth > 0) figure.dataset.loaded = 'true';
        }
        active = id;
      }
      const position = getCursorPreviewPosition(event.clientX, event.clientY,
        preview.offsetWidth, preview.offsetHeight, root.getBoundingClientRect(), innerWidth, innerHeight);
      limits = position;
      if (entering) {
        baseX = position.x; baseY = position.y;
        spring.reset();
      }
      spring.to([position.x - baseX, position.y - baseY]);
      preview.dataset.visible = 'true';
    };
    root.addEventListener('pointermove', move, { signal, passive: true });
    root.addEventListener('pointerleave', hide, { signal });
    root.addEventListener('pointercancel', hide, { signal });
    root.addEventListener('focusin', hide, { signal });
    window.addEventListener('blur', hide, { signal });
    window.addEventListener('resize', hide, { signal, passive: true });
    document.addEventListener('visibilitychange', hide, { signal });
    document.addEventListener('keydown', hide, { signal });
    media.addEventListener('change', hide, { signal });
    const unsubscribe = subscribeToScroll(hide);
    return () => { controller.abort(); unsubscribe(); spring.dispose(); };
  }, [items, mounted]);

  return (
    <div ref={rootRef} className="app-preview-region">
      {children}
      {mounted && createPortal(
        <div ref={previewRef} className="app-cursor-preview" aria-hidden="true" data-visible="false">
          {items.map(item => (
            <figure key={item.id} data-preview-id={item.id} hidden
              className={`app-cursor-preview-figure ${item.portrait ? 'is-portrait' : ''}`}>
              <img src={item.src} alt="" width={item.portrait ? 840 : 1280} height={item.portrait ? 1826 : 960}
                loading="lazy" decoding="async"
                onLoad={event => { event.currentTarget.parentElement!.dataset.loaded = 'true'; }}
                onError={event => { event.currentTarget.parentElement!.dataset.loaded = 'false'; }} />
              <figcaption>{item.name}</figcaption>
            </figure>
          ))}
        </div>, document.body,
      )}
    </div>
  );
}
