'use client';

import { useState } from 'react';
import { getPlanetJourney, PLANET_STAGES } from '../../lib/notes/planetJourney';
import { FigureFrame } from './FigureFrame';
import styles from './figures.module.css';

const STAGE_START_X = 44;
const STAGE_STEP_X = 128;
const PLANET_Y = 96;
const RANGE_STEP = 0.01;

export function PlanetJourneyFigure() {
  const [progress, setProgress] = useState(0);
  const journey = getPlanetJourney(progress);
  const positionX = STAGE_START_X + journey.position * STAGE_STEP_X;
  const percent = Math.round(journey.progress * 100);
  return (
    <FigureFrame id="planet" title="同じ惑星の，預け先をたどる" caption="簡略化した SVG の説明図です．各段階を均等に並べており，実際のスクロール距離・座標・惑星の描画ではありません．小画面・動きを減らす設定では，本体の引き継ぎを強制しません．">
      <div className={styles.svgScroll} tabIndex={0} role="region" aria-label="惑星の段階の図．狭い画面では左右キーでスクロールできます">
        <svg viewBox="0 0 600 168" className={styles.flowSvg} role="img" aria-label={`説明用の進捗${percent}パーセント．${journey.label}．${journey.action}`}>
          <path d="M44 96H556" className={styles.trackLine} />
          {PLANET_STAGES.map((stage, index) => <g key={stage.name}>
            <circle cx={STAGE_START_X + index * STAGE_STEP_X} cy={PLANET_Y} r="4" className={styles.waypoint} />
            <text x={STAGE_START_X + index * STAGE_STEP_X} y="40" textAnchor="middle" className={index === journey.index ? styles.svgActive : styles.svgMuted}>{stage.name}</text>
          </g>)}
          <g transform={`translate(${positionX} ${PLANET_Y})`}>
            <g opacity={1 - journey.merge}>
              <circle r="20" className={styles.planet} />
              <path d="M-13-6H9M-15 2H15M-9 10H11" className={styles.planetDots} />
            </g>
            <text x="0" y="7" textAnchor="middle" opacity={journey.merge} className={styles.svgName}>名前</text>
          </g>
          <text x="300" y="154" textAnchor="middle" className={styles.svgMuted}>0 → 1：この説明図の進み具合</text>
        </svg>
      </div>
      <label className={styles.rangeLabel} htmlFor="notes-planet-position">スクロール位置のモデル：{journey.progress.toFixed(2)}</label>
      <input id="notes-planet-position" type="range" className={styles.range} min={0} max={1} step={RANGE_STEP} value={progress} onChange={event => setProgress(Number(event.target.value))} aria-label="惑星の説明図のスクロール位置" aria-valuetext={`${percent}パーセント，${journey.label}，担当：${journey.owner}`} />
      <div className={styles.controls} role="group" aria-label="惑星の段階を選ぶ">
        {PLANET_STAGES.map((stage, index) => <button className="press-effect" key={stage.name} type="button" aria-pressed={journey.index === index} onClick={() => setProgress(index / (PLANET_STAGES.length - 1))}>{stage.name}</button>)}
      </div>
      <div className={styles.result} role="status" aria-atomic="true"><strong>{journey.label}</strong><p>{journey.action}</p><small>担当：{journey.owner}</small></div>
    </FigureFrame>
  );
}
