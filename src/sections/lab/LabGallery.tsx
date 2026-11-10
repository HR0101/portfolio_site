'use client';

import { useEffect, useState } from 'react';
import { LAB_EXPERIMENTS, type LabId, type LabTag } from '@/data/lab';
import { DotWaves } from './experiments/DotWaves';
import { DotOrbit } from './experiments/DotOrbit';
import { Life } from './experiments/Life';
import { Boids } from './experiments/Boids';
import { Metaballs } from './experiments/Metaballs';
import { Spiral } from './experiments/Spiral';
import { SmokeRing } from './experiments/SmokeRing';
import { ParticleText } from './experiments/ParticleText';
import { Cloth } from './experiments/Cloth';
import { FlowField } from './experiments/FlowField';
import { RippleField } from './experiments/RippleField';
import { Lissajous } from './experiments/Lissajous';
import { Constellation } from './experiments/Constellation';
import { LiquidMetal } from './experiments/LiquidMetal';
import { GodRays } from './experiments/GodRays';
import styles from './LabGallery.module.css';

const FILTERS = ['すべて', '点', '物理', '光', '生き物'] as const;
const EXPERIMENT_COMPONENTS = {
  'dot-waves': DotWaves,
  'dot-orbit': DotOrbit,
  life: Life,
  boids: Boids,
  metaballs: Metaballs,
  spiral: Spiral,
  'smoke-ring': SmokeRing,
  'particle-text': ParticleText,
  cloth: Cloth,
  'flow-field': FlowField,
  'ripple-field': RippleField,
  lissajous: Lissajous,
  constellation: Constellation,
  'liquid-metal': LiquidMetal,
  'god-rays': GodRays,
} satisfies Record<LabId, React.ComponentType>;

export function LabGallery() {
  const [tag, setTag] = useState<LabTag | 'すべて'>('すべて');
  const [hashId, setHashId] = useState('');
  useEffect(() => {
    const readHash = () => {
      let id = '';
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      if (LAB_EXPERIMENTS.some(experiment => experiment.id === id)) {
        setTag('すべて');
        setHashId(id);
      }
    };
    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, []);

  useEffect(() => {
    if (!hashId) return;
    // 絞り込みが解除され，カードが戻ってから移動します．
    const frameId = requestAnimationFrame(() => {
      const element = document.getElementById(hashId);
      element?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frameId);
  }, [hashId, tag]);

  const experiments = LAB_EXPERIMENTS.filter(experiment => tag === 'すべて' || (experiment.tags as readonly LabTag[]).includes(tag));
  return (
    <section className={styles.gallery} data-filtered={tag !== 'すべて'} aria-label="小さな実験の一覧">
      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="実験をタグで絞り込む">
          {FILTERS.map(filter => <button type="button" key={filter} className="press-effect" aria-pressed={tag === filter} onClick={() => { setHashId(''); setTag(filter); }}>{filter}</button>)}
        </div>
        <p className={styles.count} role="status" aria-live="polite">{experiments.length} 個の実験</p>
      </div>
      <div className={styles.grid}>
        {experiments.map(experiment => {
          const Experiment = EXPERIMENT_COMPONENTS[experiment.id];
          return <div key={experiment.id} className={styles.cell} data-size={experiment.size} data-experiment={experiment.id}>
            <Experiment />
            <a href={`#${experiment.id}`} className={`${styles.permalink} press-effect`} aria-label={`${experiment.title}の個別リンク`}>#{experiment.id}</a>
          </div>;
        })}
      </div>
    </section>
  );
}
