"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import {
  getLiquidAlphaMatrix,
  getLiquidDropTransform,
  getLiquidStretch,
  LIQUID_BLEED_PX,
  LIQUID_BLUR_STD_DEVIATION,
  LIQUID_LEAD_DAMPING_RATIO,
  LIQUID_LEAD_RESPONSE_SEC,
  LIQUID_REST_POSITION_PX,
  LIQUID_REST_VELOCITY_PX,
  LIQUID_TRAIL_DAMPING_RATIO,
  LIQUID_TRAIL_RESPONSE_SEC,
  type LiquidBox,
  type LiquidStretch,
} from '../../../lib/animations/liquid';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { useSpringGroup, type SpringChannels, type SpringValues } from '../shared/useSpringValue';
import styles from './LiquidTabs.module.css';

// 流体タブ：選択中のタブの背後の面が，次のタブへ粘りながら伸びて移り，遅れた雫が追いついて 1 つに戻る．
// MotionTabs と同じ約束：activeKey を受け，直下の子の button（aria-selected / aria-checked / aria-pressed が true）の位置を測る．
// ボタン・ARIA・キー操作には触れず，背後に aria-hidden の層だけを足す．
// 横一列で使う前提（スクロールする一覧には向かない．層を親より外へ広げるため）．

type LiquidChannel = 'leadX' | 'leadY' | 'leadW' | 'leadH' | 'trailX' | 'trailY' | 'trailW' | 'trailH';

const REST = { position: LIQUID_REST_POSITION_PX, velocity: LIQUID_REST_VELOCITY_PX };
const LEAD = { response: LIQUID_LEAD_RESPONSE_SEC, dampingRatio: LIQUID_LEAD_DAMPING_RATIO, rest: REST };
const TRAIL = { response: LIQUID_TRAIL_RESPONSE_SEC, dampingRatio: LIQUID_TRAIL_DAMPING_RATIO, rest: REST };
const LIQUID_CHANNELS: SpringChannels<LiquidChannel> = {
  leadX: LEAD, leadY: LEAD, leadW: LEAD, leadH: LEAD,
  trailX: TRAIL, trailY: TRAIL, trailW: TRAIL, trailH: TRAIL,
};
const ACTIVE_SELECTOR = ':scope > button[aria-selected="true"], :scope > button[aria-checked="true"], :scope > button[aria-pressed="true"]';
const NO_STRETCH: LiquidStretch = { scaleX: 1, scaleY: 1 };
// フィルタを掛けない設定（強制カラー・透明効果を減らす）
const PLAIN_QUERIES = ['(forced-colors: active)', '(prefers-reduced-transparency: reduce)'];

type InputKind = 'keyboard' | 'pointer';

// サーバーでは useLayoutEffect が警告を出すので，その場合は useEffect に切り替える
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

interface LiquidTabsProps extends HTMLAttributes<HTMLDivElement> {
  activeKey: string | number;
  children: ReactNode;
}

