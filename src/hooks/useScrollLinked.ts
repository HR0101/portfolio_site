"use client";

import { useEffect, useRef, useState } from 'react';
import { clamp, subscribeToScroll } from '../lib/scrollObserver';

// 進捗の測り方
// - 'through': 要素が画面下端から入り，上端から抜けるまでを 0→1 とする（背景の視差向け）
// - 'enter': 要素の上端が画面下端に触れてから，画面の中ほどに来るまでを 0→1 とする（線を描く演出向け）
// - 'leave': 要素の上端が画面上端に達してから，1画面ぶんスクロールするまでを 0→1 とする（Hero の退場向け）
// - 'fill': 要素が画面の少し下から，下端が画面中ほどを抜けるまでを 0→1 とする（縦線を描く演出向け）
export type ScrollLinkMode = 'through' | 'enter' | 'leave' | 'fill';

// 'enter' モードで進捗が 1 になる位置（画面高さに対する割合）
const ENTER_COMPLETION_RATIO = 0.55;
// 'fill' モードで基準にする画面上の位置（画面高さに対する割合）
const FILL_REFERENCE_RATIO = 0.62;

// 要素のスクロール位置に連動した進捗（0〜1）を返すフック
export function useScrollLinked<T extends HTMLElement>(mode: ScrollLinkMode = 'through') {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const measureProgress = () => {
      const bounds = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      if (mode === 'leave') {
        // 要素の上端が画面上端を通り過ぎた量を，画面1つぶんで正規化する
        setProgress(clamp(-bounds.top / viewportHeight));
        return;
      }

      if (mode === 'enter') {
        // 要素の上端が画面下端に触れてから，画面中ほどに達するまで
        const travelDistance = viewportHeight * ENTER_COMPLETION_RATIO;
        setProgress(clamp((viewportHeight - bounds.top) / (travelDistance + bounds.height)));
        return;
      }

      if (mode === 'fill') {
        // 画面の少し下に引いた基準線が，要素の上端から下端まで進む割合
        const referenceLineY = viewportHeight * FILL_REFERENCE_RATIO;
        setProgress(clamp((referenceLineY - bounds.top) / bounds.height));
        return;
      }

      // 'through': 要素が画面を通過し切るまでの全体を 0→1 とする
      setProgress(clamp((viewportHeight - bounds.top) / (viewportHeight + bounds.height)));
    };

    return subscribeToScroll(measureProgress);
  }, [mode]);

  return { ref, progress };
}
