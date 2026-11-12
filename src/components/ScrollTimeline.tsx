'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { clamp, subscribeToScroll } from '../lib/scrollObserver';
import { staggerDelay } from '../lib/choreography';
import styles from '../sections/Profile.module.css';
import { TIMELINE_MILESTONES } from '../data/timeline';

// 既存の fill モードと同じ位置を，線の進捗の基準にします．
const FILL_REFERENCE_RATIO = 0.62;
const MILESTONE_ACTIVATION_OFFSET = 0.5;
const TAG_STEP_MS = 30;
const LINE_INSET_PX = 8;
const TIP_OFFSET_PX = 16;
const TIP_VISIBLE_START = 0.02;
const TIP_VISIBLE_END = 0.99;

export function ScrollTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const milestones = Array.from(element.querySelectorAll<HTMLElement>('[data-milestone]'));
    // フレームごとの React 更新を避け，線と節目だけへ直接書き込みます．
    return subscribeToScroll(() => {
      const bounds = element.getBoundingClientRect();
      const progress = reducedMotion ? 1 : clamp((window.innerHeight * FILL_REFERENCE_RATIO - bounds.top) / Math.max(bounds.height, 1));
      if (lineRef.current) lineRef.current.style.transform = `scaleY(${progress})`;
      if (tipRef.current) {
        tipRef.current.style.transform = `translate(-50%, ${progress * (bounds.height - LINE_INSET_PX * 2) - TIP_OFFSET_PX}px)`;
        tipRef.current.style.opacity = !reducedMotion && progress > TIP_VISIBLE_START && progress < TIP_VISIBLE_END ? '1' : '0';
      }
      milestones.forEach((milestone, index) => {
        const reached = progress >= (index + MILESTONE_ACTIVATION_OFFSET) / milestones.length;
        milestone.dataset.reached = String(reached);
        // 一度灯った節目の登場は巻き戻さず，弾みと波紋も一度だけにします．
        if (reached) milestone.dataset.entered = 'true';
      });
    });
  }, [reducedMotion]);

  return (
    <div ref={ref} className={`${styles.timelineRoot} relative pl-10 md:pl-14`} data-testid="scroll-timeline">
      <div className="absolute left-3 md:left-5 top-2 bottom-2 w-px bg-mist dark:bg-night-border" aria-hidden="true" />
      <div ref={lineRef} className={`${styles.timelineLine} absolute left-3 md:left-5 top-2 bottom-2 w-px bg-ink dark:bg-night-ink origin-top`} style={{ transform: 'scaleY(0)' }} aria-hidden="true" />
      <div ref={tipRef} className={`${styles.timelineTip} absolute left-3 md:left-5 top-2 w-2 h-2 rounded-full bg-ink dark:bg-night-ink shadow-[0_0_14px_4px_rgba(29,29,31,0.18)]`} style={{ opacity: 0 }} aria-hidden="true" />
      <ol className="space-y-10">
        {TIMELINE_MILESTONES.map((milestone, index) => (
          <li key={milestone.period} className={`${styles.milestone} relative`} data-milestone data-reached="false" data-entered="false" style={{ '--card-offset': index % 2 === 0 ? '-16px' : '16px' } as CSSProperties}>
            {/* 配置の transform と点灯時の弾みを，外側と内側へ分けます． */}
            <span className="absolute -left-10 md:-left-14 top-1.5 w-6 h-6 -translate-x-1/2 ml-3 md:ml-5" aria-hidden="true">
              <span className={styles.timelineDot}>
                <span className={styles.timelineCore} />
              </span>
            </span>
            <div className={styles.timelineCard}>
              <p className={`${styles.timelinePeriod} text-xs font-mono tracking-widest`}>{milestone.period}</p>
              <h4 className="mt-1 text-lg font-semibold">{milestone.title}</h4>
              <p className={`${styles.milestoneDescription} mt-2 text-sm leading-relaxed text-subtle dark:text-night-subtle max-w-2xl`}>{milestone.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {milestone.apps.map((appName, appIndex) => (
                  <span key={appName} className={`${styles.timelineTag} px-2.5 py-1 text-xs rounded-full border bg-mist dark:bg-night border-soft dark:border-night-border text-body dark:text-night-body`} style={{ '--tag-delay': `${staggerDelay(appIndex, { stepMs: TAG_STEP_MS })}ms` } as CSSProperties}>{appName}</span>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
