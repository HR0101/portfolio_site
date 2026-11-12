"use client";

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { siteConfig } from '../config/site';
import { SWIFT_APPS } from '../data/apps';
import { ALL_WORKS } from '../data/works';
import { createDotMap } from '../lib/dotMapCanvas';
import {
  PRELOADER_CLOSE_MS,
  PRELOADER_HOLD_MS,
  PRELOADER_MAX_MS,
  PRELOADER_MIN_MS,
  PRELOADER_OPEN_EVENT,
  PRELOADER_OPEN_MS,
  PRELOADER_STORAGE_KEY,
  PRELOADER_WAITING_CEILING,
  PRELOADING_CLASS,
} from '../lib/preloader';
import './PageLoader.css';

type LoaderPhase = 'loading' | 'closing' | 'opening' | 'done';

interface FeedLine {
  id: number;
  text: string;
}

// 進捗の表示桁数（00〜100）
const COUNTER_DIGITS = 2;
const PERCENT_FULL = 100;
// 数字が目標へ追いつくなめらかさ（ms）
const COUNTER_SMOOTHING_MS = 90;
// この値を超えたら 100 に丸めて，読み込み完了とみなす
const COUNTER_SNAP_THRESHOLD = 99.5;
// 開き終わったあと，DOM から外すまでの余裕（ms）
const UNMOUNT_MARGIN_MS = 100;

// 左右に流れる文字の列：左は使っている技術，右はつくったもの
const STACK_LINES = ['Swift', 'SwiftUI', 'TypeScript', 'Next.js', 'Python', 'C', 'Arduino', 'Xcode', 'GitHub'];
const PRODUCT_LINES = [...SWIFT_APPS.map((app) => app.name), ...ALL_WORKS.map((work) => work.name)];
// 1 行足す間隔（ms）と，同時に見える行数
const FEED_INTERVAL_MS = 170;
const FEED_VISIBLE_LINES = 9;
// いちばん古い行の濃さ（新しい行ほど濃い）
const FEED_OLDEST_ALPHA = 0.25;

// 読み込み中に操作させない要素（読み込み画面自身は含めない）
const INERT_TARGET_SELECTOR = '#main-content, body header, body footer, .skip-link';

// 円形に開くときの，円の最終的な半径（画面の対角より十分大きい値）と，その動き方
const IRIS_END_RADIUS = '90vmax';
const IRIS_EASING = 'cubic-bezier(0.65, 0, 0.25, 1)';

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

// CSS が管理しているアニメーションか（CSS 側で止めるので，JS では触らない）
function isCssDrivenAnimation(animation: Animation): boolean {
  return 'animationName' in animation || 'transitionProperty' in animation;
}

// 新しい行を足して，見える行数だけ残す
function appendFeedLine(lines: FeedLine[], id: number, source: string[]): FeedLine[] {
  return [...lines, { id, text: source[id % source.length] }].slice(-FEED_VISIBLE_LINES);
}

