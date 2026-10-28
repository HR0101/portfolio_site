"use client";

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { siteConfig } from '../config/site';
import { SWIFT_APPS } from '../data/apps';
import { RollingNumber } from '../components/RollingNumber';
import { TypingTerminal, type TerminalLine } from '../components/TypingTerminal';
import { RotatingWords } from '../components/RotatingWords';
import { useHeroMotion } from '../hooks/useHeroMotion';
import styles from './Hero.module.css';

const TERMINAL_LINES: TerminalLine[] = [
  {
    command: 'xcodebuild -scheme Subghost build',
    output: ['CompileSwiftSources normal arm64 com.apple.xcode.tools.swift.compiler', '** BUILD SUCCEEDED **'],
  },
  {
    command: 'npm test',
    output: ['# tests 42', '# pass 42', '# fail 0'],
  },
  {
    command: 'git push origin main',
    output: [
      'Enumerating objects: 19, done.',
      'Writing objects: 100% (11/11), 3.21 KiB | 3.21 MiB/s, done.',
      'To https://github.com/HR0101/portfolio_site.git',
      '   629c13e..c39d579  main -> main',
    ],
  },
  {
    command: 'curl -sI https://ekihub.jp | head -1',
    output: ['HTTP/2 200'],
  },
];

const SPOTLIGHT_NAMES = ['Subghost', 'BusTimeApp', 'Tsumugi', 'TeleDeck'];
const spotlightApps = SPOTLIGHT_NAMES.flatMap(name => {
  const app = SWIFT_APPS.find(item => item.name === name);
  return app?.imageSrc ? [app] : [];
});

function AssembledLine({ text, accent = false }: { text: string; accent?: boolean }) {
  return <span className={`${styles.line} ${accent ? styles.accent : ''}`} aria-hidden="true">{Array.from(text).map((character, index) => (
    <span key={index} className={styles.charMask}><span className={styles.char} data-hero-char>{character}</span></span>
  ))}</span>;
}

export function Hero() {
  const ref = useHeroMotion();
  return (
    <section ref={ref} id="hero" data-testid="hero-section" className={styles.runway}>
      <div className={styles.stage}>
        <div className={`${styles.wash} ${styles.blue}`} data-hero-blue aria-hidden="true" />
        <div className={`${styles.wash} ${styles.peach}`} data-hero-peach aria-hidden="true" />
        <div className={styles.rule} data-hero-rule aria-hidden="true" />
        <div className={styles.layout}>
          <div className={styles.copy}>
            <p className={styles.eyebrow} data-hero-intro>{siteConfig.displayName} · iOS & macOS Developer</p>
            <div className={styles.titleScroll} data-hero-title>
              <h1 aria-label="信頼を、コードで築く。"><AssembledLine text="信頼を、" /><AssembledLine text="コードで築く。" accent /></h1>
            </div>
            <p className={styles.lead} data-hero-intro>日々のアイデアから、<RotatingWords words={['アプリ', 'Webサービス', 'ゲーム']} />をつくる。</p>
            <p className={styles.description} data-hero-intro>使う人の毎日に寄り添うものを。<br />企画からデザイン、実装まで一つひとつ形にしています。</p>
            <div className={styles.terminalWrap} data-hero-intro>
              <TypingTerminal
                lines={TERMINAL_LINES}
                prompt="~/HR0101 %"
                accessibleText="ターミナルにコマンドを打ち込み，ビルド・テスト・デプロイを繰り返す様子の演出です．"
                className={styles.terminal}
              />
            </div>
            <div className={styles.actions} data-hero-intro>
              <a className={styles.cta} href="#showcase" data-magnetic>アプリを見る <ArrowUpRight size={19} aria-hidden="true" /></a>
              <a className={styles.source} href={siteConfig.githubUrl} target="_blank" rel="noopener noreferrer" data-magnetic>GitHubでコードを見る <ArrowUpRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
          <div className={styles.universe} data-hero-universe aria-label="注目のアプリ">
            <div className={styles.core} data-hero-core aria-hidden="true"><div /><span>RH</span></div>
            <div className={styles.orbitPath} aria-hidden="true" />
            {spotlightApps.map((app, index) => (
              <div className={styles.orbit} data-orbit-depth={[1, -1, .6, -.5][index]} key={app.name}>
                <div data-orbit-intro>
                  <div className={styles.appFloat} style={{ animationDelay: `${index * -0.9}s` }}>
                    <Link href={app.detailHref ?? '#projects'} className={styles.app}>
                      <Image src={app.imageSrc!} alt="" width={112} height={112} priority={index < 2} />
                      <span>{app.name}</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            <span className={styles.coordinate} aria-hidden="true">DESIGN × CODE × CURIOSITY</span>
          </div>
        </div>
        <div className={styles.bottom}>
          <a className={styles.scrollCue} href="#showcase" data-hero-cue><span>SCROLL TO EXPLORE</span><i aria-hidden="true" /></a>
          <dl className={styles.stats}>
            <div><dt>公開プロダクト</dt><dd><RollingNumber value={SWIFT_APPS.length} /></dd></div>
            <div><dt>開発言語・フレームワーク</dt><dd>Swift / SwiftUI</dd></div>
            <div><dt>対応プラットフォーム</dt><dd>iPhone & Mac</dd></div>
          </dl>
        </div>
      </div>
    </section>
  );
}
