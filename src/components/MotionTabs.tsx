'use client';

import { useLayoutEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';

interface MotionTabsProps extends HTMLAttributes<HTMLDivElement> {
  activeKey: string | number;
  children: ReactNode;
}

// An underline follows the actual selected button, including wrapped rows and
// horizontally scrolled tabs. Existing ARIA roles and keyboard handlers stay put.
export function MotionTabs({ activeKey, children, className = '', ...props }: MotionTabsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    const line = marker.current;
    if (!root || !line) return;
    const update = () => {
      const button = root.querySelector<HTMLElement>(':scope > button[aria-selected="true"], :scope > button[aria-pressed="true"]');
      if (!button) { line.style.opacity = '0'; return; }
      // offset* are layout coordinates, so hover transforms do not move the line.
      line.style.width = `${button.offsetWidth}px`;
      line.style.translate = `${button.offsetLeft}px ${button.offsetTop + button.offsetHeight - 2}px`;
      line.style.backgroundColor = getComputedStyle(button).color;
      line.style.opacity = '0.75';
      if (!line.dataset.ready) {
        line.getBoundingClientRect();
        line.dataset.ready = 'true';
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    root.querySelectorAll(':scope > button').forEach(button => observer.observe(button));
    const themeObserver = new MutationObserver(update);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    // A theme can also crossfade its text color. Read the settled color after
    // that transition, rather than keeping the intermediate color sampled above.
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName === 'color') update();
    };
    root.addEventListener('transitionend', onTransitionEnd);
    return () => { observer.disconnect(); themeObserver.disconnect(); root.removeEventListener('transitionend', onTransitionEnd); };
  }, [activeKey]);

  return <div {...props} ref={ref} className={`${className} motion-tabs`}>
    <span ref={marker} className="motion-tab-line" aria-hidden="true" />
    {children}
  </div>;
}