// 初めてサイトを開いたときの読み込み画面．
// ドットの世界地図（日本だけが青く光る），左右に流れる文字の列，進捗の数字が出て，
// 100 になると名前だけが中央に残り，画面が中央から円形に開いてヒーローへつながる．
// html の .is-preloading（<head> の起動スクリプトが付ける）が無ければ何も出さない
export function PageLoader() {
  const [phase, setPhase] = useState<LoaderPhase>('loading');
  const [stackFeed, setStackFeed] = useState<FeedLine[]>([]);
  const [productFeed, setProductFeed] = useState<FeedLine[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLParagraphElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains(PRELOADING_CLASS)) {
      setPhase('done');
      return;
    }

    // 背後の内容（本文・ナビ・フッター・スキップリンク）に，フォーカスや読み上げが入らないようにしておく．
    // すでに inert だったものは触らず，ここで付けたものだけを開くときに戻す
    const inertTargets = Array.from(document.querySelectorAll<HTMLElement>(INERT_TARGET_SELECTOR)).filter(
      (element) => !element.hasAttribute('inert'),
    );
    inertTargets.forEach((element) => element.setAttribute('inert', ''));
    const restoreInert = () => inertTargets.forEach((element) => element.removeAttribute('inert'));

    // 読み込み中に作られた WAAPI のアニメーション（ヒーローの登場など）は
    // 先頭で止めておき，画面が開く瞬間にまとめて再生する
    const pausedAnimations = new Set<Animation>();
    const pauseNewAnimations = () => {
      document.getAnimations().forEach((animation) => {
        if (pausedAnimations.has(animation) || isCssDrivenAnimation(animation)) {
          return;
        }
        animation.pause();
        animation.currentTime = 0;
        pausedAnimations.add(animation);
      });
    };
    const resumePausedAnimations = () => {
      pausedAnimations.forEach((animation) => {
        try {
          animation.play();
        } catch {
          // すでに取り消されたアニメーションは何もしなくてよい
        }
      });
      pausedAnimations.clear();
    };

    const canvas = canvasRef.current;
    const dotMap = canvas ? createDotMap(canvas) : null;
    const resizeObserver = canvas && dotMap ? new ResizeObserver(() => dotMap.resize()) : null;
    if (canvas) {
      resizeObserver?.observe(canvas);
    }

    // 左右の文字の列：一定の間隔で 1 行ずつ足す
    let feedCount = 0;
    const feedTimerId = window.setInterval(() => {
      const id = feedCount++;
      setStackFeed((lines) => appendFeedLine(lines, id, STACK_LINES));
      setProductFeed((lines) => appendFeedLine(lines, id, PRODUCT_LINES));
    }, FEED_INTERVAL_MS);

    const startedAt = performance.now();
    let previousTime = startedAt;
    let displayed = 0;
    let frameId = 0;
    const timeoutIds: number[] = [];

    const render = (value: number, now: number) => {
      if (counterRef.current) {
        counterRef.current.textContent = String(Math.round(value)).padStart(COUNTER_DIGITS, '0');
      }
      dotMap?.draw(value, now);
    };

    // 中央から円形に開く．ここからページ側のアニメーションが一斉に始まる
    const open = () => {
      root.classList.remove(PRELOADING_CLASS);
      try {
        window.sessionStorage.setItem(PRELOADER_STORAGE_KEY, '1');
      } catch {
        // storage が使えなくても，このページ内では問題ない
      }
      restoreInert();
      resumePausedAnimations();
      window.dispatchEvent(new Event(PRELOADER_OPEN_EVENT));
      setPhase('opening');
      // 円の半径を登録済みのカスタムプロパティで動かす（面のくり抜きと輪の帯が同じ値を読む）．
      // 非対応のブラウザでは単純に薄れて消える
      const supportsIris = typeof CSS !== 'undefined' && typeof CSS.registerProperty === 'function';
      rootRef.current?.animate(
        supportsIris
          ? [{ '--loader-iris': '0px' }, { '--loader-iris': IRIS_END_RADIUS }]
          : [{ opacity: 1 }, { opacity: 0 }],
        { duration: PRELOADER_OPEN_MS, easing: IRIS_EASING, fill: 'forwards' },
      );
      timeoutIds.push(window.setTimeout(() => setPhase('done'), PRELOADER_OPEN_MS + UNMOUNT_MARGIN_MS));
    };

    // 閉じる．地図や文字が薄れ，名前だけが画面の中央へ寄る
    const startClosing = () => {
      window.clearInterval(feedTimerId);
      const logo = logoRef.current;
      const panel = panelRef.current;
      if (logo && panel) {
        const bounds = logo.getBoundingClientRect();
        panel.style.setProperty('--logo-dx', `${window.innerWidth / 2 - (bounds.left + bounds.width / 2)}px`);
        panel.style.setProperty('--logo-dy', `${window.innerHeight / 2 - (bounds.top + bounds.height / 2)}px`);
      }
      setPhase('closing');
      timeoutIds.push(window.setTimeout(open, PRELOADER_CLOSE_MS));
    };

    const finish = () => {
      render(PERCENT_FULL, performance.now());
      timeoutIds.push(window.setTimeout(startClosing, PRELOADER_HOLD_MS));
    };

    const tick = (now: number) => {
      pauseNewAnimations();
      const elapsed = now - startedAt;
      const isLoaded = document.readyState === 'complete';
      // 最短の表示時間をかけて数字を進める．読み込みが終わるまでは上限で止める
      const paced = easeOutCubic(Math.min(elapsed / PRELOADER_MIN_MS, 1)) * PERCENT_FULL;
      const target = Math.min(paced, isLoaded ? PERCENT_FULL : PRELOADER_WAITING_CEILING);
      displayed += (target - displayed) * (1 - Math.exp(-(now - previousTime) / COUNTER_SMOOTHING_MS));
      previousTime = now;
      if (displayed > COUNTER_SNAP_THRESHOLD && target >= PERCENT_FULL) {
        finish();
        return;
      }
      // 読み込みが長引いても，最大の表示時間で必ず開く
      if (elapsed >= PRELOADER_MAX_MS) {
        finish();
        return;
      }
      render(displayed, now);
      frameId = window.requestAnimationFrame(tick);
    };

    pauseNewAnimations();
    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearInterval(feedTimerId);
      timeoutIds.forEach((id) => window.clearTimeout(id));
      resizeObserver?.disconnect();
      restoreInert();
      resumePausedAnimations();
    };
  }, []);

  if (phase === 'done') {
    return null;
  }

  // 列の中の位置に応じた濃さ（古い行ほど薄い）
  const feedAlpha = (index: number, length: number) =>
    FEED_OLDEST_ALPHA + ((1 - FEED_OLDEST_ALPHA) * (index + 1)) / length;

  const renderFeed = (lines: FeedLine[], side: 'left' | 'right') => (
    <ul className={`page-loader-feed page-loader-feed-${side}`}>
      {lines.map((line, index) => (
        // 閉じるとき，上の行から順に抜けるための番号（--row）
        <li key={line.id} style={{ '--row': index } as CSSProperties}>
          <span style={{ opacity: feedAlpha(index, lines.length) }}>{line.text}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={rootRef} className="page-loader" data-phase={phase} role="status" aria-live="polite">
      <span className="sr-only">{siteConfig.displayName} を読み込み中</span>
      <div ref={panelRef} className="page-loader-panel" aria-hidden="true">
        <div className="page-loader-hud">
          <p ref={logoRef} className="page-loader-logo">
            {siteConfig.displayName}
          </p>
          <p className="page-loader-count">
            <span ref={counterRef}>{'0'.repeat(COUNTER_DIGITS)}</span>
            <svg className="page-loader-spinner" viewBox="0 0 16 16" width="14" height="14">
              <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="26 12" strokeLinecap="round" />
            </svg>
          </p>
          {renderFeed(stackFeed, 'left')}
          <div className="page-loader-map">
            <canvas ref={canvasRef} className="page-loader-canvas" />
          </div>
          {renderFeed(productFeed, 'right')}
        </div>
      </div>
      {/* 円形に開くとき，広がる縁に添える薄い帯 */}
      <div className="page-loader-ring" aria-hidden="true" />
    </div>
  );
}
