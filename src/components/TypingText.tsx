"use client";

import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// 1文字あたりの表示間隔（ミリ秒）
const TYPING_INTERVAL_MS = 55;
// 打ち終わってから消し始めるまでの待ち時間（ミリ秒）
const HOLD_AFTER_TYPED_MS = 1800;
// 1文字あたりの削除間隔（ミリ秒）
const DELETING_INTERVAL_MS = 28;

interface TypingTextProps {
  // 順番に表示する文字列のリスト
  phrases: string[];
  className?: string;
  // 見た目のタイピングを追わずに読み上げる，安定した代替文
  accessibleText?: string;
}

// 文字列を1文字ずつ打ち込み，消し，次のフレーズへ移るタイピング演出
export function TypingText({ phrases, className = '', accessibleText }: TypingTextProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentPhrase = phrases[phraseIndex] ?? '';

  useEffect(() => {
    if (prefersReducedMotion || phrases.length === 0) {
      return;
    }

    // 打ち終わった状態：しばらく見せてから削除に切り替える
    if (!isDeleting && characterCount === currentPhrase.length) {
      const timeoutId = window.setTimeout(() => setIsDeleting(true), HOLD_AFTER_TYPED_MS);
      return () => window.clearTimeout(timeoutId);
    }

    // 消し終わった状態：次のフレーズへ進む
    if (isDeleting && characterCount === 0) {
      setIsDeleting(false);
      setPhraseIndex((previous) => (previous + 1) % phrases.length);
      return;
    }

    const intervalMs = isDeleting ? DELETING_INTERVAL_MS : TYPING_INTERVAL_MS;
    const timeoutId = window.setTimeout(() => {
      setCharacterCount((previous) => previous + (isDeleting ? -1 : 1));
    }, intervalMs);
    return () => window.clearTimeout(timeoutId);
  }, [characterCount, isDeleting, currentPhrase, phrases, prefersReducedMotion]);

  // アニメーション抑制時は最初のフレーズを静的に表示する
  const visibleText = prefersReducedMotion
    ? phrases[0] ?? ''
    : currentPhrase.slice(0, characterCount);

  return (
    <>
      <span className={className} aria-hidden={accessibleText ? 'true' : undefined}>
        {visibleText}
        {!prefersReducedMotion && (
          <span className="animate-caret text-subtle dark:text-night-subtle" aria-hidden="true">
            |
          </span>
        )}
      </span>
      {accessibleText && <span className="sr-only">{accessibleText}</span>}
    </>
  );
}
