"use client";

import { useEffect, useState } from 'react';
import { subscribeToScroll } from '../lib/scrollObserver';

// 画面上部からこの割合の位置にある見出しを「現在のセクション」とみなす
const ACTIVE_LINE_RATIO = 0.35;

// スクロール位置から，いま表示中のセクション ID を返すフック．
// Navbar のリンクをハイライトするために使う．
export function useActiveSection(sectionIds: string[]): string {
  const [activeSectionId, setActiveSectionId] = useState(sectionIds[0] ?? '');

  useEffect(() => {
    const updateActiveSection = () => {
      const activeLineY = window.innerHeight * ACTIVE_LINE_RATIO;

      // 判定ラインを最後に越えたセクションを採用する
      let currentId = sectionIds[0] ?? '';
      sectionIds.forEach((sectionId) => {
        const element = document.getElementById(sectionId);
        if (element && element.getBoundingClientRect().top <= activeLineY) {
          currentId = sectionId;
        }
      });
      setActiveSectionId(currentId);
    };

    return subscribeToScroll(updateActiveSection);
  }, [sectionIds]);

  return activeSectionId;
}
