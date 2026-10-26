"use client";

import { useInView } from '../hooks/useInView';

// 1文字ごとにずらす時間（ミリ秒）
const CHARACTER_DELAY_MS = 32;

interface SplitTextRevealProps {
  // 1文字ずつ表示する文字列
  text: string;
  className?: string;
}

// 画面内に入ると，1文字ずつ下から立ち上がって現れる見出し．
// 読み上げ用には元の文字列を視覚的に隠して置き，分割した文字は読み上げから外す．
export function SplitTextReveal({ text, className = '' }: SplitTextRevealProps) {
  const { ref, isInView } = useInView<HTMLSpanElement>();

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {Array.from(text).map((character, index) => (
          <span
            key={`${character}-${index}`}
            className={isInView ? 'animate-char-rise' : 'inline-block opacity-0'}
            style={{ animationDelay: `${index * CHARACTER_DELAY_MS}ms` }}
          >
            {/* 空白は幅を保つため実体参照で描画する */}
            {character === ' ' ? '\u00a0' : character}
          </span>
        ))}
      </span>
    </span>
  );
}
