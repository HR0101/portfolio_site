'use client';

import { useState } from 'react';
import { compareSampleCandidates, DEFAULT_ORIGINS, isSampleOrigin, SAMPLE_BAR_MAX, SAMPLE_ORIGINS, type SampleOrigin } from '../../lib/notes/fairness';
import { FigureFrame } from './FigureFrame';
import styles from './figures.module.css';

export function FairnessFigure() {
  const [origins, setOrigins] = useState<SampleOrigin[]>([...DEFAULT_ORIGINS]);
  const candidates = compareSampleCandidates(origins);
  return (
    <FigureFrame id="fairness" title="一人だけ遠い，を数で見る" caption="駅名と所要時間は説明用の固定サンプルです．分数の出典：src/lib/notes/fairness.ts．実際の経路・所要時間・製品の採点式ではありません．">
      <div className={styles.selects}>
        {origins.map((origin, index) => <label key={index} htmlFor={`notes-origin-${index}`}>参加者{index + 1}の出発駅
          <select id={`notes-origin-${index}`} value={origin} aria-label={`参加者${index + 1}の出発駅`} onChange={event => {
            const value = event.target.value;
            if (isSampleOrigin(value)) setOrigins(current => current.map((item, itemIndex) => itemIndex === index ? value : item));
          }}>{SAMPLE_ORIGINS.map(name => <option key={name} value={name}>{name}</option>)}</select>
        </label>)}
      </div>
      <p className={styles.status} role="status" aria-atomic="true">このサンプルで差が最も小さい候補は{candidates[0].name}，差は{candidates[0].spread}分です．</p>
      <div className={styles.candidates}>
        {candidates.map(candidate => <section key={candidate.name} className={styles.candidate} aria-label={`集合候補：${candidate.name}`}>
          <header><h4>{candidate.name}</h4><span>最大 − 最小 = <b>{candidate.spread}分</b></span></header>
          <ul className={styles.bars} aria-label={`${candidate.name}への説明用移動時間`}>
            {candidate.times.map((time, index) => <li key={index}>
              <span>参加者{index + 1}・{origins[index]}</span>
              <div className={styles.barTrack} aria-hidden="true"><span style={{ transform: `scaleX(${time / SAMPLE_BAR_MAX})` }} /></div>
              <b>{time}分</b>
            </li>)}
          </ul>
          <p className={styles.fine}>最大{candidate.max}分 − 最小{candidate.min}分．合計は{candidate.total}分です．</p>
        </section>)}
      </div>
    </FigureFrame>
  );
}
