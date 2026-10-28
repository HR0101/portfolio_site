"use client";

import { useEffect } from 'react';

// 読み込み待ちの印（globals.css の img[data-image-reveal]）
const PENDING = 'pending';
const LOADED = 'loaded';

// 遅延読み込みの画像に，読み込み終わるまでの印を付ける．
// 読み込みが終わると，ぼかしの中から静かに浮かび上がる（画面の外で読み込まれた画像も，見えたときには表示済み）
function prepareImage(image: HTMLImageElement): void {
  if (image.loading !== 'lazy' || image.complete || image.dataset.imageReveal) {
    return;
  }
  image.dataset.imageReveal = PENDING;
  const markLoaded = () => {
    image.dataset.imageReveal = LOADED;
  };
  // 読み込めなかったときも，隠したままにしない
  image.addEventListener('load', markLoaded, { once: true });
  image.addEventListener('error', markLoaded, { once: true });
}

// 子孫も含めて，新しく加わった画像を探す
function prepareImagesIn(node: Node): void {
  if (node instanceof HTMLImageElement) {
    prepareImage(node);
  } else if (node instanceof Element) {
    node.querySelectorAll('img').forEach(prepareImage);
  }
}

// ページ中の遅延読み込みの画像が，ぱっと現れずにふわりと現れるようにする（レイアウトに1つだけ置く）
export function ImageReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    prepareImagesIn(document.body);
    // ページの移動やタブの切り替えで後から加わった画像にも付ける
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach(prepareImagesIn));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
