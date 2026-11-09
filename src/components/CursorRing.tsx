"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { subscribeToScroll } from '../lib/scrollObserver';
import styles from './CursorRing.module.css';

// ===== 引力（カーソルへ要素がゆるく吸い寄せられる）=====
// 対象は，見出し・カード・文章のかたまりを包む .reveal と，data-attract を付けた要素
const ATTRACT_SELECTOR = '.reveal, [data-attract]';
// カーソルの影響が届く半径（要素の縁からの距離，px）
const ATTRACT_RADIUS_PX = 240;
// 吸い寄せられる最大の距離（px）
const ATTRACT_MAX_OFFSET_PX = 12;
// 追従のなめらかさ（ms）．大きいほどゆっくり動き，既存のカーソルより重く感じる
const ATTRACT_SMOOTHING_MS = 120;
// 大きな要素ほど移動量を小さくする基準（px）．この寸法を超えるほど最小値へ近づく
const ATTRACT_SIZE_REFERENCE_PX = 2400;
const ATTRACT_MIN_SIZE_FACTOR = 0.5;
// 画面の幅に対してこれより広い要素はページの枠とみなし，動かさない
const ATTRACT_MAX_WIDTH_RATIO = 0.75;
// 背景の装飾（data-attract="decor"）は，操作しない飾りなので大きく寄せる
const ATTRACT_DECOR_STRENGTH = 2.5;
// 元の位置に戻り終えたとみなす移動量（px）
const ATTRACT_SETTLE_PX = 0.02;
// まだ動いているとみなす，目標との差（px）．
// 戻り終える前にループが眠らないよう，ATTRACT_SETTLE_PX より小さくしておく
const ATTRACT_MOVING_PX = 0.01;

