'use client';

import { useState, type CSSProperties } from 'react';
import { hubManualMoveMs, hubRoutes } from '../../lib/hubRoutes';
import { rankHubCandidates, sampleCandidates, sampleTimeMax } from '../../lib/skillLab/hubCompare';
import styles from './SkillLab.module.css';

export function EkiHubCompare() {
  const [origins, setOrigins] = useState<string[]>(hubRoutes.map(route => route.name));
  const [instant, setInstant] = useState(false);
  const ranked = rankHubCandidates(origins);
  const ready = origins.length >= 2;
  const best = ready ? ranked[0]?.spread : undefined;

  return <div data-testid="skill-lab-web" className={styles.exhibit}>
    <header className={styles.exhibitHeader}><div><p className={styles.eyebrow}>Web · EkiHub</p><h4>集合駅を比べる</h4></div><span className={styles.kind}>説明用の固定データ</span></header>
    <p className={styles.copy}>出発駅を選ぶ → 各人の時間を並べる → 最大と最小の差を比べます．この見本では，差が小さいほど公平としています．</p>
    <fieldset className={styles.originChoices} onKeyDown={() => setInstant(true)} onPointerDown={() => setInstant(false)}><legend>出発駅を2つ以上選びます</legend>
      {hubRoutes.map(route => <label key={route.name} className="press-effect"><input type="checkbox" checked={origins.includes(route.name)} onChange={event => setOrigins(previous => event.target.checked ? [...previous, route.name] : previous.filter(origin => origin !== route.name))} />{route.name}</label>)}
    </fieldset>
    <p className={styles.resultStatus} role="status">{ready ? `差が最も小さい候補：${ranked.filter(candidate => candidate.spread === best).map(candidate => candidate.name).join('・')}（差${best}分）` : '出発駅を2つ以上選ぶと，比較できます．'}</p>
    <div className={styles.candidates} data-instant={instant} style={{ '--compare-duration': `${hubManualMoveMs}ms` } as CSSProperties}>
      {sampleCandidates.map(sample => {
        const candidate = ranked.find(item => item.name === sample.name);
        const isBest = ready && candidate?.spread === best;
        return <section key={sample.name} className={styles.candidate} data-best={isBest} aria-label={`候補駅 ${sample.name}`}>
          <header><h5>{sample.name}</h5><span>{isBest ? '最も公平' : '候補駅'}</span></header>
          <div className={styles.journeys}>
            {hubRoutes.map(origin => {
              const journey = candidate?.journeys.find(item => item.origin === origin.name);
              const scale = ready && journey ? journey.minutes / sampleTimeMax : 0;
              return <div key={origin.name} className={styles.journey} data-selected={ready && Boolean(journey)}>
                <span>{origin.name}</span>
                <div className={styles.barTrack} aria-hidden="true"><span className={styles.barFill} style={{ transform: `scaleX(${scale})` }} /><span className={styles.barMover} style={{ transform: `translateX(${scale * 100}%)` }}><i /></span></div>
                <span className={styles.minutes}>{ready && journey ? `${journey.minutes}分` : '—'}</span>
              </div>;
            })}
          </div>
          <p className={styles.spread}>最大 − 最小 <strong>{ready && candidate ? `${candidate.spread}分` : '—'}</strong></p>
          <div className={styles.fairnessTrack} aria-hidden="true"><span style={{ transform: `scaleX(${ready && candidate ? candidate.spread / sampleTimeMax : 0})` }} /></div>
        </section>;
      })}
    </div>
    <p className={styles.note}>説明用の固定データです．実際の所要時間・検索結果ではありません．ここでは公平さを「最大と最小の差」だけで簡略化しています．棒の共通目盛りは0〜50分です．</p>
  </div>;
}
