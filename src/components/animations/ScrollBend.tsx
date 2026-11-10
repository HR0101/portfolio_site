"use client";

import { useEffect, useRef, type ReactNode } from 'react';
import { subscribeToScroll } from '../../lib/scrollObserver';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import {
  getBendAmount,
  getBendFromAmount,
  getScrollVelocity,
  isBendSettled,
  stepBendSpring,
  toBendTransform,
  type SpringState,
} from '../../lib/animations/scrollBend';

// 画面の少し外側（上下）に出たタイルまでは動かし続ける（端で急に止まって見えないように）
const VISIBLE_ROOT_MARGIN = '10% 0px';
// スクロールが始まった最初のフレームで，経過時間として見なす値（ミリ秒）
const FIRST_FRAME_MS = 1000 / 60;
const MS_PER_SECOND = 1000;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

interface BendTarget {
  // 変形を受ける内側の要素（画面内かどうかは，外側の要素で測る）
  inner: HTMLElement;
  isVisible: boolean;
}

// 全タイルで共有する状態．スクロールの購読・rAF・ばねは，ページ全体で 1 つだけ持つ．
// タイルごとに持たないので，何枚あっても処理は 1 回の rAF で済む．
const targets = new Map<Element, BendTarget>();
let intersectionObserver: IntersectionObserver | null = null;
let unsubscribeScroll: (() => void) | null = null;
let frameId = 0;
let lastScrollY = 0;
let lastFrameTime = 0;
let spring: SpringState = { value: 0, velocity: 0 };

// 1 枚のタイルから変形を取り除く
function clearTarget(target: BendTarget): void {
  target.inner.style.removeProperty('transform');
  target.inner.style.removeProperty('will-change');
}

// いまのばねの値を，画面内のタイルへ書く．画面外のタイルには何も書かない
function paint(): void {
  const transform = toBendTransform(getBendFromAmount(spring.value));
  targets.forEach((target) => {
    if (!target.isVisible) return;
    if (transform === 'none') {
      clearTarget(target);
      return;
    }
    target.inner.style.transform = transform;
    target.inner.style.willChange = 'transform';
  });
}

// 1 フレーム進める．動いている間だけ次のフレームを予約し，止まったら眠る
function tick(now: number): void {
  frameId = 0;
  const elapsedMs = lastFrameTime === 0 ? FIRST_FRAME_MS : now - lastFrameTime;
  const scrollY = window.scrollY;
  const velocity = getScrollVelocity(scrollY - lastScrollY, elapsedMs);
  lastScrollY = scrollY;
  lastFrameTime = now;

  const targetAmount = getBendAmount(velocity);
  spring = stepBendSpring(spring, targetAmount, elapsedMs / MS_PER_SECOND);
  paint();

  // スクロールが続いている（目標が 0 でない）か，まだ戻りきっていない間は動かす
  if (targetAmount !== 0 || !isBendSettled(spring, 0)) {
    frameId = window.requestAnimationFrame(tick);
    return;
  }
  spring = { value: 0, velocity: 0 };
  paint();
  lastFrameTime = 0;
}

// 眠っているループを起こす（スクロールの通知・タイルが画面に入ったとき）
function wake(): void {
  if (frameId !== 0) return;
  frameId = window.requestAnimationFrame(tick);
}

function handleIntersection(entries: IntersectionObserverEntry[]): void {
  entries.forEach((entry) => {
    const target = targets.get(entry.target);
    if (!target) return;
    target.isVisible = entry.isIntersecting;
    if (!target.isVisible) {
      clearTarget(target);
    }
  });
  wake();
}

// 共有のループを止めて，状態を初期へ戻す（登録されているタイルがなくなったとき）
function teardown(): void {
  unsubscribeScroll?.();
  unsubscribeScroll = null;
  intersectionObserver?.disconnect();
  intersectionObserver = null;
  if (frameId !== 0) {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  }
  spring = { value: 0, velocity: 0 };
  lastFrameTime = 0;
}

// タイルを共有のループへ登録する．戻り値を呼ぶと登録を外し，変形も取り除く
function registerTarget(outer: HTMLElement, inner: HTMLElement): () => void {
  // 動きを減らす設定のときは，何も登録しない
  if (typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches) {
    return () => {};
  }
  // IntersectionObserver がない環境では，しならせない（静止したまま）
  if (typeof IntersectionObserver === 'undefined') {
    return () => {};
  }

  const target: BendTarget = { inner, isVisible: false };
  targets.set(outer, target);
  if (!intersectionObserver) {
    intersectionObserver = new IntersectionObserver(handleIntersection, { rootMargin: VISIBLE_ROOT_MARGIN });
  }
  intersectionObserver.observe(outer);

  if (!unsubscribeScroll) {
    lastScrollY = window.scrollY;
    lastFrameTime = 0;
    // 通知はスクロール（とリサイズ）のたびに来る．ここでは眠りを覚ますだけで，速さはループの中で測る
    unsubscribeScroll = subscribeToScroll(wake);
  }

  return () => {
    intersectionObserver?.unobserve(outer);
    targets.delete(outer);
    clearTarget(target);
    if (targets.size === 0) {
      teardown();
    }
  };
}

interface ScrollBendProps {
  children: ReactNode;
  className?: string;
}

// スクロールが速いほど，中の画面が進行方向に少し傾いて縦へ伸び，止まるとばねで戻る．
// 画面内かどうかを測る外側と，変形を受ける内側を分けているので，発振しない．
// 変形するのは内側だけで，子の要素が自分の transform（ホバーなど）を持っていても競合しない．
// 値は style へ直接書くので，スクロール中も React の再描画は起きない．
export function ScrollBend({ children, className = '' }: ScrollBendProps) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || prefersReducedMotion) {
      return;
    }
    return registerTarget(outer, inner);
  }, [prefersReducedMotion]);

  return (
    <div ref={outerRef} className={className || undefined} data-scroll-bend="">
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
