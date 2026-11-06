'use client';

import { useEffect, useRef } from 'react';
import { Maximize2, X } from 'lucide-react';
import styles from './product.module.css';

export function Screenshot({ image, alt, caption }: { image: string; alt: string; caption?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const thumbnail = useRef<HTMLImageElement>(null);
  const motion = useRef<ViewTransition | null>(null);
  const src = `/projects/bustimeapp-screens/${image}.webp`;
  const changeExpanded = (open: boolean) => {
    const modal = dialog.current;
    const small = thumbnail.current;
    const large = modal?.querySelector<HTMLImageElement>(':scope > img');
    if (!modal || !small || !large) return;
    motion.current?.skipTransition();
    const commit = () => { if (open) modal.showModal(); else modal.close(); };
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { commit(); return; }
    const root = document.documentElement;
    const source = open ? small : large;
    const target = open ? large : small;
    const radius = open ? getComputedStyle(small.parentElement!).borderRadius : '0px';
    small.style.viewTransitionName = '';
    large.style.viewTransitionName = '';
    source.style.viewTransitionName = 'screenshot-morph';
    root.classList.add('is-image-morphing');
    const transition = document.startViewTransition(() => {
      source.style.viewTransitionName = '';
      commit();
      target.style.viewTransitionName = 'screenshot-morph';
    });
    motion.current = transition;
    let shape: Animation | undefined;
    void transition.ready.then(() => {
      if (motion.current !== transition) return;
      shape = root.animate([{ borderRadius: radius }, { borderRadius: open ? '0px' : getComputedStyle(small.parentElement!).borderRadius }],
        { duration: 900, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both', pseudoElement: '::view-transition-group(screenshot-morph)' });
    }).catch(() => {});
    void transition.finished.finally(() => {
      shape?.cancel();
      if (motion.current !== transition) return;
      motion.current = null;
      small.style.viewTransitionName = '';
      large.style.viewTransitionName = '';
      root.classList.remove('is-image-morphing');
    }).catch(() => {});
  };
  useEffect(() => () => {
    if (motion.current) {
      motion.current.skipTransition();
      document.documentElement.classList.remove('is-image-morphing');
    }
  }, []);
  return (
    <figure className={styles.screenshot}>
      <button type="button" className={styles.screenshotButton} onClick={() => changeExpanded(true)} aria-label={`${alt}を拡大`}>
        <img ref={thumbnail} src={src} alt={alt} width={840} height={1826} loading="lazy" />
        <span className={styles.zoomHint} aria-hidden="true"><Maximize2 size={14} /></span>
      </button>
      {caption && <figcaption>{caption}</figcaption>}
      <dialog ref={dialog} data-motion-dialog className={styles.screenshotDialog} aria-label={alt} onCancel={event => { event.preventDefault(); changeExpanded(false); }} onClick={event => { if (event.target === event.currentTarget) changeExpanded(false); }}>
        <div className={styles.dialogToolbar}><span>{caption || 'BusTimeApp'}</span><button type="button" onClick={() => changeExpanded(false)} aria-label="拡大画像を閉じる"><X size={22} /></button></div>
        <img src={src} alt={alt} width={840} height={1826} loading="lazy" />
      </dialog>
    </figure>
  );
}
