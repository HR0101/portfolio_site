"use client";

import { useInView } from '../hooks/useInView';

export function RevealLine() {
  const { ref, isInView } = useInView<HTMLSpanElement>();
  return <span ref={ref} className={`reveal-line ${isInView ? 'is-visible' : ''}`} aria-hidden="true" />;
}
