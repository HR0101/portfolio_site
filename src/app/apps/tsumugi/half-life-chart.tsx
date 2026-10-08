'use client';

import { useState } from 'react';
import { useScrollLinked } from '../../../hooks/useScrollLinked';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import styles from './product.module.css';

// 話題ごとの半減期（日数）．アプリ内の判定と同じ考え方を，そのまま図にしている
const TOPICS = [
  { id: 'ai', label: 'AI・生成AI', halfLife: 120 },
  { id: 'tech', label: '技術一般', halfLife: 365 },
  { id: 'basics', label: '学術・基礎', halfLife: 1095 },
] as const;

// グラフの描画範囲
const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 300;
const PADDING_LEFT = 46;
const PADDING_RIGHT = 18;
const PADDING_TOP = 18;
const PADDING_BOTTOM = 40;
// 横軸に取る日数の上限
const MAX_DAYS = 540;
// 曲線を折れ線で近似するときの分割数
const SAMPLE_COUNT = 96;

// 経過日数から鮮度スコア（0〜100）を求める
function freshnessAt(days: number, halfLife: number) {
  return 100 * Math.pow(0.5, days / halfLife);
}

function toX(days: number) {
  return PADDING_LEFT + (days / MAX_DAYS) * (VIEW_WIDTH - PADDING_LEFT - PADDING_RIGHT);
}

function toY(score: number) {
  return PADDING_TOP + (1 - score / 100) * (VIEW_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
}

// 減衰カーブの折れ線を組み立てる
function buildCurve(halfLife: number) {
  const points: string[] = [];
  for (let index = 0; index <= SAMPLE_COUNT; index += 1) {
    const days = (index / SAMPLE_COUNT) * MAX_DAYS;
    points.push(`${toX(days).toFixed(2)},${toY(freshnessAt(days, halfLife)).toFixed(2)}`);
  }
  return `M ${points.join(' L ')}`;
}

export function HalfLifeChart() {
  const [topicIndex, setTopicIndex] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  // スクロールに合わせて曲線を左から描く
  const { ref, progress } = useScrollLinked<HTMLDivElement>('enter');
  const drawn = prefersReducedMotion ? 1 : progress;
  const topic = TOPICS[topicIndex];
  const curve = buildCurve(topic.halfLife);
  const halfX = toX(Math.min(topic.halfLife, MAX_DAYS));
  const halfY = toY(50);

  return (
    <div className={styles.chartCard} ref={ref}>
      <div className={styles.topicRow} role="group" aria-label="話題の種類を選ぶ">
        {TOPICS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={index === topicIndex}
            onClick={() => setTopicIndex(index)}
          >
            {item.label}
            <small>{item.halfLife}日</small>
          </button>
        ))}
      </div>

      <svg
        className={styles.chartSvg}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={`${topic.label}の記事は，半減期${topic.halfLife}日で鮮度が半分になる減衰カーブを描く`}
      >
        {/* 横の目盛り線（0・50・100点） */}
        {[0, 50, 100].map((score) => (
          <g key={score}>
            <line
              x1={PADDING_LEFT}
              x2={VIEW_WIDTH - PADDING_RIGHT}
              y1={toY(score)}
              y2={toY(score)}
              className={styles.chartGrid}
            />
            <text x={PADDING_LEFT - 10} y={toY(score) + 4} textAnchor="end" className={styles.chartTick}>
              {score}
            </text>
          </g>
        ))}

        {/* 縦の目盛り（日数） */}
        {[0, 180, 360, 540].map((days) => (
          <text key={days} x={toX(days)} y={VIEW_HEIGHT - 16} textAnchor="middle" className={styles.chartTick}>
            {days}日
          </text>
        ))}

        {/* 半減期の位置を示す補助線 */}
        <line x1={halfX} x2={halfX} y1={halfY} y2={toY(0)} className={styles.chartMarker} />
        <line x1={PADDING_LEFT} x2={halfX} y1={halfY} y2={halfY} className={styles.chartMarker} />

        {/* 減衰カーブ本体．pathLength を 1 に正規化して，進捗をそのまま描き出しに使う */}
        <path
          d={curve}
          className={styles.chartCurve}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - drawn}
        />

        <circle cx={halfX} cy={halfY} r={5} className={styles.chartDot} opacity={drawn > 0.45 ? 1 : 0} />
        <text
          x={halfX + 12}
          y={halfY - 12}
          className={styles.chartCallout}
          opacity={drawn > 0.45 ? 1 : 0}
        >
          {topic.halfLife}日で、半分に。
        </text>
      </svg>

      <p className={styles.chartAxisNote}>
        横軸：公開からの経過日数／縦軸：鮮度スコア（補正前）
      </p>
    </div>
  );
}
