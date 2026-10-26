"use client";

import type { CSSProperties } from 'react';
import { Cpu, GraduationCap, HeartHandshake, Smartphone } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import { useTilt } from '../hooks/useTilt';
import styles from './About.module.css';

type AboutKind = 'learn' | 'apps' | 'hardware' | 'trust';
interface AboutCardData {
  icon: typeof GraduationCap;
  title: string;
  description: string;
  accent: string;
  kind: AboutKind;
}

const ABOUT_CARDS: AboutCardData[] = [
  {
    icon: GraduationCap,
    title: '情報系の学生',
    description: '大学で情報工学を学びながら，授業の枠を超えて日々新しい技術を吸収しています．',
    accent: '#7297c9', kind: 'learn',
  },
  {
    icon: Smartphone,
    title: 'iOS / macOSアプリ開発',
    description: '2025年6月から，Swift / SwiftUI で iPhone・Mac 両方のアプリを17本つくり，すべてソースコードごと公開しています．',
    accent: '#9a86c5', kind: 'apps',
  },
  {
    icon: Cpu,
    title: '組込み・電子工作',
    description: 'C / Arduino を使ったハードウェア寄りの開発も好きで，ソフトとハードの両面から物事を考えます．',
    accent: '#69a797', kind: 'hardware',
  },
  {
    icon: HeartHandshake,
    title: '「Trust」を軸に',
    description: '「信頼されるソフトウェア」を目標に，使う人の体験を最優先した設計と丁寧な実装を心がけています．',
    accent: '#c79479', kind: 'trust',
  },
];

// Small line drawings share the same draw-in, but respond differently to hover.
function CardMotif({ kind }: { kind: AboutKind }) {
  return <svg className={styles.motif} viewBox="0 0 160 110" fill="none" aria-hidden="true">
    {kind === 'learn' && <>
      <ellipse className={styles.trace} pathLength="1" cx="80" cy="55" rx="55" ry="27" transform="rotate(-25 80 55)" />
      <ellipse className={styles.trace} pathLength="1" cx="80" cy="55" rx="55" ry="27" transform="rotate(30 80 55)" />
      <circle className={styles.node} cx="80" cy="55" r="7" /><circle className={styles.satellite} cx="128" cy="30" r="4" />
    </>}
    {kind === 'apps' && <>
      <rect className={styles.trace} pathLength="1" x="45" y="10" width="48" height="84" rx="10" />
      <path className={styles.trace} pathLength="1" d="M60 18h18M64 86h10M103 31h19v51h-19" />
      <rect className={styles.screen} x="53" y="31" width="32" height="42" rx="4" />
      <path className={styles.scan} d="M55 48h28" /><circle className={styles.node} cx="115" cy="90" r="3" />
    </>}
    {kind === 'hardware' && <>
      <rect className={styles.trace} pathLength="1" x="61" y="35" width="38" height="38" rx="7" />
      <path className={styles.trace} pathLength="1" d="M61 45H35V26H18M61 62H28v22H13M99 45h25V25h20M99 62h35v21h14M72 35V14M87 35V8M72 73v23M87 73v30" />
      <path className={styles.signal} d="M18 26h17v19h26m38 17h35v21h14" />
      <circle className={styles.node} cx="18" cy="26" r="3" /><circle className={styles.node} cx="148" cy="83" r="3" />
    </>}
    {kind === 'trust' && <>
      <circle className={styles.trace} pathLength="1" cx="80" cy="55" r="39" />
      <circle className={styles.ripple} cx="80" cy="55" r="47" />
      <path className={styles.check} pathLength="1" d="m64 55 11 11 23-25" />
    </>}
  </svg>;
}

function AboutCard({ card, index }: { card: AboutCardData; index: number }) {
  const { ref, handlers } = useTilt<HTMLElement>();
  const Icon = card.icon;
  return (
    <Reveal variant="scene" delayMs={index * 120} className={styles.entry}>
      <article ref={ref} {...handlers} className={styles.card} style={{ '--about-accent': card.accent, '--about-delay': `${index * 120}ms` } as CSSProperties}>
        <div className={styles.top}>
          <span className={styles.icon}><Icon size={24} aria-hidden="true" /></span>
          <span className={styles.number} aria-hidden="true">0{index + 1}</span>
        </div>
        <CardMotif kind={card.kind} />
        <div className={styles.copy}>
          <h3>{card.title}</h3>
          <p>{card.description}</p>
        </div>
        <span className={styles.edge} aria-hidden="true" />
      </article>
    </Reveal>
  );
}

export function About() {
  return (
    <section id="about" data-testid="about-section" className={`scroll-mt-24 py-24 md:py-32 ${styles.section}`}>
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading label="01. About Me" title="自己紹介" description="情報系の学生として，ソフトウェアからハードウェアまで幅広い開発に取り組んでいます．つくるものすべてに共通する軸は「信頼」です．" />
        <div className={styles.grid}>{ABOUT_CARDS.map((card, index) => <AboutCard key={card.title} card={card} index={index} />)}</div>
      </div>
    </section>
  );
}