interface AttractionInput {
  cursorX: number;
  cursorY: number;
  // 引力で動いた分を除いた，要素本来の矩形
  left: number;
  top: number;
  width: number;
  height: number;
  isDecor: boolean;
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

// 0 から 1 へなだらかに立ち上がる．距離による効き方の変わり目を滑らかにする
function smoothStep(value: number): number {
  return value * value * (3 - 2 * value);
}

// カーソルへ向かう移動量（px）を返す．
// 半径の外では 0，縁に近いほど強く，要素の中心にカーソルが重なると 0 に戻る
function computeAttractionOffset(input: AttractionInput): [number, number] {
  const { cursorX, cursorY, left, top, width, height, isDecor } = input;
  // 要素の縁からカーソルまでの距離（カーソルが要素の内側なら 0）
  const edgeDistance = Math.hypot(
    cursorX - clampNumber(cursorX, left, left + width),
    cursorY - clampNumber(cursorY, top, top + height),
  );
  if (edgeDistance >= ATTRACT_RADIUS_PX) return [0, 0];

  const toCursorX = cursorX - (left + width / 2);
  const toCursorY = cursorY - (top + height / 2);
  const centerDistance = Math.hypot(toCursorX, toCursorY);
  if (centerDistance < 1) return [0, 0];

  const falloff = smoothStep(1 - edgeDistance / ATTRACT_RADIUS_PX);
  // 中心付近では動かさず，離れるほど強める（カーソルが重なったときの震えを防ぐ）
  const core = clampNumber(
    centerDistance / (isDecor ? ATTRACT_RADIUS_PX : Math.min(width, height) / 2),
    0,
    1,
  );
  const sizeFactor = isDecor
    ? 1
    : clampNumber(1 - Math.max(width, height) / ATTRACT_SIZE_REFERENCE_PX, ATTRACT_MIN_SIZE_FACTOR, 1);
  const strength = isDecor ? ATTRACT_DECOR_STRENGTH : 1;
  const magnitude = ATTRACT_MAX_OFFSET_PX * strength * sizeFactor * falloff * core;
  return [(toCursorX / centerDistance) * magnitude, (toCursorY / centerDistance) * magnitude];
}

// One sleeping rAF loop owns cursor, magnetic links, and the site-wide attraction.
export function CursorRing() {
  const ref = useRef<HTMLDivElement>(null);
  const progressRef = useRef<SVGCircleElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const cursor = ref.current;
    if (!cursor) return;
    const enabled = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 761px) and (prefers-reduced-motion: no-preference)');
    let dispose = () => {};
    const setup = () => {
      dispose();
      if (!enabled.matches) return;
      const controller = new AbortController();
      const { signal } = controller;
      // ページの実際のスクロール範囲に追従する．Reactを毎フレーム再描画しない．
      const updateProgress = () => {
        const root = document.scrollingElement ?? document.documentElement;
        const range = root.scrollHeight - root.clientHeight;
        const progress = range > 0 ? clampNumber(root.scrollTop / range, 0, 1) : 0;
        if (progressRef.current) {
          progressRef.current.style.strokeDashoffset = String((1 - progress) * 100);
        }
      };
      type Magnet = { x: number; y: number; original: string };
      const magnets = new Map<HTMLElement, Magnet>();
      let magnetic: HTMLElement | null = null;
      let card: HTMLElement | null = null;
      let cardX = 0, cardY = 0;
      let px = 0, py = 0, x = 0, y = 0, visible = false;
      let frame = 0, previousTime = 0;
      const request = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(tick); };
      const resetCard = () => {
        card?.style.removeProperty('--motion-parallax-x');
        card?.style.removeProperty('--motion-parallax-y');
        card?.style.removeProperty('--motion-tilt-x');
        card?.style.removeProperty('--motion-tilt-y');
        cardX = 0; cardY = 0;
        card = null;
      };
      // 引力で動いている要素の現在の移動量．translate プロパティで動かすので，
      // 既存の transform（登場・ホバー・チルト）とは重ねがけになり，競合しない
      const attractions = new Map<HTMLElement, { x: number; y: number }>();
      // 引力を 1 フレーム進める．まだ動いている要素があれば true を返す
      const updateAttraction = (smoothing: number): boolean => {
        let stillMoving = false;
        const maxWidth = window.innerWidth * ATTRACT_MAX_WIDTH_RATIO;
        const viewportHeight = window.innerHeight;
        document.querySelectorAll<HTMLElement>(ATTRACT_SELECTOR).forEach((element) => {
          const current = attractions.get(element);
          const rect = element.getBoundingClientRect();
          let targetX = 0;
          let targetY = 0;
          const isDecor = element.dataset.attract === 'decor';
          const isWaitingToReveal = element.classList.contains('reveal') && !element.classList.contains('reveal-visible');
          const isNearViewport = rect.bottom > -ATTRACT_RADIUS_PX && rect.top < viewportHeight + ATTRACT_RADIUS_PX;
          const isPageFrame = !isDecor && (rect.width > maxWidth || rect.height > viewportHeight);
          if (visible && rect.width > 0 && isNearViewport && !isWaitingToReveal && !isPageFrame) {
            [targetX, targetY] = computeAttractionOffset({
              cursorX: px,
              cursorY: py,
              left: rect.left - (current?.x ?? 0),
              top: rect.top - (current?.y ?? 0),
              width: rect.width,
              height: rect.height,
              isDecor,
            });
          }
          // 動いておらず，これからも動かない要素は何もしない
          if (!current && targetX === 0 && targetY === 0) return;

          const next = current ?? { x: 0, y: 0 };
          next.x += (targetX - next.x) * smoothing;
          next.y += (targetY - next.y) * smoothing;
          if (targetX === 0 && targetY === 0 && Math.abs(next.x) < ATTRACT_SETTLE_PX && Math.abs(next.y) < ATTRACT_SETTLE_PX) {
            // 元の位置に戻り終えたら，インラインの指定を取り除く
            element.style.removeProperty('translate');
            attractions.delete(element);
            return;
          }
          attractions.set(element, next);
          element.style.translate = `${next.x.toFixed(2)}px ${next.y.toFixed(2)}px`;
          stillMoving ||= Math.abs(targetX - next.x) + Math.abs(targetY - next.y) > ATTRACT_MOVING_PX;
        });
        // ページ遷移などで DOM から外れた要素は覚えておかない
        attractions.forEach((_, element) => { if (!element.isConnected) attractions.delete(element); });
        return stillMoving;
      };
      function tick(now: number) {
        frame = 0;
        const dt = previousTime ? Math.min(now - previousTime, 48) : 16.67;
        previousTime = now;
        const alpha = 1 - Math.exp(-dt / 75);
        const magnet = magnetic ? magnets.get(magnetic) : undefined;
        const bounds = magnetic?.getBoundingClientRect();
        const imageBounds = card?.getBoundingClientRect();
        const tx = bounds ? px * .65 + (bounds.left + bounds.width / 2) * .35 : px;
        const ty = bounds ? py * .65 + (bounds.top + bounds.height / 2) * .35 : py;
        x += (tx - x) * alpha;
        y += (ty - y) * alpha;
        let moving = visible && Math.hypot(tx - x, ty - y) > .15;
        const mx = bounds && magnet ? Math.max(-1, Math.min(1, (px - (bounds.left + bounds.width / 2 - magnet.x)) / (bounds.width / 2))) * 12 : 0;
        const my = bounds && magnet ? Math.max(-1, Math.min(1, (py - (bounds.top + bounds.height / 2 - magnet.y)) / (bounds.height / 2))) * 12 : 0;
        cursor!.style.transform = `translate3d(${x}px,${y}px,0)`;
        if (visible) cursor!.style.opacity = '1';
        magnets.forEach((item, element) => {
          const ax = element === magnetic ? mx : 0;
          const ay = element === magnetic ? my : 0;
          item.x += (ax - item.x) * alpha;
          item.y += (ay - item.y) * alpha;
          moving ||= Math.abs(ax - item.x) + Math.abs(ay - item.y) > .03;
          element.style.transform = `translate3d(${item.x}px,${item.y}px,0)`;
        });
        if (card && imageBounds) {
          const targetX = Math.max(-1, Math.min(1, ((px - imageBounds.left) / imageBounds.width - .5) * 2));
          const targetY = Math.max(-1, Math.min(1, ((py - imageBounds.top) / imageBounds.height - .5) * 2));
          cardX += (targetX - cardX) * alpha;
          cardY += (targetY - cardY) * alpha;
          moving ||= Math.abs(targetX - cardX) + Math.abs(targetY - cardY) > .002;
          card.style.setProperty('--motion-parallax-x', `${cardX * 14}px`);
          card.style.setProperty('--motion-parallax-y', `${cardY * 14}px`);
          card.style.setProperty('--motion-tilt-x', `${-cardY * 7}deg`);
          card.style.setProperty('--motion-tilt-y', `${cardX * 10}deg`);
        }
        moving = updateAttraction(1 - Math.exp(-dt / ATTRACT_SMOOTHING_MS)) || moving;
        if (moving) request();
        else previousTime = 0;
      }
      const clear = () => { magnetic = null; resetCard(); cursor.removeAttribute('data-mode'); request(); };
      const leave = () => { visible = false; cursor.style.opacity = '0'; clear(); };
      window.addEventListener('pointermove', event => {
        if (event.pointerType === 'touch') return;
        px = event.clientX; py = event.clientY;
        if (!visible) { x = px; y = py; }
        visible = true;
        request();
      }, { signal, passive: true });
      document.addEventListener('pointerover', event => {
        if (event.pointerType === 'touch') return;
        const target = event.target instanceof Element ? event.target : null;
        const nextCard = target?.closest<HTMLElement>('[data-motion-work]') ?? null;
        if (nextCard !== card) { resetCard(); card = nextCard; }
        magnetic = target?.closest<HTMLElement>('[data-magnetic]') ?? null;
        if (magnetic && !magnets.has(magnetic)) magnets.set(magnetic, { x: 0, y: 0, original: magnetic.style.transform });
        cursor.dataset.mode = card ? 'work' : target?.closest('a,button,input,textarea,[role="tab"],summary') ? 'link' : '';
        request();
      }, { signal, passive: true });
      document.documentElement.addEventListener('pointerleave', leave, { signal });
      window.addEventListener('blur', leave, { signal });
      const unsubscribe = subscribeToScroll(() => { updateProgress(); clear(); });
      // 画像の読込や詳細の展開など，スクロールせずページの高さが変わる場合も更新する．
      const resizeObserver = new ResizeObserver(updateProgress);
      resizeObserver.observe(document.documentElement);
      resizeObserver.observe(document.body);
      window.addEventListener('pageshow', updateProgress, { signal });
      // 点はOSカーソルとして描画し，リングの追従とは別に実際の指示位置を示す．
      document.documentElement.setAttribute('data-dot-cursor', '');
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; leave(); }
        else updateProgress();
      }, { signal });
      dispose = () => {
        controller.abort(); unsubscribe(); resizeObserver.disconnect(); cancelAnimationFrame(frame); resetCard();
        document.documentElement.removeAttribute('data-dot-cursor');
        magnets.forEach((item, element) => { element.style.transform = item.original; });
        attractions.forEach((_, element) => element.style.removeProperty('translate'));
        attractions.clear();
        cursor.style.opacity = '0'; cursor.removeAttribute('data-mode');
      };
    };
    setup();
    enabled.addEventListener('change', setup);
    return () => { dispose(); enabled.removeEventListener('change', setup); };
  }, [pathname]);
  return (
    <div ref={ref} data-motion-cursor className={styles.cursor} aria-hidden="true">
      <div className={styles.ring}>
        <svg className={styles.progress} viewBox="0 0 72 72" focusable="false">
          <circle className={styles.track} cx="36" cy="36" r="33.5" />
          <circle ref={progressRef} className={styles.progressArc} cx="36" cy="36" r="33.5" pathLength="100" strokeDasharray="100" strokeDashoffset="100" />
        </svg>
      </div>
      <span>VIEW</span>
    </div>
  );
}
