"use client";

import type { CSSProperties } from 'react';
import { useInView } from '../hooks/useInView';

// 句ごとにずらす時間（ミリ秒）
const PHRASE_DELAY_MS = 80;

interface PhraseRevealProps {
  text: string;
  className?: string;
}

// 句読点の直後で区切る（区切り文字は前の句に残す）
function splitIntoPhrases(text: string): string[] {
  return text.match(/[^，．、。,.]+[，．、。,.]?/g) ?? [text];
}

// 画面に入ると，文章が句ごとにぼかしの中から順に浮かび上がる．
export function PhraseReveal({ text, className = '' }: PhraseRevealProps) {
  const { ref, isInView } = useInView<HTMLSpanElement>();
  const phrases = splitIntoPhrases(text);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {phrases.map((phrase, index) => (
          <span
            key={`${phrase}-${index}`}
            className={`phrase-reveal ${isInView ? 'is-visible' : ''}`}
            style={{ '--phrase-delay': `${index * PHRASE_DELAY_MS}ms` } as CSSProperties}
          >
            {phrase}
          </span>
        ))}
      </span>
    </span>
  );
}
