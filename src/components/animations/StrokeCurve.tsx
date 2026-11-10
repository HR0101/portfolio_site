"use client";

// 章の間を横切る太い曲線．スクロールに 1:1 で連動して，端から端へ描かれていく（戻せば戻る）．
// 例：<StrokeCurve variant="arc" tone="primary" testId="ambient-skills-apps" />
//     <StrokeCurve variant="crest" tone="sky"><StatementBand text="..." /></StrokeCurve>
// - variant：arc（左から入って下へ弧）／crest（右から入って上へ弧）／wave（S 字）
// - tone：primary（サイトの青 --site-accent）／sky（水色）
// - flip：左右を反転する（右から入り，右から左へ描かれる）
// - children：曲線の前面に置く文字（StatementBand など）．曲線は文字の背後に置く
// - exposeChildren：children が読み上げの対象のとき（sr-only の文を持つ SpreadWords など）は true にする．
//   既定（false）は帯ぜんたいが aria-hidden で，children は装飾として扱う（StatementBand は自身も aria-hidden）．
//   true のときは，曲線の svg だけが aria-hidden になる．
// 帯は操作を通す（pointer-events: none）．
//
// 作り：帯の大きさ（px）を測って path を作る（viewBox は帯と同じ大きさ）ので，線の太さが歪まない．
// 描画は path 1 本の stroke-dashoffset を style へ直接書くだけで，スクロール中に React は再描画しない．
// 帯の位置は，大きさが変わったとき（ResizeObserver）にだけ測り，スクロールでは測らない．
// スクロールのたびに位置から進みを求めるが，値が変わったときだけ style へ書く（画面の外で端のままなら何も書かない）．
// 動かすのは path の stroke-dashoffset だけなので，計測する帯と，描く path は別の要素．
import { useEffect, useRef, type ReactNode } from 'react';
import { subscribeToScroll } from '../../lib/scrollObserver';
import {
  buildCurvePath,
  getCurveDash,
  getCurveProgress,
  getCurveStrokeWidth,
  type StrokeCurveVariant,
} from '../../lib/animations/strokeCurve';
import styles from './StrokeCurve.module.css';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export interface StrokeCurveProps {
  variant?: StrokeCurveVariant;
  tone?: 'primary' | 'sky';
  flip?: boolean;
  exposeChildren?: boolean;
  className?: string;
  testId?: string;
  children?: ReactNode;
}

export function StrokeCurve({
  variant = 'arc',
  tone = 'primary',
  flip = false,
  exposeChildren = false,
  className = '',
  testId = 'stroke-curve',
  children,
}: StrokeCurveProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    if (!host || !svg || !path) return;

    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    // 帯の大きさと，文書の上端からの位置．スクロールのたびには測らず，大きさが変わったときだけ測る
    let bandHeight = 0;
    let pageTop = 0;
    let viewportHeight = window.innerHeight;
    // 最後に style へ書いた値．同じ値なら書かない（画面の外にあって進みが端のままなら，何も書かない）
    let lastDashKey = '';
    let unsubscribeScroll: (() => void) | undefined;

    const writeDash = (dashArray: string, dashOffset: string) => {
      const key = `${dashArray}|${dashOffset}`;
      if (key === lastDashKey) return;
      lastDashKey = key;
      path.style.strokeDasharray = dashArray;
      path.style.strokeDashoffset = dashOffset;
    };

    const paint = () => {
      // 動きを減らす設定は，描き終えた静止の線
      if (media.matches) {
        writeDash('none', '0');
        return;
      }
      const top = pageTop - window.scrollY;
      const dash = getCurveDash(getCurveProgress(top, bandHeight, viewportHeight));
      writeDash(dash.dashArray, String(dash.dashOffset));
    };

    // 帯の大きさから path と太さを作り直す
    const measure = () => {
      const bounds = host.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      bandHeight = bounds.height;
      pageTop = bounds.top + window.scrollY;
      viewportHeight = window.innerHeight;
      const strokeWidth = getCurveStrokeWidth(bounds.width);
      svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
      path.setAttribute('d', buildCurvePath(variant, bounds.width, bounds.height, strokeWidth, flip));
      path.style.strokeWidth = `${strokeWidth}px`;
      paint();
    };

    // スクロールの購読．画面の外にいる間も位置から進みを求める（ジャンプで一気に通り過ぎても，
    // 描き終えた／まだ描かない，の端の姿へ正しく寄せるため）．計算は軽く，値が変わらなければ何も書かない
    const syncSubscription = () => {
      unsubscribeScroll?.();
      unsubscribeScroll = undefined;
      lastDashKey = '';
      paint();
      if (!media.matches) {
        unsubscribeScroll = subscribeToScroll(paint);
      }
    };

    // 帯自身と，文書全体の高さ（上の章の高さが変わると，帯の位置がずれる）を見る
    const resize = new ResizeObserver(measure);

    measure();
    resize.observe(host);
    resize.observe(document.body);
    media.addEventListener('change', syncSubscription);
    syncSubscription();

    return () => {
      resize.disconnect();
      unsubscribeScroll?.();
      media.removeEventListener('change', syncSubscription);
      path.style.removeProperty('stroke-dasharray');
      path.style.removeProperty('stroke-dashoffset');
      path.style.removeProperty('stroke-width');
    };
  }, [variant, flip]);

  return (
    <div
      ref={hostRef}
      aria-hidden={exposeChildren ? undefined : 'true'}
      data-testid={testId}
      data-variant={variant}
      data-tone={tone}
      data-flip={flip ? 'true' : undefined}
      className={`${styles.host} ${className}`.trim()}
    >
      <svg ref={svgRef} className={styles.svg} aria-hidden="true" focusable="false">
        <path ref={pathRef} className={styles.path} pathLength={1} />
      </svg>
      {children ? <div className={styles.content}>{children}</div> : null}
    </div>
  );
}