export function LiquidTabs({ activeKey, children, className = '', ...props }: LiquidTabsProps) {
  const rawId = useId();
  const filterId = `liquid-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const gooRef = useRef<HTMLSpanElement>(null);
  const leadRef = useRef<HTMLSpanElement>(null);
  const trailRef = useRef<HTMLSpanElement>(null);
  // 雫の基準の大きさ（いまのタブの大きさ）．見た目の大きさとの比を scale で表すので，タブが変わっても連続する
  const baseRef = useRef({ w: 0, h: 0 });
  const readyRef = useRef(false);
  const plainRef = useRef(false);
  const reducedRef = useRef(false);
  const inputRef = useRef<InputKind | null>(null);
  const reduced = usePrefersReducedMotion();

  const drawDrop = useCallback((node: HTMLSpanElement, box: LiquidBox, stretch: LiquidStretch) => {
    const base = baseRef.current;
    const drop = getLiquidDropTransform(box, base, LIQUID_BLEED_PX, stretch);
    node.style.transform = `translate(${drop.translateX.toFixed(2)}px, ${drop.translateY.toFixed(2)}px) scale(${drop.scaleX.toFixed(4)}, ${drop.scaleY.toFixed(4)})`;
  }, []);

  // 毎フレーム呼ばれる．React の state は使わず，雫の transform と，フィルタの付け外しだけを書く
  const onFrame = useCallback((values: SpringValues<LiquidChannel>, moving: boolean) => {
    const goo = gooRef.current;
    const lead = leadRef.current;
    const trail = trailRef.current;
    if (!goo || !lead || !trail) return;
    const filtered = moving && !plainRef.current;
    const stretch = filtered ? getLiquidStretch(values.leadX.velocity, values.leadY.velocity) : NO_STRETCH;
    drawDrop(lead, { x: values.leadX.value, y: values.leadY.value, w: values.leadW.value, h: values.leadH.value }, stretch);
    if (filtered) drawDrop(trail, { x: values.trailX.value, y: values.trailY.value, w: values.trailW.value, h: values.trailH.value }, NO_STRETCH);
    // フィルタは動いている間だけ掛ける．止まったら外して，後続の雫も隠す（隠すのは CSS が data-moving を見て行う）
    const movingState = moving ? 'true' : 'false';
    if (goo.dataset.moving !== movingState) goo.dataset.moving = movingState;
    const filteredState = filtered ? 'true' : 'false';
    if (goo.dataset.filtered !== filteredState) {
      goo.dataset.filtered = filteredState;
      goo.style.filter = filtered ? `url(#${filterId})` : '';
    }
  }, [drawDrop, filterId]);

  const group = useSpringGroup(LIQUID_CHANNELS, onFrame);

  // いま選ばれているタブの箱（親の左上が原点．変形の影響を受けない offset 系で測る）
  const measureActive = useCallback((): LiquidBox | null => {
    const button = rootRef.current?.querySelector<HTMLElement>(ACTIVE_SELECTOR);
    if (!button) return null;
    return { x: button.offsetLeft, y: button.offsetTop, w: button.offsetWidth, h: button.offsetHeight };
  }, []);

  // 雫を選択中のタブへ向ける．animate が false なら，その場で置く（雫は 1 つ）
  const retarget = useCallback((animate: boolean) => {
    const goo = gooRef.current;
    const lead = leadRef.current;
    const trail = trailRef.current;
    if (!goo || !lead || !trail) return;
    const box = measureActive();
    if (!box) {
      delete goo.dataset.ready;
      readyRef.current = false;
      return;
    }
    baseRef.current = { w: box.w, h: box.h };
    for (const node of [lead, trail]) {
      node.style.width = `${box.w}px`;
      node.style.height = `${box.h}px`;
    }
    const target = {
      leadX: box.x, leadY: box.y, leadW: box.w, leadH: box.h,
      trailX: box.x, trailY: box.y, trailW: box.w, trailH: box.h,
    };
    if (animate && readyRef.current) {
      // 基準の大きさが変わった分は，同じ見た目になるよう scale を計算し直してから動かす
      group.refresh();
      group.setTargets(target);
      return;
    }
    group.jump(target);
    readyRef.current = true;
    goo.dataset.ready = 'true';
  }, [group, measureActive]);

  useIsomorphicLayoutEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  // 選択が変わったとき：マウス・タッチの操作なら粘って動かす．キーボード・動きを減らす設定・まだ操作のないとき（保存した選択の復元など）は即時に置く
  useIsomorphicLayoutEffect(() => {
    retarget(inputRef.current === 'pointer' && !reducedRef.current);
  }, [activeKey, retarget]);

  // 動きを減らす設定に切り替わったときは，動いている途中でも目標へ置く
  useEffect(() => {
    if (reduced) retarget(false);
  }, [reduced, retarget]);

  // 入力の種類を覚える（キーボードは即時，ポインターは粘る）
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onKeyDown = () => { inputRef.current = 'keyboard'; };
    const onPointerDown = () => { inputRef.current = 'pointer'; };
    root.addEventListener('keydown', onKeyDown, true);
    root.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      root.removeEventListener('keydown', onKeyDown, true);
      root.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, []);

  // 寸法が変わったとき（画面幅・フォント）は，雫をその場で新しい位置へ置く．
  // 観測を始めた直後の最初の通知は，位置が変わったわけではないので読み飛ばす（選択直後の動きを止めないため）
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let initial = true;
    const observer = new ResizeObserver(() => {
      if (initial) { initial = false; return; }
      retarget(false);
    });
    observer.observe(root);
    root.querySelectorAll(':scope > button').forEach(button => observer.observe(button));
    return () => observer.disconnect();
  }, [retarget, activeKey]);

  // 強制カラー・透明効果を減らす設定のときは，フィルタなしの面にする
  useEffect(() => {
    const queries = PLAIN_QUERIES.map(query => window.matchMedia(query));
    const update = () => {
      plainRef.current = queries.some(query => query.matches);
      const goo = gooRef.current;
      if (goo) goo.dataset.plain = String(plainRef.current);
      group.refresh();
    };
    update();
    queries.forEach(query => query.addEventListener('change', update));
    return () => queries.forEach(query => query.removeEventListener('change', update));
  }, [group]);

  return (
    <div {...props} ref={rootRef} className={`${styles.root} ${className}`} data-liquid="true">
      {/* フィルタの定義は 1 つだけ．サイズ 0 で置く（display:none だと Safari で効かない） */}
      <svg className={styles.defs} width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={LIQUID_BLUR_STD_DEVIATION} result="blur" />
            <feColorMatrix in="blur" type="matrix" values={getLiquidAlphaMatrix()} />
          </filter>
        </defs>
      </svg>
      <span ref={gooRef} className={styles.goo} aria-hidden="true" style={{ '--liquid-bleed': `${LIQUID_BLEED_PX}px` } as CSSProperties}>
        <span ref={trailRef} className={`${styles.drop} ${styles.trail}`} />
        <span ref={leadRef} className={`${styles.drop} ${styles.lead}`} />
      </span>
      {children}
    </div>
  );
}
