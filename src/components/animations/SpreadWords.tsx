"use client";

// 大きな文字が 1 語ずつ間隔を空けて広がる帯．スクロールに 1:1 で連動して，語が中央から外（両端）へ離れていく．
// 例：<SpreadWords words={["Let's", 'build', 'something']} />  /  <SpreadWords text="文を渡すと語に分ける" />
// - words：語の配列（日本語は文節．省略すると text を Intl.Segmenter / 空白で分ける）
// 語は CSS（flex の space-between）で，最初から広がり切った位置に置く．
// スクロールの進みが小さいほど，各語を行の中央へ寄せる translateX を書く（進み 1 で 0）．
// 元の文は sr-only で読み上げに渡し，分けた側は aria-hidden（どの文字演出も同じ形）．
//
// 計測する帯（host）と，動かす語（span）は別の要素．語の位置と幅は，大きさが変わったときだけ測る．
// スクロールでは何も測らず，各語の style.transform だけを書く．React は再描画しない．
import { useEffect, useMemo, useRef } from 'react';
import { subscribeToScroll } from '../../lib/scrollObserver';
import {
  computeSpreadDeltas,
  getEndAlignedIndices,
  getSpreadOffset,
  getSpreadProgress,
  splitSpreadWords,
  toSpreadTransform,
  type SpreadWordBox,
} from '../../lib/animations/spreadWords';
import styles from './SpreadWords.module.css';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const DEFAULT_FONT_SIZE_PX = 16;
// 語の配列を 1 つの文字列にまとめて比べるときの区切り（語の中には現れない文字）
const WORD_JOINER = '\u0001';

export interface SpreadWordsProps {
  words?: readonly string[];
  text?: string;
  locale?: string;
  className?: string;
  testId?: string;
}

export function SpreadWords({
  words,
  text = '',
  locale = 'ja',
  className = '',
  testId = 'spread-words',
}: SpreadWordsProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const wordsRef = useRef<HTMLDivElement | null>(null);
  // 配列の参照が毎回変わっても，中身が同じなら作り直さない（効果を張り直さない）
  const wordsKey = words ? words.join(WORD_JOINER) : '';
  const list = useMemo(
    () => (wordsKey ? wordsKey.split(WORD_JOINER) : splitSpreadWords(text, locale)),
    [wordsKey, text, locale],
  );
  const sentence = list.join(' ');

  useEffect(() => {
    const host = hostRef.current;
    const container = wordsRef.current;
    if (!host || !container) return;
    const spans = Array.from(container.querySelectorAll<HTMLElement>('[data-word]'));
    if (spans.length === 0) return;

    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    // 語ごとの「詰めた位置 - 広がった位置」．大きさが変わったときだけ測り直す
    let deltas: number[] = spans.map(() => 0);
    let bandHeight = 0;
    let pageTop = 0;
    let viewportHeight = window.innerHeight;
    // 最後に書いた進み．同じなら何も書かない（画面の外で端のままなら，style に触れない）
    let lastProgress = Number.NaN;
    let unsubscribeScroll: (() => void) | undefined;

    const clearTransforms = () => {
      spans.forEach((span) => span.style.removeProperty('transform'));
    };

    const paint = () => {
      // 動きを減らす設定は，広がり切った静止の姿（transform なし）
      if (media.matches) {
        clearTransforms();
        lastProgress = Number.NaN;
        return;
      }
      const top = pageTop - window.scrollY;
      const progress = getSpreadProgress(top, bandHeight, viewportHeight);
      if (progress === lastProgress) return;
      lastProgress = progress;
      spans.forEach((span, index) => {
        span.style.transform = toSpreadTransform(getSpreadOffset(deltas[index] ?? 0, progress));
      });
    };

    // offsetLeft / offsetTop は transform の影響を受けないので，動かしたまま測ってよい
    const readBoxes = (): SpreadWordBox[] =>
      spans.map((span) => ({
        left: span.offsetLeft,
        width: span.offsetWidth,
        top: span.offsetTop,
      }));

    const measure = () => {
      // 1 行に 1 語しか入らない狭い画面では，行頭と行末が交互になるよう，奇数番目の行の語を行末へ寄せる
      spans.forEach((span) => span.removeAttribute('data-end'));
      let boxes = readBoxes();
      const endAligned = getEndAlignedIndices(boxes);
      if (endAligned.length > 0) {
        endAligned.forEach((index) => spans[index].setAttribute('data-end', ''));
        boxes = readBoxes();
      }
      const fontSize = Number.parseFloat(getComputedStyle(container).fontSize) || DEFAULT_FONT_SIZE_PX;
      deltas = computeSpreadDeltas(boxes, container.clientWidth, fontSize);
      const bounds = host.getBoundingClientRect();
      bandHeight = bounds.height;
      pageTop = bounds.top + window.scrollY;
      viewportHeight = window.innerHeight;
      // 語の位置が変わったので，同じ進みでも書き直す
      lastProgress = Number.NaN;
      paint();
    };

    // スクロールの購読．画面の外にいる間も位置から進みを求める（ジャンプで一気に通り過ぎても，
    // 広がり切った／詰めた，の端の姿へ正しく寄せるため）．計算は軽く，進みが変わらなければ何も書かない
    const syncSubscription = () => {
      unsubscribeScroll?.();
      unsubscribeScroll = undefined;
      lastProgress = Number.NaN;
      paint();
      if (!media.matches) {
        unsubscribeScroll = subscribeToScroll(paint);
      }
    };

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
      clearTransforms();
    };
  }, [list]);

  return (
    <div ref={hostRef} data-testid={testId} className={`${styles.host} ${className}`.trim()}>
      <p className="sr-only">{sentence}</p>
      <div ref={wordsRef} aria-hidden="true" className={styles.words}>
        {list.map((word, index) => (
          <span key={`${word}-${index}`} data-word="" className={styles.word}>
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
