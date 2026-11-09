"use client";

import { useEffect, useState } from 'react';
import {
  PRELOADER_FAILSAFE_MS,
  PRELOADER_OPEN_EVENT,
  PRELOADING_CLASS,
} from '../lib/preloader';

// 読み込み画面が開くまで false，開いたら true を返す．
// 読み込み画面が出ない場合（2 回目以降など）は最初から true．
// 画面が開いた瞬間から始めたい JS の演出（タイピングなど）の開始を遅らせるのに使う
export function usePageRevealed(): boolean {
  // サーバーと最初のクライアント描画をそろえるため，初期値は true にしておく
  const [isRevealed, setIsRevealed] = useState(true);

  useEffect(() => {
    if (!document.documentElement.classList.contains(PRELOADING_CLASS)) {
      return;
    }
    setIsRevealed(false);
    const handleOpen = () => setIsRevealed(true);
    window.addEventListener(PRELOADER_OPEN_EVENT, handleOpen, { once: true });
    // 読み込み画面側が動かなかった場合でも，演出が止まったままにならないようにする
    const failsafeId = window.setTimeout(handleOpen, PRELOADER_FAILSAFE_MS);
    return () => {
      window.removeEventListener(PRELOADER_OPEN_EVENT, handleOpen);
      window.clearTimeout(failsafeId);
    };
  }, []);

  return isRevealed;
}
