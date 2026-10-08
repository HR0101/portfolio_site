'use client';

import { useRef } from 'react';
import { Maximize2, X } from 'lucide-react';
import styles from './product.module.css';

export function Screenshot({ image, alt, caption }: { image: string; alt: string; caption?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const src = `/projects/bustimeapp-screens/${image}.webp`;
  return (
    <figure className={styles.screenshot}>
      <button type="button" className={styles.screenshotButton} onClick={() => dialog.current?.showModal()} aria-label={`${alt}を拡大`}>
        <img src={src} alt={alt} width={840} height={1826} loading="lazy" />
        <span className={styles.zoomHint} aria-hidden="true"><Maximize2 size={14} /></span>
      </button>
      {caption && <figcaption>{caption}</figcaption>}
      <dialog ref={dialog} className={styles.screenshotDialog} aria-label={alt} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        <div className={styles.dialogToolbar}><span>{caption || 'BusTimeApp'}</span><button type="button" onClick={() => dialog.current?.close()} aria-label="拡大画像を閉じる"><X size={22} /></button></div>
        <img src={src} alt={alt} width={840} height={1826} loading="lazy" />
      </dialog>
    </figure>
  );
}
