"use client";

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// 次の語へ切り替わるまでの時間（ミリ秒）
const ROTATION_INTERVAL_MS = 2400;

interface RotatingWordsProps {
  // 順番に入れ替える語（最初の語が初期表示）
  words: string[];
  className?: string;
}

// 文中の1語だけを，下から押し上げるように順番に入れ替える．
// すべての語を同じマスに重ねて置き，枠の幅だけを次の語に合わせてなめらかに伸び縮みさせる．
export function RotatingWords({ words, className = '' }: RotatingWordsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  // 語ごとの表示幅（ピクセル）．入れ替えに合わせて枠の幅もなめらかに変える
  const [wordWidths, setWordWidths] = useState<number[]>([]);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const prefersReducedMotion = usePrefersReducedMotion();

  // フォントの読み込み後に幅が変わることもあるので，文字の大きさが変わるたびに測り直す
  useLayoutEffect(() => {
    const measure = () => setWordWidths(wordRefs.current.map((element) => element?.offsetWidth ?? 0));
    measure();
    const observer = new ResizeObserver(measure);
    wordRefs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, [words]);

  useEffect(() => {
    if (prefersReducedMotion || words.length < 2) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % words.length);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [prefersReducedMotion, words.length]);

  return (
    <span
      className={`rotating-words ${className}`}
      style={wordWidths[activeIndex] ? { width: `${wordWidths[activeIndex]}px` } : undefined}
    >
      {/* 読み上げでは入れ替わる語をまとめて1度だけ伝える */}
      <span className="sr-only">{words.join('・')}</span>
      {words.map((word, index) => {
        const state = index === activeIndex ? 'is-active' : index === (activeIndex - 1 + words.length) % words.length ? 'is-leaving' : '';
        return (
          <span
            key={word}
            ref={(element) => {
              wordRefs.current[index] = element;
            }}
            aria-hidden="true"
            className={`rotating-word ${state}`}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
}
