"use client";

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useInView } from '../hooks/useInView';
import { createParticleWordmark, WORDMARK_PARTICLE_PADDING } from '../lib/particleWordmarkCanvas';

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

// フッターの大きな名前．マウスでなぞると点がほどけ，元の字形へ戻る．
// 名前はすぐ上のリンクで読めるため，この飾りは読み上げから外す
export function FooterWordmark({ text }: { text: string }) {
  const { ref, isInView } = useInView<HTMLDivElement>(WORDMARK_IN_VIEW_THRESHOLD);
  const textRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const characters = Array.from(text);

  useEffect(() => {
    const wordmark = ref.current;
    const fallbackText = textRef.current;
    const canvas = canvasRef.current;
    if (!wordmark || !fallbackText || !canvas) return;
    const enabled = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 761px) and (prefers-reduced-motion: no-preference)');
    let dispose = () => {};
    const setup = () => {
      dispose();
      if (!enabled.matches) return;
      dispose = createParticleWordmark(wordmark, fallbackText, canvas);
    };
    setup(); enabled.addEventListener('change', setup);
    return () => { dispose(); enabled.removeEventListener('change', setup); };
  }, [ref, text]);

  return (
    <div ref={ref} className={`footer-wordmark ${isInView ? 'is-visible' : ''}`} aria-hidden="true">
      <div ref={textRef} className="footer-wordmark-text">
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
      <canvas
        ref={canvasRef}
        className="footer-wordmark-canvas"
        style={{ '--particle-padding': `${WORDMARK_PARTICLE_PADDING}px` } as CSSProperties}
      />
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
