"use client";

// 事実だけを呼び出し側から渡す短文の帯です．「/」でスクロール強調する語を区切ります．
// 例：<StatementBand text={STATEMENT_EXAMPLES.apps(SWIFT_APPS.length)} />．
// STATEMENT_EXAMPLES はサーバーからも使える src/lib/ambient/statement から import します．
// props：text（必須），className，testId（既定 statement-band）．文言・本数の正しさは呼び出し側で確認します．
// 広い画面は大きな一行，小さい画面は語の境目で折り返します．装飾の再掲なので aria-hidden です．
// 新しい事実をここだけに置かず，同じ内容を本文にも残してください．
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { subscribeToScroll } from '../../lib/scrollObserver';
import { statementOpacity, statementWords } from '../../lib/ambient/statement';
import styles from './StatementBand.module.css';

export interface StatementBandProps { text: string; className?: string; testId?: string }
const READ_START = 0.82;
const READ_DISTANCE = 0.55;
const ASCII_MAX = 127;
const ASCII_WIDTH_RATIO = 0.56;

export function StatementBand({ text, className = '', testId = 'statement-band' }: StatementBandProps) {
  const ref = useRef<HTMLDivElement>(null);
  const words = useMemo(() => statementWords(text), [text]);
  const units = Math.max(1, Array.from(words.join('')).reduce((sum, char) => sum + (char.charCodeAt(0) > ASCII_MAX ? 1 : ASCII_WIDTH_RATIO), 0));
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const spans = Array.from(node.querySelectorAll<HTMLElement>('[data-word]'));
    let inView = false;
    let unsubscribeScroll: (() => void) | undefined;
    const paint = () => {
      if (document.hidden) return;
      const top = node.getBoundingClientRect().top;
      const progress = media.matches ? 1 : (innerHeight * READ_START - top) / Math.max(1, innerHeight * READ_DISTANCE);
      spans.forEach((span, index) => { span.style.opacity = String(statementOpacity(index, spans.length, progress)); });
    };
    const update = () => {
      unsubscribeScroll?.();
      unsubscribeScroll = undefined;
      if (media.matches) paint();
      else if (inView && !document.hidden) unsubscribeScroll = subscribeToScroll(paint);
    };
    const observer = new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting);
      update();
    });
    observer.observe(node);
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer.disconnect();
      unsubscribeScroll?.();
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [words]);

  return <div ref={ref} aria-hidden="true" data-testid={testId} className={`${styles.band} ${className}`} style={{ '--statement-units': units } as CSSProperties}>
    <p className={styles.text}>{words.map((word, index) => <span key={`${word}-${index}`} data-word="" className={styles.word}>{word}</span>)}</p>
  </div>;
}
