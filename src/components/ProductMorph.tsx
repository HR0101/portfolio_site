"use client";

import { useEffect, useLayoutEffect } from 'react';

// 押したカードの画面が，紹介ページの主役の画面へそのまま移って変形する演出（View Transitions API の共有要素）．
// 移動元に付けた名前と同じ名前を移動先にも付けると，ブラウザが位置と大きさを補間してくれる．
// 名前は移動の間だけ付ける（付けたままだとテーマ切り替えの円の演出から外れてしまう）．

// 移動元と移動先に付ける共通の名前（globals.css の ::view-transition-group(product-morph)）
const MORPH_NAME = 'product-morph';
// 押してから移動先が描かれるまで待つ上限．これを過ぎたら演出をあきらめる
const MORPH_PENDING_MS = 1500;
// 名前を外すまでの時間（演出が終わりきってから外す．globals.css のページの入れ替え 0.27s + 1.08s より長く取る）
const MORPH_CLEANUP_MS = 2200;
// 紹介ページの URL の先頭
const DETAIL_PATH_PREFIX = '/apps/';

// 移動元を押した時刻（この時刻から MORPH_PENDING_MS の間だけ，移動先が名前を受け取る）
let pendingSince = 0;
// いま名前を付けている要素．同じ名前が2つあると演出ごと失敗するため，付け替えるときは先に外す
const namedElements = new Set<HTMLElement>();

function clearMorphName(element: HTMLElement): void {
  if (element.style.viewTransitionName === MORPH_NAME) {
    element.style.viewTransitionName = '';
  }
  namedElements.delete(element);
}

// 名前を付け，しばらくしたら外す
function nameForMorph(element: HTMLElement): void {
  element.style.viewTransitionName = MORPH_NAME;
  namedElements.add(element);
  window.setTimeout(() => clearMorphName(element), MORPH_CLEANUP_MS);
}

// 画面に見えている要素か（画面外から飛んでくると，かえって分かりにくい）
function isOnScreen(element: HTMLElement): boolean {
  const bounds = element.getBoundingClientRect();
  return bounds.width > 0 && bounds.bottom > 0 && bounds.top < window.innerHeight;
}

// 押したリンクから，移動元にする画面を探す．
// カードの中のどのリンクを押しても，そのカードの画面（data-morph-source）を使う
function findMorphSource(anchor: HTMLAnchorElement): HTMLElement | null {
  const scopedSource = anchor.closest('[data-morph-scope]')?.querySelector<HTMLElement>('[data-morph-source]');
  return scopedSource ?? anchor.querySelector<HTMLElement>('[data-morph-source], img');
}

// 紹介ページへのリンクが押されたら，移動元の画面に名前を付ける（レイアウトに1つだけ置く）
export function ProductMorphSource() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const isPlainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
      if (!isPlainClick || typeof document.startViewTransition !== 'function') {
        return;
      }
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      // メニューの中の画像は，閉じる動きと重なるため使わない
      if (!anchor || anchor.target === '_blank' || anchor.closest('.site-navbar')) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      const isOtherDetailPage =
        url.origin === window.location.origin &&
        url.pathname.startsWith(DETAIL_PATH_PREFIX) &&
        url.pathname !== window.location.pathname;
      if (!isOtherDetailPage) {
        return;
      }
      const source = findMorphSource(anchor);
      if (!source || !isOnScreen(source)) {
        return;
      }
      // 続けて押されたときは，前に押した画面の名前を外してから付け直す
      namedElements.forEach(clearMorphName);
      nameForMorph(source);
      pendingSince = performance.now();
    };

    // Next.js のリンクが遷移を始める前に名前を付けたいので，捕捉の段階で受け取る
    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, []);

  return null;
}

// 紹介ページが描かれた直後（新しい画面を撮る前）に，主役の画面（data-morph-target）へ同じ名前を付ける
export function ProductMorphTarget() {
  useLayoutEffect(() => {
    if (pendingSince === 0 || performance.now() - pendingSince > MORPH_PENDING_MS) {
      return;
    }
    pendingSince = 0;
    const target = document.querySelector<HTMLElement>('[data-morph-target]');
    if (target && !namedElements.has(target)) {
      nameForMorph(target);
    }
  }, []);

  return null;
}
