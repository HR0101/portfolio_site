"use client";

import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Code2, Cpu, Globe2, Terminal } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { useTilt } from '../hooks/useTilt';
import { SWIFT_APPS } from '../data/apps';
import { siteConfig } from '../config/site';
import { SkillExamples } from './SkillExamples';
import styles from './Skills.module.css';

const SHOWCASE_APPS = ['Subghost', 'BusTimeApp', 'Tsumugi'].map((name) => SWIFT_APPS.find((app) => app.name === name)!);
const REPOSITORY_COUNT = SWIFT_APPS.reduce((total, app) => total + app.repositories.length, 0);

function SkillCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { ref, handlers } = useTilt<HTMLDivElement>();
  return <div ref={ref} {...handlers} className={`${styles.card} ${className}`}>{children}</div>;
}

export function Skills() {
  return (
    <section id="skills" data-testid="skills-section" className={`tinted scroll-mt-24 py-24 md:py-32 bg-mist dark:bg-night-soft/40 ${styles.section}`}>
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          label="02. Skills"
          title="アイデアを、動くものに。"
          description="Swift で日常のアプリを。TypeScript で Web の体験を。目的に合わせて技術を選び、ソフトウェアからハードウェアまで形にしています。"
        />
        <div className={styles.sectionLabel}><span>MY DEVELOPMENT TOOLKIT</span><span>技術と、それでつくったもの</span></div>
        <div className={styles.grid}>
          <Reveal className={styles.nativeSlot} cardDirection="left">
            <SkillCard className={styles.native}>
              <div className={styles.cardTop}><span className={styles.icon}><Code2 size={22} aria-hidden="true" /></span><span className={styles.category}>APP DEVELOPMENT</span><span className={styles.primaryBadge}>メインスキル</span></div>
              <h3>Swift <span>/ SwiftUI</span></h3>
              <p className={styles.description}>毎日使いたくなる、<br />iPhone と Mac のアプリを。</p>
              <div className={styles.nativeVisual}>
                <div className={styles.orbit} aria-hidden="true" />
                <span className={`${styles.platform} ${styles.ios}`}>iOS</span>
                <span className={`${styles.platform} ${styles.macos}`}>macOS</span>
                <div className={styles.appShelf}>
                  {SHOWCASE_APPS.map((app, index) => (
                    <Link key={app.name} href={app.detailHref!} className={styles.app} style={{ '--app-index': index } as CSSProperties} aria-label={`${app.name}の紹介を見る`}>
                      <Image src={app.imageSrc!} alt="" width={96} height={96} />
                      <span>{app.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <dl className={styles.stats}>
                <div><dt>公開プロダクト</dt><dd><AnimatedCounter value={SWIFT_APPS.length} /><span>Apps</span></dd></div>
                <div><dt>公開リポジトリ</dt><dd><AnimatedCounter value={REPOSITORY_COUNT} /><span>Repositories</span></dd></div>
              </dl>
              <div className={styles.cardFooter}><span>SwiftUI / UIKit</span><Link href="#projects">つくったアプリへ <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
            </SkillCard>
          </Reveal>
          <Reveal className={styles.webSlot} cardDirection="right" delayMs={80}>
            <SkillCard className={styles.web}>
              <div className={styles.webCopy}>
                <div className={styles.cardTop}><span className={styles.icon}><Globe2 size={21} aria-hidden="true" /></span><span className={styles.category}>WEB EXPERIENCE</span></div>
                <h3>TypeScript <span>/ Next.js</span></h3>
                <p className={styles.description}>ブラウザから、体験を届ける。</p>
                <p className={styles.evidence}>EkiHub・このポートフォリオサイト</p>
                <Link className={styles.textLink} href="#works">Web サービスとゲームへ <ArrowUpRight size={16} aria-hidden="true" /></Link>
              </div>
              <div className={styles.browserVisual} aria-hidden="true">
                <div className={styles.browserBar}><i /><i /><i /><span>localhost</span></div>
                <div className={styles.code}><span>&lt;<b>Idea</b></span><span>   language=<em>"TypeScript"</em></span><span>   framework=<em>"Next.js"</em></span><span>   /&gt;<i className={styles.caret} /></span></div>
                <div className={styles.browserPreview}><span /><span /><span /></div>
              </div>
            </SkillCard>
          </Reveal>
          <Reveal cardDirection="left" delayMs={150} tow={false}>
            <SkillCard className={styles.python}>
              <div className={styles.cardTop}><span className={styles.icon}><Terminal size={21} aria-hidden="true" /></span><span className={styles.category}>AUTOMATION</span></div>
              <h3>Python</h3>
              <p className={styles.description}>繰り返す作業に、仕組みを。</p>
              <div className={styles.pipeline} aria-hidden="true"><span>Data</span><i className={styles.dataLink} /><span>Script</span><i className={styles.dataLink} /><span>Done</span></div>
              <p className={styles.evidence}>データ処理・自動化・機械学習</p>
              <a className={styles.textLink} href={`${siteConfig.githubUrl}?tab=repositories&language=python`}>AeroPath / FraTerm など <ArrowUpRight size={15} aria-hidden="true" /></a>
            </SkillCard>
          </Reveal>
          <Reveal cardDirection="right" delayMs={220}>
            <SkillCard className={styles.hardware}>
              <div className={styles.cardTop}><span className={styles.icon}><Cpu size={21} aria-hidden="true" /></span><span className={styles.category}>HARDWARE</span></div>
              <h3>C <span>/ Arduino</span></h3>
              <p className={styles.description}>画面の先の、ものづくり。</p>
              <div className={styles.circuit} aria-hidden="true"><span /><span /><Cpu size={32} /><span /><span /></div>
              <p className={styles.evidence}>組込み開発・低レイヤプログラミング<br />電子工作・IoT プロトタイピング</p>
            </SkillCard>
          </Reveal>
        </div>
        <Reveal delayMs={100}>
          <SkillExamples />
        </Reveal>
      </div>
    </section>
  );
}
