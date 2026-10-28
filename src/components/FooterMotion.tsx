"use client";

import { useEffect, useState, type CSSProperties } from 'react';
import { useInView } from '../hooks/useInView';

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

  return (
    <div ref={ref} className={`footer-wordmark ${isInView ? 'is-visible' : ''}`} aria-hidden="true">
      {characters.map((character, index) => (
        <span
          key={`${character}-${index}`}
          className={`footer-wordmark-char ${index === characters.length - 1 ? 'is-accent' : ''}`}
          style={{ '--char-index': index } as CSSProperties}
        >
          {character === ' ' ? ' ' : character}
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
