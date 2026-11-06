"use client";

import { useEffect, useState, type CSSProperties } from 'react';
import { useInView } from '../hooks/useInView';
import { createPointerSpring } from '../lib/pointerSpring';

// ワードマークが画面にこの割合だけ入ったら文字を起こし始める
const WORDMARK_IN_VIEW_THRESHOLD = 0.35;
// 時計を更新する間隔の基準（1分）
const MS_PER_MINUTE = 60_000;
// 分の切り替わりよりわずかに遅らせ，表示が前の分のまま残らないようにする
const CLOCK_TICK_MARGIN_MS = 50;

// 日本時間の「時:分」（24時間表記）
const JAPAN_TIME_FORMATTER = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// フッターの大きな名前．画面に入ると1文字ずつ下から起き上がる．
// 名前はすぐ上のリンクで読めるため，この飾りは読み上げから外す
export function FooterWordmark({ text }: { text: string }) {
  const { ref, isInView } = useInView<HTMLDivElement>(WORDMARK_IN_VIEW_THRESHOLD);
  const characters = Array.from(text);

  useEffect(() => {
    const wordmark = ref.current;
    if (!wordmark) return;
    const enabled = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 761px) and (prefers-reduced-motion: no-preference)');
    let dispose = () => {};
    const setup = () => {
      dispose();
      if (!enabled.matches) return;
      const controller = new AbortController();
      const { signal } = controller;
      const letters = [...wordmark.querySelectorAll<HTMLElement>('[data-footer-letter]')];
      let centers: number[] = [];
      let bounds: DOMRect | null = null;
      let lift = 0;
      let radius = 0;
      const spring = createPointerSpring(letters.length * 2, values => {
        letters.forEach((letter, index) => {
          letter.style.transform = `translate3d(0,${values[index * 2]}px,0) rotate(${values[index * 2 + 1]}deg)`;
        });
      });
      const measure = () => {
        bounds = wordmark.getBoundingClientRect();
        lift = Math.min(bounds.height * .15, 32);
        radius = Math.max(bounds.width / letters.length * 1.7, 90);
        centers = letters.map(letter => {
          const rect = letter.parentElement!.getBoundingClientRect();
          return rect.left + rect.width / 2;
        });
      };
      const release = () => spring.to(Array(letters.length * 2).fill(0));
      wordmark.addEventListener('pointerenter', measure, { signal, passive: true });
      wordmark.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        if (!bounds) measure();
        const targets = centers.flatMap(center => {
          const distance = event.clientX - center;
          const influence = Math.exp(-((distance / radius) ** 2) * 1.5);
          return [-lift * influence, distance / radius * influence * 7];
        });
        spring.to(targets);
      }, { signal, passive: true });
      wordmark.addEventListener('pointerleave', release, { signal });
      window.addEventListener('blur', () => spring.reset(), { signal });
      document.addEventListener('visibilitychange', () => { if (document.hidden) spring.reset(); }, { signal });
      const resize = new ResizeObserver(() => { bounds = null; spring.reset(); });
      resize.observe(wordmark);
      const intersection = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) spring.reset(); });
      intersection.observe(wordmark);
      wordmark.setAttribute('data-pointer-wave', '');
      dispose = () => {
        controller.abort(); resize.disconnect(); intersection.disconnect(); spring.dispose();
        wordmark.removeAttribute('data-pointer-wave');
        letters.forEach(letter => letter.style.removeProperty('transform'));
      };
    };
    setup(); enabled.addEventListener('change', setup);
    return () => { dispose(); enabled.removeEventListener('change', setup); };
  }, [ref, text]);

  return (
    <div ref={ref} className={`footer-wordmark ${isInView ? 'is-visible' : ''}`} aria-hidden="true">
      {characters.map((character, index) => (
        <span
          key={`${character}-${index}`}
          className={`footer-wordmark-char ${index === characters.length - 1 ? 'is-accent' : ''}`}
          style={{ '--char-index': index } as CSSProperties}
        >
          <span className="footer-letter" data-footer-letter>{character === ' ' ? ' ' : character}</span>
        </span>
      ))}
    </div>
  );
}

// いまの日本時間を分単位で表示する時計．分が変わると数字が下から差し替わる
export function JapanClock() {
  // サーバーとブラウザで時刻がずれて表示が食い違わないよう，時刻は表示後に入れる
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId = 0;
    const tick = () => {
      const now = new Date();
      setTime(JAPAN_TIME_FORMATTER.format(now));
      // 次の分の切り替わりに合わせて更新する
      const untilNextMinute = MS_PER_MINUTE - (now.getTime() % MS_PER_MINUTE);
      timeoutId = window.setTimeout(tick, untilNextMinute + CLOCK_TICK_MARGIN_MS);
    };
    tick();
    return () => window.clearTimeout(timeoutId);
  }, []);

  const [hours, minutes] = (time ?? '--:--').split(':');

  return (
    <p className="footer-clock">
      <span className="footer-clock-label">日本時間</span>
      <time className="footer-clock-time" dateTime={time ?? undefined}>
        <span key={`h-${hours}`} className="footer-clock-digits">{hours}</span>
        <span className="footer-clock-colon">:</span>
        <span key={`m-${minutes}`} className="footer-clock-digits">{minutes}</span>
      </time>
    </p>
  );
}
