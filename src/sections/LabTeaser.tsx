import Link from 'next/link';
import { LAB_EXPERIMENTS, LAB_PATH, type LabId } from '@/data/lab';
import { DotWaves } from './lab/experiments/DotWaves';
import { ParticleText } from './lab/experiments/ParticleText';
import { SmokeRing } from './lab/experiments/SmokeRing';
import styles from './LabTeaser.module.css';

const PREVIEWS = [
  { id: 'dot-waves', Component: DotWaves },
  { id: 'particle-text', Component: ParticleText },
  { id: 'smoke-ring', Component: SmokeRing },
] as const satisfies readonly { id: LabId; Component: typeof DotWaves }[];

export function LabTeaser() {
  return (
    <section id="lab" data-testid="lab-teaser" className={styles.teaser} aria-labelledby="lab-teaser-title">
      <header className={styles.heading}>
        <div><h2 id="lab-teaser-title">実験室</h2><p>製品になる前の，小さな試作です．点と光を触ってみてください．</p></div>
        <Link href={LAB_PATH} className={`${styles.link} press-effect`}>実験室へ <span aria-hidden="true">↗</span></Link>
      </header>
      <div className={styles.previews}>
        {PREVIEWS.map(({ id, Component }) => {
          const experiment = LAB_EXPERIMENTS.find(item => item.id === id)!;
          return <div key={experiment.id} className={styles.preview}>
            <Component compact />
            <Link href={`${LAB_PATH}#${experiment.id}`} className={`${styles.detail} press-effect`}>{experiment.title}を大きく見る →</Link>
          </div>;
        })}
      </div>
    </section>
  );
}
